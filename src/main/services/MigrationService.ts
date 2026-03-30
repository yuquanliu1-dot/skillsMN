/**
 * Migration Service
 *
 * Handles migration of skills from project directories
 * to the centralized application directory
 */

import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import { logger } from '../utils/Logger';
import { SkillService } from './SkillService';
import { Configuration, Skill, MigrationOptions, MigrationProgress, MigrationResult } from '../../shared/types';
import { SkillDirectoryModel } from '../models/SkillDirectory';
import { IPC_CHANNELS } from '../../shared/constants';
import { BrowserWindow } from 'electron';

export class MigrationService {
  constructor(
    private skillService: SkillService
  ) {}

  /**
   * Check if migration is needed
   * Looks for skills in configured project directories
   * @param config - Current configuration
   * @returns True if skills exist in project directories
   */
  async needsMigration(config: Configuration): Promise<boolean> {
    // If migration already completed or preference asked, don't check
    if (config.migrationCompleted || config.migrationPreferenceAsked) {
      logger.debug('Migration already handled', 'MigrationService', {
        migrationCompleted: config.migrationCompleted,
        migrationPreferenceAsked: config.migrationPreferenceAsked,
      });
      return false;
    }

    // Check project directories only
    let projectSkillsCount = 0;
    for (const projectDir of config.projectDirectories) {
      const fullDir = SkillDirectoryModel.getProjectDirectory(projectDir);
      const skills = await this.scanDirectoryForSkills(fullDir);
      projectSkillsCount += skills.length;
    }

    const needsMigration = projectSkillsCount > 0;

    logger.info('Migration check completed', 'MigrationService', {
      projectSkills: projectSkillsCount,
      needsMigration,
    });

    return needsMigration;
  }

  /**
   * Detect existing skills in project directories
   * @param config - Current configuration
   * @returns Array of skills found in project directories
   */
  async detectExistingSkills(config: Configuration): Promise<Skill[]> {
    logger.info('Detecting existing skills in project directories', 'MigrationService');

    const projectSkills: Skill[] = [];

    // Scan project directories
    for (const projectDir of config.projectDirectories) {
      const fullDir = SkillDirectoryModel.getProjectDirectory(projectDir);
      const skills = await this.scanDirectoryForSkills(fullDir);
      projectSkills.push(...skills);
    }

    logger.info('Skill detection completed', 'MigrationService', {
      projectCount: projectSkills.length,
    });

    return projectSkills;
  }

