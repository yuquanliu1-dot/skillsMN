/**
 * Migration IPC Handlers
 *
 * IPC handlers for migration operations
 */

import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { MigrationService } from '../services/MigrationService';
import { SkillService } from '../services/SkillService';
import { ConfigService } from '../services/ConfigService';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, IPCError, MigrationOptions, MigrationResult, Skill } from '../../shared/types';

let migrationService: MigrationService | null = null;
let skillService: SkillService | null = null;
let configService: ConfigService | null = null;

/**
 * Convert error to IPCError format
 */
function toIPCError(error: unknown): IPCError {
  const message = ErrorHandler.format(error);
  let code = 'UNKNOWN_ERROR';

  if (error instanceof Error) {
    code = 'MIGRATION_ERROR';
  }

  return { code, message };
}

/**
 * Initialize services and register IPC handlers
 */
export function registerMigrationHandlers(
  migrationSvc: MigrationService,
  skillSvc: SkillService,
  configSvc: ConfigService
): void {
  migrationService = migrationSvc;
  skillService = skillSvc;
  configService = configSvc;

  logger.info('Migration handlers initialized', 'MigrationHandlers');

  // Handler for migration:check-needed
  ipcMain.handle(
    IPC_CHANNELS.MIGRATION_CHECK_NEEDED,
    async (): Promise<IPCResponse<boolean>> => {
      try {
        logger.debug('Checking if migration is needed', 'MigrationHandlers');

        // Get configuration
        const config = await configService!.load();

        // Check if migration is needed
        const needed = await migrationService!.needsMigration(config);

        logger.debug('Migration check completed', 'MigrationHandlers', { needed });

        return { success: true, data: needed };
      } catch (error) {
        logger.error('Failed to check migration status', 'MigrationHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for migration:detect-skills
  ipcMain.handle(
    IPC_CHANNELS.MIGRATION_DETECT_SKILLS,
    async (): Promise<IPCResponse<{ global: Skill[]; project: Skill[] }>> => {
      try {
        logger.debug('Detecting existing skills for migration', 'MigrationHandlers');

        // Get configuration
        const config = await configService!.load();

        // Detect skills
        const skills = await migrationService!.detectExistingSkills(config);

        logger.info('Skills detected for migration', 'MigrationHandlers', {
          globalCount: skills.global.length,
          projectCount: skills.project.length,
        });

        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to detect existing skills', 'MigrationHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for migration:start
  ipcMain.handle(
    IPC_CHANNELS.MIGRATION_START,
    async (
      event,
      { skills, options }: { skills: Skill[]; options: MigrationOptions }
    ): Promise<IPCResponse<MigrationResult>> => {
      try {
        logger.info('Starting migration', 'MigrationHandlers', {
          skillCount: skills.length,
          options,
        });

        // Get configuration
        const config = await configService!.load();

        // Get main window for progress updates
        const mainWindow = BrowserWindow.fromWebContents(event.sender);

        // Run migration
        const result = await migrationService!.migrateSkills(
          config,
          skills,
          options,
          mainWindow
        );

        logger.info('Migration completed', 'MigrationHandlers', {
          migratedCount: result.migratedCount,
          failedCount: result.failedCount,
          duration: result.duration,
        });

        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to start migration', 'MigrationHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for migration:check-directory - Check if a specific directory has skills
  ipcMain.handle(
    IPC_CHANNELS.MIGRATION_CHECK_DIRECTORY,
    async (
      _event,
      { directoryPath }: { directoryPath: string }
    ): Promise<IPCResponse<Skill[]>> => {
      try {
        logger.debug('Checking directory for skills', 'MigrationHandlers', { directoryPath });

        // Scan the directory for skills
        const skills = await migrationService!.scanDirectoryForSkills(directoryPath);

        logger.info('Directory skill check completed', 'MigrationHandlers', {
          directoryPath,
          skillCount: skills.length,
        });

        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to check directory for skills', 'MigrationHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );
}
