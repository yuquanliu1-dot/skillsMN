/**
 * IPC handlers for configuration operations
 */

import { ipcMain } from 'electron';
import {
  ConfigSetRequest,
  ConfigValidateProjectDirRequest,
} from '../../shared/types';
import { ConfigService } from '../services/ConfigService';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../utils/Logger';

let configService: ConfigService | null = null;

/**
 * Get or create ConfigService instance
 */
function getConfigService(): ConfigService {
  if (!configService) {
    configService = new ConfigService();
  }
  return configService;
}

/**
 * Register configuration IPC handlers
 */
export function registerConfigHandlers(): void {
  logger.info('ConfigHandlers', 'Registering configuration IPC handlers');

  // config:get - Get current configuration
  ipcMain.handle('config:get', async () => {
    try {
      const service = getConfigService();
      const config = service.get();

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      return ErrorHandler.handleIPCError(error, 'config:get');
    }
  });

  // config:set - Update configuration
  ipcMain.handle('config:set', async (_event, updates: ConfigSetRequest) => {
    const startTime = Date.now();

    try {
      logger.info('ConfigHandlers', 'Updating configuration', { updates });

      const service = getConfigService();
      const updated = service.set(updates);

      logger.perf('ConfigHandlers', 'config:set', Date.now() - startTime);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return ErrorHandler.handleIPCError(error, 'config:set');
    }
  });

  // config:validate-project-dir - Validate a project directory
  ipcMain.handle(
    'config:validate-project-dir',
    async (_event, request: ConfigValidateProjectDirRequest) => {
      const startTime = Date.now();

      try {
        logger.info('ConfigHandlers', 'Validating project directory', {
          path: request.path,
        });

        const service = getConfigService();
        const result = service.validateProjectDirectory(request.path);

        logger.perf('ConfigHandlers', 'config:validate-project-dir', Date.now() - startTime, {
          isValid: result.isValid,
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return ErrorHandler.handleIPCError(error, 'config:validate-project-dir');
      }
    }
  );

  logger.info('ConfigHandlers', 'Configuration IPC handlers registered');
}

/**
 * Clean up config handlers
 */
export function cleanupConfigHandlers(): void {
  configService = null;
  ipcMain.removeHandler('config:get');
  ipcMain.removeHandler('config:set');
  ipcMain.removeHandler('config:validate-project-dir');
  logger.info('ConfigHandlers', 'Configuration IPC handlers cleaned up');
}
