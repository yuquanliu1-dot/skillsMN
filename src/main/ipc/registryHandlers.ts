/**
 * Registry IPC Handlers
 *
 * IPC handlers for registry operations
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/Logger';
import { RegistryService, RegistryErrorCode } from '../services/RegistryService';
import { SkillInstaller } from '../services/SkillInstaller';
import { IPC_CHANNELS } from '../../shared/constants';
import { validateInstallRequest } from '../models/InstallFromRegistryRequest';
import type { InstallFromRegistryRequest, InstallProgressEvent, SkillSourceMetadata } from '../../shared/types';

/**
 * User-friendly error messages for registry errors
 */
const REGISTRY_ERROR_MESSAGES: Record<RegistryErrorCode, string> = {
  GIT_NOT_FOUND: 'Git is required but not installed. Please install Git and restart the application.',
  REPO_NOT_FOUND: 'This skill repository could not be found. It may have been moved or deleted.',
  PRIVATE_REPO: 'This skill is in a private repository and cannot be accessed.',
  NETWORK_ERROR: 'Unable to connect to GitHub. Please check your internet connection.',
  DISK_SPACE_ERROR: 'Not enough disk space to download this skill.',
  CLONE_FAILED: 'Failed to download the skill repository. Please try again.',
  SKILL_NOT_FOUND: 'This skill was not found in the repository. It may have been renamed or removed.',
  REGISTRY_UNAVAILABLE: 'The skills registry is currently unavailable. Please try again later.',
  INVALID_RESPONSE: 'Received an invalid response from the registry. Please try again.'
};

/**
 * Register Registry IPC handlers
 */
export function registerRegistryHandlers(): void {
  const skillInstaller = new SkillInstaller();
  const registryService = new RegistryService();

  /**
   * Handler for registry:search
   */
  ipcMain.handle(
    IPC_CHANNELS.REGISTRY_SEARCH,
    async (_event, { query, limit }: { query: string; limit?: number }) => {
      try {
        logger.debug('Searching registry for skills', 'RegistryHandlers', { query, limit });

        // Validate input
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Search query must be a non-empty string'
            }
          };
        }

        // Set defaults
        const searchLimit = limit || 20;

        // Search skills via registry service
        const results = await registryService.searchSkills(query, searchLimit);

        logger.info('Registry search complete', 'RegistryHandlers', {
          query,
          resultsCount: results.length
        });

        return {
          success: true,
          data: results
        };
      } catch (error) {
        logger.error('Registry search failed', 'RegistryHandlers', error);
        return {
          success: false,
          error: {
            code: 'REGISTRY_ERROR',
            message: error instanceof Error ? error.message : 'Registry search failed'
          }
        };
      }
    }
  );

  /**
   * Handler for registry:install
   */
  ipcMain.handle(
    IPC_CHANNELS.REGISTRY_INSTALL,
    async (event, { request, targetDirectory }: {
      request: InstallFromRegistryRequest;
      targetDirectory: string;
    }) => {
      try {
        logger.debug('Installing skill from registry', 'RegistryHandlers', { request, targetDirectory });

        // Validate request
        if (!validateInstallRequest(request)) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid installation request'
            }
          };
        }

        // Get window for progress updates
        const window = BrowserWindow.fromWebContents(event.sender);

        // Install skill with progress callback
        const result = await skillInstaller.installFromRegistry(
          request,
          targetDirectory,
          (progressEvent: InstallProgressEvent) => {
            // Send progress update to renderer
            if (window && !window.isDestroyed()) {
              window.webContents.send(
                IPC_CHANNELS.REGISTRY_INSTALL_PROGRESS,
                progressEvent
              );
            }
          }
        );

        if (result.success) {
          logger.info('Skill installed successfully', 'RegistryHandlers', {
            skillPath: result.skillPath
          });
        } else {
          logger.error('Skill installation failed', 'RegistryHandlers', {
            error: result.error,
            errorCode: result.errorCode
          });
        }

        return {
          success: result.success,
          data: result.success ? { skillPath: result.skillPath } : undefined,
          error: !result.success ? {
            code: result.errorCode || 'REGISTRY_INSTALLATION_ERROR',
            message: result.error || 'Installation failed'
          } : undefined
        };
      } catch (error: any) {
        const errorCode = error.code || 'REGISTRY_INSTALLATION_ERROR';
        logger.error('Skill installation failed with exception', 'RegistryHandlers', {
          error: error.message,
          errorCode,
          stack: error.stack
        });

        return {
          success: false,
          error: {
            code: errorCode,
            message: error.message || 'Installation failed'
          }
        };
      }
    }
  );

  /**
   * Handler for registry:check-installed
   */
  ipcMain.handle(
    IPC_CHANNELS.REGISTRY_CHECK_INSTALLED,
    async (_event, { skillId, targetDirectory }: {
      skillId: string;
      targetDirectory: string;
    }) => {
      try {
        logger.debug('Checking if skill is installed', 'RegistryHandlers', {
          skillId,
          targetDirectory
        });

        // Check if skill directory exists
        const skillPath = path.join(targetDirectory, skillId);
        const exists = fs.existsSync(skillPath);

        if (exists) {
          // Check for .source.json metadata
          const sourcePath = path.join(skillPath, '.source.json');
          const installedAt = fs.existsSync(sourcePath)
            ? (JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as SkillSourceMetadata).installedAt
            : undefined;

          logger.info('Skill is installed', 'RegistryHandlers', {
            skillPath,
            installedAt
          });

          return {
            success: true,
            data: {
              installed: true,
              skillPath,
              installedAt
            }
          };
        }

        logger.info('Skill is not installed', 'RegistryHandlers', { skillId });

        return {
          success: true,
          data: {
            installed: false
          }
        };
      } catch (error) {
        logger.error('Failed to check installation status', 'RegistryHandlers', error);
        return {
          success: false,
          error: {
            code: 'CHECK_ERROR',
            message: error instanceof Error ? error.message : 'Failed to check installation'
          }
        };
      }
    }
  );

  /**
   * Handler for registry:get-content
   * Fetches skill content from the registry for preview
   */
  ipcMain.handle(
    IPC_CHANNELS.REGISTRY_GET_CONTENT,
    async (_event, { source, skillId }: {
      source: string;
      skillId: string;
    }) => {
      try {
        logger.debug('Fetching skill content from registry', 'RegistryHandlers', {
          source,
          skillId
        });

        const result = await registryService.getSkillContent(source, skillId);

        if (result.success && result.content) {
          logger.info('Skill content fetched successfully', 'RegistryHandlers', {
            source,
            skillId,
            contentLength: result.content.length
          });

          return {
            success: true,
            data: result.content
          };
        }

        // Handle structured error response
        const errorCode = result.errorCode || 'CLONE_FAILED';
        const errorMessage = result.errorMessage ||
          REGISTRY_ERROR_MESSAGES[errorCode] ||
          'Failed to fetch skill content';

        logger.error('Failed to fetch skill content', 'RegistryHandlers', {
          source,
          skillId,
          errorCode,
          errorMessage
        });

        return {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage
          }
        };
      } catch (error) {
        logger.error('Failed to fetch skill content', 'RegistryHandlers', error);
        return {
          success: false,
          error: {
            code: 'REGISTRY_CONTENT_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch skill content'
          }
        };
      }
    }
  );

  logger.info('Registry IPC handlers registered', 'RegistryHandlers');
}
