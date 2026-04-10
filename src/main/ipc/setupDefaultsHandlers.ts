/**
 * Setup Defaults IPC Handlers
 *
 * IPC handlers for loading default configuration values for the setup wizard
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { SetupDefaultsService } from '../services/SetupDefaultsService';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResponse, IPCError } from '../../shared/types';

function toIPCError(error: unknown): IPCError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { code: 'SETUP_DEFAULTS_ERROR', message };
}

/**
 * Register setup defaults IPC handlers
 */
export function registerSetupDefaultsHandlers(): void {
  logger.info('Registering setup defaults handlers', 'SetupDefaultsHandlers');

  // Handler for getting repository default configuration
  ipcMain.handle(
    IPC_CHANNELS.SETUP_DEFAULTS_GET_REPO_CONFIG,
    async (): Promise<IPCResponse<any>> => {
      try {
        logger.debug('Getting repo config defaults', 'SetupDefaultsHandlers');
        const config = await SetupDefaultsService.getRepoConfig();
        return { success: true, data: config };
      } catch (error) {
        logger.error('Failed to get repo config', 'SetupDefaultsHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for getting AI default configuration
  ipcMain.handle(
    IPC_CHANNELS.SETUP_DEFAULTS_GET_AI_CONFIG,
    async (): Promise<IPCResponse<any>> => {
      try {
        logger.debug('Getting AI config defaults', 'SetupDefaultsHandlers');
        const config = await SetupDefaultsService.getAIConfig();
        return { success: true, data: config };
      } catch (error) {
        logger.error('Failed to get AI config', 'SetupDefaultsHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  logger.info('Setup defaults handlers registered', 'SetupDefaultsHandlers');
}
