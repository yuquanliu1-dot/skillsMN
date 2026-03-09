/**
 * Configuration IPC Handlers
 *
 * IPC handlers for configuration operations
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { ConfigService } from '../services/ConfigService';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, Configuration } from '../../shared/types';

let configService: ConfigService | null = null;

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
        const message = ErrorHandler.format(error);
        logger.error('Failed to load configuration', 'ConfigHandlers', error);
        return { success: false, error: message };
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
        const message = ErrorHandler.format(error);
        logger.error('Failed to save configuration', 'ConfigHandlers', error);
        return { success: false, error: message };
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
