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

/**
 * Parsed skill metadata from SKILL.md frontmatter
 */
interface SkillMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
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
      const files = await this.downloadSkillDirectory(owner, repo, request.skillId);

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
   */
  private async downloadSkillDirectory(
    owner: string,
    repo: string,
    skillId: string
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    try {
      // Get repository tree
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
      const treeResponse = await fetch(treeUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App'
        }
      });

      if (!treeResponse.ok) {
        // Try 'master' branch if 'main' fails
        const masterTreeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
        const masterResponse = await fetch(masterTreeUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'skillsMN-App'
          }
        });

        if (!masterResponse.ok) {
          throw new Error(`Failed to fetch repository tree: ${treeResponse.status}`);
        }

        const masterData: any = await masterResponse.json();
        await this.downloadFilesFromTree(owner, repo, 'master', masterData.tree, skillId, files);
      } else {
        const data: any = await treeResponse.json();
        await this.downloadFilesFromTree(owner, repo, 'main', data.tree, skillId, files);
      }

      logger.info('Downloaded skill directory', 'SkillInstaller', {
        owner,
        repo,
        skillId,
        fileCount: files.size
      });

      return files;
    } catch (error) {
      logger.error('Failed to download skill directory', 'SkillInstaller', error);
      throw error;
    }
  }

  /**
   * Download files from GitHub tree that match skill directory
   */
  private async downloadFilesFromTree(
    owner: string,
    repo: string,
    branch: string,
    tree: any[],
    skillId: string,
    files: Map<string, string>
  ): Promise<void> {
    // Find all files in skill directory
    const possiblePaths = [
      skillId,
      `skills/${skillId}`,
      `skill/${skillId}`
    ];

    const skillFiles = tree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      return possiblePaths.some(prefix => item.path.startsWith(prefix + '/'));
    });

    if (skillFiles.length === 0) {
      return;
    }

    // Download all files in parallel
    await Promise.all(
      skillFiles.map(async (file: any) => {
        const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
        const response = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'skillsMN-App'
          }
        });

        if (response.ok) {
          const content = await response.text();
          files.set(file.path, content);
        } else {
          logger.warn(`Failed to download file: ${file.path}`, 'SkillInstaller');
        }
      })
    );
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
    const slugifiedName = this.slugify(skillName);
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
   * Slugify a string for use as a directory name
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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
