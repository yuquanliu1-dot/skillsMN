/**
 * Private Repository IPC Handlers
 *
 * IPC handlers for private repository operations (Feature 005)
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { PrivateRepoService } from '../services/PrivateRepoService';
import { PathValidator } from '../services/PathValidator';
import { getConfigService } from './configHandlers';
import { IPC_CHANNELS } from '../../shared/constants';
import type { PrivateRepo, PrivateSkill, IPCResponse } from '../../shared/types';

let pathValidator: PathValidator | null = null;

/**
 * Register private repository IPC handlers
 */
export async function registerPrivateRepoHandlers(validator: PathValidator): Promise<void> {
  pathValidator = validator;

  // Initialize service and wait for completion
  try {
    await PrivateRepoService.initialize();
    logger.info('PrivateRepoService initialized successfully', 'PrivateRepoHandlers');
  } catch (error) {
    logger.error('Failed to initialize PrivateRepoService', 'PrivateRepoHandlers', error);
  }

  // Handler for private-repo:add
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_ADD,
    async (
      _event,
      { url, pat, displayName, provider, instanceUrl }: { url: string; pat: string; displayName?: string; provider?: 'github' | 'gitlab'; instanceUrl?: string }
    ): Promise<IPCResponse<PrivateRepo>> => {
      try {
        logger.debug('Adding private repository', 'PrivateRepoHandlers', { url, provider });

        const repo = await PrivateRepoService.addRepo(url, pat, displayName, provider, instanceUrl);

        logger.info('Private repository added', 'PrivateRepoHandlers', {
          id: repo.id,
          url: repo.url,
          provider: repo.provider,
        });

        return { success: true, data: repo };
      } catch (error) {
        logger.error('Failed to add private repo', 'PrivateRepoHandlers', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorCode = 'ADD_FAILED';
        let actionableMessage = errorMessage;

        // Provide actionable error messages
        if (errorMessage.includes('Invalid repository URL')) {
          errorCode = 'INVALID_URL';
          actionableMessage = 'Invalid repository URL. Please use format: https://github.com/owner/repo or https://gitlab.com/owner/repo';
        } else if (errorMessage.includes('Failed to connect') || errorMessage.includes('authentication failed')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'Authentication failed. Please check your PAT has read access to this repository.';
        } else if (errorMessage.includes('already exists')) {
          errorCode = 'ALREADY_EXISTS';
          actionableMessage = 'This repository is already configured. You can edit it in Settings.';
        } else if (errorMessage.includes('Encryption not available')) {
          errorCode = 'ENCRYPTION_FAILED';
          actionableMessage = 'Failed to encrypt PAT. Please check your system credential store is available.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  // Handler for private-repo:list
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_LIST,
    async (): Promise<IPCResponse<PrivateRepo[]>> => {
      try {
        const repos = await PrivateRepoService.listRepos();
        return { success: true, data: repos };
      } catch (error) {
        logger.error('Failed to list private repos', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'LIST_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:get
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_GET,
    async (_event, { repoId }: { repoId: string }): Promise<IPCResponse<PrivateRepo | null>> => {
      try {
        const repo = await PrivateRepoService.getRepo(repoId);
        return { success: true, data: repo };
      } catch (error) {
        logger.error('Failed to get private repo', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'GET_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:update
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_UPDATE,
    async (
      _event,
      { repoId, updates }: { repoId: string; updates: Partial<PrivateRepo> }
    ): Promise<IPCResponse<PrivateRepo>> => {
      try {
        logger.debug('Updating private repository', 'PrivateRepoHandlers', { repoId });

        const repo = await PrivateRepoService.updateRepo(repoId, updates);

        logger.info('Private repository updated', 'PrivateRepoHandlers', { repoId });

        return { success: true, data: repo };
      } catch (error) {
        logger.error('Failed to update private repo', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:remove
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_REMOVE,
    async (_event, { repoId }: { repoId: string }): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Removing private repository', 'PrivateRepoHandlers', { repoId });

        await PrivateRepoService.removeRepo(repoId);

        logger.info('Private repository removed', 'PrivateRepoHandlers', { repoId });

        return { success: true, data: undefined };
      } catch (error) {
        logger.error('Failed to remove private repo', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'REMOVE_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:test-connection
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_TEST_CONNECTION,
    async (
      _event,
      { repoId }: { repoId: string }
    ): Promise<
      IPCResponse<{
        valid: boolean;
        repository?: {
          name: string;
          description: string;
          defaultBranch: string;
        };
        error?: string;
      }>
    > => {
      try {
        logger.debug('Testing private repository connection', 'PrivateRepoHandlers', { repoId });

        const result = await PrivateRepoService.testConnection(repoId);

        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to test connection', 'PrivateRepoHandlers', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorCode = 'TEST_FAILED';
        let actionableMessage = errorMessage;

        if (errorMessage.includes('Repository not found')) {
          errorCode = 'REPO_NOT_FOUND';
          actionableMessage = 'Repository configuration not found. Please refresh and try again.';
        } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'PAT has expired or been revoked. Please update your PAT in Settings.';
        } else if (errorMessage.includes('rate limit')) {
          errorCode = 'RATE_LIMIT';
          actionableMessage = 'GitHub API rate limit exceeded. Please wait a few minutes before trying again.';
        } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
          errorCode = 'NETWORK_ERROR';
          actionableMessage = 'Cannot connect to GitHub. Please check your internet connection.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  // Handler for private-repo:get-skills
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_GET_SKILLS,
    async (_event, { repoId }: { repoId: string }): Promise<IPCResponse<PrivateSkill[]>> => {
      try {
        logger.debug('Getting skills from private repository', 'PrivateRepoHandlers', { repoId });

        const skills = await PrivateRepoService.getSkills(repoId);

        logger.info('Retrieved skills from private repo', 'PrivateRepoHandlers', {
          repoId,
          count: skills.length,
        });

        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to get private repo skills', 'PrivateRepoHandlers', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorCode = 'GET_SKILLS_FAILED';
        let actionableMessage = errorMessage;

        if (errorMessage.includes('Repository not found')) {
          errorCode = 'REPO_NOT_FOUND';
          actionableMessage = 'Repository not found. It may have been removed. Please refresh the repository list.';
        } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'PAT has expired. Please update your PAT in Settings → Repositories.';
        } else if (errorMessage.includes('rate limit')) {
          errorCode = 'RATE_LIMIT';
          actionableMessage = 'GitHub API rate limit exceeded. Skills list cached for 5 minutes. Please try again later.';
        } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
          errorCode = 'NETWORK_ERROR';
          actionableMessage = 'Cannot connect to GitHub. Please check your internet connection and try again.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  // Handler for private-repo:search-skills
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_SEARCH_SKILLS,
    async (
      _event,
      { repoId, query }: { repoId: string; query: string }
    ): Promise<IPCResponse<PrivateSkill[]>> => {
      try {
        logger.debug('Searching skills in private repository', 'PrivateRepoHandlers', {
          repoId,
          query,
        });

        const skills = await PrivateRepoService.searchSkills(repoId, query);

        logger.info('Searched skills in private repo', 'PrivateRepoHandlers', {
          repoId,
          query,
          count: skills.length,
        });

        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to search private repo skills', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'SEARCH_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:install-skill
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_INSTALL_SKILL,
    async (
      _event,
      {
        repoId,
        skillPath,
        conflictResolution,
      }: {
        repoId: string;
        skillPath: string;
        conflictResolution?: 'overwrite' | 'rename' | 'skip';
      }
    ): Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>> => {
      try {
        logger.debug('Installing skill from private repository', 'PrivateRepoHandlers', {
          repoId,
          skillPath,
        });

        // Load config to get application directory
        const configService = getConfigService();
        if (!configService) {
          throw new Error('ConfigService not initialized');
        }
        const config = await configService.load();

        const result = await PrivateRepoService.installSkill(
          repoId,
          skillPath,
          config,
          conflictResolution
        );

        if (result.success) {
          logger.info('Installed skill from private repo', 'PrivateRepoHandlers', {
            repoId,
            skillPath,
            newPath: result.newPath,
          });
        }

        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to install skill from private repo', 'PrivateRepoHandlers', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorCode = 'INSTALL_FAILED';
        let actionableMessage = errorMessage;

        if (errorMessage.includes('Repository not found')) {
          errorCode = 'REPO_NOT_FOUND';
          actionableMessage = 'Repository not found. It may have been removed. Please refresh and try again.';
        } else if (errorMessage.includes('not configured')) {
          errorCode = 'INVALID_TARGET';
          actionableMessage = 'Application skills directory not configured. Please check your settings.';
        } else if (errorMessage.includes('Skill not found')) {
          errorCode = 'SKILL_NOT_FOUND';
          actionableMessage = 'Skill not found in repository. It may have been moved or deleted. Please refresh the skill list.';
        } else if (errorMessage.includes('ENOSPC') || errorMessage.includes('disk')) {
          errorCode = 'DISK_FULL';
          actionableMessage = 'Not enough disk space to install skill. Please free up space and try again.';
        } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
          errorCode = 'PERMISSION_DENIED';
          actionableMessage = 'Permission denied. Please check write permissions for the application directory.';
        } else if (errorMessage.includes('already exists') && !conflictResolution) {
          errorCode = 'CONFLICT';
          actionableMessage = 'Skill already exists. Please choose to overwrite, rename, or skip.';
        } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'PAT has expired. Please update your PAT in Settings → Repositories.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  // Handler for private-repo:check-updates
  ipcMain.handle(
    IPC_CHANNELS.PRIVATE_REPO_CHECK_UPDATES,
    async (): Promise<IPCResponse<Map<string, { hasUpdate: boolean }>>> => {
      try {
        logger.debug('Checking for private skill updates', 'PrivateRepoHandlers');

        const updates = await PrivateRepoService.checkForUpdates();

        logger.info('Checked for private skill updates', 'PrivateRepoHandlers', {
          count: updates.size,
        });

        return { success: true, data: updates };
      } catch (error) {
        logger.error('Failed to check for updates', 'PrivateRepoHandlers', error);
        return {
          success: false,
          error: {
            code: 'CHECK_UPDATES_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  // Handler for private-repo:get-skill-content
  ipcMain.handle(
    'private-repo:get-skill-content',
    async (
      _event,
      { repoId, skillPath }: { repoId: string; skillPath: string }
    ): Promise<IPCResponse<string>> => {
      try {
        logger.debug('Getting skill content from private repository', 'PrivateRepoHandlers', {
          repoId,
          skillPath,
        });

        const content = await PrivateRepoService.getSkillContent(repoId, skillPath);

        logger.info('Retrieved skill content from private repo', 'PrivateRepoHandlers', {
          repoId,
          skillPath,
          contentLength: content.length,
        });

        return { success: true, data: content };
      } catch (error) {
        logger.error('Failed to get skill content from private repo', 'PrivateRepoHandlers', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorCode = 'GET_CONTENT_FAILED';
        let actionableMessage = errorMessage;

        if (errorMessage.includes('Repository not found')) {
          errorCode = 'REPO_NOT_FOUND';
          actionableMessage = 'Repository not found. It may have been removed. Please refresh and try again.';
        } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'PAT has expired. Please update your PAT in Settings → Repositories.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  // Handler for private-repo:upload-skill
  ipcMain.handle(
    'private-repo:upload-skill',
    async (
      _event,
      {
        repoId,
        skillPath,
        skillContent,
        skillName,
        commitMessage,
      }: {
        repoId: string;
        skillPath: string;
        skillContent: string;
        skillName: string;
        commitMessage?: string;
      }
    ): Promise<IPCResponse<{ sha: string }>> => {
      try {
        logger.debug('Uploading skill to private repository', 'PrivateRepoHandlers', {
          repoId,
          skillPath,
          skillName,
        });

        const result = await PrivateRepoService.uploadSkillToRepo(
          repoId,
          skillPath,
          skillContent,
          skillName,
          commitMessage
        );

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        logger.info('Successfully uploaded skill to private repo', 'PrivateRepoHandlers', {
          repoId,
          skillPath,
          sha: result.sha,
        });

        return { success: true, data: { sha: result.sha || '' } };
      } catch (error) {
        // Convert Error object to plain object for logging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorData = error instanceof Error
          ? { message: error.message, stack: error.stack, name: error.name }
          : error;

        logger.error('Failed to upload skill to private repo', 'PrivateRepoHandlers', {
          error: errorData,
          originalMessage: errorMessage
        });

        let errorCode = 'UPLOAD_FAILED';
        let actionableMessage = errorMessage;

        if (errorMessage.includes('Repository not found')) {
          errorCode = 'REPO_NOT_FOUND';
          actionableMessage = 'Repository not found. It may have been removed. Please refresh and try again.';
        } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
          errorCode = 'AUTH_FAILED';
          actionableMessage = 'PAT has expired or lacks write permissions. Please update your PAT in Settings → Repositories.';
        } else if (errorMessage.includes('403')) {
          errorCode = 'FORBIDDEN';
          actionableMessage = 'Access forbidden. Please ensure your PAT has write permissions.';
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: actionableMessage,
          },
        };
      }
    }
  );

  logger.info('Private repository IPC handlers registered', 'PrivateRepoHandlers');
}
