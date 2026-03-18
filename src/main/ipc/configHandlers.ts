/**
 * Configuration IPC Handlers
 *
 * IPC handlers for configuration operations
 */

import { ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { ConfigService } from '../services/ConfigService';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, IPCError, Configuration } from '../../shared/types';

const execAsync = promisify(exec);

let configService: ConfigService | null = null;

/**
 * Convert error to IPCError format
 */
function toIPCError(error: unknown): IPCError {
  const message = ErrorHandler.format(error);
  let code = 'UNKNOWN_ERROR';

  if (error instanceof Error) {
    code = 'GENERAL_ERROR';
  }

  return { code, message };
}

/**
 * Initialize configuration service and register IPC handlers
 */
export function registerConfigHandlers(): void {
  // Initialize config service
  configService = new ConfigService();
  logger.info('Configuration service initialized', 'ConfigHandlers');

  // Handler for config:load
  ipcMain.handle(
    IPC_CHANNELS.CONFIG_LOAD,
    async (): Promise<IPCResponse<Configuration>> => {
      try {
        logger.debug('Loading configuration', 'ConfigHandlers');
        const config = await configService!.load();
        return { success: true, data: config };
      } catch (error) {
        logger.error('Failed to load configuration', 'ConfigHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for config:save
  ipcMain.handle(
    IPC_CHANNELS.CONFIG_SAVE,
    async (
      _event,
      { config }: { config: Partial<Configuration> }
    ): Promise<IPCResponse<Configuration>> => {
      try {
        logger.debug('Saving configuration', 'ConfigHandlers', config);
        const updated = await configService!.save(config);
        logger.info('Configuration saved successfully', 'ConfigHandlers');
        return { success: true, data: updated };
      } catch (error) {
        logger.error('Failed to save configuration', 'ConfigHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for dialog:select-directory
  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SELECT_DIRECTORY,
    async (): Promise<IPCResponse<{ canceled: boolean; filePaths: string[] }>> => {
      try {
        logger.debug('Opening directory selection dialog', 'ConfigHandlers');
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Claude Project Directory',
          buttonLabel: 'Select Directory',
        });

        return {
          success: true,
          data: {
            canceled: result.canceled,
            filePaths: result.filePaths,
          },
        };
      } catch (error) {
        logger.error('Failed to open directory dialog', 'ConfigHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for claude:check-install - Check if Claude CLI is installed
  ipcMain.handle(
    IPC_CHANNELS.CLAUDE_CHECK_INSTALL,
    async (): Promise<IPCResponse<{ installed: boolean; version?: string }>> => {
      try {
        logger.debug('Checking Claude CLI installation', 'ConfigHandlers');

        // Try to run claude --version to check if installed
        const { stdout } = await execAsync('claude --version', {
          timeout: 5000,
          env: { ...process.env, LANG: 'en_US.UTF-8' }
        });

        // Parse version from output (e.g., "claude version 1.0.0" or just "1.0.0")
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : stdout.trim();

        logger.info('Claude CLI found', 'ConfigHandlers', { version });
        return { success: true, data: { installed: true, version } };
      } catch (error) {
        // Claude not found or command failed
        logger.debug('Claude CLI not found', 'ConfigHandlers');
        return { success: true, data: { installed: false } };
      }
    }
  );

  logger.info('Configuration IPC handlers registered', 'ConfigHandlers');
}

/**
 * Get config service instance
 */
export function getConfigService(): ConfigService | null {
  return configService;
}
