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
   * Get list of skill directories (subdirectories containing SKILL.md)
   * Recursively scans subdirectories and filters out nested skills
   * (if a skill is a subdirectory of another skill, only the parent is kept)
   */
  static async getSkillDirectories(dirPath: string): Promise<string[]> {
    if (!fs.existsSync(dirPath)) {
      logger.warn(`Directory does not exist: ${dirPath}`, 'SkillDirectoryModel');
      return [];
    }

    try {
      // Recursively find all directories containing SKILL.md
      const allSkillDirs = await this.findSkillDirectoriesRecursive(dirPath);

      // Filter out nested skills (skills that are subdirectories of other skills)
      const topLevelSkills = this.filterNestedSkills(allSkillDirs);

      logger.debug(`Found ${topLevelSkills.length} skill directories (from ${allSkillDirs.length} total, filtered nested)`, 'SkillDirectoryModel', { dirPath });
      return topLevelSkills;
    } catch (error) {
      logger.error('Failed to read skill directories', 'SkillDirectoryModel', { dirPath, error });
      return [];
    }
  }

  /**
   * Recursively find all directories containing SKILL.md
   */
  private static async findSkillDirectoriesRecursive(dirPath: string): Promise<string[]> {
    const skillDirs: string[] = [];

    const scanDir = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.')) continue;

          const subPath = path.join(currentPath, entry.name);
          const skillFile = path.join(subPath, SKILL_FILE_NAME);

          // If this directory contains SKILL.md, it's a skill directory
          if (fs.existsSync(skillFile)) {
            skillDirs.push(subPath);
            // Don't recurse into skill directories - we'll filter nested skills later
            // This prevents unnecessary deep scanning into skill contents
          } else {
            // Only recurse if this isn't already a skill directory
            await scanDir(subPath);
          }
        }
      } catch (error) {
        // Ignore permission errors or inaccessible directories
        logger.debug(`Could not scan directory: ${currentPath}`, 'SkillDirectoryModel', { error });
      }
    };

    await scanDir(dirPath);
    return skillDirs;
  }

  /**
   * Filter out nested skills (skills that are subdirectories of other skills)
   * When a directory is identified as a skill, its subdirectories are not searched
   * for additional skills (prevents nested sub-skills from being listed)
   */
  private static filterNestedSkills(skillDirs: string[]): string[] {
    // Sort by path length (shorter paths first = parent directories first)
    const sorted = [...skillDirs].sort((a, b) => a.length - b.length);

    const topLevelSkills: string[] = [];

    for (const skillDir of sorted) {
      // Check if this skill is a subdirectory of any already-added top-level skill
      const isNested = topLevelSkills.some(parentPath =>
        skillDir.startsWith(parentPath + path.sep) ||
        skillDir.startsWith(parentPath + '/')
      );

      if (!isNested) {
        topLevelSkills.push(skillDir);
      }
    }

    return topLevelSkills;
  }
}
