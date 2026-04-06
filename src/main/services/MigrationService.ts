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
import { Configuration, Skill, MigrationOptions, MigrationProgress, MigrationResult, ConflictStrategy } from '../../shared/types';
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
      skippedCount: 0,
      renamedCount: 0,
      overwrittenCount: 0,
      failedSkills: [],
      skippedSkills: [],
      renamedSkills: [],
      duration: 0,
    };

    // Get application directory
    const appDir = this.getApplicationSkillsDirectory(config);

    // Ensure application directory exists
    await SkillDirectoryModel.ensureDirectory(appDir);

    // Process each skill
    const conflictStrategy = options.conflictStrategy || 'rename';

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

        // Migrate skill with conflict handling
        const migrationResult = await this.migrateSkill(skill, appDir, options, conflictStrategy);

        // Update result based on migration outcome
        if (migrationResult.skipped) {
          result.skippedCount++;
          result.skippedSkills.push({
            name: skill.name,
            reason: migrationResult.reason || 'Skipped due to conflict',
          });
          logger.debug('Skill skipped', 'MigrationService', {
            skillName: skill.name,
            reason: migrationResult.reason,
          });
        } else {
          result.migratedCount++;
          if (migrationResult.renamedTo) {
            result.renamedCount++;
            result.renamedSkills.push({
              originalName: skill.name,
              newName: migrationResult.renamedTo,
            });
            logger.debug('Skill migrated with rename', 'MigrationService', {
              originalName: skill.name,
              newName: migrationResult.renamedTo,
              progress: `${i + 1}/${skills.length}`,
            });
          } else if (migrationResult.overwritten) {
            result.overwrittenCount++;
            logger.debug('Skill migrated with overwrite', 'MigrationService', {
              skillName: skill.name,
              progress: `${i + 1}/${skills.length}`,
            });
          } else {
            logger.debug('Skill migrated successfully', 'MigrationService', {
              skillName: skill.name,
              progress: `${i + 1}/${skills.length}`,
            });
          }
        }
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
   * Result of migrating a single skill
   */
  private migrateSkillResult: {
    skipped?: boolean;
    renamedTo?: string;
    overwritten?: boolean;
    reason?: string;
  };

  /**
   * Migrate a single skill with conflict handling
   * @param skill - Skill to migrate
   * @param appDir - Application directory
   * @param options - Migration options
   * @param conflictStrategy - Strategy for handling name conflicts
   * @returns Migration result details
   */
  private async migrateSkill(
    skill: Skill,
    appDir: string,
    options: MigrationOptions,
    conflictStrategy: ConflictStrategy
  ): Promise<{ skipped?: boolean; renamedTo?: string; overwritten?: boolean; reason?: string }> {
    const skillName = path.basename(skill.path);
    let targetPath = path.join(appDir, skillName);
    let finalSkillName = skillName;
    let overwritten = false;

    // Check if skill already exists in target
    if (await fsExtra.pathExists(targetPath)) {
      switch (conflictStrategy) {
        case 'skip':
          return {
            skipped: true,
            reason: `Skill already exists: ${skillName}`,
          };

        case 'overwrite':
          // Remove existing skill before migration
          await fsExtra.remove(targetPath);
          overwritten = true;
          break;

        case 'rename':
        default:
          // Find a unique name by appending a number
          finalSkillName = await this.findUniqueSkillName(appDir, skillName);
          targetPath = path.join(appDir, finalSkillName);
          break;
      }
    }

    if (options.deleteOriginals) {
      // Move skill (original will be removed)
      await fsExtra.move(skill.path, targetPath);
    } else {
      // Copy skill (original will be kept)
      await fsExtra.copy(skill.path, targetPath);
    }

    return {
      renamedTo: finalSkillName !== skillName ? finalSkillName : undefined,
      overwritten,
    };
  }

  /**
   * Find a unique skill name by appending a number suffix
   * @param appDir - Application directory
   * @param baseName - Original skill name
   * @returns Unique skill name
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
