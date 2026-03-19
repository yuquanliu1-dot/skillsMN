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
   * Get list of allowed directories for symlinks
   * Returns global directory and all configured project directories
   * Note: Directories are used directly as skill storage locations (no .claude subdirectory required)
   * @param projectDirectories - Configured project directories
   * @returns Array of directory paths for symlinks
   */
  getClaudeDirectories(projectDirectories: string[]): string[] {
    const dirs: string[] = [];

    // Add global directory (still uses .claude/skills for backward compatibility)
    const globalDir = path.join(os.homedir(), '.claude', 'skills');
    dirs.push(globalDir);

    // Add project directories directly (no .claude/skills subdirectory)
    // These are used as-is for skill storage
    for (const projectDir of projectDirectories) {
      dirs.push(projectDir);
    }

    logger.debug('Claude directories for symlinks', 'SymlinkService', { dirs });
    return dirs;
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
   * Get all installed tools
   * Convenience method that wraps detectInstalledTools
   * @returns Array of installed AgentTool objects
   */
  async getInstalledTools(): Promise<AgentTool[]> {
    return this.detectInstalledTools();
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
   * @param toolId - Target tool ID
   * @param enabled - Whether to enable or disable this target
   */
  async updateSingleTargetSymlink(
    appSkillsDir: string,
    skillName: string,
    skillPath: string,
    toolId: string,
    enabled: boolean
  ): Promise<void> {
    const tool = getToolById(toolId);
    if (!tool) {
      throw new Error(`Unknown tool ID: ${toolId}`);
    }

    logger.info('Updating single target symlink', 'SymlinkService', {
      skillName,
      toolId,
      toolName: tool.name,
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
        targetDirectory: tool.skillsDir,
        enabled: false,
        createdAt: now,
        lastModified: now,
      };
      skillConfig.targets[toolId] = targetConfig;
    }

    // Update enabled state
    targetConfig.enabled = enabled;
    targetConfig.lastModified = now;
    skillConfig.lastModified = now;

    // Create or remove symlink
    if (enabled) {
      await this.createSymlink(skillPath, tool.skillsDir);
    } else {
      await this.removeSymlink(skillPath, tool.skillsDir);
    }

    // If all targets are disabled, remove the skill config
    const hasEnabledTargets = Object.values(skillConfig.targets).some((t) => t.enabled);
    if (!hasEnabledTargets) {
      delete db.symlinks[skillName];
    }

    // Save database
    await this.saveDatabaseV2(appSkillsDir, db);

    logger.info('Single target symlink updated', 'SymlinkService', {
      skillName,
      toolId,
      enabled,
    });
  }

  /**
   * Get all symlink statuses for a skill across all installed tools
   * @param appSkillsDir - Application skills directory path
   * @param skillName - Skill directory name
   * @returns Map of tool ID to enabled status
   */
  async getSkillSymlinkStatus(
    appSkillsDir: string,
    skillName: string
  ): Promise<Record<string, boolean>> {
    const installedTools = await this.detectInstalledTools();
    const db = await this.loadDatabaseV2(appSkillsDir);
    const skillConfig = db.symlinks[skillName];

    const status: Record<string, boolean> = {};

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
}
