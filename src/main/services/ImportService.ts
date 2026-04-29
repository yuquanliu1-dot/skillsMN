/**
 * Import Service
 *
 * Handles importing skills from local directories and Git URLs (GitHub/GitLab)
 * Reuses patterns from MigrationService, PrivateRepoService, and SkillInstaller
 */

import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { logger } from '../utils/Logger';
import { SkillService } from './SkillService';
import { getGitProvider } from './GitProvider';
import { SkillDirectoryModel } from '../models/SkillDirectory';
import { IPC_CHANNELS, SOURCE_METADATA_FILE } from '../../shared/constants';
import {
  Configuration,
  DetectedSkill,
  ImportOptions,
  ImportProgress,
  ImportResult,
  UrlScanResult,
  Skill,
} from '../../shared/types';
import { createGitImportSource } from '../models/SkillSource';
import { BrowserWindow } from 'electron';
import { getProxyAgent } from '../utils/proxy';

export class ImportService {
  constructor(
    private skillService: SkillService
  ) {}

  // ============================================================================
  // Local Directory Import
  // ============================================================================

  /**
   * Scan a local directory for skills
   * @param dirPath - Directory path to scan
   * @param appDir - Application skills directory (for conflict detection)
   * @returns Array of detected skills with conflict information
   */
  async scanLocalDirectory(dirPath: string, appDir: string): Promise<DetectedSkill[]> {
    logger.info('Scanning local directory for skills', 'ImportService', { dirPath });

    if (!fs.existsSync(dirPath)) {
      logger.warn('Directory does not exist', 'ImportService', { dirPath });
      return [];
    }

    // Use SkillService to scan the directory
    const skills = await this.skillService.scanDirectory(dirPath, 'project');

    // Check for conflicts with existing skills
    const detectedSkills: DetectedSkill[] = await Promise.all(
      skills.map(async (skill) => {
        const skillDirName = path.basename(skill.path);
        const targetPath = path.join(appDir, skillDirName);
        const hasConflict = await fsExtra.pathExists(targetPath);

        return {
          name: skill.name,
          path: skill.path,
          source: 'local' as const,
          description: skill.description,
          tags: skill.tags,
          hasConflict,
          existingPath: hasConflict ? targetPath : undefined,
        };
      })
    );

    logger.info('Local directory scan complete', 'ImportService', {
      dirPath,
      skillCount: detectedSkills.length,
      conflictCount: detectedSkills.filter(s => s.hasConflict).length,
    });

    return detectedSkills;
  }

  /**
   * Import skills from local directory
   * @param skills - Skills to import
   * @param appDir - Application skills directory
   * @param options - Import options
   * @param mainWindow - Electron window for progress updates
   * @returns Import result
   */
  async importLocalSkills(
    skills: DetectedSkill[],
    appDir: string,
    options: ImportOptions,
    mainWindow: BrowserWindow | null
  ): Promise<ImportResult> {
    logger.info('Starting local skill import', 'ImportService', {
      skillCount: skills.length,
      options,
    });

    const startTime = Date.now();
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      renamedSkills: [],
      failedSkills: [],
      duration: 0,
    };

