/**
 * Skill Installer Service
 *
 * Handles installation of skills from the registry by cloning GitHub repositories
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createRegistrySource, SkillSource } from '../models/SkillSource';
import { logger } from '../utils/Logger';
import { SOURCE_METADATA_FILE } from '../../shared/constants';
import type { InstallFromRegistryRequest, InstallProgressEvent, RegistryErrorCode } from '../../shared/types';
import { getProxyAgent, fetchWithProxy } from '../utils/proxy';
import { toKebabCase } from '../utils/pathUtils';

/**
 * Parsed skill metadata from SKILL.md frontmatter
 */
interface SkillMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
}

/**
 * Found skill match in repository
 */
interface FoundSkill {
  directoryPath: string;
  skillMdPath: string;
  metadata: SkillMetadata;
  branch: string;
}

// Timeout for fetch operations (30 seconds)
const FETCH_TIMEOUT_MS = 30000;
// Max retries for failed downloads
const MAX_RETRIES = 3;

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);
      return response;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Fetch attempt ${attempt}/${maxRetries} failed for ${url}`, 'SkillInstaller', {
        error: error.message
      });
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

export class SkillInstaller {
  /**
   * Install a skill from the registry
   * Always installs to application directory (centralized storage)
   * Uses GitHub API to download files (no Git required)
   *
   * @param request - Installation request with source, skillId, targetToolId
   * @param appDirectory - Application skills directory
   * @param onProgress - Optional progress callback
   * @returns Installation result with skill path and error details
   */
  async installFromRegistry(
    request: InstallFromRegistryRequest,
    appDirectory: string,
    onProgress?: (event: InstallProgressEvent) => void
  ): Promise<{
    success: boolean;
    skillPath?: string;
    skillName?: string;
    error?: string;
    errorCode?: RegistryErrorCode;
  }> {
    const tempRoot = path.join(os.tmpdir(), `skillsMN-${Date.now()}-${uuidv4().slice(0, 8)}`);
    const installContext = {
      source: request.source,
      skillId: request.skillId,
      targetToolId: request.targetToolId,
      appDirectory,
      tempRoot,
      startTime: new Date().toISOString()
    };

    logger.info('Starting skill installation', 'SkillInstaller', installContext);

    try {
      // Parse source (format: "owner/repo")
      const [owner, repo] = request.source.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid source format: ${request.source}. Expected "owner/repo"`);
      }

      // Stage 1: Fetching repository tree (10%)
      onProgress?.({
        stage: 'cloning',
        message: `Fetching repository information from ${request.source}...`,
        progress: 10
      });

      // Try to download skill directory using GitHub API
      // Pass selectedDirectoryPath if user has already selected a specific skill
      const files = await this.downloadSkillDirectory(
        owner,
        repo,
        request.skillId,
        request.selectedDirectoryPath
      );

      if (files.size === 0) {
        throw Object.assign(
          new Error(
            `Skill "${request.skillId}" not found in repository. ` +
            `Make sure the repository contains a valid skill directory.`
          ),
          { code: 'REGISTRY_SKILL_NOT_FOUND' }
        );
      }

      logger.info('Skill files downloaded', 'SkillInstaller', {
        fileCount: files.size,
        ...installContext
      });

      // Stage 2: Parsing metadata (40%)
      onProgress?.({
        stage: 'discovering',
        message: 'Parsing skill metadata...',
        progress: 40
      });

      // Find SKILL.md file
      let skillMdContent: string | null = null;
      let skillDir = '';
      for (const [filePath, content] of files.entries()) {
        if (filePath.endsWith('SKILL.md') || filePath.endsWith('skill.md')) {
          skillMdContent = content;
          skillDir = path.dirname(filePath);
          break;
        }
      }

      if (!skillMdContent) {
        throw Object.assign(
          new Error(`Invalid skill structure: SKILL.md not found`),
          { code: 'REGISTRY_INVALID_SKILL' }
        );
      }

      const metadata = await this.parseSkillMetadataFromContent(skillMdContent);
      const skillName = metadata.name || request.skillId;

      logger.info('Skill metadata parsed', 'SkillInstaller', {
        skillName,
        metadata,
        ...installContext
      });

      // Stage 3: Copying to application directory (60%)
      onProgress?.({
        stage: 'copying',
        message: 'Copying skill to application directory...',
        progress: 60
      });

      // Create unique target directory (avoid conflicts)
      const targetPath = await this.createUniqueTargetDir(appDirectory, skillName);

      // Write all files from skill directory
      await fs.promises.mkdir(targetPath, { recursive: true });
      let copiedCount = 0;
      for (const [filePath, content] of files.entries()) {
        // Only copy files within the skill directory
        if (filePath.startsWith(skillDir)) {
          const relativePath = path.relative(skillDir, filePath);
          const absolutePath = path.join(targetPath, relativePath);
          await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
          await fs.promises.writeFile(absolutePath, content, 'utf-8');
          copiedCount++;
        }
      }

      logger.info('Skill copied to target directory', 'SkillInstaller', {
        targetPath,
        fileCount: copiedCount,
        ...installContext
      });

      // Stage 4: Writing metadata (80%)
      onProgress?.({
        stage: 'writing_metadata',
        message: 'Writing installation metadata...',
        progress: 80
      });

      // Create and write source metadata (no commit hash for API-based downloads)
      const sourceMetadata = createRegistrySource(
        request.source,
        skillName,
        undefined // No commit hash when using API
      );

      const metadataPath = path.join(targetPath, SOURCE_METADATA_FILE);
      await fs.promises.writeFile(metadataPath, JSON.stringify(sourceMetadata, null, 2), 'utf-8');

      logger.info('Source metadata written', 'SkillInstaller', {
        metadata: sourceMetadata,
        ...installContext
      });

      // Stage 5: Cleanup (90%)
      onProgress?.({
        stage: 'cleaning_up',
        message: 'Cleaning up temporary files...',
        progress: 90
      });

      // Clean up temporary directory (if any)
      await this.cleanup(tempRoot);

      // Stage 6: Completed (100%)
      onProgress?.({
        stage: 'completed',
        message: 'Installation completed successfully!',
        progress: 100
      });

      const duration = Date.now() - new Date(installContext.startTime).getTime();
      logger.info('Skill installation completed', 'SkillInstaller', {
        skillPath: targetPath,
        skillName,
        duration: `${duration}ms`,
        ...installContext
      });

      return {
        success: true,
        skillPath: targetPath,
        skillName
      };

    } catch (error: any) {
      return this.handleInstallError(error, tempRoot, onProgress, installContext);
    }
  }

  /**
   * Download skill directory from public GitHub repository
   * Uses GitHub API (no Git required)
   * Searches for SKILL.md files and matches by skill name
   */
  private async downloadSkillDirectory(
    owner: string,
    repo: string,
    skillId: string,
    selectedDirectoryPath?: string
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    try {
      // Try to get repository info first to find default branch
      const repoInfoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      let defaultBranch = 'main';

      try {
        const repoInfoResponse = await fetchWithRetry(repoInfoUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'skillsMN-App'
          }
        });

        if (repoInfoResponse.ok) {
          const repoInfo: any = await repoInfoResponse.json();
          defaultBranch = repoInfo.default_branch || 'main';
          logger.debug('Found default branch', 'SkillInstaller', { defaultBranch });
        }
      } catch (error) {
        logger.warn('Failed to get repo info, using default branch', 'SkillInstaller');
      }

      // Get repository tree
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
      let treeResponse = await fetchWithRetry(treeUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App'
        }
      });

      // Try alternative branches if default fails
      if (!treeResponse.ok) {
        const branches = defaultBranch === 'main' ? ['master'] : ['main'];
        for (const branch of branches) {
          const altTreeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
          treeResponse = await fetchWithRetry(altTreeUrl, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'skillsMN-App'
            }
          });
          if (treeResponse.ok) {
            defaultBranch = branch;
            break;
          }
        }
      }

      if (!treeResponse.ok) {
        throw new Error(`Failed to fetch repository tree: ${treeResponse.status}`);
      }

      const data: any = await treeResponse.json();
      const tree = data.tree;

      // Step 1: Find all SKILL.md files in the repository
      const skillMdFiles = tree.filter((item: any) =>
        item.type === 'blob' &&
        (item.path.endsWith('SKILL.md') || item.path.endsWith('skill.md'))
      );

      logger.debug('Found SKILL.md files in repository', 'SkillInstaller', {
        count: skillMdFiles.length,
        paths: skillMdFiles.map((f: any) => f.path)
      });

      if (skillMdFiles.length === 0) {
        throw Object.assign(
          new Error(`No SKILL.md files found in repository ${owner}/${repo}`),
          { code: 'REGISTRY_SKILL_NOT_FOUND' }
        );
      }

      // Step 2: Download each SKILL.md and parse metadata to find matching skill
      // If selectedDirectoryPath is provided, skip search and use it directly
      const foundSkills: FoundSkill[] = [];

      if (selectedDirectoryPath) {
        // User has already selected a specific skill directory
        logger.info('Using pre-selected directory path', 'SkillInstaller', {
          selectedDirectoryPath
        });

        // Find the SKILL.md in the selected directory
        const selectedSkillMd = skillMdFiles.find((f: any) =>
          f.path.startsWith(selectedDirectoryPath + '/') ||
          path.dirname(f.path) === selectedDirectoryPath
        );

        if (selectedSkillMd) {
          const skillMdUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${selectedSkillMd.path}`;
          const skillMdResponse = await fetchWithRetry(skillMdUrl, {
            headers: { 'User-Agent': 'skillsMN-App' }
          });

          if (skillMdResponse.ok) {
            const skillMdContent = await skillMdResponse.text();
            const metadata = await this.parseSkillMetadataFromContent(skillMdContent);

            foundSkills.push({
              directoryPath: selectedDirectoryPath,
              skillMdPath: selectedSkillMd.path,
              metadata,
              branch: defaultBranch
            });
          }
        }
      } else {
        // Search for matching skills
        for (const skillMdFile of skillMdFiles) {
          try {
            const skillMdUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${skillMdFile.path}`;
            const skillMdResponse = await fetchWithRetry(skillMdUrl, {
              headers: { 'User-Agent': 'skillsMN-App' }
            });

            if (skillMdResponse.ok) {
              const skillMdContent = await skillMdResponse.text();
              const metadata = await this.parseSkillMetadataFromContent(skillMdContent);
              const directoryPath = path.dirname(skillMdFile.path);

              // Check if this skill matches the requested skillId
              // Exact match only: skillId must match skill name OR directory name
              const skillName = (metadata.name || '').trim();
              const dirName = path.basename(directoryPath);

              const isMatch =
                skillName === skillId ||
                dirName === skillId;

              if (isMatch) {
                foundSkills.push({
                  directoryPath,
                  skillMdPath: skillMdFile.path,
                  metadata,
                  branch: defaultBranch
                });

                logger.debug('Found matching skill', 'SkillInstaller', {
                  directoryPath,
                  skillName: metadata.name,
                  matchedWith: skillId
                });
              }
            }
          } catch (error) {
            logger.warn(`Failed to check SKILL.md: ${skillMdFile.path}`, 'SkillInstaller');
          }
        }
      } // end of else block

      // Step 3: Handle found skills
      if (foundSkills.length === 0) {
        throw Object.assign(
          new Error(
            `Skill "${skillId}" not found in repository. ` +
            `Available skills: ${skillMdFiles.map((f: any) => path.dirname(f.path)).join(', ')}`
          ),
          { code: 'REGISTRY_SKILL_NOT_FOUND' }
        );
      }

      // If multiple skills found, return list for user selection
      if (foundSkills.length > 1) {
        const skillOptions = foundSkills.map(s => ({
          name: s.metadata.name || path.basename(s.directoryPath),
          directoryPath: s.directoryPath,
          description: s.metadata.description
        }));

        logger.info('Multiple skills found, returning options for user selection', 'SkillInstaller', {
          count: foundSkills.length,
          options: skillOptions
        });

        throw Object.assign(
          new Error(`Multiple skills found matching "${skillId}". Please select one.`),
          {
            code: 'REGISTRY_MULTIPLE_SKILLS_FOUND',
            skillOptions
          }
        );
      }

      // Single skill found, proceed with installation
      const selectedSkill = foundSkills[0];
      logger.info('Selected skill for installation', 'SkillInstaller', {
        directoryPath: selectedSkill.directoryPath,
        skillName: selectedSkill.metadata.name
      });

      // Step 4: Download all files in the selected skill directory
      const skillDirPath = selectedSkill.directoryPath;
      const skillFiles = tree.filter((item: any) => {
        if (item.type !== 'blob') return false;
        // File is in skill directory (including subdirectories)
        return item.path.startsWith(skillDirPath + '/') || item.path === `${skillDirPath}/SKILL.md`;
      });

      logger.debug('Files to download', 'SkillInstaller', {
        count: skillFiles.length,
        paths: skillFiles.map((f: any) => f.path)
      });

      // Download files in parallel with concurrency limit
      const CONCURRENCY = 5;
      const batches: any[][] = [];
      for (let i = 0; i < skillFiles.length; i += CONCURRENCY) {
        batches.push(skillFiles.slice(i, i + CONCURRENCY));
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (file: any) => {
            const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
            const response = await fetchWithRetry(downloadUrl, {
              headers: { 'User-Agent': 'skillsMN-App' }
            });

            if (response.ok) {
              return { path: file.path, content: await response.text() };
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            files.set(result.value.path, result.value.content);
          } else {
            logger.warn('Error downloading file', 'SkillInstaller', { error: result.reason });
          }
        }
      }

      logger.info('Downloaded skill directory', 'SkillInstaller', {
        owner,
        repo,
        skillId,
        skillName: selectedSkill.metadata.name,
        directoryPath: skillDirPath,
        fileCount: files.size
      });

      return files;
    } catch (error) {
      logger.error('Failed to download skill directory', 'SkillInstaller', error);
      throw error;
    }
  }

  /**
   * Parse skill metadata from SKILL.md frontmatter content
   */
  private async parseSkillMetadataFromContent(content: string): Promise<SkillMetadata> {
    try {
      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return { name: '' };
      }

      const frontmatter = frontmatterMatch[1];
      const metadata: SkillMetadata = { name: '' };

      // Extract name
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        metadata.name = nameMatch[1].trim();
      }

      // Extract description
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
      if (descMatch) {
        metadata.description = descMatch[1].trim();
      }

      // Extract version
      const versionMatch = frontmatter.match(/^version:\s*(.+)$/m);
      if (versionMatch) {
        metadata.version = versionMatch[1].trim();
      }

      // Extract author
      const authorMatch = frontmatter.match(/^author:\s*(.+)$/m);
      if (authorMatch) {
        metadata.author = authorMatch[1].trim();
      }

      return metadata;
    } catch (error) {
      logger.warn('Failed to parse skill metadata', 'SkillInstaller', { error });
      return { name: '' };
    }
  }

  /**
   * Parse skill metadata from SKILL.md frontmatter
   */
  private async parseSkillMetadata(skillMdPath: string): Promise<SkillMetadata> {
    try {
      const content = await fs.promises.readFile(skillMdPath, 'utf-8');
      return await this.parseSkillMetadataFromContent(content);
    } catch (error) {
      logger.warn('Failed to parse skill metadata', 'SkillInstaller', { error });
      return { name: '' };
    }
  }

  /**
   * Create a unique target directory to avoid conflicts
   * If directory exists, append a number suffix
   */
  private async createUniqueTargetDir(
    appDirectory: string,
    skillName: string
  ): Promise<string> {
    const slugifiedName = toKebabCase(skillName);
    let targetPath = path.join(appDirectory, slugifiedName);

    // Ensure application directory exists
    await fs.promises.mkdir(appDirectory, { recursive: true });

    // Check for conflicts and create unique name
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(appDirectory, `${slugifiedName}-${counter}`);
      counter++;

      // Safety limit
      if (counter > 100) {
        throw new Error(`Too many conflicts for skill "${skillName}"`);
      }
    }

    logger.debug(`Created unique target path: ${targetPath}`, 'SkillInstaller');
    return targetPath;
  }

  /**
   * Clean up temporary directory
   */
  private async cleanup(tempRoot: string): Promise<void> {
    try {
      if (fs.existsSync(tempRoot)) {
        await fs.promises.rm(tempRoot, { recursive: true, force: true });
        logger.debug('Temporary directory cleaned up', 'SkillInstaller', { tempRoot });
      }
    } catch (error: any) {
      logger.warn('Failed to clean up temporary directory', 'SkillInstaller', {
        error: error.message,
        tempRoot
      });
    }
  }

  /**
   * Handle installation error
   */
  private handleInstallError(
    error: any,
    tempRoot: string,
    onProgress?: (event: InstallProgressEvent) => void,
    installContext?: any
  ): { success: false; error: string; errorCode: RegistryErrorCode } {
    const errorCode = error.code || 'REGISTRY_INSTALLATION_FAILED';
    const errorMessage = error.message || 'Installation failed';

    logger.error('Skill installation failed', 'SkillInstaller', {
      error: errorMessage,
      errorCode,
      stack: error.stack,
      ...installContext
    });

    // Clean up temporary directory
    this.cleanup(tempRoot);

    onProgress?.({
      stage: 'failed',
      message: errorMessage,
      progress: 0
    });

    return {
      success: false,
      error: errorMessage,
      errorCode: errorCode as RegistryErrorCode
    };
  }
}
