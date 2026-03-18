/**
 * Symlink IPC Handlers
 *
 * IPC handlers for symlink operations
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SymlinkService } from '../services/SymlinkService';
import { SkillService } from '../services/SkillService';
import { ConfigService } from '../services/ConfigService';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, IPCError, SkillSymlinkConfig } from '../../shared/types';

let symlinkService: SymlinkService | null = null;
let skillService: SkillService | null = null;
let configService: ConfigService | null = null;

/**
 * Convert error to IPCError format
 */
function toIPCError(error: unknown): IPCError {
  const message = ErrorHandler.format(error);
  let code = 'UNKNOWN_ERROR';

  if (error instanceof Error) {
    code = 'SYMLINK_ERROR';
  }

  return { code, message };
}

/**
 * Initialize services and register IPC handlers
 */
export function registerSymlinkHandlers(
  symlinkSvc: SymlinkService,
  skillSvc: SkillService,
  configSvc: ConfigService
): void {
  symlinkService = symlinkSvc;
  skillService = skillSvc;
  configService = configSvc;

  logger.info('Symlink handlers initialized', 'SymlinkHandlers');

  // Handler for symlink:update
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_UPDATE,
    async (
      _event,
      { skillName, config }: { skillName: string; config: SkillSymlinkConfig }
    ): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Updating symlink configuration', 'SymlinkHandlers', {
          skillName,
          enabled: config.enabled,
        });

        // Get configuration
        const appConfig = await configService!.load();

        // Get application directory
        const appDir = skillService!.getApplicationSkillsDirectory(appConfig);

        // Build skill path
        const skillPath = `${appDir}/${skillName}`;

        // Update symlink
        await symlinkService!.updateSkillSymlink(appDir, skillName, skillPath, config);

        logger.info('Symlink configuration updated', 'SymlinkHandlers', { skillName });

        return { success: true };
      } catch (error) {
        logger.error('Failed to update symlink configuration', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for symlink:get-status
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_GET_STATUS,
    async (
      _event,
      { skillName }: { skillName: string }
    ): Promise<IPCResponse<SkillSymlinkConfig | null>> => {
      try {
        logger.debug('Getting symlink status', 'SymlinkHandlers', { skillName });

        // Get configuration
        const appConfig = await configService!.load();

        // Get application directory
        const appDir = skillService!.getApplicationSkillsDirectory(appConfig);

        // Load database
        const db = await symlinkService!.loadDatabase(appDir);

        // Get symlink config
        const config = db.symlinks[skillName] || null;

        logger.debug('Symlink status retrieved', 'SymlinkHandlers', {
          skillName,
          hasConfig: !!config,
        });

        return { success: true, data: config };
      } catch (error) {
        logger.error('Failed to get symlink status', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for symlink:get-claude-dirs
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_GET_CLAUDE_DIRS,
    async (): Promise<IPCResponse<string[]>> => {
      try {
        logger.debug('Getting Claude directories', 'SymlinkHandlers');

        // Get configuration
        const appConfig = await configService!.load();

        // Get Claude directories
        const dirs = symlinkService!.getClaudeDirectories(appConfig.projectDirectories);

        logger.debug('Claude directories retrieved', 'SymlinkHandlers', {
          dirCount: dirs.length,
        });

        return { success: true, data: dirs };
      } catch (error) {
        logger.error('Failed to get Claude directories', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );
}