    // Ensure target directory exists
    await SkillDirectoryModel.ensureDirectory(appDir);

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];

      try {
        // Send progress update
        this.sendProgress(mainWindow, {
          currentSkill: skill.name,
          currentIndex: i,
          totalSkills: skills.length,
          percentage: Math.round((i / skills.length) * 100),
          operation: options.deleteOriginals ? 'moving' : 'copying',
          successCount: result.importedCount,
          failedCount: result.failedCount,
        });

        // Import the skill
        const importResult = await this.importLocalSkill(skill, appDir, options);

        if (importResult.skipped) {
          result.skippedCount++;
          logger.debug('Skill skipped', 'ImportService', {
            skillName: skill.name,
            reason: importResult.reason,
          });
        } else {
          result.importedCount++;
          if (importResult.renamedTo) {
            result.renamedSkills.push({
              originalName: skill.name,
              newName: importResult.renamedTo,
            });
          }
          logger.debug('Skill imported', 'ImportService', {
            skillName: skill.name,
            renamedTo: importResult.renamedTo,
          });
        }
      } catch (error) {
        result.failedCount++;
        result.failedSkills.push({
          name: skill.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Failed to import skill', 'ImportService', {
          skillName: skill.name,
          error,
        });
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.failedCount === 0;

    // Send completion progress
    this.sendProgress(mainWindow, {
      currentSkill: '',
      currentIndex: skills.length,
      totalSkills: skills.length,
      percentage: 100,
      operation: 'completed',
      successCount: result.importedCount,
      failedCount: result.failedCount,
    });

    logger.info('Local skill import completed', 'ImportService', {
      importedCount: result.importedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      duration: result.duration,
    });

    return result;
  }

  /**
   * Import a single local skill
   */
  private async importLocalSkill(
    skill: DetectedSkill,
    appDir: string,
    options: ImportOptions
  ): Promise<{ skipped?: boolean; reason?: string; renamedTo?: string }> {
    const skillDirName = path.basename(skill.path);
    let targetPath = path.join(appDir, skillDirName);
    let finalSkillName = skillDirName;

    // Handle conflicts
    if (skill.hasConflict || (await fsExtra.pathExists(targetPath))) {
      switch (options.conflictStrategy) {
        case 'skip':
          return {
            skipped: true,
            reason: `Skill already exists: ${skillDirName}`,
          };

        case 'overwrite':
          await fsExtra.remove(targetPath);
          break;

        case 'rename':
        default:
          finalSkillName = await this.findUniqueSkillName(appDir, skillDirName);
          targetPath = path.join(appDir, finalSkillName);
          break;
      }
    }

    // Copy or move the skill
    if (options.deleteOriginals) {
      await fsExtra.move(skill.path, targetPath);
    } else {
      await fsExtra.copy(skill.path, targetPath);
    }

    return {
      renamedTo: finalSkillName !== skillDirName ? finalSkillName : undefined,
    };
  }

  // ============================================================================
  // URL Import (GitHub/GitLab)
  // ============================================================================

  /**
   * Scan a Git URL for skills
   * @param url - Repository URL (GitHub or GitLab)
   * @param pat - Optional Personal Access Token for private repos
   * @returns Scan result with detected skills
   */
  async scanUrlForSkills(url: string, pat?: string): Promise<UrlScanResult> {
    logger.info('Scanning URL for skills', 'ImportService', { url, hasPat: !!pat });

    // Parse URL to get provider info
    const parsed = this.parseGitUrl(url);
    if (!parsed) {
      return {
        success: false,
        provider: 'github',
        owner: '',
        repo: '',
        skills: [],
        isPrivate: false,
        error: 'Invalid URL format. Please use GitHub or GitLab repository URLs.',
      };
    }

    try {
      const provider = getGitProvider(parsed.provider);

      // Try both main and master branches
      const branches = ['main', 'master'];
      let tree: any[] = [];
      let actualBranch = '';
      let lastError: string | null = null;

      for (const branch of branches) {
        try {
          tree = await provider.getRepoTree(
            parsed.owner,
            parsed.repo,
            pat,
            branch,
            parsed.instanceUrl
          );
          if (tree.length > 0) {
            actualBranch = branch;
            logger.debug('Found repository tree', 'ImportService', { branch, treeLength: tree.length });
            break;
          }
        } catch (branchError) {
          const errorMsg = branchError instanceof Error ? branchError.message : String(branchError);
          lastError = errorMsg;
          logger.debug('Branch not found, trying next', 'ImportService', { branch, error: branchError });
        }
      }

      if (tree.length === 0) {
        return {
          success: false,
          provider: parsed.provider,
          owner: parsed.owner,
          repo: parsed.repo,
          skills: [],
          isPrivate: false,
          error: lastError || 'Could not access repository tree. Please check if the repository exists and is accessible.',
        };
      }

      // Find skill directories (directories containing SKILL.md)
      const skillPaths = this.findSkillDirectories(tree);

      // Get skills with metadata
      // Special case: if SKILL.md is at root (skillPath === ''), use repo name as skill name
      const skills: DetectedSkill[] = await Promise.all(
        skillPaths.map(async (skillPath) => {
          // Use repo name for root-level skills (SKILL.md at repo root)
          const skillName = skillPath === '' ? parsed.repo : path.basename(skillPath);
          return {
            name: skillName,
            path: skillPath,
            source: parsed.provider as 'github' | 'gitlab',
            description: undefined,
            tags: undefined,
            hasConflict: false,
          };
        })
      );

      logger.info('URL scan completed', 'ImportService', {
        url,
        provider: parsed.provider,
        owner: parsed.owner,
        repo: parsed.repo,
        skillCount: skills.length,
      });

      return {
        success: true,
        provider: parsed.provider,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: actualBranch,
        skills,
        isPrivate: false,
        instanceUrl: parsed.instanceUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to scan URL', 'ImportService', { url, error });

      return {
        success: false,
        provider: parsed.provider,
        owner: parsed.owner,
        repo: parsed.repo,
        skills: [],
        isPrivate: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Import skills from a Git URL
   * @param url - Repository URL
   * @param skillPaths - Paths to skill directories to import
   * @param pat - Optional PAT for private repos
   * @param appDir - Application skills directory
   * @param options - Import options
   * @param mainWindow - Electron window for progress updates
   * @returns Import result
   */
  async importSkillsFromUrl(
    url: string,
    skillPaths: string[],
    pat: string | undefined,
    appDir: string,
    options: ImportOptions,
    mainWindow: BrowserWindow | null
  ): Promise<ImportResult> {
    logger.info('Starting URL skill import', 'ImportService', {
      url,
      skillCount: skillPaths.length,
      hasPat: !!pat,
    });

    const startTime = Date.now();
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      renamedSkills: [],
      failedSkills: [],
      duration: 0,
    };

    // Parse URL
    const parsed = this.parseGitUrl(url);
    if (!parsed) {
      result.success = false;
      result.failedCount = skillPaths.length;
      result.failedSkills = skillPaths.map(p => ({
        name: path.basename(p),
        error: 'Invalid URL format',
      }));
      return result;
    }

    // Ensure target directory exists
    await SkillDirectoryModel.ensureDirectory(appDir);

    const provider = getGitProvider(parsed.provider);

    // Detect branch by trying main and master
    const branches = ['main', 'master'];
    let branch = 'main';
    for (const testBranch of branches) {
      try {
        const testTree = await provider.getRepoTree(
          parsed.owner,
          parsed.repo,
          pat,
          testBranch,
          parsed.instanceUrl
        );
        if (testTree.length > 0) {
          branch = testBranch;
          break;
        }
      } catch {
        // Try next branch
      }
    }

    for (let i = 0; i < skillPaths.length; i++) {
      const skillPath = skillPaths[i];
      // Use repo name for root-level skills (SKILL.md at repo root)
      const skillName = skillPath === '' ? parsed.repo : path.basename(skillPath);

      try {
        // Send progress update
        this.sendProgress(mainWindow, {
          currentSkill: skillName,
          currentIndex: i,
          totalSkills: skillPaths.length,
          percentage: Math.round((i / skillPaths.length) * 100),
          operation: 'downloading',
          successCount: result.importedCount,
          failedCount: result.failedCount,
        });

        // Check for conflicts
        let targetDir = path.join(appDir, skillName);
        let finalSkillName = skillName;

        if (await fsExtra.pathExists(targetDir)) {
          switch (options.conflictStrategy) {
            case 'skip':
              result.skippedCount++;
              logger.debug('Skill skipped (exists)', 'ImportService', { skillName });
              continue;

            case 'overwrite':
              await fsExtra.remove(targetDir);
              break;

            case 'rename':
            default:
              finalSkillName = await this.findUniqueSkillName(appDir, skillName);
              targetDir = path.join(appDir, finalSkillName);
              break;
          }
        }

        // Download skill directory
        const files = await (provider as any).downloadPrivateDirectory?.(
          parsed.owner,
          parsed.repo,
          skillPath,
          pat,
          branch,
          parsed.instanceUrl
        );

        // Write downloaded files to target directory
        await fsExtra.ensureDir(targetDir);

        if (files && Array.isArray(files)) {
          for (const file of files) {
            if (file.path && file.content) {
              // For root-level skill (skillPath === ''), keep full path; otherwise strip skillPath prefix
              const relativePath = skillPath === ''
                ? file.path
                : (file.path.startsWith(skillPath + '/')
                  ? file.path.substring(skillPath.length + 1)
                  : file.path);
              const targetFilePath = path.join(targetDir, relativePath);
              await fsExtra.ensureDir(path.dirname(targetFilePath));
              await fsExtra.writeFile(targetFilePath, file.content);
            }
          }
        } else {
          // Fallback: download files individually if downloadPrivateDirectory not available
          const tree = await provider.getRepoTree(
            parsed.owner,
            parsed.repo,
            pat,
            branch,
            parsed.instanceUrl
          );

          const skillFiles = tree.filter((item: any) =>
            // For root-level skill (skillPath === ''), match all files
            skillPath === ''
              ? item.path !== undefined
              : (item.path.startsWith(skillPath + '/') || item.path === skillPath)
          );

          for (const file of skillFiles) {
            if (file.type === 'blob') {
              // For root-level skill (skillPath === ''), keep full path; otherwise strip skillPath prefix
              const relativePath = skillPath === ''
                ? file.path
                : file.path.substring(skillPath.length + 1);
              const targetFilePath = path.join(targetDir, relativePath);
              await fsExtra.ensureDir(path.dirname(targetFilePath));

              const content = await this.downloadFileContent(
                provider,
                parsed.owner,
                parsed.repo,
                file.path,
                pat,
                branch,
                parsed.instanceUrl
              );

              if (content !== null) {
                await fsExtra.writeFile(targetFilePath, content);
              }
            }
          }
        }

        // Write source metadata
        const sourceMetadata = createGitImportSource(
          parsed.provider,
          `${parsed.owner}/${parsed.repo}`,
          skillPath,
          parsed.instanceUrl
        );
        await fsExtra.writeJson(path.join(targetDir, SOURCE_METADATA_FILE), sourceMetadata, { spaces: 2 });

        result.importedCount++;
        if (finalSkillName !== skillName) {
          result.renamedSkills.push({
            originalName: skillName,
            newName: finalSkillName,
          });
        }

        logger.debug('Skill imported from URL', 'ImportService', {
          skillName,
          renamedTo: finalSkillName !== skillName ? finalSkillName : undefined,
        });
      } catch (error) {
        result.failedCount++;
        result.failedSkills.push({
          name: skillName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Failed to import skill from URL', 'ImportService', {
          skillName,
          error,
        });
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.failedCount === 0;

    // Send completion progress
    this.sendProgress(mainWindow, {
      currentSkill: '',
      currentIndex: skillPaths.length,
      totalSkills: skillPaths.length,
      percentage: 100,
      operation: 'completed',
      successCount: result.importedCount,
      failedCount: result.failedCount,
    });

    logger.info('URL skill import completed', 'ImportService', {
      importedCount: result.importedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      duration: result.duration,
    });

    return result;
  }

  /**
   * Download file content from provider
   */
  private async downloadFileContent(
    provider: any,
    owner: string,
    repo: string,
    filePath: string,
    pat: string | undefined,
    branch: string,
    instanceUrl?: string
  ): Promise<Buffer | null> {
    try {
      // Use fetch to get raw file content
      const baseUrl = instanceUrl || (provider.name === 'gitlab' ? 'https://gitlab.com' : 'https://raw.githubusercontent.com');
      const rawUrl = provider.name === 'gitlab'
        ? `${baseUrl}/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${branch}`
        : `${baseUrl}/${owner}/${repo}/${branch}/${filePath}`;

      const headers: Record<string, string> = {};
      if (pat) {
        headers['Authorization'] = provider.name === 'gitlab' ? `Bearer ${pat}` : `token ${pat}`;
      }

      // Get proxy agent if configured
      const agent = getProxyAgent(rawUrl);

      const response = await fetch(rawUrl, { headers, agent });
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error('Failed to download file', 'ImportService', { filePath, error });
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Parse a Git URL to extract provider, owner, and repo
   */
  private parseGitUrl(url: string): {
    provider: 'github' | 'gitlab';
    owner: string;
    repo: string;
    instanceUrl?: string;
  } | null {
    // Try GitHub pattern
    const githubPattern = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
    const githubMatch = url.match(githubPattern);
    if (githubMatch) {
      return {
        provider: 'github',
        owner: githubMatch[1],
        repo: githubMatch[2].replace(/\.git$/, ''),
      };
    }

    // Try GitLab.com pattern
    const gitlabPattern = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/?$/;
    const gitlabMatch = url.match(gitlabPattern);
    if (gitlabMatch) {
      return {
        provider: 'gitlab',
        owner: gitlabMatch[1],
        repo: gitlabMatch[2].replace(/\.git$/, ''),
      };
    }

    // Try self-hosted GitLab pattern
    const selfHostedPattern = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;
    const selfHostedMatch = url.match(selfHostedPattern);
    if (selfHostedMatch && !selfHostedMatch[1].includes('github.com')) {
      return {
        provider: 'gitlab',
        owner: selfHostedMatch[2],
        repo: selfHostedMatch[3].replace(/\.git$/, ''),
        instanceUrl: `https://${selfHostedMatch[1]}`,
      };
    }

    return null;
  }

  /**
   * Find skill directories in a repository tree
   * When a directory is identified as a skill (contains SKILL.md), its subdirectories
   * are not searched for additional skills (prevents nested sub-skills from being listed)
   * Special case: if SKILL.md exists at repo root (path ''), treat as a skill with empty path
   */
  private findSkillDirectories(tree: any[]): string[] {
    const skillFiles = tree.filter((item: any) =>
      item.type === 'blob' && item.path.endsWith('SKILL.md')
    );

    // Build list of skill directories with their paths
    // Deduplicate by path to avoid duplicate entries (e.g., root SKILL.md only added once)
    const seenPaths = new Set<string>();
    const allSkillDirs: Array<{ path: string; depth: number }> = [];
    for (const file of skillFiles) {
      const pathParts = file.path.split('/');
      pathParts.pop(); // Remove 'SKILL.md'
      const dirPath = pathParts.join('/');
      const depth = pathParts.length;

      // Skip if we've already seen this path (prevents duplicates)
      if (seenPaths.has(dirPath)) continue;
      seenPaths.add(dirPath);

      allSkillDirs.push({ path: dirPath, depth });
    }

    // Sort by path length (shorter first) to process parent dirs before children
    allSkillDirs.sort((a, b) => a.depth - b.depth);

    // Filter out nested skills (skills that are subdirectories of other skills)
    const topLevelSkills: string[] = [];
    for (const skillDir of allSkillDirs) {
      // Check if this skill is a subdirectory of any already-added top-level skill
      const isNested = topLevelSkills.some(parentPath =>
        skillDir.path.startsWith(parentPath + '/')
      );

      if (!isNested) {
        topLevelSkills.push(skillDir.path);
      }
    }

    return topLevelSkills;
  }

  /**
   * Find a unique skill name by appending a number suffix
   */
  private async findUniqueSkillName(appDir: string, baseName: string): Promise<string> {
    let counter = 2;
    let newName = `${baseName}-${counter}`;

    while (await fsExtra.pathExists(path.join(appDir, newName))) {
      counter++;
      newName = `${baseName}-${counter}`;
    }

    return newName;
  }

  /**
   * Get application skills directory path
   */
  getApplicationSkillsDirectory(config: Configuration): string {
    if (config.applicationSkillsDirectory) {
      return config.applicationSkillsDirectory;
    }

    const { app } = require('electron');
    const appPath = app.getAppPath();
    return path.join(appPath, '.claude', 'skills');
  }

  /**
   * Send import progress to renderer
   */
  private sendProgress(mainWindow: BrowserWindow | null, progress: ImportProgress): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.IMPORT_PROGRESS, progress);
    }
  }
}
