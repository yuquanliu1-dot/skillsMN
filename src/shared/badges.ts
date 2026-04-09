/**
 * Badge Definitions
 *
 * 预定义的徽章配置
 */

import type { BadgeDefinition, ContributorLevel } from './types';

/**
 * 预定义徽章列表
 */
export const BADGES: BadgeDefinition[] = [
  // === 提交相关徽章 ===
  {
    id: 'first_commit',
    nameKey: 'badges.firstCommit',
    descriptionKey: 'badges.firstCommitDesc',
    icon: '🌱',
    color: '#22c55e',
    condition: { type: 'commits', value: 1 },
    tier: 1,
  },
  {
    id: 'active_contributor',
    nameKey: 'badges.activeContributor',
    descriptionKey: 'badges.activeContributorDesc',
    icon: '🔥',
    color: '#f97316',
    condition: { type: 'commits', value: 10 },
    tier: 2,
  },
  {
    id: 'dedicated_member',
    nameKey: 'badges.dedicatedMember',
    descriptionKey: 'badges.dedicatedMemberDesc',
    icon: '💪',
    color: '#ec4899',
    condition: { type: 'commits', value: 25 },
    tier: 3,
  },
  {
    id: 'core_member',
    nameKey: 'badges.coreMember',
    descriptionKey: 'badges.coreMemberDesc',
    icon: '💎',
    color: '#8b5cf6',
    condition: { type: 'commits', value: 50 },
    tier: 4,
  },
  {
    id: 'legend',
    nameKey: 'badges.legend',
    descriptionKey: 'badges.legendDesc',
    icon: '👑',
    color: '#fbbf24',
    condition: { type: 'commits', value: 100 },
    tier: 5,
  },

  // === 技能创建相关徽章 ===
  {
    id: 'skill_creator',
    nameKey: 'badges.skillCreator',
    descriptionKey: 'badges.skillCreatorDesc',
    icon: '✨',
    color: '#3b82f6',
    condition: { type: 'skills_created', value: 1 },
    tier: 1,
  },
  {
    id: 'skill_architect',
    nameKey: 'badges.skillArchitect',
    descriptionKey: 'badges.skillArchitectDesc',
    icon: '🏗️',
    color: '#0ea5e9',
    condition: { type: 'skills_created', value: 5 },
    tier: 3,
  },
  {
    id: 'skill_master',
    nameKey: 'badges.skillMaster',
    descriptionKey: 'badges.skillMasterDesc',
    icon: '🎯',
    color: '#6366f1',
    condition: { type: 'skills_created', value: 10 },
    tier: 4,
  },

  // === 下载/受欢迎相关徽章 ===
  {
    id: 'popular_skill',
    nameKey: 'badges.popularSkill',
    descriptionKey: 'badges.popularSkillDesc',
    icon: '⭐',
    color: '#eab308',
    condition: { type: 'downloads', value: 10 },
    tier: 2,
  },
  {
    id: 'viral_skill',
    nameKey: 'badges.viralSkill',
    descriptionKey: 'badges.viralSkillDesc',
    icon: '🚀',
    color: '#ef4444',
    condition: { type: 'downloads', value: 50 },
    tier: 4,
  },
  {
    id: 'superstar',
    nameKey: 'badges.superstar',
    descriptionKey: 'badges.superstarDesc',
    icon: '🌟',
    color: '#f59e0b',
    condition: { type: 'downloads', value: 100 },
    tier: 5,
  },

  // === 综合分数徽章 ===
  {
    id: 'rising_star',
    nameKey: 'badges.risingStar',
    descriptionKey: 'badges.risingStarDesc',
    icon: '📈',
    color: '#10b981',
    condition: { type: 'score', value: 100 },
    tier: 2,
  },
  {
    id: 'champion',
    nameKey: 'badges.champion',
    descriptionKey: 'badges.championDesc',
    icon: '🏆',
    color: '#fcd34d',
    condition: { type: 'score', value: 500 },
    tier: 4,
  },
];

/**
 * 贡献者等级阈值配置
 */
export const CONTRIBUTOR_LEVELS: Array<{
  level: ContributorLevel;
  nameKey: string;
  minScore: number;
  icon: string;
  color: string;
}> = [
  { level: 'newcomer', nameKey: 'levels.newcomer', minScore: 0, icon: '🆕', color: '#9ca3af' },
  { level: 'contributor', nameKey: 'levels.contributor', minScore: 500, icon: '🤝', color: '#22c55e' },
  { level: 'active', nameKey: 'levels.active', minScore: 2000, icon: '⚡', color: '#3b82f6' },
  { level: 'core', nameKey: 'levels.core', minScore: 5000, icon: '💎', color: '#8b5cf6' },
  { level: 'maintainer', nameKey: 'levels.maintainer', minScore: 10000, icon: '👑', color: '#fbbf24' },
];

