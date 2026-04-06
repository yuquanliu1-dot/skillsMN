/**
 * Contribution Panel Component
 *
 * 展示用户贡献值、等级和徽章
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { RepoContributionStats, UserBadge, ContributorLevel } from '../../shared/types';
import type { BadgeDefinition } from '../../shared/types';
import { getStarsDisplay, getStarColor, getContributorStarCount } from '../../shared/badges';

interface ContributionPanelProps {
  repoId: string;
  onClose?: () => void;
}

// 徽章定义 (从 badges.ts 复制)
const BADGES: BadgeDefinition[] = [
  { id: 'first_commit', nameKey: 'badges.firstCommit', descriptionKey: 'badges.firstCommitDesc', icon: '🌱', color: '#22c55e', condition: { type: 'commits', value: 1 }, tier: 1 },
  { id: 'active_contributor', nameKey: 'badges.activeContributor', descriptionKey: 'badges.activeContributorDesc', icon: '🔥', color: '#f97316', condition: { type: 'commits', value: 10 }, tier: 2 },
  { id: 'dedicated_member', nameKey: 'badges.dedicatedMember', descriptionKey: 'badges.dedicatedMemberDesc', icon: '💪', color: '#ec4899', condition: { type: 'commits', value: 25 }, tier: 3 },
  { id: 'core_member', nameKey: 'badges.coreMember', descriptionKey: 'badges.coreMemberDesc', icon: '💎', color: '#8b5cf6', condition: { type: 'commits', value: 50 }, tier: 4 },
  { id: 'legend', nameKey: 'badges.legend', descriptionKey: 'badges.legendDesc', icon: '👑', color: '#fbbf24', condition: { type: 'commits', value: 100 }, tier: 5 },
  { id: 'skill_creator', nameKey: 'badges.skillCreator', descriptionKey: 'badges.skillCreatorDesc', icon: '✨', color: '#3b82f6', condition: { type: 'skills_created', value: 1 }, tier: 1 },
  { id: 'skill_architect', nameKey: 'badges.skillArchitect', descriptionKey: 'badges.skillArchitectDesc', icon: '🏗️', color: '#0ea5e9', condition: { type: 'skills_created', value: 5 }, tier: 3 },
  { id: 'skill_master', nameKey: 'badges.skillMaster', descriptionKey: 'badges.skillMasterDesc', icon: '🎯', color: '#6366f1', condition: { type: 'skills_created', value: 10 }, tier: 4 },
  { id: 'popular_skill', nameKey: 'badges.popularSkill', descriptionKey: 'badges.popularSkillDesc', icon: '⭐', color: '#eab308', condition: { type: 'downloads', value: 10 }, tier: 2 },
  { id: 'viral_skill', nameKey: 'badges.viralSkill', descriptionKey: 'badges.viralSkillDesc', icon: '🚀', color: '#ef4444', condition: { type: 'downloads', value: 50 }, tier: 4 },
  { id: 'superstar', nameKey: 'badges.superstar', descriptionKey: 'badges.superstarDesc', icon: '🌟', color: '#f59e0b', condition: { type: 'downloads', value: 100 }, tier: 5 },
  { id: 'rising_star', nameKey: 'badges.risingStar', descriptionKey: 'badges.risingStarDesc', icon: '📈', color: '#10b981', condition: { type: 'score', value: 100 }, tier: 2 },
  { id: 'champion', nameKey: 'badges.champion', descriptionKey: 'badges.championDesc', icon: '🏆', color: '#fcd34d', condition: { type: 'score', value: 500 }, tier: 4 },
];

// 等级配置
const LEVELS = [
  { level: 'newcomer' as ContributorLevel, nameKey: 'levels.newcomer', minScore: 0, color: '#9ca3af' },
  { level: 'contributor' as ContributorLevel, nameKey: 'levels.contributor', minScore: 50, color: '#22c55e' },
  { level: 'active' as ContributorLevel, nameKey: 'levels.active', minScore: 200, color: '#3b82f6' },
  { level: 'core' as ContributorLevel, nameKey: 'levels.core', minScore: 500, color: '#8b5cf6' },
  { level: 'maintainer' as ContributorLevel, nameKey: 'levels.maintainer', minScore: 1000, color: '#fbbf24' },
];

export default function ContributionPanel({ repoId, onClose }: ContributionPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [stats, setStats] = useState<RepoContributionStats | null>(null);
  const [userBadges, setUserBadges] = useState<{
    earned: UserBadge[];
    nextBadges: Array<{ badge: BadgeDefinition; progress: number; remaining: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [repoId]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取仓库贡献统计
      const statsResponse = await window.electronAPI.getRepoContributionStats(repoId);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      // 获取用户徽章
      const badgesResponse = await window.electronAPI.getUserBadges(repoId);
      if (badgesResponse.success && badgesResponse.data) {
        setUserBadges(badgesResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contribution stats');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLevelConfig = () => {
    if (!stats) return LEVELS[0];
    return LEVELS.find(l => l.level === stats.currentUserLevel) || LEVELS[0];
  };

  const getNextLevelConfig = () => {
    const currentLevelIndex = LEVELS.findIndex(l => l.level === stats?.currentUserLevel);
    if (currentLevelIndex < LEVELS.length - 1) {
      return LEVELS[currentLevelIndex + 1];
    }
    return null;
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    const nextLevel = getNextLevelConfig();
    if (!nextLevel) return 100;
    const currentLevel = getCurrentLevelConfig();
    const progress = ((stats.currentUserScore - currentLevel.minScore) / (nextLevel.minScore - currentLevel.minScore)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getBadgeById = (id: string): BadgeDefinition | undefined => {
    return BADGES.find(b => b.id === id);
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        <p>{error}</p>
        <button
          onClick={loadStats}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const currentLevel = getCurrentLevelConfig();
  const nextLevel = getNextLevelConfig();
  const levelProgress = getLevelProgress();
  const starCount = getContributorStarCount(stats?.currentUserLevel || 'newcomer');
  const starsDisplay = getStarsDisplay(starCount);
  const starColor = getStarColor(starCount);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('contribution.title')}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* 当前等级和分数 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl mb-2"
               style={{ backgroundColor: `${currentLevel.color}20` }}>
            <span style={{ color: starColor }}>
              {starsDisplay.slice(0, starCount * 2)}
              <span className="opacity-30">{starsDisplay.slice(starCount * 2)}</span>
            </span>
          </div>
          <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t(currentLevel.nameKey)}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {stats?.currentUserScore || 0} {t('contribution.points')}
          </p>
        </div>

        {/* 等级进度 */}
        {nextLevel && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">{t('contribution.currentLevel')}</span>
              <span className="text-slate-600 dark:text-slate-400">
                {t('contribution.nextLevel')}: {nextLevel.minScore} {t('contribution.points')}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${levelProgress}%`,
                  backgroundColor: currentLevel.color,
                }}
              />
            </div>
            <p className="text-xs text-center mt-1 text-slate-500 dark:text-slate-400">
              {nextLevel.minScore - (stats?.currentUserScore || 0)} {t('contribution.pointsToNextLevel')}
            </p>
          </div>
        )}

        {/* 仓库统计 */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalSkills}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('contribution.totalSkills')}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalContributors}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('contribution.contributors')}</p>
            </div>
          </div>
        )}

        {/* 已获得徽章 */}
        {userBadges && userBadges.earned.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('contribution.earnedBadges')} ({userBadges.earned.length})
            </h5>
            <div className="flex flex-wrap gap-2">
              {userBadges.earned.map((userBadge) => {
                const badge = getBadgeById(userBadge.badgeId);
                if (!badge) return null;
                return (
                  <div
                    key={badge.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: `${badge.color}20`,
                      color: badge.color,
                    }}
                    title={t(badge.descriptionKey)}
                  >
                    <span>{badge.icon}</span>
                    <span>{t(badge.nameKey)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 待解锁徽章 */}
        {userBadges && userBadges.nextBadges.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('contribution.nextBadges')}
            </h5>
            <div className="space-y-2">
              {userBadges.nextBadges.slice(0, 3).map(({ badge, progress, remaining }) => (
                <div key={badge.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg opacity-50"
                    style={{ backgroundColor: `${badge.color}20` }}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{t(badge.nameKey)}</span>
                      <span className="text-slate-500 dark:text-slate-500">
                        {remaining} {t('contribution.moreNeeded')}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: badge.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 活跃技能 */}
        {stats && stats.skillActivities.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('contribution.activeSkills')}
            </h5>
            <div className="space-y-2">
              {stats.skillActivities
                .sort((a, b) => b.activityScore - a.activityScore)
                .slice(0, 5)
                .map((skill) => (
                  <div
                    key={skill.skillPath}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {skill.skillName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {skill.commitCount} {t('contribution.commits')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-500">🔥</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {skill.activityScore}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
