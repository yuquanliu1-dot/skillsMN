/**
 * Shared Keyword Matcher Service
 *
 * Unified keyword matching logic for skill grouping
 * Used by both main process and renderer process
 */

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
  /** Source of the match (priority: name > tags > description) */
  matchSource: 'name' | 'description' | 'tags';
}

/**
 * Skill data for matching
 */
export interface SkillForMatching {
  path?: string;
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
 * Shared Keyword Matcher Service
 * Implements strict priority matching: tags > name > description
 */
export class KeywordMatcher {
  /**
   * Match a single skill to groups based on keywords
   * Uses strict priority: name > tags > description
   * Returns first match at highest priority level
   */
  static matchSkillToGroups(
    skill: {
      name: string;
      description?: string;
      tags?: string[];
    },
    groups: GroupForMatching[]
  ): KeywordMatchResult {
    // Priority 1: Check name (highest priority)
    const nameLower = skill.name.toLowerCase();
    for (const group of groups) {
      if (!group.keywords || group.keywords.length === 0) continue;

      for (const keyword of group.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (nameLower.includes(keywordLower)) {
          // Found match in name - return immediately
          return {
            groupId: group.id,
            confidence: 1.0,
            matchedKeywords: [keyword],
            matchSource: 'name'
          };
        }
      }
    }

    // Priority 2: Check tags (medium priority)
    if (skill.tags && skill.tags.length > 0) {
      for (const group of groups) {
        if (!group.keywords || group.keywords.length === 0) continue;

        for (const keyword of group.keywords) {
          const keywordLower = keyword.toLowerCase();
          for (const tag of skill.tags) {
            if (tag.toLowerCase().includes(keywordLower)) {
              // Found match in tags - return immediately
              return {
                groupId: group.id,
                confidence: 1.0,
                matchedKeywords: [keyword],
                matchSource: 'tags'
              };
            }
          }
        }
      }
    }

    // Priority 3: Check description (lowest priority)
    const descriptionLower = (skill.description || '').toLowerCase();
    for (const group of groups) {
      if (!group.keywords || group.keywords.length === 0) continue;

      for (const keyword of group.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (descriptionLower.includes(keywordLower)) {
          // Found match in description - return immediately
          return {
            groupId: group.id,
            confidence: 1.0,
            matchedKeywords: [keyword],
            matchSource: 'description'
          };
        }
      }
    }

    // No match found
    return {
      groupId: null,
      confidence: 0,
      matchedKeywords: [],
      matchSource: 'name'
    };
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

    for (const skill of skills) {
      const match = this.matchSkillToGroups(skill, groups);
      if (match.groupId && skill.path) {
        result.set(skill.path, match);
      }
    }

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