/**
 * 根据分数获取贡献者等级
 */
export function getContributorLevel(score: number): ContributorLevel {
  const sortedLevels = [...CONTRIBUTOR_LEVELS].sort((a, b) => b.minScore - a.minScore);
  for (const levelConfig of sortedLevels) {
    if (score >= levelConfig.minScore) {
      return levelConfig.level;
    }
  }
  return 'newcomer';
}

/**
 * 根据分数获取等级配置
 */
export function getLevelConfig(level: ContributorLevel) {
  return CONTRIBUTOR_LEVELS.find(l => l.level === level) || CONTRIBUTOR_LEVELS[0];
}

/**
 * 获取下一等级配置
 */
export function getNextLevel(currentLevel: ContributorLevel) {
  const currentIndex = CONTRIBUTOR_LEVELS.findIndex(l => l.level === currentLevel);
  if (currentIndex < CONTRIBUTOR_LEVELS.length - 1) {
    return CONTRIBUTOR_LEVELS[currentIndex + 1];
  }
  return null; // 已经是最高等级
}

/**
 * 检查用户是否获得某个徽章
 */
export function checkBadgeEarned(
  badge: BadgeDefinition,
  stats: { commitCount: number; skillsCreated: number; downloadCount: number; contributionScore: number }
): boolean {
  const { type, value } = badge.condition;
  switch (type) {
    case 'commits':
      return stats.commitCount >= value;
    case 'skills_created':
      return stats.skillsCreated >= value;
    case 'downloads':
      return stats.downloadCount >= value;
    case 'score':
      return stats.contributionScore >= value;
    default:
      return false;
  }
}

/**
 * 获取用户已获得的徽章
 */
export function getEarnedBadges(
  stats: { commitCount: number; skillsCreated: number; downloadCount: number; contributionScore: number }
): BadgeDefinition[] {
  return BADGES.filter(badge => checkBadgeEarned(badge, stats));
}

/**
 * 获取用户待解锁的下一个徽章 (每种条件类型只返回最近的一个)
 */
export function getNextBadges(
  stats: { commitCount: number; skillsCreated: number; downloadCount: number; contributionScore: number }
): BadgeDefinition[] {
  const nextBadges: BadgeDefinition[] = [];
  const conditionTypes: BadgeDefinition['condition']['type'][] = ['commits', 'skills_created', 'downloads', 'score'];

  for (const type of conditionTypes) {
    const unearnedBadges = BADGES
      .filter(badge => badge.condition.type === type && !checkBadgeEarned(badge, stats))
      .sort((a, b) => a.condition.value - b.condition.value);

    if (unearnedBadges.length > 0) {
      nextBadges.push(unearnedBadges[0]);
    }
  }

  return nextBadges;
}

// ============================================================================
// Contributor Level Star Display (贡献者等级星星显示)
// ============================================================================

/**
 * 贡献者等级对应的星星数量 (1-5)
 */
export function getContributorStarCount(level: ContributorLevel): number {
  const levelMap: Record<ContributorLevel, number> = {
    newcomer: 1,
    contributor: 2,
    active: 3,
    core: 4,
    maintainer: 5,
  };
  return levelMap[level] || 1;
}

/**
 * 生成星星显示字符串
 * @param starCount 填充星星数量 (1-5)
 * @returns 包含填充和空心星星的字符串
 */
export function getStarsDisplay(starCount: number): string {
  const filledStars = '⭐'.repeat(starCount);
  const emptyStars = '⭐'.repeat(5 - starCount);
  return filledStars + emptyStars;
}

/**
 * 生成星星显示组件属性（用于区分填充和空心）
 */
export function getStarsStyle(starCount: number): { filled: number; empty: number } {
  return {
    filled: starCount,
    empty: 5 - starCount,
  };
}

/**
 * 获取星星颜色 (根据等级渐变)
 */
export function getStarColor(starCount: number): string {
  const colors: Record<number, string> = {
    1: '#9ca3af', // 灰色 - newcomer
    2: '#22c55e', // 绿色 - contributor
    3: '#3b82f6', // 蓝色 - active
    4: '#8b5cf6', // 紫色 - core
    5: '#fbbf24', // 金色 - maintainer
  };
  return colors[starCount] || colors[1];
}
