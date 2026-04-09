/**
 * Keyword Matcher Service
 *
 * Matches skills to groups based on keywords in name, description, and tags
 */

import { logger } from '../utils/Logger';

/**
 * Result of keyword matching
 */
export interface KeywordMatchResult {
  /** Matched group ID (null if no match) */
  groupId: string | null;
  /** Match confidence (0-1) */
  confidence: number;
  /** Matched keywords */
  matchedKeywords: string[];
  /** Source of the match (priority: tags > name > description) */
  matchSource: 'name' | 'description' | 'tags';
}

/**
 * Skill data for matching
 */
export interface SkillForMatching {
  path: string;
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Group data for matching
 */
export interface GroupForMatching {
  id: string;
  keywords?: string[];
}

/**
 * Keyword Matcher Service
 */
export class KeywordMatcher {
  /**
   * Match a single skill to groups based on keywords
   * Considers name + description + tags with priority: tags > name > description
   */
  static matchSkillToGroups(
    skill: {
      name: string;
      description?: string;
      tags?: string[];
    },
    groups: GroupForMatching[]
  ): KeywordMatchResult {
    // Build search text parts: name + description + tags
    const searchParts = {
      name: skill.name.toLowerCase(),
      description: (skill.description || '').toLowerCase(),
      tags: (skill.tags || []).join(' ').toLowerCase()
    };

    let bestMatch: KeywordMatchResult = {
      groupId: null,
      confidence: 0,
      matchedKeywords: [],
      matchSource: 'name'
    };

    for (const group of groups) {
      if (!group.keywords || group.keywords.length === 0) continue;

      const matchedKeywords: string[] = [];
      let matchSource: 'name' | 'description' | 'tags' = 'name';
      const keywordSources = new Map<string, 'name' | 'description' | 'tags'>();

      // Check each keyword
      for (const keyword of group.keywords) {
        const keywordLower = keyword.toLowerCase();

        // Determine match source (priority: tags > name > description)
        if (searchParts.tags.includes(keywordLower)) {
          keywordSources.set(keyword, 'tags');
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        } else if (searchParts.name.includes(keywordLower)) {
          if (!keywordSources.has(keyword)) {
            keywordSources.set(keyword, 'name');
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        } else if (searchParts.description.includes(keywordLower)) {
          if (!keywordSources.has(keyword)) {
            keywordSources.set(keyword, 'description');
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        }
      }

      if (matchedKeywords.length > 0) {
        // Determine highest priority match source
        matchSource = 'description';
        for (const keyword of matchedKeywords) {
          const source = keywordSources.get(keyword);
          if (source === 'tags') {
            matchSource = 'tags';
            break;
          } else if (source === 'name' && matchSource === 'description') {
            matchSource = 'name';
          }
        }

        // Calculate confidence: matched keywords / total keywords in group
        const confidence = matchedKeywords.length / group.keywords.length;

        // Boost tags match weight by 20%
        const weightedConfidence = matchSource === 'tags'
          ? Math.min(confidence * 1.2, 1.0)
          : confidence;

        if (weightedConfidence > bestMatch.confidence) {
          bestMatch = {
            groupId: group.id,
            confidence: weightedConfidence,
            matchedKeywords,
            matchSource
          };
        }
      }
    }

    return bestMatch;
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