  /**
   * Scan a directory for skills
   * @param dirPath - Directory to scan
   * @returns Array of skills found
   */
  async scanDirectoryForSkills(dirPath: string): Promise<Skill[]> {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      // Directly scan the specified directory using SkillService's public method
      // Note: We use 'project' as source since these are external skills being migrated
      const skills = await this.skillService.scanDirectory(dirPath, 'project');

      logger.debug('Scanned directory for skills', 'MigrationService', {
        dirPath,
        skillCount: skills.length,
      });

      return skills;
    } catch (error) {
      logger.error('Failed to scan directory for skills', 'MigrationService', {
        dirPath,
        error,
      });
      return [];
    }
  }

  /**
   * Migrate skills to application directory
   * @param config - Current configuration
   * @param skills - Skills to migrate
   * @param options - Migration options
   * @param mainWindow - Electron window for progress updates
   * @returns Migration result
   */
  async migrateSkills(
    config: Configuration,
    skills: Skill[],
    options: MigrationOptions,
    mainWindow: BrowserWindow | null
  ): Promise<MigrationResult> {
    logger.info('Starting skill migration', 'MigrationService', {
      skillCount: skills.length,
      options,
    });

    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      failedSkills: [],
      duration: 0,
    };

    // Get application directory
    const appDir = this.getApplicationSkillsDirectory(config);

    // Ensure application directory exists
    await SkillDirectoryModel.ensureDirectory(appDir);

    // Process each skill
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];

      try {
        // Send progress update
        this.sendProgress(mainWindow, {
          currentSkill: skill.name,
          currentIndex: i,
          totalSkills: skills.length,
          percentage: Math.round((i / skills.length) * 100),
          operation: options.moveOrCopy === 'move' ? 'moving' : 'copying',
        });

        // Migrate skill
        await this.migrateSkill(skill, appDir, options);

        result.migratedCount++;
        logger.debug('Skill migrated successfully', 'MigrationService', {
          skillName: skill.name,
          progress: `${i + 1}/${skills.length}`,
        });
      } catch (error) {
        result.failedCount++;
        result.failedSkills.push({
          name: skill.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error('Failed to migrate skill', 'MigrationService', {
          skillName: skill.name,
          error,
        });
      }
    }

    // Send completion progress
    this.sendProgress(mainWindow, {
      currentSkill: '',
      currentIndex: skills.length,
      totalSkills: skills.length,
      percentage: 100,
      operation: 'completed',
    });

    result.duration = Date.now() - startTime;
    result.success = result.failedCount === 0;

    logger.info('Migration completed', 'MigrationService', {
      migratedCount: result.migratedCount,
      failedCount: result.failedCount,
      duration: result.duration,
    });

    return result;
  }

  /**
   * Migrate a single skill
   * @param skill - Skill to migrate
   * @param appDir - Application directory
   * @param options - Migration options
   */
  private async migrateSkill(
    skill: Skill,
    appDir: string,
    options: MigrationOptions
  ): Promise<void> {
    const skillName = path.basename(skill.path);
    const targetPath = path.join(appDir, skillName);

    // Check if skill already exists in target
    if (await fsExtra.pathExists(targetPath)) {
      throw new Error(`Skill already exists in application directory: ${skillName}`);
    }

    if (options.moveOrCopy === 'move') {
      // Move skill
      await fsExtra.move(skill.path, targetPath);

      // Delete original if requested
      if (options.deleteOriginals && await fsExtra.pathExists(skill.path)) {
        await fsExtra.remove(skill.path);
      }
    } else {
      // Copy skill
      await fsExtra.copy(skill.path, targetPath);

      // Delete original if requested (only for copy mode)
      if (options.deleteOriginals) {
        await fsExtra.remove(skill.path);
      }
    }
  }

  /**
   * Get application skills directory path
   * @param config - Configuration
   * @returns Application skills directory path
   */
  getApplicationSkillsDirectory(config: Configuration): string {
    if (config.applicationSkillsDirectory) {
      return config.applicationSkillsDirectory;
    }

    // Default to .claude/skills subdirectory in app installation directory
    // This allows Claude Code to directly use the skills
    const { app } = require('electron');
    const appPath = app.getAppPath();
    return path.join(appPath, '.claude', 'skills');
  }

  /**
   * Send migration progress to renderer
   * @param mainWindow - Electron window
   * @param progress - Progress data
   */
  private sendProgress(
    mainWindow: BrowserWindow | null,
    progress: MigrationProgress
  ): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.MIGRATION_PROGRESS, progress);
    }
  }

  /**
   * Verify migration was successful
   * @param originalSkills - Original skills before migration
   * @param appDir - Application directory
   * @returns True if all skills verified
   */
  async verifyMigration(originalSkills: Skill[], appDir: string): Promise<boolean> {
    logger.info('Verifying migration', 'MigrationService', {
      skillCount: originalSkills.length,
      appDir,
    });

    for (const skill of originalSkills) {
      const skillName = path.basename(skill.path);
      const targetPath = path.join(appDir, skillName);

      // Check if skill exists in target
      if (!await fsExtra.pathExists(targetPath)) {
        logger.error('Migration verification failed - skill not found', 'MigrationService', {
          skillName,
          targetPath,
        });
        return false;
      }

      // Check if SKILL.md exists
      const skillFile = path.join(targetPath, 'SKILL.md');
      if (!await fsExtra.pathExists(skillFile)) {
        logger.error('Migration verification failed - SKILL.md not found', 'MigrationService', {
          skillName,
          skillFile,
        });
        return false;
      }
    }

    logger.info('Migration verification successful', 'MigrationService');
    return true;
  }
}
