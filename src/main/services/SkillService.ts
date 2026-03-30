/**
 * Skill Service
 *
 * Handles skill scanning, creation, reading, updating, and deletion
 */

import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import os from 'os';
import trash from 'trash';
import { logger } from '../utils/Logger';
import { PathValidator } from './PathValidator';
import { ConfigService } from './ConfigService';
import { GitHubService } from './GitHubService';
import { decryptPAT } from '../utils/encryption';
import { SkillModel } from '../models/Skill';
import { SkillDirectoryModel } from '../models/SkillDirectory';
import { createLocalSource, isRegistrySkill, isPrivateRepoSkill } from '../models/SkillSource';
import { Configuration, Skill, VersionComparison } from '../../shared/types';
import { SKILL_FILE_NAME, SOURCE_METADATA_FILE } from '../../shared/constants';
import { SymlinkService } from './SymlinkService';
import { app } from 'electron';
import { compareVersions } from '../utils/versionUtils';

export class SkillService {
  private frontmatterCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(
    private pathValidator: PathValidator,
    private symlinkService?: SymlinkService
  ) {}

  /**
   * Get application skills directory path (static version for use without instance)
   * Returns configured application directory or default location
   * @param config - Configuration object
   * @returns Application skills directory path
   */
  static getApplicationSkillsDirectory(config: Configuration): string {
    if (config.applicationSkillsDirectory) {
      return config.applicationSkillsDirectory;
    }

    // In packaged apps, use userData directory (writable location for app data)
    // In development, use the app root directory
    // Default to .claude/skills subdirectory for Claude Code compatibility
    const basePath = app.isPackaged ? app.getPath('userData') : app.getAppPath();
    return path.join(basePath, '.claude', 'skills');
  }

  /**
   * Get application skills directory path (instance method)
   * Returns configured application directory or default location
   * @param config - Configuration object
   * @returns Application skills directory path
   */
  getApplicationSkillsDirectory(config: Configuration): string {
    return SkillService.getApplicationSkillsDirectory(config);
  }

  /**
   * Ensure application skills directory exists
   * Creates directory if it doesn't exist
   * @param config - Configuration object
   */
  async ensureApplicationDirectory(config: Configuration): Promise<void> {
    const appDir = this.getApplicationSkillsDirectory(config);
    await SkillDirectoryModel.ensureDirectory(appDir);
    logger.info('Application skills directory ensured', 'SkillService', { appDir });
  }

  /**
   * List all skills from application directory only
   * Scans the centralized application directory for skill.md files
   * Uses frontmatter caching for improved performance
   * Enriches skills with symlink information from SymlinkService
   * @param config - Configuration object with application directory setting
   * @returns Array of Skill objects from application directory
   * @example
   * const config = await configService.load();
   * const skills = await skillService.listAllSkills(config);
   * console.log(`Found ${skills.length} skills`);
   */
  async listAllSkills(config: Configuration): Promise<Skill[]> {
    logger.info('Listing all skills from application directory', 'SkillService');

    // Get application directory
    const appDir = this.getApplicationSkillsDirectory(config);

    // Scan only application directory
    const skills = await this.scanDirectory(appDir, 'application');

    // Enrich with symlink information if SymlinkService is available
    if (this.symlinkService) {
      try {
        const symlinkDb = await this.symlinkService.loadDatabase(appDir);

        for (const skill of skills) {
          const skillName = path.basename(skill.path);
          skill.symlinkConfig = symlinkDb.symlinks[skillName];
          skill.isSymlinked = skill.symlinkConfig?.enabled ?? false;
        }

        logger.debug('Skills enriched with symlink information', 'SkillService', {
          skillCount: skills.length,
          symlinkedCount: skills.filter(s => s.isSymlinked).length,
        });
      } catch (error) {
        logger.warn('Failed to load symlink database, skipping enrichment', 'SkillService', { error });
      }
    }

    logger.info(`Found ${skills.length} skills`, 'SkillService');
    return skills;
  }

  /**
   * Alias for listAllSkills for backward compatibility
   * Loads configuration internally and calls listAllSkills
   * @returns Array of Skill objects
   * @example
   * const skills = await skillService.listSkills();
   */
  async listSkills(): Promise<Skill[]> {
    const config = await this.getConfig();
    return this.listAllSkills(config);
  }

