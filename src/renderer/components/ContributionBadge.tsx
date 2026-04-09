/**
 * Contribution Badge Component
 *
 * 在共享仓库列表中展示用户贡献值的紧凑组件
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { RepoContributionStats, ContributorLevel } from '../../shared/types';
import { getContributorStarCount, getStarsDisplay, getStarColor } from '../../shared/badges';

interface ContributionBadgeProps {
  repoId: string;
  onClick?: () => void;
}

export default function ContributionBadge({ repoId, onClick }: ContributionBadgeProps): JSX.Element {
  const { t } = useTranslation();
  const [stats, setStats] = useState<RepoContributionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [repoId]);

  // Refresh stats when contribution cache is cleared
  useEffect(() => {
    const handleCacheCleared = (_event: any, data: { repoId?: string }) => {
      // Refresh if the event is for this repo or for all repos
      if (!data?.repoId || data.repoId === repoId) {
        loadStats();
      }
    };
    window.electronAPI.onContributionCacheCleared(handleCacheCleared);
    return () => {
      window.electronAPI.removeContributionCacheClearedListener();
    };
  }, [repoId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 首先检查是否已有用户信息，如果没有则从 PAT 获取
      const gitInfoResponse = await window.electronAPI.getCurrentUserGitInfo();
      if (!gitInfoResponse.success || !gitInfoResponse.data?.username) {
        // 尝试从 PAT 获取用户信息
        await window.electronAPI.fetchUserInfoFromPAT(repoId);
      }

      const response = await window.electronAPI.getRepoContributionStats(repoId);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load contribution stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-400">
        <div className="animate-spin w-3 h-3 border border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  // 计算星星显示
  const level = stats?.currentUserLevel || 'newcomer';
  const starCount = getContributorStarCount(level);
  const starColor = getStarColor(starCount);
  const score = stats?.currentUserScore || 0;
  const badgeCount = stats?.currentUserBadges?.length || 0;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : ''}`}
      title={`${t(`levels.${level}`)} · ${score} ${t('contribution.points')}${badgeCount > 0 ? ` · ${badgeCount} ${t('contribution.badges')}` : ''}`}
    >
      <span className="text-slate-500 dark:text-slate-400">{t('contribution.title')}</span>
      <span style={{ color: starColor }}>
        {'⭐'.repeat(starCount)}
        <span className="opacity-20">{'⭐'.repeat(5 - starCount)}</span>
      </span>
    </div>
  );
}
