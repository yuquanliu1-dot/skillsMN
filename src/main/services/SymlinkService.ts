/**
 * Symlink Service
 *
 * Manages skill symlinks from application directory to Claude Code directories
 * Handles cross-platform symlink creation with Windows junction support
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import { SymlinksDatabase, SkillSymlinkConfig } from '../../shared/types';

export class SymlinkService {
  private readonly SYMLINKS_DB_FILE = '.symlinks.json';
  private readonly DB_VERSION = 1;

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
   * @param appSkillsDir - Application skills directory path
   * @returns Symlinks database object
   */
  async loadDatabase(appSkillsDir: string): Promise<SymlinksDatabase> {
    const dbPath = this.getSymlinksDatabasePath(appSkillsDir);

    try {
      if (await fs.promises.access(dbPath, fs.constants.R_OK).then(() => true).catch(() => false)) {
        const content = await fs.promises.readFile(dbPath, 'utf-8');
        const db = JSON.parse(content) as SymlinksDatabase;

        logger.debug('Symlinks database loaded', 'SymlinkService', {
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

    logger.info('Created new symlinks database', 'SymlinkService', { path: dbPath });
    return emptyDb;
  }

  /**
   * Save symlinks database to disk
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
   * Create symlink from skill directory to target directory
   * Uses junction on Windows (no admin required), symlink on Unix
   * @param skillPath - Source skill directory path (in app directory)
   * @param targetDir - Target directory for symlink (Claude directory)
   * @throws Error if symlink creation fails or target already exists
   */
  async createSymlink(skillPath: string, targetDir: string): Promise<void> {
    const skillName = path.basename(skillPath);
    const linkPath = path.join(targetDir, skillName);

    logger.info('Creating symlink', 'SymlinkService', {
      source: skillPath,
      target: linkPath,
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
      await fs.promises.mkdir(targetDir, { recursive: true });

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
    const skillName = path.basename(skillPath);
    const linkPath = path.join(targetDir, skillName);

    logger.info('Removing symlink', 'SymlinkService', { linkPath });

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
   * Get list of allowed Claude directories for symlinks
   * Returns global and all project directories
   * @param projectDirectories - Configured project directories
   * @returns Array of Claude directory paths
   */
  getClaudeDirectories(projectDirectories: string[]): string[] {
    const dirs: string[] = [];

    // Add global directory
    const globalDir = path.join(os.homedir(), '.claude', 'skills');
    dirs.push(globalDir);

    // Add project directories
    for (const projectDir of projectDirectories) {
      const projectSkillsDir = path.join(projectDir, '.claude', 'skills');
      dirs.push(projectSkillsDir);
    }

    logger.debug('Claude directories for symlinks', 'SymlinkService', { dirs });
    return dirs;
  }
}