  /**
   * Scan a directory for skills
   */
  private async scanDirectory(dirPath: string, source: 'project' | 'global' | 'application'): Promise<Skill[]> {
    logger.debug(`Scanning directory: ${dirPath}`, 'SkillService', { source });

    try {
      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        logger.debug(`Directory does not exist: ${dirPath}`, 'SkillService');
        return [];
      }

      // Get skill directories
      const skillDirs = await SkillDirectoryModel.getSkillDirectories(dirPath);
      const skills: Skill[] = [];

      // Parse each skill directory (T127: cached frontmatter)
      for (const skillDir of skillDirs) {
        try {
          const skill = await SkillModel.fromDirectory(skillDir, source, this.frontmatterCache);
          skills.push(skill);
        } catch (error) {
          logger.warn(`Failed to parse skill: ${skillDir}`, 'SkillService', { error });
          // Continue with other skills
        }
      }

      logger.debug(`Found ${skills.length} skills in ${source} directory`, 'SkillService');

      // Clean expired cache entries
      this.cleanExpiredCache();

      return skills;
    } catch (error) {
      logger.error(`Failed to scan ${source} directory`, 'SkillService', { dirPath, error });
      return [];
    }
  }

  /**
   * Clean expired cache entries (T127)
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [path, entry] of this.frontmatterCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.frontmatterCache.delete(path);
      }
    }
  }

  /**
   * Get a single skill's metadata and content
   * @param skillPath - Absolute path to skill directory
   * @returns Object with metadata (Skill) and content (string)
   * @throws Error if path is invalid or skill.md not found
   * @example
   * const { metadata, content } = await skillService.getSkill('/path/to/skill');
   * console.log('Skill:', metadata.name);
   * console.log('Content length:', content.length);
   */
  async getSkill(skillPath: string): Promise<{ metadata: Skill; content: string }> {
    logger.debug(`Getting skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Determine source
    const source = this.pathValidator.getSkillSource(validatedPath);

    // Get skill metadata (with cache)
    const metadata = await SkillModel.fromDirectory(validatedPath, source, this.frontmatterCache);

    // Enrich with symlink information
    if (this.symlinkService) {
      try {
        const config = await this.getConfig();
        const appDir = this.getApplicationSkillsDirectory(config);
        const symlinkDb = await this.symlinkService.loadDatabase(appDir);
        const skillName = path.basename(validatedPath);
        metadata.symlinkConfig = symlinkDb.symlinks[skillName];
        metadata.isSymlinked = metadata.symlinkConfig?.enabled ?? false;
      } catch (error) {
        logger.warn('Failed to load symlink info for skill', 'SkillService', { error });
      }
    }

    // Read skill content
    const skillFile = path.join(validatedPath, SKILL_FILE_NAME);
    const content = await fs.promises.readFile(skillFile, 'utf-8');

    logger.debug(`Skill loaded: ${metadata.name}`, 'SkillService');
    return { metadata, content };
  }

  /**
   * Create a new skill with template content
   * Always creates in application directory (centralized storage)
   * Generates kebab-case directory name and creates skill.md file
   * @param name - Skill name (will be converted to kebab-case for directory)
   * @param directory - Ignored (always creates in application directory)
   * @returns Created Skill object with metadata
   * @throws Error if skill already exists or path validation fails
   * @example
   * const skill = await skillService.createSkill('Code Review', 'project');
   * console.log('Created:', skill.name, 'at', skill.path);
   */
  async createSkill(name: string, _directory?: 'project' | 'global' | 'application'): Promise<Skill> {
    logger.info(`Creating skill: ${name}`, 'SkillService');

    // Get application directory (always use application directory)
    const config = await this.getConfig();
    const targetBase = this.getApplicationSkillsDirectory(config);

    logger.debug(`Creating skill in application directory`, 'SkillService', {
      targetBase,
    });

    // Generate kebab-case directory name
    const kebabName = this.toKebabCase(name);
    const skillDir = path.join(targetBase, kebabName);

    // Validate path
    this.pathValidator.validate(skillDir);

    // Check if skill already exists
    if (fs.existsSync(skillDir)) {
      throw new Error(`Skill already exists: ${name} at ${skillDir}`);
    }

    // Create directory
    await fs.promises.mkdir(skillDir, { recursive: true });

    // Create skill.md with template
    const skillFile = path.join(skillDir, SKILL_FILE_NAME);
    const template = SkillModel.generateTemplate(name);
    await fs.promises.writeFile(skillFile, template, 'utf-8');

    // Create source metadata for local skill
    const sourceMetadata = createLocalSource();
    const metadataPath = path.join(skillDir, SOURCE_METADATA_FILE);
    await fs.promises.writeFile(metadataPath, JSON.stringify(sourceMetadata, null, 2), 'utf-8');

    // Parse and return created skill (with cache)
    const skill = await SkillModel.fromDirectory(skillDir, 'application', this.frontmatterCache);

    logger.info(`Skill created: ${name}`, 'SkillService', { path: skillDir });
    return skill;
  }

  /**
   * Update a skill's content with optional concurrent modification check
   * Validates path, checks for external modifications, and invalidates cache
   * @param skillPath - Absolute path to skill directory
   * @param content - New skill.md content (including frontmatter)
   * @param expectedLastModified - Optional timestamp for concurrent modification check
   * @returns Updated Skill object with new metadata
   * @throws Error with code EXTERNAL_MODIFICATION if file was modified externally
   * @example
   * try {
   *   const updated = await skillService.updateSkill(
   *     '/path/to/skill',
   *     newContent,
   *     existingSkill.lastModified
   *   );
   * } catch (error) {
   *   if (error.code === 'EXTERNAL_MODIFICATION') {
   *     // Handle concurrent modification
   *   }
   * }
   */
  async updateSkill(skillPath: string, content: string, expectedLastModified?: number): Promise<Skill> {
    logger.debug(`Updating skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Check for concurrent modifications
    const skillFile = path.join(validatedPath, SKILL_FILE_NAME);
    if (expectedLastModified) {
      const stats = await fs.promises.stat(skillFile);
      const actualLastModified = stats.mtimeMs;

      logger.debug('Timestamp comparison for concurrent modification check', 'SkillService', {
        expectedLastModified,
        actualLastModified,
        difference: actualLastModified - expectedLastModified,
        skillFile
      });

      // Allow 100ms tolerance for filesystem timestamp precision issues
      // This prevents false positives from minor filesystem variations
      const TOLERANCE_MS = 100;
      if (actualLastModified > expectedLastModified + TOLERANCE_MS) {
        const error = new Error('File has been modified externally');
        (error as any).code = 'EXTERNAL_MODIFICATION';
        throw error;
      }
    }

    // Write content
    await fs.promises.writeFile(skillFile, content, 'utf-8');

    // Invalidate cache for this skill (T127)
    this.frontmatterCache.delete(skillFile);

    // Parse and return updated skill
    const source = this.pathValidator.getSkillSource(validatedPath);
    const skill = await SkillModel.fromDirectory(validatedPath, source, this.frontmatterCache);

    logger.debug(`Skill updated: ${skill.name}`, 'SkillService');
    return skill;
  }

  /**
   * Copy a skill to a new directory with a new name
   * Copies all files and updates SKILL.md frontmatter with new name
   * @param sourcePath - Absolute path to source skill directory
   * @param newName - New name for the copied skill (will be converted to kebab-case for directory)
   * @returns Created Skill object with metadata
   * @throws Error if source skill doesn't exist, target already exists, or name is invalid
   * @example
   * const skill = await skillService.copySkill('/path/to/skill', 'my-skill-copy');
   * console.log('Copied to:', skill.path);
   */
  async copySkill(sourcePath: string, newName: string): Promise<Skill> {
    logger.info(`Copying skill: ${sourcePath} to ${newName}`, 'SkillService');

    // Validate source path
    const validatedSourcePath = this.pathValidator.validate(sourcePath);

    // Validate new name - must be valid folder name (kebab-case, no Chinese)
    const kebabName = this.validateAndConvertToKebabCase(newName);

    // Get application directory for target
    const config = await this.getConfig();
    const targetBase = this.getApplicationSkillsDirectory(config);
    const targetPath = path.join(targetBase, kebabName);

    // Validate target path
    this.pathValidator.validate(targetPath);

    // Check if source exists
    if (!fs.existsSync(validatedSourcePath)) {
      throw new Error(`Source skill not found: ${sourcePath}`);
    }

    // Check if target already exists
    if (fs.existsSync(targetPath)) {
      throw new Error(`Skill already exists: ${newName} at ${targetPath}`);
    }

    // Get source skill content
    const sourceSkillFile = path.join(validatedSourcePath, SKILL_FILE_NAME);
    let skillContent = await fs.promises.readFile(sourceSkillFile, 'utf-8');

    // Update the name in frontmatter
    skillContent = this.updateFrontmatterName(skillContent, newName);

    // Copy all files from source to target
    await fsExtra.copy(validatedSourcePath, targetPath, {
      overwrite: false,
      errorOnExist: true,
    });

    // Update SKILL.md with new name in the copied skill
    const targetSkillFile = path.join(targetPath, SKILL_FILE_NAME);
    await fs.promises.writeFile(targetSkillFile, skillContent, 'utf-8');

    // Create new source metadata for local skill (remove remote source info)
    const sourceMetadata = createLocalSource();
    const metadataPath = path.join(targetPath, SOURCE_METADATA_FILE);
    await fs.promises.writeFile(metadataPath, JSON.stringify(sourceMetadata, null, 2), 'utf-8');

    // Parse and return copied skill (with cache)
    const skill = await SkillModel.fromDirectory(targetPath, 'application', this.frontmatterCache);

    logger.info(`Skill copied: ${newName}`, 'SkillService', { sourcePath, targetPath });
    return skill;
  }

  /**
   * Validate name and convert to kebab-case
   * Ensures name is valid for folder naming (no Chinese characters)
   * @param name - The name to validate and convert
   * @returns kebab-case version of the name
   * @throws Error if name contains Chinese characters or is invalid
   */
  private validateAndConvertToKebabCase(name: string): string {
    // Check for Chinese characters
    if (/[\u4e00-\u9fa5]/.test(name)) {
      throw new Error('Skill name cannot contain Chinese characters. Please use English letters, numbers, hyphens, and underscores only.');
    }

    // Convert to kebab-case
    const kebabName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!kebabName || kebabName.length === 0) {
      throw new Error('Invalid skill name. Name must contain at least one letter or number.');
    }

    return kebabName;
  }

  /**
   * Update the name field in SKILL.md frontmatter
   * @param content - The SKILL.md content
   * @param newName - The new name to set
   * @returns Updated content with new name
   */
  private updateFrontmatterName(content: string, newName: string): string {
    // Check if content starts with frontmatter
    if (!content.startsWith('---')) {
      // No frontmatter, prepend one with just the name
      return `---
name: ${newName}
---

${content}`;
    }

    // Update name in existing frontmatter
    // Match the name field in frontmatter and replace it
    return content.replace(
      /^(---\n(?:.*\n)*?)name:\s*[^\n]+(\n(?:.*\n)*?---)/,
      `$1name: ${newName}$2`
    );
  }

  /**
   * Delete a skill by moving to system recycle bin
   * Falls back to direct deletion if recycle bin fails (common on Windows with file watchers)
   * @param skillPath - Absolute path to skill directory
   * @throws Error if path validation fails or deletion fails
   * @example
   * await skillService.deleteSkill('/path/to/skill');
   * console.log('Skill deleted successfully');
   */
  async deleteSkill(skillPath: string): Promise<void> {
    logger.info(`Deleting skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    try {
      // First try to move to recycle bin
      await trash(validatedPath);
      logger.info(`Skill moved to recycle bin: ${skillPath}`, 'SkillService');
    } catch (trashError) {
      logger.warn(`Failed to move skill to recycle bin, trying direct deletion: ${skillPath}`, 'SkillService', { error: trashError });

      try {
        // Fallback: directly delete the directory
        await fs.promises.rm(validatedPath, { recursive: true, force: true });
        logger.info(`Skill deleted directly (not in recycle bin): ${skillPath}`, 'SkillService');
      } catch (rmError) {
        logger.error(`Failed to delete skill: ${skillPath}`, 'SkillService', { error: rmError });
        throw new Error(`Failed to delete skill: ${rmError instanceof Error ? rmError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Open skill folder in system file explorer
   * Uses Electron shell to open the directory in the default file manager
   * @param skillPath - Absolute path to skill directory
   * @throws Error if path validation fails or path doesn't exist
   * @example
   * await skillService.openFolder('/path/to/skill');
   */
  async openFolder(skillPath: string): Promise<void> {
    const { shell } = require('electron');
    const validatedPath = this.pathValidator.validate(skillPath);

    // Check if path exists before trying to open
    if (!fs.existsSync(validatedPath)) {
      throw new Error(`Folder does not exist: ${validatedPath}`);
    }

    await shell.openPath(validatedPath);
    logger.debug(`Opened folder: ${validatedPath}`, 'SkillService');
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Check for updates to skills installed from private repositories and registry
   * Compares local versions with remote versions to determine update/upload status
   * @param skills - Array of skills to check for updates
   * @returns Map of skill paths to version comparison result
   * @example
   * const skills = await skillService.listAllSkills(config);
   * const updates = await skillService.checkForUpdates(skills);
   * updates.forEach((status, path) => {
   *   if (status.hasUpdate) {
   *     console.log('Update available for:', path);
   *   }
   *   if (status.canUpload) {
   *     console.log('Can upload to remote:', path);
   *   }
   * });
   */
  async checkForUpdates(
    skills: Skill[]
  ): Promise<Map<string, VersionComparison>> {
    const updateMap = new Map<string, VersionComparison>();

    for (const skill of skills) {
      try {
        // Check if skill has source metadata
        if (!skill.sourceMetadata) {
          continue;
        }

        // Handle different source types
        if (isRegistrySkill(skill.sourceMetadata)) {
          // Check registry skill for updates
          const result = await this.checkRegistrySkillForUpdates(skill, skill.sourceMetadata);
          if (result) {
            updateMap.set(skill.path, result);
          }
        } else if (isPrivateRepoSkill(skill.sourceMetadata)) {
          // Check private repo skill for updates (also checks for upload)
          const result = await this.checkPrivateRepoSkillForUpdates(skill, skill.sourceMetadata);
          if (result) {
            updateMap.set(skill.path, result);
          }
        }
        // Local skills don't have updates
      } catch (error) {
        logger.error(`Failed to check updates for skill: ${skill.name}`, 'SkillService', error);
      }
    }

    return updateMap;
  }

  /**
   * Check for updates to a registry-installed skill
   * Compares local version with remote version and commit SHA
   * If commitHash is missing, fetches and saves it for future checks
   */
  private async checkRegistrySkillForUpdates(
    skill: Skill,
    sourceMetadata: import('../models/SkillSource').RegistrySource
  ): Promise<VersionComparison | null> {
    try {
      // Get latest commit SHA from remote repository using GitHub API
      const [owner, repo] = sourceMetadata.source.split('/');

      // Use GitHub API to get the latest commit for the skill directory
      // Note: This requires the repository to be public (which registry skills are)
      const commits = await GitHubService.getDirectoryCommits(
        owner,
        repo,
        '', // No PAT needed for public repos
        sourceMetadata.skillId,
        'main' // Default branch for registry skills
      );

      if (!commits || commits.length === 0) {
        logger.warn('Failed to get latest commit SHA for registry skill', 'SkillService', {
          skill: skill.name,
          source: sourceMetadata.source
        });
        return null;
      }

      const latestCommitSHA = commits[0].sha;

      // If no commit hash stored, save the current commit hash for future checks
      if (!sourceMetadata.commitHash) {
        logger.info('No commit hash stored for registry skill, saving current commit hash for future update checks', 'SkillService', {
          skillPath: skill.path,
          commitHash: latestCommitSHA
        });

        // Update the source metadata file
        const metadataPath = path.join(skill.path, SOURCE_METADATA_FILE);
        const updatedMetadata = {
          ...sourceMetadata,
          commitHash: latestCommitSHA,
          installedAt: sourceMetadata.installedAt || new Date().toISOString()
        };

        try {
          await fs.promises.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');
          logger.debug('Updated source metadata with commit hash', 'SkillService', {
            skillPath: skill.path,
            commitHash: latestCommitSHA
          });
        } catch (writeError) {
          logger.warn('Failed to save commit hash to source metadata', 'SkillService', {
            skillPath: skill.path,
            error: writeError instanceof Error ? writeError.message : 'Unknown error'
          });
        }

        // Since this is the first check with no prior commit hash,
        // assume no update is available (the skill was just installed or this is the first check)
        return {
          hasUpdate: false,
          canUpload: false,
          localVersion: skill.version,
          remoteSHA: latestCommitSHA,
        };
      }

      const commitChanged = latestCommitSHA !== sourceMetadata.commitHash;

      // Default to commit-based detection if version comparison is not possible
      let hasUpdate = commitChanged;
      let remoteVersion: string | undefined;

      // Try to fetch remote version for comparison
      if (commitChanged && skill.version) {
        try {
          const remoteContent = await GitHubService.getPrivateRepoSkillContent(
            owner,
            repo,
            `${sourceMetadata.skillId}/${SKILL_FILE_NAME}`,
            '', // No PAT needed for public repos
            'main'
          );

          // Extract version from remote content's frontmatter
          const versionMatch = remoteContent.match(/^version:\s*["']?([^"'\n]+)["']?\s*$/m);
          if (versionMatch) {
            remoteVersion = versionMatch[1].trim();

            // Compare versions: only show update if remote version is newer
            const versionComparison = compareVersions(skill.version, remoteVersion);
            hasUpdate = versionComparison < 0; // Remote is newer

            logger.debug('Registry skill version comparison', 'SkillService', {
              skill: skill.name,
              localVersion: skill.version,
              remoteVersion,
              hasUpdate,
            });
          }
        } catch (versionError) {
          // Fall back to commit-based detection if version fetch fails
          logger.debug('Failed to fetch remote version, using commit-based detection', 'SkillService', {
            skill: skill.name,
            error: versionError instanceof Error ? versionError.message : versionError,
          });
        }
      }

      // Extract new commits (commits after the local commit SHA)
      let newCommits: import('../../shared/types').CommitInfo[] = [];
      let commitsAhead = 0;

      if (hasUpdate && commits.length > 0) {
        // Find the index of the local commit in the commits array
        const localCommitIndex = commits.findIndex((c: any) => c.sha === sourceMetadata.commitHash);

        if (localCommitIndex > 0) {
          // Get all commits before the local commit (these are newer)
          commitsAhead = localCommitIndex;
          newCommits = commits.slice(0, localCommitIndex).map((c: any) => ({
            sha: c.sha,
            shortSha: c.sha.substring(0, 7),
            message: c.commit?.message?.split('\n')[0] || 'No message',
            author: c.commit?.author?.name || 'Unknown',
            date: c.commit?.author?.date || '',
          }));
        } else if (localCommitIndex === -1) {
          // Local commit not found in recent commits, show all fetched commits
          commitsAhead = commits.length;
          newCommits = commits.map((c: any) => ({
            sha: c.sha,
            shortSha: c.sha.substring(0, 7),
            message: c.commit?.message?.split('\n')[0] || 'No message',
            author: c.commit?.author?.name || 'Unknown',
            date: c.commit?.author?.date || '',
          }));
        }
      }

      if (hasUpdate) {
        logger.info(`Update available for registry skill: ${skill.name}`, 'SkillService', {
          skillPath: skill.path,
          localVersion: skill.version,
          remoteVersion,
          localSHA: sourceMetadata.commitHash,
          remoteSHA: latestCommitSHA,
          commitsAhead,
        });
      }

      return {
        hasUpdate,
        canUpload: false, // Registry skills don't support upload
        localVersion: skill.version,
        remoteVersion,
        remoteSHA: latestCommitSHA,
        commitsAhead,
        commits: newCommits,
      };
    } catch (error) {
      logger.error(`Failed to check registry skill updates: ${skill.name}`, 'SkillService', error);
      return null;
    }
  }

  /**
   * Check for updates to a private repo-installed skill
   * Compares local version with remote version to determine update/upload status
   * If commitHash is missing, fetches and saves it for future checks
   */
  private async checkPrivateRepoSkillForUpdates(
    skill: Skill,
    sourceMetadata: import('../models/SkillSource').PrivateRepoSource
  ): Promise<VersionComparison | null> {
    try {
      const configService = await this.getConfigService();
      const repo = await configService.getPrivateRepo(sourceMetadata.repoId);

      if (!repo) {
        logger.warn(`Repository not found for skill: ${skill.name}`, 'SkillService', {
          repoId: sourceMetadata.repoId
        });
        return null;
      }

      // Decrypt PAT
      const pat = decryptPAT(repo.patEncrypted);

      // Get latest commit SHA for the directory
      const owner = repo.owner;
      const repoName = repo.repo;
      const branch = repo.defaultBranch || 'main';

      const commits = await GitHubService.getDirectoryCommits(
        owner,
        repoName,
        pat,
        sourceMetadata.skillPath,
        branch
      );

      if (!commits || commits.length === 0) {
        logger.warn(`Failed to get commits for skill: ${skill.name}`, 'SkillService', {
          skillPath: skill.path
        });
        return null;
      }

      const latestCommitSHA = commits[0].sha;

      // If no commit hash stored, save the current commit hash for future checks
      if (!sourceMetadata.commitHash) {
        logger.info('No commit hash stored, saving current commit hash for future update checks', 'SkillService', {
          skillPath: skill.path,
          commitHash: latestCommitSHA
        });

        // Update the source metadata file
        const metadataPath = path.join(skill.path, SOURCE_METADATA_FILE);
        const updatedMetadata = {
          ...sourceMetadata,
          commitHash: latestCommitSHA,
          installedAt: sourceMetadata.installedAt || new Date().toISOString()
        };

        try {
          await fs.promises.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');
          logger.debug('Updated source metadata with commit hash', 'SkillService', {
            skillPath: skill.path,
            commitHash: latestCommitSHA
          });
        } catch (writeError) {
          logger.warn('Failed to save commit hash to source metadata', 'SkillService', {
            skillPath: skill.path,
            error: writeError instanceof Error ? writeError.message : 'Unknown error'
          });
        }

        // Since this is the first check with no prior commit hash,
        // assume no update is available (the skill was just installed or this is the first check)
        return {
          hasUpdate: false,
          canUpload: false,
          localVersion: skill.version,
          remoteSHA: latestCommitSHA,
        };
      }

      const commitChanged = latestCommitSHA !== sourceMetadata.commitHash;

        // Default to commit-based detection
        let hasUpdate = commitChanged;
        let canUpload = false;
        let remoteVersion: string | undefined;

        // Try to fetch remote version for comparison
        if (skill.version) {
          try {
            const remoteContent = await GitHubService.getPrivateRepoSkillContent(
              owner,
              repoName,
              `${sourceMetadata.skillPath}/${SKILL_FILE_NAME}`,
              pat,
              branch
            );

            // Extract version from remote content's frontmatter
            const versionMatch = remoteContent.match(/^version:\s*["']?([^"'\n]+)["']?\s*$/m);
            if (versionMatch) {
              remoteVersion = versionMatch[1].trim();

              // Compare versions
              const versionComparison = compareVersions(skill.version, remoteVersion);

              if (versionComparison < 0) {
                // Local < Remote: show update
                hasUpdate = true;
                canUpload = false;
              } else if (versionComparison > 0) {
                // Local > Remote: show upload
                hasUpdate = false;
                canUpload = true;
              } else {
                // Versions equal: use commit-based detection
                hasUpdate = commitChanged;
                canUpload = false;
              }

              logger.debug('Private repo skill version comparison', 'SkillService', {
                skill: skill.name,
                localVersion: skill.version,
                remoteVersion,
                versionComparison,
                hasUpdate,
                canUpload,
              });
            }
          } catch (versionError) {
            // Fall back to commit-based detection if version fetch fails
            logger.debug('Failed to fetch remote version, using commit-based detection', 'SkillService', {
              skill: skill.name,
              error: versionError instanceof Error ? versionError.message : versionError,
            });
          }
        } else if (commitChanged) {
          // No local version, use commit-based detection
          hasUpdate = true;
        }

        if (hasUpdate) {
          logger.info(`Update available for private repo skill: ${skill.name}`, 'SkillService', {
            skillPath: skill.path,
            localVersion: skill.version,
            remoteVersion,
            localSHA: sourceMetadata.commitHash,
            remoteSHA: latestCommitSHA,
          });
        }

        if (canUpload) {
          logger.info(`Local version newer for private repo skill: ${skill.name}`, 'SkillService', {
            skillPath: skill.path,
            localVersion: skill.version,
            remoteVersion,
          });
        }

        // Extract new commits (commits after the local commit SHA)
        let newCommits: import('../../shared/types').CommitInfo[] = [];
        let commitsAhead = 0;

        if (hasUpdate && commits.length > 0) {
          // Find the index of the local commit in the commits array
          const localCommitIndex = commits.findIndex((c: any) => c.sha === sourceMetadata.commitHash);

          if (localCommitIndex > 0) {
            // Get all commits before the local commit (these are newer)
            commitsAhead = localCommitIndex;
            newCommits = commits.slice(0, localCommitIndex).map((c: any) => ({
              sha: c.sha,
              shortSha: c.sha.substring(0, 7),
              message: c.commit?.message?.split('\n')[0] || 'No message',
              author: c.commit?.author?.name || 'Unknown',
              date: c.commit?.author?.date || '',
            }));
          } else if (localCommitIndex === -1) {
            // Local commit not found in recent commits, show all fetched commits
            commitsAhead = commits.length;
            newCommits = commits.map((c: any) => ({
              sha: c.sha,
              shortSha: c.sha.substring(0, 7),
              message: c.commit?.message?.split('\n')[0] || 'No message',
              author: c.commit?.author?.name || 'Unknown',
              date: c.commit?.author?.date || '',
            }));
          }
        }

        return {
          hasUpdate,
          canUpload,
          localVersion: skill.version,
          remoteVersion,
          remoteSHA: latestCommitSHA,
          commitsAhead,
          commits: newCommits,
        };
    } catch (error) {
      logger.error(`Failed to check private repo skill updates: ${skill.name}`, 'SkillService', error);
      return null;
    }
  }

  /**
   * Update a skill from its source private repository
   * Downloads latest version with optional backup of existing version
   * @param skillPath - Absolute path to installed skill
   * @param createBackup - Whether to create backup before updating (default: true)
   * @returns Object with success status, new path if successful, or error message
   * @throws Error if skill was not installed from private repo or update fails
   * @example
   * const result = await skillService.updatePrivateSkill('/path/to/skill', true);
   * if (result.success) {
   *   console.log('Updated to:', result.newPath);
   * } else {
   *   console.error('Update failed:', result.error);
   * }
   */
  async updatePrivateSkill(
    skillPath: string,
    createBackup: boolean = true
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    logger.info('Updating skill from private repository', 'SkillService', {
      skillPath,
      createBackup,
    });

    // SAFETY: Always create a temporary backup for atomicity
    // This ensures we can restore if anything goes wrong
    const tempBackupPath = `${skillPath}-temp-backup-${Date.now()}`;
    let permanentBackupPath: string | null = null;

    try {
      // Get current skill metadata
      const skill = await this.getSkill(skillPath);

      // Check if skill has source metadata
      if (!skill.metadata.sourceMetadata || skill.metadata.sourceMetadata.type !== 'private-repo') {
        throw new Error('Skill was not installed from a private repository');
      }

      const sourceMetadata = skill.metadata.sourceMetadata;
      const repoId = sourceMetadata.repoId;

      // Get repository configuration
      const configService = await this.getConfigService();
      const repo = await configService.getPrivateRepo(repoId);

      if (!repo) {
        throw new Error('Source repository not found');
      }

      // Decrypt PAT
      const pat = decryptPAT(repo.patEncrypted);

      // STEP 1: Always create temporary backup (for atomicity/safety)
      logger.info('Creating temporary backup for atomicity', 'SkillService', {
        tempBackupPath,
      });
      await fs.promises.mkdir(tempBackupPath, { recursive: true });
      await fs.promises.cp(skillPath, tempBackupPath, { recursive: true });

      // STEP 2: Create permanent backup if requested (separate from temp backup)
      if (createBackup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        permanentBackupPath = `${skillPath}-backup-${timestamp}`;

        await fs.promises.mkdir(permanentBackupPath, { recursive: true });
        await fs.promises.cp(skillPath, permanentBackupPath, { recursive: true });

        logger.info('Created permanent backup before update', 'SkillService', {
          originalPath: skillPath,
          permanentBackupPath,
        });
      }

      // STEP 3: Remove existing skill directory
      await fs.promises.rm(skillPath, { recursive: true });

      // STEP 4: Re-download and install latest version
      const result = await this.installPrivateSkill(
        repo.owner,
        repo.repo,
        sourceMetadata.skillPath,
        pat,
        'project', // Keep in same directory
        repo.id,
        '', // directoryCommitSHA - will be fetched during install
        'overwrite', // Already removed, so no conflict
        repo.defaultBranch || 'main'
      );

      if (result.success) {
        // STEP 5a: Success - clean up temporary backup, keep permanent backup
        logger.info('Skill updated successfully, cleaning up temporary backup', 'SkillService', {
          skillPath,
          newPath: result.newPath,
        });

        try {
          await fs.promises.rm(tempBackupPath, { recursive: true });
          logger.info('Temporary backup cleaned up', 'SkillService', { tempBackupPath });
        } catch (cleanupError) {
          // Non-critical: log but don't fail
          logger.warn('Failed to clean up temporary backup', 'SkillService', {
            tempBackupPath,
            error: cleanupError,
          });
        }

        return result;
      } else {
        // STEP 5b: Download failed - restore from temporary backup
        logger.warn('Update failed, restoring from temporary backup', 'SkillService', {
          skillPath,
          tempBackupPath,
          error: result.error,
        });

        try {
          await fs.promises.mkdir(skillPath, { recursive: true });
          await fs.promises.cp(tempBackupPath, skillPath, { recursive: true });
          logger.info('Successfully restored skill from temporary backup', 'SkillService', {
            skillPath,
            tempBackupPath,
          });
        } catch (restoreError) {
          logger.error('CRITICAL: Failed to restore from temporary backup', 'SkillService', {
            tempBackupPath,
            restoreError,
          });
          return {
            success: false,
            error: `Update failed: ${result.error}. CRITICAL: Restoration also failed: ${restoreError instanceof Error ? restoreError.message : 'Unknown error'}. Temporary backup may still exist at: ${tempBackupPath}`,
          };
        } finally {
          // Clean up temporary backup after restore attempt
          try {
            await fs.promises.rm(tempBackupPath, { recursive: true });
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        return {
          success: false,
          error: result.error || 'Update failed (skill restored from backup)',
        };
      }
    } catch (error) {
      logger.error('Failed to update skill', 'SkillService', error);

      // ATOMICITY: Always attempt to restore from temporary backup on any error
      try {
        // Check if temp backup exists
        await fs.promises.access(tempBackupPath);

        logger.info('Attempting to restore from temporary backup after error', 'SkillService', {
          skillPath,
          tempBackupPath,
        });

        // Check if skill directory still exists (might have been deleted)
        try {
          await fs.promises.access(skillPath);
          // Directory exists, might be partially deleted - remove it first
          await fs.promises.rm(skillPath, { recursive: true });
        } catch {
          // Directory doesn't exist, that's fine
        }

        // Restore from backup
        await fs.promises.mkdir(skillPath, { recursive: true });
        await fs.promises.cp(tempBackupPath, skillPath, { recursive: true });
        logger.info('Successfully restored skill from temporary backup after error', 'SkillService');
      } catch (restoreError) {
        logger.error('CRITICAL: Failed to restore from temporary backup after error', 'SkillService', {
          tempBackupPath,
          restoreError,
        });
        // Return error with info about temp backup location
        return {
          success: false,
          error: `${error instanceof Error ? error.message : 'Unknown error'}. CRITICAL: Restoration failed. Temporary backup may still exist at: ${tempBackupPath}`,
        };
      } finally {
        // Clean up temporary backup
        try {
          await fs.promises.rm(tempBackupPath, { recursive: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error (skill restored from backup)',
      };
    }
  }

  /**
   * Install a skill from a private repository
   * Downloads skill files, preserves structure, and adds source metadata
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param skillPath - Path to skill directory in repository
   * @param pat - Personal Access Token with repo access
   * @param targetDirectory - 'project' or 'global' directory
   * @param sourceRepoId - ID of source repository for tracking updates
   * @param directoryCommitSHA - Commit SHA for update checking
   * @param conflictResolution - Strategy: 'overwrite', 'rename', or 'skip'
   * @param branch - Repository branch (default: 'main')
   * @returns Object with success status, new path if successful, or error message
   * @example
   * const result = await skillService.installPrivateSkill(
   *   'user', 'repo', 'skills/my-skill', pat,
   *   'project', 'repo-123', 'abc123', 'rename'
   * );
   */
  async installPrivateSkill(
    owner: string,
    repo: string,
    skillPath: string,
    pat: string,
    targetDirectory: 'project' | 'global',
    sourceRepoId: string,
    directoryCommitSHA: string,
    conflictResolution?: 'overwrite' | 'rename' | 'skip',
    branch: string = 'main'
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    logger.info('Installing skill from private repository', 'SkillService', {
      owner,
      repo,
      skillPath,
      targetDirectory,
      sourceRepoId,
    });

    try {
      // Get target directory
      const config = await this.getConfig();
      const baseDir =
        targetDirectory === 'project'
          ? (config.projectDirectories[0] || path.join(os.homedir(), '.skillsMN', 'skills'))
          : path.join(os.homedir(), '.skillsMN', 'skills');

      if (!baseDir) {
        throw new Error(`Target directory not configured for ${targetDirectory}`);
      }

      // Extract skill name from path
      const skillName = path.basename(skillPath);
      const kebabName = this.toKebabCase(skillName);
      const targetPath = path.join(baseDir, kebabName);

      // Check for conflicts
      if (await fsExtra.pathExists(targetPath)) {
        if (conflictResolution === 'skip') {
          return { success: false, error: 'Skill already exists and conflict resolution is skip' };
        } else if (conflictResolution === 'rename') {
          // Generate unique name
          let counter = 1;
          let newPath = `${targetPath}-${counter}`;
          while (await fsExtra.pathExists(newPath)) {
            counter++;
            newPath = `${targetPath}-${counter}`;
          }
          return await this.downloadAndInstallPrivateSkill(
            owner,
            repo,
            skillPath,
            pat,
            newPath,
            sourceRepoId,
            directoryCommitSHA,
            branch
          );
        } else if (conflictResolution === 'overwrite') {
          // Remove existing directory
          await fs.promises.rm(targetPath, { recursive: true });
        } else {
          // No resolution specified - return conflict error
          return {
            success: false,
            error: 'CONFLICT',
          };
        }
      }

      // Download and install
      return await this.downloadAndInstallPrivateSkill(
        owner,
        repo,
        skillPath,
        pat,
        targetPath,
        sourceRepoId,
        directoryCommitSHA,
        branch
      );
    } catch (error) {
      logger.error('Failed to install skill from private repository', 'SkillService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download and install skill from private repository
   */
  private async downloadAndInstallPrivateSkill(
    owner: string,
    repo: string,
    skillPath: string,
    pat: string,
    targetPath: string,
    sourceRepoId: string,
    directoryCommitSHA: string,
    branch: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // Download directory files from GitHub
      const files = await GitHubService.downloadPrivateDirectory(owner, repo, skillPath, pat, branch);

      // Create target directory
      await fs.promises.mkdir(targetPath, { recursive: true });

      // Write all files preserving directory structure
      for (const [filePath, content] of files.entries()) {
        const relativePath = path.relative(skillPath, filePath);
        const fullPath = path.join(targetPath, relativePath);
        const fullDir = path.dirname(fullPath);

        // Ensure directory exists
        await fs.promises.mkdir(fullDir, { recursive: true });

        // Write file
        await fs.promises.writeFile(fullPath, content, 'utf-8');
      }

      // Create or update skill.md with metadata
      const skillFile = path.join(targetPath, SKILL_FILE_NAME);
      let skillContent = '';

      // If skill.md already exists in downloaded files, use it
      if (files.has(path.join(skillPath, SKILL_FILE_NAME))) {
        skillContent = files.get(path.join(skillPath, SKILL_FILE_NAME)) || '';
      }

      // Add source metadata as frontmatter
      const frontmatter = `---
source: private
sourceRepoId: ${sourceRepoId}
sourceRepoPath: ${skillPath}
installedDirectoryCommitSHA: ${directoryCommitSHA}
installedAt: ${new Date().toISOString()}
---
`;

      // Prepend frontmatter to skill content
      const fullContent = frontmatter + skillContent;
      await fs.promises.writeFile(skillFile, fullContent, 'utf-8');

      logger.info('Skill installed successfully from private repository', 'SkillService', {
        targetPath,
        sourceRepoId,
        fileCount: files.size,
      });

      return {
        success: true,
        newPath: targetPath,
      };
    } catch (error) {
      logger.error('Failed to download and install skill from private repository', 'SkillService', error);

      // Clean up partial installation
      try {
        if (await fsExtra.pathExists(targetPath)) {
          await fsExtra.remove(targetPath);
        }
      } catch (cleanupError) {
        logger.warn('Failed to clean up partial installation', 'SkillService', cleanupError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get ConfigService instance
   */
  private async getConfigService(): Promise<ConfigService> {
    // ConfigService should be injected or available globally
    // For now, we'll create a new instance
    // In a real implementation, this should be passed in the constructor
    const configService = new ConfigService();
    return configService;
  }

  /**
   * Get configuration from ConfigService
   */
  private async getConfig(): Promise<Configuration> {
    const configService = await this.getConfigService();
    return await configService.load();
  }

  /**
   * Get file tree for a skill directory
   * Returns hierarchical structure of files and subdirectories
   * @param skillPath - Absolute path to skill directory
   * @returns Root node of file tree
   */
  async getSkillFileTree(skillPath: string): Promise<import('../../shared/types').SkillFileTreeNode> {
    logger.debug(`Getting file tree for skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Build tree recursively
    const buildTree = async (dirPath: string, relativePath: string): Promise<import('../../shared/types').SkillFileTreeNode> => {
      const name = path.basename(dirPath);
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      // Sort: directories first, then files, both alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      const children: import('../../shared/types').SkillFileTreeNode[] = [];

      for (const entry of entries) {
        // Skip hidden files and directories
        if (entry.name.startsWith('.')) continue;

        const childPath = path.join(dirPath, entry.name);
        const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          const childNode = await buildTree(childPath, childRelativePath);
          children.push(childNode);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isMainFile = entry.name === SKILL_FILE_NAME;

          children.push({
            name: entry.name,
            relativePath: childRelativePath,
            absolutePath: childPath,
            type: 'file',
            extension: ext || undefined,
            isMainFile,
          });
        }
      }

      return {
        name,
        relativePath,
        absolutePath: dirPath,
        type: 'directory',
        children,
      };
    };

    const tree = await buildTree(validatedPath, '');
    logger.debug(`File tree built for skill: ${skillPath}`, 'SkillService', {
      childCount: tree.children?.length || 0
    });

    return tree;
  }

  /**
   * Read content of a file within a skill directory
   * Validates path security and handles binary files gracefully
   * @param filePath - Absolute path to file
   * @returns File content and metadata
   */
  async readSkillFile(filePath: string): Promise<import('../../shared/types').SkillFileContent> {
    logger.debug(`Reading skill file: ${filePath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(filePath);

    // Check if file exists
    if (!fs.existsSync(validatedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check if it's a file (not a directory)
    const stats = await fs.promises.stat(validatedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    // Read first 8000 bytes to detect binary
    const buffer = Buffer.alloc(8000);
    const fd = await fs.promises.open(validatedPath, 'r');
    const { bytesRead } = await fd.read(buffer, 0, 8000, 0);
    await fd.close();

    // Check for binary content (null bytes in first 8000 bytes)
    const isBinary = bytesRead > 0 && buffer.slice(0, bytesRead).includes(0);

    if (isBinary) {
      logger.debug(`File is binary: ${filePath}`, 'SkillService');
      return {
        path: validatedPath,
        content: '',
        isBinary: true,
        language: undefined,
      };
    }

    // Read full content as text
    const content = await fs.promises.readFile(validatedPath, 'utf-8');

    // Detect language from extension
    const ext = path.extname(validatedPath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.md': 'markdown',
      '.txt': 'plaintext',
      '.json': 'json',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.py': 'python',
      '.sh': 'shell',
      '.bat': 'bat',
      '.env': 'plaintext',
      '.mdx': 'markdown',
    };

    const language = languageMap[ext] || 'plaintext';

    logger.debug(`File read successfully: ${filePath}`, 'SkillService', {
      contentLength: content.length,
      language,
    });

    return {
      path: validatedPath,
      content,
      isBinary: false,
      language,
    };
  }

  /**
   * Ensure a skill has source metadata
   * Creates local source metadata if missing (e.g., for AI-created skills)
   * @param skillPath - Path to the skill directory
   */
  async ensureSourceMetadata(skillPath: string): Promise<void> {
    const metadataPath = path.join(skillPath, SOURCE_METADATA_FILE);

    // Check if source metadata already exists
    if (fs.existsSync(metadataPath)) {
      logger.debug('Source metadata already exists', 'SkillService', { skillPath });
      return;
    }

    // Create local source metadata
    const sourceMetadata = createLocalSource();
    await fs.promises.writeFile(metadataPath, JSON.stringify(sourceMetadata, null, 2), 'utf-8');

    logger.info('Created source metadata for skill', 'SkillService', { skillPath });
  }

  /**
   * Write content to a file within a skill directory
   * Validates path security before writing
   * @param filePath - Absolute path to file
   * @param content - Content to write
   */
  async writeSkillFile(filePath: string, content: string): Promise<void> {
    logger.debug(`Writing skill file: ${filePath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(filePath);

    // Ensure parent directory exists
    const parentDir = path.dirname(validatedPath);
    await fsExtra.ensureDir(parentDir);

    // Write content to file
    await fs.promises.writeFile(validatedPath, content, 'utf-8');

    logger.info(`File written successfully: ${filePath}`, 'SkillService', {
      contentLength: content.length,
    });
  }
}
