/**
 * Skill Directory Model
 *
 * Represents a parent folder containing skill directories
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/Logger';
import { SkillDirectory, SkillSource } from '../../shared/types';
import { CLAUDE_DIR_NAME, SKILLS_DIR_NAME, SKILL_FILE_NAME } from '../../shared/constants';

export class SkillDirectoryModel {
  /**
   * Create a skill directory model from a path
   */
  static fromPath(dirPath: string, type: SkillSource): SkillDirectory {
    const resolved = path.resolve(dirPath);
    const exists = fs.existsSync(resolved);

    const directory: SkillDirectory = {
      path: resolved,
      type,
      exists,
    };

    logger.debug(`Skill directory model created: ${type}`, 'SkillDirectoryModel', {
      path: resolved,
      exists,
    });

    return directory;
  }

  /**
   * Get global skills directory path (~/.claude/skills)
   */
  static getGlobalDirectory(): string {
    return path.join(os.homedir(), CLAUDE_DIR_NAME, SKILLS_DIR_NAME);
  }

  /**
   * Get project skills directory path
   * Note: Now returns the directory directly without appending .claude/skills
   * The configured directory is used as-is for skill storage
   */
  static getProjectDirectory(projectDir: string): string {
    return projectDir;
  }

  /**
   * Validate that a directory exists and is accessible
   * Note: No longer requires .claude subdirectory - any directory can be used for skill storage
   */
  static isValidProjectDirectory(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if necessary
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
      logger.info(`Created skill directory: ${dirPath}`, 'SkillDirectoryModel');
    }
  }

  /**
   * Get list of skill directories (subdirectories containing skill.md)
   */
  static async getSkillDirectories(dirPath: string): Promise<string[]> {
    if (!fs.existsSync(dirPath)) {
      logger.warn(`Directory does not exist: ${dirPath}`, 'SkillDirectoryModel');
      return [];
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const skillDirs: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;

        const skillPath = path.join(dirPath, entry.name);
        const skillFile = path.join(skillPath, SKILL_FILE_NAME);

        // Only include directories that contain SKILL.md
        if (fs.existsSync(skillFile)) {
          skillDirs.push(skillPath);
        }
      }

      logger.debug(`Found ${skillDirs.length} skill directories`, 'SkillDirectoryModel', { dirPath });
      return skillDirs;
    } catch (error) {
      logger.error('Failed to read skill directories', 'SkillDirectoryModel', { dirPath, error });
      return [];
    }
  }
}
