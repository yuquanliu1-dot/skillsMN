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
import { Configuration, Skill } from '../../shared/types';
import { SKILL_FILE_NAME } from '../../shared/constants';

export class SkillService {
  private frontmatterCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(
    private pathValidator: PathValidator
  ) {}

  /**
   * List all skills from project and global directories
   * Scans both directories for skill.md files and parses metadata
   * Uses frontmatter caching for improved performance
   * @param config - Configuration object with project directory setting
   * @returns Array of Skill objects from both directories
   * @example
   * const config = await configService.load();
   * const skills = await skillService.listAllSkills(config);
   * console.log(`Found ${skills.length} skills`);
   */
  async listAllSkills(config: Configuration): Promise<Skill[]> {
    logger.info('Listing all skills', 'SkillService', {
      projectDir: config.projectDirectory,
    });

    const skills: Skill[] = [];

    // Scan global directory
    const globalDir = SkillDirectoryModel.getGlobalDirectory();
    const globalSkills = await this.scanDirectory(globalDir, 'global');
    skills.push(...globalSkills);

    // Scan project directory if configured
    if (config.projectDirectory) {
      const projectDir = SkillDirectoryModel.getProjectDirectory(config.projectDirectory);
      const projectSkills = await this.scanDirectory(projectDir, 'project');
      skills.push(...projectSkills);
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
  private async scanDirectory(dirPath: string, source: 'project' | 'global'): Promise<Skill[]> {
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

    // Read skill content
    const skillFile = path.join(validatedPath, SKILL_FILE_NAME);
    const content = await fs.promises.readFile(skillFile, 'utf-8');

    logger.debug(`Skill loaded: ${metadata.name}`, 'SkillService');
    return { metadata, content };
  }

  /**
   * Create a new skill with template content
   * Generates kebab-case directory name and creates skill.md file
   * @param name - Skill name (will be converted to kebab-case for directory)
   * @param directory - 'project' or 'global' directory to create in
   * @returns Created Skill object with metadata
   * @throws Error if skill already exists or path validation fails
   * @example
   * const skill = await skillService.createSkill('Code Review', 'project');
   * console.log('Created:', skill.name, 'at', skill.path);
   */
  async createSkill(name: string, directory: 'project' | 'global'): Promise<Skill> {
    logger.info(`Creating skill: ${name}`, 'SkillService', { directory });

    // Get target directory
    const config = await this.getConfig();
    logger.debug(`Config loaded`, 'SkillService', {
      hasProjectDirectory: !!config.projectDirectory,
      projectDirectory: config.projectDirectory,
      requestedDirectory: directory
    });

    const targetBase = directory === 'project' && config.projectDirectory
      ? SkillDirectoryModel.getProjectDirectory(config.projectDirectory)
      : SkillDirectoryModel.getGlobalDirectory();

    logger.debug(`Target directory selected`, 'SkillService', {
      targetBase,
      isProject: directory === 'project' && !!config.projectDirectory
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

    // Parse and return created skill (with cache)
    const skill = await SkillModel.fromDirectory(skillDir, directory, this.frontmatterCache);

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

      if (actualLastModified > expectedLastModified) {
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
   * Check for updates to skills installed from private repositories
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
      // Only check skills installed from private repos
      if (!skill.sourceRepoId || !skill.sourceRepoPath || !skill.installedDirectoryCommitSHA) {
        continue;
      }

      try {
        const configService = await this.getConfigService();
        const repo = await configService.getPrivateRepo(skill.sourceRepoId);

        if (!repo) {
          logger.warn(`Repository not found for skill: ${skill.name}`, 'SkillService', { repoId: skill.sourceRepoId });
          continue;
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
          skill.sourceRepoPath,
          branch
        );

        if (commits && commits.length > 0) {
          const latestCommitSHA = commits[0].sha;
          const hasUpdate = latestCommitSHA !== skill.installedDirectoryCommitSHA;

          updateMap.set(skill.path, {
            hasUpdate,
            remoteSHA: latestCommitSHA,
          });

          if (hasUpdate) {
            logger.info(`Update available for skill: ${skill.name}`, 'SkillService', {
              skillPath: skill.path,
              localSHA: skill.installedDirectoryCommitSHA,
              remoteSHA: latestCommitSHA,
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to check updates for skill: ${skill.name}`, 'SkillService', error);
      }
    }

    return updateMap;
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
      if (!skill.metadata.sourceRepoId || !skill.metadata.sourceRepoPath) {
        throw new Error('Skill was not installed from a private repository');
      }

      // Get repository configuration
      const configService = await this.getConfigService();
      const repo = await configService.getPrivateRepo(skill.metadata.sourceRepoId);

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
          : path.join(process.env.USERPROFILE || os.homedir(), '.skillsMN', 'skills');

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
