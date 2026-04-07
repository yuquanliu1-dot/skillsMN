/**
 * Symlink Service
 *
 * Manages skill symlinks from application directory to Claude Code directories
 * Handles cross-platform symlink creation with Windows junction support
 * Supports multi-target symlinks to multiple AI agent tools
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import {
  SymlinksDatabase,
  SkillSymlinkConfig,
  AgentTool,
  SymlinkTargetConfig,
  MultiTargetSymlinkConfig,
  SymlinksDatabaseV2,
} from '../../shared/types';
import { AGENT_TOOLS, getToolById } from '../../shared/agentTools';

export class SymlinkService {
  private readonly SYMLINKS_DB_FILE = '.symlinks.json';
  private readonly DB_VERSION = 1;

  // In-memory cache for symlinks database
  private databaseCache: Map<string, SymlinksDatabase> = new Map();

  /**
   * Expand tilde (~) in path to actual home directory
   * @param filePath - Path that may contain ~
   * @returns Expanded path
   */
  private expandTilde(filePath: string): string {
    if (filePath.startsWith('~/') || filePath === '~') {
      return filePath.replace('~', os.homedir());
    }
    return filePath;
  }

  /**
   * Get path to symlinks database file
   * Database is stored in application skills directory
   */
  private getSymlinksDatabasePath(appSkillsDir: string): string {
    return path.join(appSkillsDir, this.SYMLINKS_DB_FILE);
  }

  /**
   * Load symlinks database from disk
   * Creates empty database if it doesn't exist
   * Uses in-memory cache to reduce file system reads
   * @param appSkillsDir - Application skills directory path
   * @returns Symlinks database object
   */
  async loadDatabase(appSkillsDir: string): Promise<SymlinksDatabase> {
    // Check cache first
    const cached = this.databaseCache.get(appSkillsDir);
    if (cached) {
      logger.debug('Symlinks database loaded from cache', 'SymlinkService', {
        path: appSkillsDir,
        symlinkCount: Object.keys(cached.symlinks).length,
      });
      return cached;
    }

    const dbPath = this.getSymlinksDatabasePath(appSkillsDir);

    try {
      if (await fs.promises.access(dbPath, fs.constants.R_OK).then(() => true).catch(() => false)) {
        const content = await fs.promises.readFile(dbPath, 'utf-8');
        const db = JSON.parse(content) as SymlinksDatabase;

        // Cache the loaded database
        this.databaseCache.set(appSkillsDir, db);

        logger.debug('Symlinks database loaded from disk', 'SymlinkService', {
          path: dbPath,
          symlinkCount: Object.keys(db.symlinks).length,
        });

        return db;
      }
    } catch (error) {
      logger.error('Failed to load symlinks database, creating new one', 'SymlinkService', {
        path: dbPath,
        error,
      });
    }

    // Create empty database
    const emptyDb: SymlinksDatabase = {
      version: this.DB_VERSION,
      symlinks: {},
    };

    // Cache the empty database
    this.databaseCache.set(appSkillsDir, emptyDb);

    logger.info('Created new symlinks database', 'SymlinkService', { path: dbPath });
    return emptyDb;
  }

  /**
   * Save symlinks database to disk
   * Updates in-memory cache after successful save
   * @param appSkillsDir - Application skills directory path
   * @param db - Symlinks database to save
   */
  async saveDatabase(appSkillsDir: string, db: SymlinksDatabase): Promise<void> {
    const dbPath = this.getSymlinksDatabasePath(appSkillsDir);

    try {
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });

      // Write database
      const content = JSON.stringify(db, null, 2);
      await fs.promises.writeFile(dbPath, content, 'utf-8');

      // Update cache
      this.databaseCache.set(appSkillsDir, db);

      logger.debug('Symlinks database saved', 'SymlinkService', {
        path: dbPath,
        symlinkCount: Object.keys(db.symlinks).length,
      });
    } catch (error) {
      logger.error('Failed to save symlinks database', 'SymlinkService', {
        path: dbPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Clear the in-memory cache for a specific directory or all directories
   * @param appSkillsDir - Optional directory to clear cache for. If not provided, clears all.
   */
  clearCache(appSkillsDir?: string): void {
    if (appSkillsDir) {
      this.databaseCache.delete(appSkillsDir);
      logger.debug('Symlinks database cache cleared for directory', 'SymlinkService', {
        path: appSkillsDir,
      });
    } else {
      this.databaseCache.clear();
      logger.debug('Symlinks database cache cleared for all directories', 'SymlinkService');
    }
  }

  /**
   * Create symlink from skill directory to target directory
   * Uses junction on Windows (no admin required), symlink on Unix
   * @param skillPath - Source skill directory path (in app directory)
   * @param targetDir - Target directory for symlink (Claude directory)
   * @throws Error if symlink creation fails or target already exists
   */
  async createSymlink(skillPath: string, targetDir: string): Promise<void> {
    // Expand tilde in target directory path
    const expandedTargetDir = this.expandTilde(targetDir);
    const skillName = path.basename(skillPath);
    const linkPath = path.join(expandedTargetDir, skillName);

    logger.info('Creating symlink', 'SymlinkService', {
      source: skillPath,
      target: linkPath,
      originalTargetDir: targetDir,
      expandedTargetDir,
      platform: process.platform,
    });

    try {
      // Check if link path already exists
      if (fs.existsSync(linkPath)) {
        const stats = fs.lstatSync(linkPath);

        if (stats.isSymbolicLink()) {
          const existingTarget = await this.getSymlinkTarget(linkPath);

          if (existingTarget === skillPath) {
            // Already linked correctly
            logger.debug('Symlink already exists and points to correct location', 'SymlinkService', {
              linkPath,
              target: existingTarget,
            });
            return;
          } else {
            // Symlink points elsewhere
            throw new Error(`Symlink already exists pointing to: ${existingTarget}`);
          }
        } else {
          // Directory exists, not a symlink
          throw new Error(`Directory already exists: ${linkPath}`);
        }
      }

      // Ensure target directory exists
      await fs.promises.mkdir(expandedTargetDir, { recursive: true });

      // Create symlink with platform-appropriate type
      if (process.platform === 'win32') {
        // Use junction for Windows (no admin privileges required)
        await fs.promises.symlink(skillPath, linkPath, 'junction');
        logger.info('Windows junction created', 'SymlinkService', { linkPath, target: skillPath });
      } else {
        // Use standard symlink for macOS/Linux
        await fs.promises.symlink(skillPath, linkPath);
        logger.info('Unix symlink created', 'SymlinkService', { linkPath, target: skillPath });
      }
    } catch (error) {
      logger.error('Failed to create symlink', 'SymlinkService', {
        skillPath,
        linkPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove symlink from target directory
   * @param skillPath - Source skill directory path
   * @param targetDir - Target directory containing symlink
   */
  async removeSymlink(skillPath: string, targetDir: string): Promise<void> {
    // Expand tilde in target directory path
    const expandedTargetDir = this.expandTilde(targetDir);
    const skillName = path.basename(skillPath);
    const linkPath = path.join(expandedTargetDir, skillName);

    logger.info('Removing symlink', 'SymlinkService', { linkPath, originalTargetDir: targetDir });

    try {
      // Check if symlink exists
      if (!fs.existsSync(linkPath)) {
        logger.debug('Symlink does not exist, nothing to remove', 'SymlinkService', { linkPath });
        return;
      }

      // Verify it's actually a symlink
      const stats = fs.lstatSync(linkPath);
      if (!stats.isSymbolicLink()) {
        logger.warn('Path exists but is not a symlink, not removing', 'SymlinkService', { linkPath });
        return;
      }

      // Remove symlink
      await fs.promises.unlink(linkPath);
      logger.info('Symlink removed', 'SymlinkService', { linkPath });
    } catch (error) {
      logger.error('Failed to remove symlink', 'SymlinkService', { linkPath, error });
      throw error;
    }
  }

  /**
   * Check if path is a symlink
   * @param linkPath - Path to check
   * @returns True if path is a symlink
   */
  async isSymlink(linkPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(linkPath)) {
        return false;
      }

      const stats = fs.lstatSync(linkPath);
      return stats.isSymbolicLink();
    } catch (error) {
      logger.error('Failed to check symlink status', 'SymlinkService', { linkPath, error });
      return false;
    }
  }

  /**
   * Get target path of a symlink
   * @param linkPath - Symlink path
   * @returns Target path or null if not a symlink
   */
  async getSymlinkTarget(linkPath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(linkPath)) {
        return null;
      }

      const stats = fs.lstatSync(linkPath);
      if (!stats.isSymbolicLink()) {
        return null;
      }

      const target = fs.readlinkSync(linkPath);
      return path.resolve(target);
    } catch (error) {
      logger.error('Failed to read symlink target', 'SymlinkService', { linkPath, error });
      return null;
    }
  }

  /**
   * Update symlink configuration for a skill
   * Creates or removes symlink based on config.enabled
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @param skillPath - Full path to skill directory in app directory
   * @param config - Symlink configuration
   */
  async updateSkillSymlink(
    appSkillsDir: string,
    skillName: string,
    skillPath: string,
    config: SkillSymlinkConfig
  ): Promise<void> {
    logger.info('Updating skill symlink configuration', 'SymlinkService', {
      skillName,
      enabled: config.enabled,
      claudeDirectory: config.claudeDirectory,
    });

    try {
      // Load database
      const db = await this.loadDatabase(appSkillsDir);

      if (config.enabled) {
        // Create symlink
        await this.createSymlink(skillPath, config.claudeDirectory);

        // Update database
        db.symlinks[skillName] = config;
      } else {
        // Remove symlink
        const existingConfig = db.symlinks[skillName];
        if (existingConfig) {
          await this.removeSymlink(skillPath, existingConfig.claudeDirectory);
        }

        // Remove from database
        delete db.symlinks[skillName];
      }

      // Save database
      await this.saveDatabase(appSkillsDir, db);

      logger.info('Skill symlink configuration updated', 'SymlinkService', {
        skillName,
        enabled: config.enabled,
      });
    } catch (error) {
      logger.error('Failed to update skill symlink', 'SymlinkService', {
        skillName,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all link targets (both project directories and AI tools)
   * @param projectDirectories - Configured project directories
   * @returns Combined array of link targets
   */
  getAllLinkTargets(projectDirectories: string[]): Array<{ id: string; name: string; path: string; isProject: boolean }> {
    const targets: Array<{ id: string; name: string; path: string; isProject: boolean }> = [];

    // Add project directories first (higher priority)
    for (const projectDir of projectDirectories) {
      targets.push({
        id: `project:${projectDir}`,
        name: path.basename(projectDir),
        path: projectDir,
        isProject: true,
      });
    }

    return targets;
  }

  // ============================================================================
  // Multi-Target Symlink Methods
  // ============================================================================

  /**
   * Detect which AI agent tools are installed on the system
   * Checks if the config directory exists for each tool
   * @returns Array of installed AgentTool objects
   */
  async detectInstalledTools(): Promise<AgentTool[]> {
    const installedTools: AgentTool[] = [];

    for (const tool of AGENT_TOOLS) {
      const configDir = this.expandTilde(tool.configDir);
      try {
        const exists = await fs.promises.access(configDir, fs.constants.F_OK)
          .then(() => true)
          .catch(() => false);

        if (exists) {
          installedTools.push(tool);
          logger.debug(`Detected installed tool: ${tool.name}`, 'SymlinkService', {
            toolId: tool.id,
            configDir,
          });
        }
      } catch (error) {
        logger.debug(`Error checking tool installation: ${tool.name}`, 'SymlinkService', {
          toolId: tool.id,
          error,
        });
      }
    }

    logger.info('Detected installed agent tools', 'SymlinkService', {
      count: installedTools.length,
      tools: installedTools.map((t) => t.name),
    });

    return installedTools;
  }

  /**
   * Get all installed tools and project directories
   * @param projectDirectories - Configured project directories
   * @returns Array of installed AgentTool objects (including project directories)
   */
  async getInstalledTools(projectDirectories?: string[]): Promise<AgentTool[]> {
    const tools = await this.detectInstalledTools();

    // Add project directories as "tools" if provided
    if (projectDirectories && projectDirectories.length > 0) {
      const projectTools: AgentTool[] = projectDirectories.map((dir, index) => ({
        id: `project-${index}`,
        name: path.basename(dir),
        configDir: dir,
        skillsDir: dir,
        type: 'project' as const,
      }));

      // Project directories first (higher priority)
      return [...projectTools, ...tools];
    }

    return tools;
  }

  /**
   * Load v2 multi-target symlinks database
   * Handles migration from v1 to v2 format
   * @param appSkillsDir - Application skills directory path
   * @returns Multi-target symlinks database
   */
  async loadDatabaseV2(appSkillsDir: string): Promise<SymlinksDatabaseV2> {
    const dbPath = this.getSymlinksDatabasePath(appSkillsDir);

    try {
      if (await fs.promises.access(dbPath, fs.constants.R_OK).then(() => true).catch(() => false)) {
        const content = await fs.promises.readFile(dbPath, 'utf-8');
        const db = JSON.parse(content);

        // Check if it's already v2 format
        if (db.version === 2) {
          logger.debug('Loaded v2 symlinks database', 'SymlinkService', {
            symlinkCount: Object.keys(db.symlinks).length,
          });
          return db as SymlinksDatabaseV2;
        }

        // Migrate from v1 to v2
        if (db.version === 1) {
          logger.info('Migrating symlinks database from v1 to v2', 'SymlinkService');
          return this.migrateDatabaseV1toV2(db as SymlinksDatabase);
        }
      }
    } catch (error) {
      logger.error('Failed to load v2 symlinks database, creating new one', 'SymlinkService', {
        path: dbPath,
        error,
      });
    }

    // Create empty v2 database
    const emptyDb: SymlinksDatabaseV2 = {
      version: 2,
      symlinks: {},
    };

    return emptyDb;
  }

  /**
   * Migrate v1 database to v2 format
   * @param v1Db - v1 database
   * @returns v2 database
   */
  private migrateDatabaseV1toV2(v1Db: SymlinksDatabase): SymlinksDatabaseV2 {
    const v2Db: SymlinksDatabaseV2 = {
      version: 2,
      symlinks: {},
    };

    // Migrate each skill's config
    for (const [skillName, config] of Object.entries(v1Db.symlinks)) {
      if (config.enabled) {
        // Try to determine which tool the old config was for
        // Default to claude-code if it was using .claude/skills
        const isClaudeCode = config.claudeDirectory.includes('.claude');
        const toolId = isClaudeCode ? 'claude-code' : 'claude-code';

        v2Db.symlinks[skillName] = {
          targets: {
            [toolId]: {
              toolId,
              targetDirectory: config.claudeDirectory,
              enabled: true,
              createdAt: config.createdAt,
              lastModified: config.lastModified,
            },
          },
          createdAt: config.createdAt,
          lastModified: config.lastModified,
        };
      }
    }

    logger.info('Migrated v1 database to v2', 'SymlinkService', {
      migratedCount: Object.keys(v2Db.symlinks).length,
    });

    return v2Db;
  }

  /**
   * Save v2 multi-target symlinks database
   * @param appSkillsDir - Application skills directory path
   * @param db - v2 database to save
   */
  async saveDatabaseV2(appSkillsDir: string, db: SymlinksDatabaseV2): Promise<void> {
    const dbPath = this.getSymlinksDatabasePath(appSkillsDir);

    try {
      await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });
      const content = JSON.stringify(db, null, 2);
      await fs.promises.writeFile(dbPath, content, 'utf-8');

      logger.debug('Saved v2 symlinks database', 'SymlinkService', {
        path: dbPath,
        symlinkCount: Object.keys(db.symlinks).length,
      });
    } catch (error) {
      logger.error('Failed to save v2 symlinks database', 'SymlinkService', {
        path: dbPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Get multi-target symlink configuration for a skill
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @returns Multi-target configuration or null
   */
  async getMultiTargetSymlinkConfig(
    appSkillsDir: string,
    skillName: string
  ): Promise<MultiTargetSymlinkConfig | null> {
    const db = await this.loadDatabaseV2(appSkillsDir);
    return db.symlinks[skillName] || null;
  }

  /**
   * Update a single target symlink for a skill
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @param skillPath - Full path to skill directory
   * @param toolId - Target tool ID (e.g., 'claude-code' or 'project-0')
   * @param enabled - Whether to enable or disable this target
   * @param projectDirectories - Optional project directories for resolving project-* IDs
   */
  async updateSingleTargetSymlink(
    appSkillsDir: string,
    skillName: string,
    skillPath: string,
    toolId: string,
    enabled: boolean,
    projectDirectories?: string[]
  ): Promise<void> {
    // Get target directory and tool name
    let targetDirectory: string;
    let toolName: string;

    // Check if this is a project directory ID
    if (toolId.startsWith('project-')) {
      const index = parseInt(toolId.replace('project-', ''), 10);
      if (projectDirectories && projectDirectories[index]) {
        targetDirectory = projectDirectories[index];
        toolName = path.basename(targetDirectory);
      } else {
        throw new Error(`Project directory not found for ID: ${toolId}`);
      }
    } else {
      // Look up AI agent tool
      const tool = getToolById(toolId);
      if (!tool) {
        throw new Error(`Unknown tool ID: ${toolId}`);
      }
      targetDirectory = tool.skillsDir;
      toolName = tool.name;
    }

    logger.info('Updating single target symlink', 'SymlinkService', {
      skillName,
      toolId,
      toolName,
      enabled,
    });

    const db = await this.loadDatabaseV2(appSkillsDir);
    const now = new Date().toISOString();

    // Get or create skill config
    let skillConfig = db.symlinks[skillName];
    if (!skillConfig) {
      skillConfig = {
        targets: {},
        createdAt: now,
        lastModified: now,
      };
      db.symlinks[skillName] = skillConfig;
    }

    // Get or create target config
    let targetConfig = skillConfig.targets[toolId];
    if (!targetConfig) {
      targetConfig = {
        toolId,
        targetDirectory,
        enabled: false,
        createdAt: now,
        lastModified: now,
      };
      skillConfig.targets[toolId] = targetConfig;
    }

    // Update enabled state in memory
    const previousEnabledState = targetConfig.enabled;
    targetConfig.enabled = enabled;
    targetConfig.lastModified = now;
    skillConfig.lastModified = now;

    // If all targets are disabled, prepare to remove the skill config
    const hasEnabledTargets = Object.values(skillConfig.targets).some((t) => t.enabled);
    const shouldRemoveSkillConfig = !hasEnabledTargets;

    // STEP 1: Save database FIRST (before file system operation)
    // This ensures we have a consistent state even if file system operation fails
    const dbToSave = { ...db };
    if (shouldRemoveSkillConfig) {
      delete dbToSave.symlinks[skillName];
    }

    try {
      await this.saveDatabaseV2(appSkillsDir, dbToSave);
    } catch (error) {
      // Rollback in-memory state if database save fails
      targetConfig.enabled = previousEnabledState;
      logger.error('Failed to save database, rolling back in-memory state', 'SymlinkService', error);
      throw error;
    }

    // STEP 2: Perform file system operation AFTER database is saved
    try {
      if (enabled) {
        await this.createSymlink(skillPath, targetDirectory);
      } else {
        await this.removeSymlink(skillPath, targetDirectory);
      }
    } catch (error) {
      // File system operation failed - this is acceptable since database is consistent
      // The symlink will be reconciled on next app start via reconcileSymlinks()
      logger.warn('File system operation failed after database save. Symlink will be reconciled on next app start.', 'SymlinkService', {
        skillName,
        toolId,
        enabled,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - database is consistent, symlink can be fixed later
    }

    logger.info('Single target symlink updated', 'SymlinkService', {
      skillName,
      toolId,
      enabled,
    });
  }

  /**
   * Get all symlink statuses for a skill across all installed tools and project directories
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @param projectDirectories - Optional project directories to include in status
   * @returns Map of tool ID to enabled status
   */
  async getSkillSymlinkStatus(
    appSkillsDir: string,
    skillName: string,
    projectDirectories?: string[]
  ): Promise<Record<string, boolean>> {
    const installedTools = await this.detectInstalledTools();
    const db = await this.loadDatabaseV2(appSkillsDir);
    const skillConfig = db.symlinks[skillName];

    const status: Record<string, boolean> = {};

    // Add project directories first
    if (projectDirectories) {
      for (let i = 0; i < projectDirectories.length; i++) {
        const toolId = `project-${i}`;
        status[toolId] = skillConfig?.targets[toolId]?.enabled ?? false;
      }
    }

    // Add AI agent tools
    for (const tool of installedTools) {
      status[tool.id] = skillConfig?.targets[tool.id]?.enabled ?? false;
    }

    return status;
  }

  /**
   * Count enabled targets for a skill
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @returns Number of enabled targets
   */
  async countEnabledTargets(appSkillsDir: string, skillName: string): Promise<number> {
    const db = await this.loadDatabaseV2(appSkillsDir);
    const skillConfig = db.symlinks[skillName];

    if (!skillConfig) {
      return 0;
    }

    return Object.values(skillConfig.targets).filter((t) => t.enabled).length;
  }

  /**
   * Get Claude directories from project directories
   * Returns the list of configured project directories that can be used for symlinks
   * @param projectDirectories - List of project directories from config
   * @returns List of valid Claude directories
   */
  getClaudeDirectories(projectDirectories: string[] | undefined): string[] {
    if (!projectDirectories || projectDirectories.length === 0) {
      return [];
    }

    // Filter to only existing directories
    const validDirs = projectDirectories.filter((dir) => {
      try {
        return fs.existsSync(dir);
      } catch {
        return false;
      }
    });

    logger.debug('Claude directories retrieved', 'SymlinkService', {
      total: projectDirectories.length,
      valid: validDirs.length,
    });

    return validDirs;
  }
}
