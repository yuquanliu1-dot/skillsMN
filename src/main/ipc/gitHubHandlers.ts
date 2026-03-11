/**
 * GitHub IPC Handlers
 *
 * IPC handlers for GitHub public skill discovery operations
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { GitHubService } from '../services/GitHubService';
import { PathValidator } from '../services/PathValidator';
import { IPC_CHANNELS } from '../../shared/constants';
import type { GitHubSearchResponse } from '../models/SearchResult';
import { validateSearchQuery } from '../models/SearchResult';

let pathValidator: PathValidator | null = null;

/**
 * Register GitHub IPC handlers
 */
export function registerGitHubHandlers(validator: PathValidator): void {
  pathValidator = validator;

  // Handler for github:search
  ipcMain.handle(
    IPC_CHANNELS.GITHUB_SEARCH_SKILLS,
    async (_event, { query, page }: { query: string; page?: number }): Promise<GitHubSearchResponse> => {
      try {
        logger.debug('Searching GitHub for skills', 'GitHubHandlers', { query, page });

        // Validate query
        const validationError = validateSearchQuery(query);
        if (validationError) {
          throw new Error(validationError);
        }

        const response = await GitHubService.searchSkills(query, page || 1);

        logger.info('GitHub search complete', 'GitHubHandlers', {
          query,
          resultsCount: response.results.length,
        });

        return response;
      } catch (error) {
        logger.error('GitHub search failed', 'GitHubHandlers', error);
        throw error;
      }
    }
  );

  // Handler for github:preview
  ipcMain.handle(
    IPC_CHANNELS.GITHUB_PREVIEW_SKILL,
    async (_event, { downloadUrl }: { downloadUrl: string }): Promise<{ content: string }> => {
      try {
        logger.debug('Previewing skill from GitHub', 'GitHubHandlers', { downloadUrl });

        const content = await GitHubService.previewSkill(downloadUrl);

        logger.info('Skill preview loaded', 'GitHubHandlers', {
          length: content.length,
        });

        return { content };
      } catch (error) {
        logger.error('Failed to preview skill', 'GitHubHandlers', error);
        throw error;
      }
    }
  );

  // Handler for github:install
  ipcMain.handle(
    IPC_CHANNELS.GITHUB_INSTALL_SKILL,
    async (
      _event,
      {
        repositoryName,
        skillFilePath,
        downloadUrl,
        targetDirectory,
        conflictResolution,
      }: {
        repositoryName: string;
        skillFilePath: string;
        downloadUrl: string;
        targetDirectory: 'project' | 'global';
        conflictResolution?: 'overwrite' | 'rename' | 'skip';
      }
    ) => {
      try {
        logger.debug('Installing skill from GitHub', 'GitHubHandlers', {
          repositoryName,
          skillFilePath,
          targetDirectory,
          conflictResolution,
        });

        if (!pathValidator) {
          throw new Error('PathValidator not initialized');
        }

        const result = await GitHubService.installSkill(
          repositoryName,
          skillFilePath,
          downloadUrl,
          targetDirectory,
          pathValidator,
          conflictResolution
        );

        if (result.success) {
          logger.info('Skill installed successfully', 'GitHubHandlers', {
            repositoryName,
            newPath: result.newPath,
          });
        } else {
          logger.warn('Skill installation failed', 'GitHubHandlers', {
            error: result.error,
          });
        }

        return result;
      } catch (error) {
        logger.error('Failed to install skill', 'GitHubHandlers', error);
        throw error;
      }
    }
  );

  logger.info('GitHub IPC handlers registered', 'GitHubHandlers');
}

/**
 * Get rate limit info
 */
export function getRateLimitInfo() {
  return GitHubService.getRateLimitInfo();
}
