/**
 * Contribution Stats Service
 *
 * 贡献统计服务 - 基于GitHub/GitLab提交记录统计用户贡献
 */

import { logger } from '../utils/Logger';
import { getConfigService } from '../ipc/configHandlers';
import { getGitProvider } from './GitProvider';
import {
  ContributorStats,
  SkillActivityStats,
  RepoContributionStats,
  ContributionStatsConfig,
  UserBadge,
} from '../../shared/types';
import {
  BADGES,
  getContributorLevel,
  getEarnedBadges,
  getNextBadges,
  getLevelConfig,
  getNextLevel,
} from '../../shared/badges';
import type { BadgeDefinition } from '../../shared/types';

/**
 * 贡献分数计算权重
 */
const SCORE_WEIGHTS = {
  commit: 10,        // 每次提交得分
  skillCreated: 50,  // 每创建一个技能得分
  download: 1,       // 每次下载得分
  recencyBonus: 5,   // 近期活跃加成 (最近7天)
};

/**
 * 缓存有效期 (5分钟)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

export class ContributionStatsService {
  private static config: ContributionStatsConfig | null = null;

  /**
   * 初始化服务
   */
  static async initialize(): Promise<void> {
    await this.loadConfig();
    logger.info('ContributionStatsService initialized', 'ContributionStatsService');
  }

  /**
   * 加载配置
   */
  private static async loadConfig(): Promise<void> {
    try {
      const configService = getConfigService();
      if (!configService) {
        throw new Error('ConfigService not initialized');
      }

      const appConfig = configService.getCurrent();
      if (appConfig && (appConfig as any).contributionStats) {
        this.config = (appConfig as any).contributionStats;
      } else {
        this.config = this.createDefaultConfig();
      }

      logger.debug('Loaded contribution stats config', 'ContributionStatsService');
    } catch (error) {
      logger.error('Failed to load contribution stats config', 'ContributionStatsService', error);
      this.config = this.createDefaultConfig();
    }
  }

  /**
   * 创建默认配置
   */
  private static createDefaultConfig(): ContributionStatsConfig {
    return {
      version: 1,
      repoStatsCache: {},
    };
  }

  /**
   * 保存配置
   */
  private static async saveConfig(): Promise<void> {
    try {
      const configService = getConfigService();
      if (!configService || !this.config) {
        throw new Error('ConfigService not initialized');
      }

      // 通过 appConfig 保存 (需要扩展 AppConfiguration 类型)
      const appConfig = configService.getCurrent();
      if (appConfig) {
        (appConfig as any).contributionStats = this.config;
        // ConfigService.save 会处理持久化
      }

      logger.debug('Saved contribution stats config', 'ContributionStatsService');
    } catch (error) {
      logger.error('Failed to save contribution stats config', 'ContributionStatsService', error);
    }
  }

  /**
   * 获取仓库贡献统计
   */
  static async getRepoContributionStats(
    repoId: string,
    owner: string,
    repo: string,
    pat: string,
    provider: 'github' | 'gitlab' = 'github',
    instanceUrl?: string,
    branch: string = 'main',
    currentUserGitInfo?: {
      username?: string;
      email?: string;
      userId?: number;
      instanceUrl?: string;
    }
  ): Promise<RepoContributionStats> {
    if (!this.config) {
      await this.initialize();
    }

    // 检查缓存
    const cached = this.config!.repoStatsCache[repoId];
    if (cached && Date.now() - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
      logger.debug('Returning cached repo contribution stats', 'ContributionStatsService', { repoId });
      return cached.stats;
    }

    try {
      const gitProvider = getGitProvider(provider);

      // 获取仓库所有技能
      const skills = await (gitProvider as any).getPrivateRepoSkills?.(
        owner,
        repo,
        pat,
        branch,
        instanceUrl
      ) || [];

      // 获取所有提交记录 (用于统计贡献者)
      const allCommits: Map<string, any[]> = new Map();
      const contributorMap: Map<string, ContributorStats> = new Map();

      // 为每个技能获取提交历史
      for (const skill of skills) {
        try {
          // GitHub 和 GitLab 的 getDirectoryCommits 参数顺序不同
          let commits: any[];
          if (provider === 'github') {
            commits = await (gitProvider as any).getDirectoryCommits(
              owner,
              repo,
              pat,
              skill.path,
              branch
            ) || [];
          } else {
            commits = await (gitProvider as any).getDirectoryCommits(
              owner,
              repo,
              skill.path,
              pat,
              branch,
              instanceUrl
            ) || [];
          }

          allCommits.set(skill.path, commits);

          // 聚合贡献者统计
          for (const commit of commits) {
            // 优先使用 git commit email（commit.commit.author.email），然后是 GitHub 公开邮箱
            const authorEmail = commit.commit?.author?.email || commit.author?.email || commit.authorEmail || '';
            const authorName = commit.commit?.author?.name || commit.author?.name || commit.authorName || commit.author || 'Unknown';
            // 优先使用 authorUsername 字段（GitLab），然后是 commit.author.login（GitHub）
            const authorUsername = commit.authorUsername || commit.author?.login || authorName.toLowerCase().replace(/\s+/g, '-');

            const key = authorEmail || authorUsername;
            if (!contributorMap.has(key)) {
              contributorMap.set(key, {
                username: authorUsername,
                displayName: authorName,
                email: authorEmail,
                commitCount: 0,
                skillsCreated: 0,
                lastActiveAt: null,
                contributionScore: 0,
                badges: [],
                level: 'newcomer',
              });
            }

            const contributor = contributorMap.get(key)!;
            contributor.commitCount += 1;

            const commitDate = commit.commit?.author?.date || commit.date || commit.created_at;
            if (commitDate) {
              const date = new Date(commitDate);
              if (!contributor.lastActiveAt || date > contributor.lastActiveAt) {
                contributor.lastActiveAt = date;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to get commits for skill ${skill.path}`, 'ContributionStatsService', { error });
        }
      }

      // 计算每个贡献者创建的技能数量
      for (const skill of skills) {
        const commits = allCommits.get(skill.path) || [];
        if (commits.length > 0) {
          // 第一个提交者被认为是技能创建者
          const firstCommit = commits[commits.length - 1];
          // 优先使用 git commit email（commit.commit.author.email），然后是 GitHub 公开邮箱
          const authorEmail = firstCommit.commit?.author?.email || firstCommit.author?.email || firstCommit.authorEmail || '';
          const authorName = firstCommit.commit?.author?.name || firstCommit.author?.name || firstCommit.authorName || firstCommit.author || 'Unknown';
          // 优先使用 authorUsername 字段（GitLab），然后是 commit.author.login（GitHub）
          const authorUsername = firstCommit.authorUsername || firstCommit.author?.login || authorName.toLowerCase().replace(/\s+/g, '-');
          const key = authorEmail || authorUsername;

          if (contributorMap.has(key)) {
            contributorMap.get(key)!.skillsCreated += 1;
          }
        }
      }

      // 计算贡献分数和等级
      const contributors = Array.from(contributorMap.values());
      for (const contributor of contributors) {
        // 计算近期活跃加成
        let recencyBonus = 0;
        if (contributor.lastActiveAt) {
          const daysSinceActive = (Date.now() - contributor.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActive <= 7) {
            recencyBonus = SCORE_WEIGHTS.recencyBonus;
          }
        }

        // 计算综合分数
        contributor.contributionScore =
          (contributor.commitCount * SCORE_WEIGHTS.commit) +
          (contributor.skillsCreated * SCORE_WEIGHTS.skillCreated) +
          recencyBonus;

        // 计算等级和徽章
        contributor.level = getContributorLevel(contributor.contributionScore);
        contributor.badges = this.calculateUserBadges(contributor);
      }

      // 按贡献度排序
      contributors.sort((a, b) => b.contributionScore - a.contributionScore);

      // 构建技能活跃度统计
      const skillActivities: SkillActivityStats[] = skills.map(skill => {
        const commits = allCommits.get(skill.path) || [];
        const latestCommit = commits[0];

        // 获取技能贡献者
        const skillContributors = new Map<string, number>();
        for (const commit of commits) {
          const authorName = commit.commit?.author?.name || commit.author?.name || commit.authorName || commit.author || 'Unknown';
          const count = skillContributors.get(authorName) || 0;
          skillContributors.set(authorName, count + 1);
        }

        const activityScore = commits.length * 5;

        return {
          skillPath: skill.path,
          skillName: skill.name,
          lastUpdatedAt: latestCommit?.commit?.author?.date || latestCommit?.date
            ? new Date(latestCommit.commit?.author?.date || latestCommit.date)
            : null,
          lastCommitAuthor: latestCommit?.commit?.author?.name || latestCommit?.author?.name || latestCommit?.authorName || latestCommit?.author || '',
          commitCount: commits.length,
          activityScore,
          contributors: Array.from(skillContributors.entries())
            .map(([username, commitCount]) => ({ username, commitCount }))
            .sort((a, b) => b.commitCount - a.commitCount)
            .slice(0, 5),
        };
      });

      // 计算当前用户贡献
      let currentUserScore = 0;
      let currentUserLevel: ContributorStats['level'] = 'newcomer';
      let currentUserBadges: UserBadge[] = [];

      // 获取当前用户 Git 信息（包括 username 和 email）
      const userGitInfo = currentUserGitInfo || this.getCurrentUserGitInfo();
      const userLogin = userGitInfo?.username?.toLowerCase();
      const userEmail = userGitInfo?.email?.toLowerCase();
      const userId = userGitInfo?.userId;
      const userInstanceUrl = userGitInfo?.instanceUrl;

      if (userEmail || userLogin) {
        const currentUser = contributors.find(c => {
          const cEmail = c.email?.toLowerCase();
          const cUsername = c.username?.toLowerCase();

          // 匹配逻辑：
          // 1. 邮箱精确匹配
          if (userEmail && cEmail === userEmail) return true;

          // 2. 用户名精确匹配
          if (userLogin && cUsername === userLogin) return true;

          // 3. 邮箱作为用户名匹配
          if (userEmail && cUsername === userEmail) return true;

          // 4. GitHub noreply 邮箱匹配（username@users.noreply.github.com）
          if (userLogin && cEmail) {
            const noreplyEmail = `${userLogin}@users.noreply.github.com`;
            if (cEmail === noreplyEmail) return true;
          }

          // 5. GitLab noreply 邮箱匹配（{id}-{username}@users.noreply.{instanceUrl}）
          if (userLogin && cEmail && userId && userInstanceUrl) {
            const gitlabNoreplyEmail = `${userId}-${userLogin}@users.noreply.${userInstanceUrl}`;
            if (cEmail === gitlabNoreplyEmail) return true;
          }

          return false;
        });

        if (currentUser) {
          currentUserScore = currentUser.contributionScore;
          currentUserLevel = currentUser.level;
          currentUserBadges = currentUser.badges;
        }
      }

      // 计算总提交数
      const totalCommits = Array.from(allCommits.values())
        .reduce((sum, commits) => sum + commits.length, 0);

      const stats: RepoContributionStats = {
        repoId,
        repoPath: `${owner}/${repo}`,
        updatedAt: new Date(),
        totalContributors: contributors.length,
        totalSkills: skills.length,
        totalCommits,
        currentUserScore,
        currentUserLevel,
        currentUserBadges,
        topContributors: contributors.slice(0, 20),
        skillActivities,
      };

      // 缓存结果
      this.config!.repoStatsCache[repoId] = {
        stats,
        cachedAt: new Date(),
      };
      await this.saveConfig();

      logger.info('Calculated repo contribution stats', 'ContributionStatsService', {
        repoId,
        contributorCount: contributors.length,
        skillCount: skills.length,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get repo contribution stats', 'ContributionStatsService', error);
      throw error;
    }
  }

  /**
   * 计算用户徽章
   */
  private static calculateUserBadges(
    contributor: ContributorStats
  ): UserBadge[] {
    const stats = {
      commitCount: contributor.commitCount,
      skillsCreated: contributor.skillsCreated,
      downloadCount: 0,
      contributionScore: contributor.contributionScore,
    };

    const earnedBadges = getEarnedBadges(stats);

    return earnedBadges.map(badge => ({
      badgeId: badge.id,
      earnedAt: new Date(),
      earnedValue: this.getBadgeEarnedValue(badge, stats),
    }));
  }

  /**
   * 获取徽章获得时的数值
   */
  private static getBadgeEarnedValue(
    badge: BadgeDefinition,
    stats: { commitCount: number; skillsCreated: number; downloadCount: number; contributionScore: number }
  ): number {
    switch (badge.condition.type) {
      case 'commits':
        return stats.commitCount;
      case 'skills_created':
        return stats.skillsCreated;
      case 'downloads':
        return stats.downloadCount;
      case 'score':
        return stats.contributionScore;
      default:
        return 0;
    }
  }

  /**
   * 获取用户徽章列表
   */
  static async getUserBadges(
    repoId: string,
    owner: string,
    repo: string,
    pat: string,
    provider: 'github' | 'gitlab' = 'github',
    instanceUrl?: string,
    branch: string = 'main',
    currentUserGitInfo?: { username?: string; email?: string }
  ): Promise<{
    earned: UserBadge[];
    nextBadges: Array<{ badge: BadgeDefinition; progress: number; remaining: number }>;
  }> {
    const stats = await this.getRepoContributionStats(
      repoId,
      owner,
      repo,
      pat,
      provider,
      instanceUrl,
      branch,
      currentUserGitInfo
    );

    // 获取当前用户 Git 信息
    const userGitInfo = currentUserGitInfo || this.getCurrentUserGitInfo();
    const userLogin = userGitInfo?.username?.toLowerCase();
    const userEmail = userGitInfo?.email?.toLowerCase();

    const currentUser = stats.topContributors.find(c => {
      const cEmail = c.email?.toLowerCase();
      const cUsername = c.username?.toLowerCase();

      if (userEmail && cEmail === userEmail) return true;
      if (userLogin && cUsername === userLogin) return true;
      if (userEmail && cUsername === userEmail) return true;
      if (userLogin && cEmail) {
        const noreplyEmail = `${userLogin}@users.noreply.github.com`;
        if (cEmail === noreplyEmail) return true;
      }
      return false;
    });

    if (!currentUser) {
      return { earned: [], nextBadges: [] };
    }

    const userStats = {
      commitCount: currentUser.commitCount,
      skillsCreated: currentUser.skillsCreated,
      downloadCount: 0,
      contributionScore: currentUser.contributionScore,
    };

    const earnedBadges = currentUser.badges;
    const nextBadgesData = getNextBadges(userStats);

    const nextBadges = nextBadgesData.map(badge => {
      const currentValue = this.getBadgeConditionValue(badge, userStats);
      const targetValue = badge.condition.value;
      const progress = Math.min(100, (currentValue / targetValue) * 100);
      const remaining = Math.max(0, targetValue - currentValue);

      return {
        badge,
        progress,
        remaining,
      };
    });

    return {
      earned: earnedBadges,
      nextBadges,
    };
  }

  /**
   * 获取徽章条件当前值
   */
  private static getBadgeConditionValue(
    badge: BadgeDefinition,
    stats: { commitCount: number; skillsCreated: number; downloadCount: number; contributionScore: number }
  ): number {
    switch (badge.condition.type) {
      case 'commits':
        return stats.commitCount;
      case 'skills_created':
        return stats.skillsCreated;
      case 'downloads':
        return stats.downloadCount;
      case 'score':
        return stats.contributionScore;
      default:
        return 0;
    }
  }

  /**
   * 获取贡献等级信息
   */
  static getLevelInfo(level: ContributorStats['level']) {
    return getLevelConfig(level);
  }

  /**
   * 获取下一等级信息
   */
  static getNextLevelInfo(currentLevel: ContributorStats['level']) {
    return getNextLevel(currentLevel);
  }

  /**
   * 设置当前用户 Git 信息 (用于匹配贡献者)
   */
  static async setCurrentUserGitInfo(
    username: string,
    email: string,
    userId?: number,
    instanceUrl?: string
  ): Promise<void> {
    if (!this.config) {
      await this.initialize();
    }

    this.config!.currentUserGitInfo = { username, email, userId, instanceUrl };
    await this.saveConfig();

    logger.info('Set current user git info', 'ContributionStatsService', {
      username,
      email,
      userId,
      instanceUrl,
    });
  }

  /**
   * 获取当前用户 Git 信息
   */
  static getCurrentUserGitInfo(): {
    username?: string;
    email?: string;
    userId?: number;
    instanceUrl?: string;
  } | undefined {
    return this.config?.currentUserGitInfo;
  }

  /**
   * 从 PAT 自动获取用户信息并设置
   * 使用 GitHub/GitLab API 获取当前认证用户的身份信息
   * @param provider - Git 提供商 ('github' 或 'gitlab')
   * @param pat - Personal Access Token
   * @param instanceUrl - GitLab 实例 URL (仅 GitLab 需要)
   * @returns 用户信息
   */
  static async fetchAndSetUserInfoFromPAT(
    provider: 'github' | 'gitlab',
    pat: string,
    instanceUrl?: string
  ): Promise<{
    success: boolean;
    user?: {
      id?: number;
      login: string;
      name: string | null;
      email: string | null;
      avatarUrl: string | null;
    };
    error?: string;
  }> {
    try {
      const gitProvider = getGitProvider(provider);
      let result;

      if (provider === 'github') {
        result = await (gitProvider as any).getCurrentUser(pat);
      } else {
        result = await (gitProvider as any).getCurrentUser(pat, instanceUrl);
      }

      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || 'Failed to get user info',
        };
      }

      // 自动设置用户信息
      await this.setCurrentUserGitInfo(
        result.user.login,
        result.user.email || '',
        result.user.id,
        instanceUrl
      );

      logger.info('Auto-fetched and set user git info from PAT', 'ContributionStatsService', {
        login: result.user.login,
        email: result.user.email,
        userId: result.user.id,
        instanceUrl,
        provider,
      });

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      logger.error('Failed to fetch user info from PAT', 'ContributionStatsService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 清除缓存
   */
  static async clearCache(repoId?: string): Promise<void> {
    if (!this.config) {
      await this.initialize();
    }

    if (repoId) {
      delete this.config!.repoStatsCache[repoId];
    } else {
      this.config!.repoStatsCache = {};
    }

    await this.saveConfig();
    logger.info('Cleared contribution stats cache', 'ContributionStatsService', { repoId });
  }
}
