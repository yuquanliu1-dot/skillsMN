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
    async (_event, { query, page }: { query: string; page?: number }) => {
      try {
        logger.debug('Searching GitHub for skills', 'GitHubHandlers', { query, page });

        // Validate query
        const validationError = validateSearchQuery(query);
        if (validationError) {
          return {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationError },
          };
        }

        const response = await GitHubService.searchSkills(query, page || 1);

        logger.info('GitHub search complete', 'GitHubHandlers', {
          query,
          resultsCount: response.results.length,
        });

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        logger.error('GitHub search failed', 'GitHubHandlers', error);
        const errorMessage = error instanceof Error ? error.message : 'Search failed';
        return {
          success: false,
          error: { code: 'SEARCH_ERROR', message: errorMessage },
        };
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

  // Handler for github:set-conflict-preference
  ipcMain.handle(
    IPC_CHANNELS.GITHUB_SET_CONFLICT_PREFERENCE,
    async (_event, { resolution }: { resolution: 'overwrite' | 'rename' | 'skip' }) => {
      try {
        logger.debug('Setting conflict preference', 'GitHubHandlers', { resolution });

        GitHubService.setConflictPreference(resolution);

        return { success: true };
      } catch (error) {
        logger.error('Failed to set conflict preference', 'GitHubHandlers', error);
        throw error;
      }
    }
  );

  // Handler for github:clear-conflict-preference
  ipcMain.handle(IPC_CHANNELS.GITHUB_CLEAR_CONFLICT_PREFERENCE, async () => {
    try {
      logger.debug('Clearing conflict preference', 'GitHubHandlers');

      GitHubService.clearConflictPreference();

      return { success: true };
    } catch (error) {
      logger.error('Failed to clear conflict preference', 'GitHubHandlers', error);
      throw error;
    }
  });

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
        applyToAll,
      }: {
        repositoryName: string;
        skillFilePath: string;
        downloadUrl: string;
        targetDirectory: 'project' | 'global';
        conflictResolution?: 'overwrite' | 'rename' | 'skip';
        applyToAll?: boolean;
      }
    ) => {
      try {
        logger.debug('Installing skill from GitHub', 'GitHubHandlers', {
          repositoryName,
          skillFilePath,
          targetDirectory,
          conflictResolution,
          applyToAll,
        });

        if (!pathValidator) {
          throw new Error('PathValidator not initialized');
        }

        // Set conflict preference if "Apply to all" is checked
        if (applyToAll && conflictResolution) {
          GitHubService.setConflictPreference(conflictResolution);
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

          // Clear preference after successful installation
          if (applyToAll) {
            GitHubService.clearConflictPreference();
          }
        } else {
          logger.warn('Skill installation failed', 'GitHubHandlers', {
            error: result.error,
          });

          // Don't clear preference on failure - allow retry
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
