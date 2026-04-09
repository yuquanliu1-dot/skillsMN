/**
 * Keyword Matcher Service
 *
 * Matches skills to groups based on keywords in name, description, and tags
 * This is a thin wrapper around the shared KeywordMatcher for backward compatibility
 */

import { logger } from '../utils/Logger';
import { KeywordMatcher as SharedKeywordMatcher, KeywordMatchResult, SkillForMatching, GroupForMatching } from '../../shared/services/KeywordMatcher';

/**
 * Keyword Matcher Service (Main Process)
 * Exports shared functionality from shared KeywordMatcher
 */
export class KeywordMatcher extends SharedKeywordMatcher {
  /**
   * Match a single skill to groups based on keywords
   * Uses shared implementation with logging
   */
  static matchSkillToGroups(
    skill: {
      name: string;
      description?: string;
      tags?: string[];
    },
    groups: GroupForMatching[]
  ): KeywordMatchResult {
    return super.matchSkillToGroups(skill, groups);
  }

  /**
   * Batch match skills to groups
   * Returns a map of skill path to match result
   */
  static matchSkillsToGroups(
    skills: SkillForMatching[],
    groups: GroupForMatching[]
  ): Map<string, KeywordMatchResult> {
    const result = new Map<string, KeywordMatchResult>();
    let matchCount = 0;
    let unmatchCount = 0;

    for (const skill of skills) {
      const match = this.matchSkillToGroups(skill, groups);
      if (match.groupId) {
        result.set(skill.path, match);
        matchCount++;
      } else {
        unmatchCount++;
      }
    }

    logger.info('Keyword matching completed', 'KeywordMatcher', {
      total: skills.length,
      matched: matchCount,
      unmatched: unmatchCount
    });

    return result;
  }

  /**
   * Get display label for match source
   */
  static getMatchSourceLabel(source: 'name' | 'description' | 'tags'): string {
    const labels = {
      name: '名称',
      description: '描述',
      tags: '标签'
    };
    return labels[source];
  }

  /**
   * Get match source icon
   */
  static getMatchSourceIcon(source: 'name' | 'description' | 'tags'): string {
    const icons = {
      name: '📝',
      description: '📄',
      tags: '🏷️'
    };
    return icons[source];
  }
}
