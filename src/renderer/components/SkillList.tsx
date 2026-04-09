/**
 * SkillList Component
 *
 * Grid-based skill list with group support
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill, FilterSource, SortBy, VersionComparison, SkillGroup } from '../../shared/types';
import SkillCard from './SkillCard';
import { ipcClient } from '../services/ipcClient';

/**
 * Keyword Matcher (Renderer Process Version)
 * Matches skills to groups based on keywords in name, description, and tags
 */
interface KeywordMatchResult {
  groupId: string | null;
  confidence: number;
  matchedKeywords: string[];
  matchSource: 'name' | 'description' | 'tags';
}

class KeywordMatcher {
  static matchSkillToGroups(
    skill: { name: string; description?: string; tags?: string[] },
    groups: Array<{ id: string; keywords?: string[] }>
  ): KeywordMatchResult {
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

      for (const keyword of group.keywords) {
        const keywordLower = keyword.toLowerCase();

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

        const confidence = matchedKeywords.length / group.keywords.length;
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

  static matchSkillsToGroups(
    skills: Array<{ path: string; name: string; description?: string; tags?: string[] }>,
    groups: Array<{ id: string; keywords?: string[] }>
  ): Map<string, KeywordMatchResult> {
    const result = new Map<string, KeywordMatchResult>();

    for (const skill of skills) {
      const match = this.matchSkillToGroups(skill, groups);
      if (match.groupId) {
        result.set(skill.path, match);
      }
    }

    return result;
  }

  static getMatchSourceLabel(source: 'name' | 'description' | 'tags'): string {
    const labels = {
      name: '名称',
      description: '描述',
      tags: '标签'
    };
    return labels[source];
  }

  static getMatchSourceIcon(source: 'name' | 'description' | 'tags'): string {
    const icons = {
      name: '📝',
      description: '📄',
      tags: '🏷️'
    };
    return icons[source];
  }
}

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
  onSkillSelect?: (skill: Skill) => void;
  onCreateSkill?: () => void;
  onImportSkill?: () => void;
  onEditSkill?: (skill: Skill) => void;
  onDeleteSkill?: (skill: Skill) => void;
  onCopySkill?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  selectedSkillPath?: string | null;
  skillUpdates?: Record<string, VersionComparison>;
  onSkillUpdate?: (skill: Skill) => Promise<void>;
  onNavigateToSettings?: () => void;
  onTagAssigned?: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

interface GroupedSkills {
  group: SkillGroup | null;
  skills: Skill[];
}

export default function SkillList({
  skills,
  onSkillClick,
  onSkillSelect,
  onCreateSkill,
  onImportSkill,
  onEditSkill,
  onDeleteSkill,
  onCopySkill,
  onOpenFolder,
  selectedSkillPath,
  skillUpdates = {},
  onSkillUpdate,
  onNavigateToSettings,
  onTagAssigned,
  onRefresh,
  isRefreshing = false,
}: SkillListProps): JSX.Element {
  const { t } = useTranslation();

  /**
   * Helper function to translate group field if it's an i18n key
   */
  const tGroupField = useCallback((value: string | undefined): string => {
    if (!value) return '';
    if (value.startsWith('skillGroups.') || value.includes('.')) {
      const translated = t(value);
      if (translated && translated !== value) {
        return translated;
      }
    }
    return value;
  }, [t]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);

  // Load skill groups
  const loadSkillGroups = useCallback(async () => {
    try {
      const response = await window.electronAPI.listSkillGroups();
      if (response.success && response.data) {
        setSkillGroups(response.data);
      }
    } catch (error) {
      console.error('Failed to load skill groups:', error);
    }
  }, []);

  useEffect(() => {
    loadSkillGroups();

    // Subscribe to skills:refresh event to reload groups when they change
    const unsubscribe = window.electronAPI.onSkillsRefresh(() => {
      loadSkillGroups();
    });

    return () => {
      unsubscribe();
    };
  }, [loadSkillGroups]);

  // Handle tag assigned callback
  const handleTagAssigned = useCallback(() => {
    loadSkillGroups();
    onTagAssigned?.();
  }, [loadSkillGroups, onTagAssigned]);

  // Filter and sort skills
  const filteredAndSortedSkills = useMemo(() => {
    let result = [...skills];

    // Filter by source type (local, registry, private-repo)
    if (filterSource !== 'all') {
      result = result.filter((skill) => {
        const sourceType = skill.sourceMetadata?.type || 'local';
        return sourceType === filterSource;
      });
    }

    // Filter by search query (matches name, description, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query) ||
          skill.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort skills
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'modified':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [skills, filterSource, searchQuery, sortBy]);

  // Group skills by configured groups (using keyword matching)
  // Disabled groups are filtered out and not displayed
  const groupedSkills = useMemo((): GroupedSkills[] => {
    const result: GroupedSkills[] = [];
    const assignedSkills = new Set<string>();

    // Step 1: Use keyword matching (considers name + description + tags)
    const keywordMatches = KeywordMatcher.matchSkillsToGroups(
      filteredAndSortedSkills,
      skillGroups
    );

    // Step 2: Organize skills by group
    const groupsMap = new Map<string, Skill[]>();
    for (const skill of filteredAndSortedSkills) {
      const matchResult = keywordMatches.get(skill.path);
      if (matchResult && matchResult.groupId) {
        if (!groupsMap.has(matchResult.groupId)) {
          groupsMap.set(matchResult.groupId, []);
        }
        groupsMap.get(matchResult.groupId)!.push(skill);
        assignedSkills.add(skill.path);
      }
    }

    // Step 3: Output groups in order
    for (const group of skillGroups) {
      if (group.enabled === false) continue;
      const groupSkills = groupsMap.get(group.id);
      if (groupSkills && groupSkills.length > 0) {
        result.push({ group, skills: groupSkills });
      }
    }

    // Step 4: Unclassified skills
    const ungroupedSkills = filteredAndSortedSkills.filter(
      (skill) => !assignedSkills.has(skill.path)
    );
    if (ungroupedSkills.length > 0) {
      result.push({ group: null, skills: ungroupedSkills });
    }

    return result;
  }, [filteredAndSortedSkills, skillGroups]);

  const handleFilterChange = useCallback((newFilter: FilterSource) => {
    setFilterSource(newFilter);
  }, []);

  const handleSortChange = useCallback((newSort: SortBy) => {
    setSortBy(newSort);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSkillUpdate = useCallback(async (skill: Skill): Promise<void> => {
    if (onSkillUpdate) {
      await onSkillUpdate(skill);
    } else {
      // Default implementation using IPC
      await ipcClient.updateSkillFromSource(skill.path);
    }
  }, [onSkillUpdate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and search */}
      <div className="border-b border-gray-200 p-4 space-y-3 flex-shrink-0 bg-white">
        {/* Top row: Search + New Skill button */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              data-testid="skill-search-input"
              type="text"
              placeholder={t('skills.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label={t('common.search')}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              data-testid="refresh-skills-button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('skills.refreshList')}
              aria-label={t('skills.refreshList')}
            >
              {isRefreshing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </button>
          )}

          {/* New Skill Button */}
          {onCreateSkill && (
            <button
              data-testid="create-skill-button"
              onClick={onCreateSkill}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              aria-label={t('skills.createSkill')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>{t('skills.newSkill')}</span>
            </button>
          )}

          {/* Import Skill Button */}
          {onImportSkill && (
            <button
              data-testid="import-skill-button"
              onClick={onImportSkill}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              aria-label={t('import.title')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>{t('import.button')}</span>
            </button>
          )}
        </div>

        {/* Bottom row: Filters + Sort (with icons) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Skill count */}
          <span className="text-xs text-gray-500">
            {t('skills.skillsCount', { count: filteredAndSortedSkills.length })}
          </span>

          <div className="flex items-center gap-1 ml-auto">
            {/* Filter by source */}
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <select
                id="filter-source"
                value={filterSource}
                onChange={(e) => handleFilterChange(e.target.value as FilterSource)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                aria-label={t('skills.filter')}
                title={t('skills.filter')}
              >
                <option value="all">{t('skills.all')}</option>
                <option value="local">{t('skills.local')}</option>
                <option value="registry">{t('skills.registry')}</option>
                <option value="private-repo">{t('skills.private')}</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortBy)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                aria-label={t('skills.sort')}
                title={t('skills.sort')}
              >
                <option value="name">{t('skills.name')}</option>
                <option value="modified">{t('skills.date')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Skill grid with groups */}
      <div data-testid="skills-list" className="flex-1 overflow-auto bg-gray-50 p-4">
        {filteredAndSortedSkills.length > 0 ? (
          <div className="space-y-6">
            {groupedSkills.map(({ group, skills: groupSkills }) => (
              <div key={group?.id || 'ungrouped'}>
                {/* Group header */}
                {group && (
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xl"
                      style={{ color: group.color }}
                    >
                      {group.icon || '📁'}
                    </span>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: group.color }}
                    >
                      {tGroupField(group.name)}
                    </h3>
                    {tGroupField(group.description) && (
                      <span className="text-xs text-gray-500">
                        · {tGroupField(group.description)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      ({groupSkills.length})
                    </span>
                  </div>
                )}
                {!group && groupSkills.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl text-gray-400">📦</span>
                    <h3 className="text-sm font-semibold text-gray-500">
                      {t('skills.ungrouped')}
                    </h3>
                    <span className="text-xs text-gray-400">
                      ({groupSkills.length})
                    </span>
                  </div>
                )}

                {/* Skill cards grid - using content-visibility for performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupSkills.map((skill) => {
                    const versionStatus = skillUpdates[skill.path];
                    // Get match result for display
                    const matchResult = group
                      ? KeywordMatcher.matchSkillToGroups(skill, [group])
                      : undefined;

                    return (
                      <div
                        key={skill.path}
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
                      >
                        <SkillCard
                          skill={skill}
                          matchResult={matchResult}
                          onClick={onSkillClick}
                          onEdit={onEditSkill}
                          onSelect={onSkillSelect}
                          onDelete={onDeleteSkill}
                          onCopy={onCopySkill}
                          onOpenFolder={onOpenFolder}
                          isSelected={skill.path === selectedSkillPath}
                          versionStatus={versionStatus}
                          onUpdate={handleSkillUpdate}
                          onNavigateToSettings={onNavigateToSettings}
                          onTagAssigned={handleTagAssigned}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              {skills.length === 0
                ? t('skills.noSkills')
                : t('skills.noMatchingSkills')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
