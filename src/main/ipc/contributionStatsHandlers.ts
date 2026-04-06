/**
 * Contribution Stats IPC Handlers
 *
 * 处理贡献统计相关的 IPC 请求
 */

import { ipcMain } from 'electron';
import { ContributionStatsService } from '../services/ContributionStatsService';
import { PrivateRepoService } from '../services/PrivateRepoService';
import { logger } from '../utils/Logger';

/**
 * 注册贡献统计 IPC 处理器
 */
export function registerContributionStatsHandlers(): void {
  /**
   * 获取仓库贡献统计
   */
  ipcMain.handle('contribution:getRepoStats', async (_event, repoId: string) => {
    try {
      logger.debug('Getting repo contribution stats', 'ContributionStatsHandlers', { repoId });

      // 获取仓库信息
      const repo = await PrivateRepoService.getRepo(repoId);
      if (!repo) {
        return {
          success: false,
          error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' },
        };
      }

      // 解密 PAT
      const pat = await (PrivateRepoService as any).decryptAndFixPAT(repo);

      // 获取当前用户 Git 信息
      const currentUserGitInfo = ContributionStatsService.getCurrentUserGitInfo();

      const stats = await ContributionStatsService.getRepoContributionStats(
        repoId,
        repo.owner,
        repo.repo,
        pat,
        repo.provider || 'github',
        repo.instanceUrl,
        repo.defaultBranch || 'main',
        currentUserGitInfo
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to get repo contribution stats', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'GET_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 获取用户徽章
   */
  ipcMain.handle('contribution:getUserBadges', async (_event, repoId: string) => {
    try {
      logger.debug('Getting user badges', 'ContributionStatsHandlers', { repoId });

      // 获取仓库信息
      const repo = await PrivateRepoService.getRepo(repoId);
      if (!repo) {
        return {
          success: false,
          error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' },
        };
      }

      // 解密 PAT
      const pat = await (PrivateRepoService as any).decryptAndFixPAT(repo);

      // 获取当前用户 Git 信息
      const currentUserGitInfo = ContributionStatsService.getCurrentUserGitInfo();

      const badges = await ContributionStatsService.getUserBadges(
        repoId,
        repo.owner,
        repo.repo,
        pat,
        repo.provider || 'github',
        repo.instanceUrl,
        repo.defaultBranch || 'main',
        currentUserGitInfo
      );

      return {
        success: true,
        data: badges,
      };
    } catch (error) {
      logger.error('Failed to get user badges', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'GET_BADGES_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 设置当前用户 Git 信息
   */
  ipcMain.handle('contribution:setGitInfo', async (_event, username: string, email: string) => {
    try {
      logger.debug('Setting current user git info', 'ContributionStatsHandlers', { username });

      await ContributionStatsService.setCurrentUserGitInfo(username, email);

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      logger.error('Failed to set git info', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'SET_GIT_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 获取当前用户 Git 信息
   */
  ipcMain.handle('contribution:getGitInfo', async () => {
    try {
      const gitInfo = ContributionStatsService.getCurrentUserGitInfo();

      return {
        success: true,
        data: gitInfo,
      };
    } catch (error) {
      logger.error('Failed to get git info', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'GET_GIT_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 从 PAT 自动获取用户信息
   */
  ipcMain.handle('contribution:fetchUserInfoFromPAT', async (_event, repoId: string) => {
    try {
      logger.debug('Fetching user info from PAT', 'ContributionStatsHandlers', { repoId });

      // 获取仓库信息
      const repo = await PrivateRepoService.getRepo(repoId);
      if (!repo) {
        return {
          success: false,
          error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' },
        };
      }

      // 解密 PAT
      const pat = await (PrivateRepoService as any).decryptAndFixPAT(repo);

      // 从 PAT 获取用户信息
      const result = await ContributionStatsService.fetchAndSetUserInfoFromPAT(
        repo.provider || 'github',
        pat,
        repo.instanceUrl
      );

      if (!result.success) {
        return {
          success: false,
          error: {
            code: 'FETCH_USER_INFO_FAILED',
            message: result.error || 'Failed to fetch user info',
          },
        };
      }

      return {
        success: true,
        data: result.user,
      };
    } catch (error) {
      logger.error('Failed to fetch user info from PAT', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'FETCH_USER_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 清除贡献统计缓存
   */
  ipcMain.handle('contribution:clearCache', async (_event, repoId?: string) => {
    try {
      logger.debug('Clearing contribution stats cache', 'ContributionStatsHandlers', { repoId });

      await ContributionStatsService.clearCache(repoId);

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      logger.error('Failed to clear cache', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'CLEAR_CACHE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 获取等级信息
   */
  ipcMain.handle('contribution:getLevelInfo', async (_event, level: string) => {
    try {
      const levelInfo = ContributionStatsService.getLevelInfo(level as any);

      return {
        success: true,
        data: levelInfo,
      };
    } catch (error) {
      logger.error('Failed to get level info', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'GET_LEVEL_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  /**
   * 获取下一等级信息
   */
  ipcMain.handle('contribution:getNextLevelInfo', async (_event, currentLevel: string) => {
    try {
      const nextLevelInfo = ContributionStatsService.getNextLevelInfo(currentLevel as any);

      return {
        success: true,
        data: nextLevelInfo,
      };
    } catch (error) {
      logger.error('Failed to get next level info', 'ContributionStatsHandlers', error);
      return {
        success: false,
        error: {
          code: 'GET_NEXT_LEVEL_INFO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  logger.info('Contribution stats IPC handlers registered', 'ContributionStatsHandlers');
}
