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
import {
  IPCResponse,
  IPCError,
  SkillSymlinkConfig,
  AgentTool,
  MultiTargetSymlinkConfig,
} from '../../shared/types';

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

  // Handler for symlink:get-installed-tools
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_GET_INSTALLED_TOOLS,
    async (): Promise<IPCResponse<AgentTool[]>> => {
      try {
        logger.debug('Getting installed agent tools and project directories', 'SymlinkHandlers');

        // Get configuration to access project directories
        const appConfig = await configService!.load();

        // Get installed tools including project directories
        const tools = await symlinkService!.getInstalledTools(appConfig.projectDirectories);

        logger.debug('Installed tools retrieved', 'SymlinkHandlers', {
          toolCount: tools.length,
          tools: tools.map((t) => t.name),
        });

        return { success: true, data: tools };
      } catch (error) {
        logger.error('Failed to get installed tools', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for symlink:update-target
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_UPDATE_TARGET,
    async (
      _event,
      {
        skillName,
        skillPath,
        toolId,
        enabled,
      }: {
        skillName: string;
        skillPath: string;
        toolId: string;
        enabled: boolean;
      }
    ): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Updating single target symlink', 'SymlinkHandlers', {
          skillName,
          toolId,
          enabled,
        });

        // Get configuration
        const appConfig = await configService!.load();

        // Get application directory
        const appDir = skillService!.getApplicationSkillsDirectory(appConfig);

        // Update single target symlink (pass project directories for project-* IDs)
        await symlinkService!.updateSingleTargetSymlink(
          appDir,
          skillName,
          skillPath,
          toolId,
          enabled,
          appConfig.projectDirectories
        );

        logger.info('Single target symlink updated', 'SymlinkHandlers', {
          skillName,
          toolId,
          enabled,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to update single target symlink', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for symlink:get-multi-status
  ipcMain.handle(
    IPC_CHANNELS.SYMLINK_GET_MULTI_STATUS,
    async (
      _event,
      { skillName }: { skillName: string }
    ): Promise<IPCResponse<Record<string, boolean>>> => {
      try {
        logger.debug('Getting multi-target symlink status', 'SymlinkHandlers', { skillName });

        // Get configuration
        const appConfig = await configService!.load();

        // Get application directory
        const appDir = skillService!.getApplicationSkillsDirectory(appConfig);

        // Get status (pass project directories for project-* IDs)
        const status = await symlinkService!.getSkillSymlinkStatus(
          appDir,
          skillName,
          appConfig.projectDirectories
        );

        logger.debug('Multi-target symlink status retrieved', 'SymlinkHandlers', {
          skillName,
          status,
        });

        return { success: true, data: status };
      } catch (error) {
        logger.error('Failed to get multi-target symlink status', 'SymlinkHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );
}
