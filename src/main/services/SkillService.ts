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
import { Configuration, Skill } from '../../shared/types';
import { SKILL_FILE_NAME, SOURCE_METADATA_FILE } from '../../shared/constants';
import { SymlinkService } from './SymlinkService';
import { app } from 'electron';

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

    // Default to skills subdirectory in app installation directory
    const appPath = app.getAppPath();
    return path.join(appPath, 'skills');
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
   * Delete a skill by moving to system recycle bin
   * Safe deletion that allows recovery from trash
   * @param skillPath - Absolute path to skill directory
   * @throws Error if path validation fails or deletion fails
   * @example
   * await skillService.deleteSkill('/path/to/skill');
   * console.log('Skill moved to recycle bin');
   */
  async deleteSkill(skillPath: string): Promise<void> {
    logger.info(`Deleting skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Move to recycle bin
    await trash(validatedPath);

    logger.info(`Skill moved to recycle bin: ${skillPath}`, 'SkillService');
  }

  /**
   * Open skill folder in system file explorer
   * Uses Electron shell to open the directory in the default file manager
   * @param skillPath - Absolute path to skill directory
   * @throws Error if path validation fails
   * @example
   * await skillService.openFolder('/path/to/skill');
   */
  async openFolder(skillPath: string): Promise<void> {
    const { shell } = require('electron');
    const validatedPath = this.pathValidator.validate(skillPath);
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
   * Compares local commit SHAs with remote repository commit SHAs
   * @param skills - Array of skills to check for updates
   * @returns Map of skill paths to update status and remote SHA
   * @example
   * const skills = await skillService.listAllSkills(config);
   * const updates = await skillService.checkForUpdates(skills);
   * updates.forEach((status, path) => {
   *   if (status.hasUpdate) {
   *     console.log('Update available for:', path);
   *   }
   * });
   */
  async checkForUpdates(
    skills: Skill[]
  ): Promise<Map<string, { hasUpdate: boolean; remoteSHA?: string }>> {
    const updateMap = new Map<string, { hasUpdate: boolean; remoteSHA?: string }>();

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
          // Check private repo skill for updates
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
   * Compares local commit SHA with remote repository commit SHA
   */
  private async checkRegistrySkillForUpdates(
    skill: Skill,
    sourceMetadata: import('../models/SkillSource').RegistrySource
  ): Promise<{ hasUpdate: boolean; remoteSHA?: string } | null> {
    if (!sourceMetadata.commitHash) {
      logger.debug('No commit hash stored for registry skill, skipping update check', 'SkillService', {
        skillPath: skill.path
      });
      return null;
    }

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
      const hasUpdate = latestCommitSHA !== sourceMetadata.commitHash;

      if (hasUpdate) {
        logger.info(`Update available for registry skill: ${skill.name}`, 'SkillService', {
          skillPath: skill.path,
          localSHA: sourceMetadata.commitHash,
          remoteSHA: latestCommitSHA,
        });
      }

      return {
        hasUpdate,
        remoteSHA: latestCommitSHA,
      };
    } catch (error) {
      logger.error(`Failed to check registry skill updates: ${skill.name}`, 'SkillService', error);
      return null;
    }
  }

  /**
   * Check for updates to a private repo-installed skill
   * Compares local commit SHA with remote repository commit SHA
   */
  private async checkPrivateRepoSkillForUpdates(
    skill: Skill,
    sourceMetadata: import('../models/SkillSource').PrivateRepoSource
  ): Promise<{ hasUpdate: boolean; remoteSHA?: string } | null> {
    if (!sourceMetadata.commitHash) {
      logger.debug('No commit hash stored for private repo skill, skipping update check', 'SkillService', {
        skillPath: skill.path
      });
      return null;
    }

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

      if (commits && commits.length > 0) {
        const latestCommitSHA = commits[0].sha;
        const hasUpdate = latestCommitSHA !== sourceMetadata.commitHash;

        if (hasUpdate) {
          logger.info(`Update available for private repo skill: ${skill.name}`, 'SkillService', {
            skillPath: skill.path,
            localSHA: sourceMetadata.commitHash,
            remoteSHA: latestCommitSHA,
          });
        }

        return {
          hasUpdate,
          remoteSHA: latestCommitSHA,
        };
      }

      return null;
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

      // Create backup if requested
      if (createBackup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${skillPath}-backup-${timestamp}`;

        await fs.promises.mkdir(backupPath, { recursive: true });
        await fs.promises.cp(skillPath, backupPath, { recursive: true });

        logger.info('Created backup before update', 'SkillService', {
          originalPath: skillPath,
          backupPath,
        });
      }

      // Remove existing skill directory
      await fs.promises.rm(skillPath, { recursive: true });

      // Re-download and install latest version
      const result = await this.installPrivateSkill(
        repo.owner,
        repo.repo,
        skill.metadata.sourceRepoPath,
        pat,
        'project', // Keep in same directory
        repo.id,
        skill.metadata.sourceRepoPath, // Will be updated with new SHA
        'overwrite', // Already removed, so no conflict
        repo.defaultBranch || 'main'
      );

      if (result.success) {
        logger.info('Skill updated successfully', 'SkillService', {
          skillPath,
          newPath: result.newPath,
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to update skill', 'SkillService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
          ? config.projectDirectory
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
}
