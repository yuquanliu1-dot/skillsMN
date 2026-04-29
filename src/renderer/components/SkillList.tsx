/**
 * SkillList Component
 *
 * Grid-based skill list with group support
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Skill, FilterSource, SortBy, VersionComparison, SkillGroup } from '../../shared/types';
import { KeywordMatcher } from '../../shared/services/KeywordMatcher';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants';
import { useColumnCount } from '../hooks/useColumnCount';
import SkillCard from './SkillCard';
import { ipcClient } from '../services/ipcClient';
import GroupIcon from './GroupIcon';
import { useViewMode } from '../hooks/useViewMode';
import { ViewModeToggle } from './ViewModeToggle';

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query for filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const { viewMode, setViewMode } = useViewMode('skillList');

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
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
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
  }, [skills, filterSource, debouncedSearchQuery, sortBy]);

  // Keyword matching results (cached alongside grouping)
  const keywordMatches = useMemo(() => {
    const groups = skillGroups.filter(group => group.enabled !== false);
    return KeywordMatcher.matchSkillsToGroups(filteredAndSortedSkills, groups);
  }, [filteredAndSortedSkills, skillGroups]);

  // Group skills by configured groups (using keyword matching)
  // Disabled groups are filtered out and not displayed
  const groupedSkills = useMemo((): GroupedSkills[] => {
    const result: GroupedSkills[] = [];
    const assignedSkills = new Set<string>();
    const groups = skillGroups.filter(group => group.enabled !== false);

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
    for (const group of groups) {
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
  }, [filteredAndSortedSkills, skillGroups, keywordMatches]);

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

  // Virtual scrolling setup
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount(scrollRef);

  // Flatten grouped skills into virtual rows
  const virtualRows = useMemo(() => {
    type VirtualRow =
      | { type: 'header'; group: SkillGroup | null; count: number }
      | { type: 'cards'; skills: Skill[] };

    const rows: VirtualRow[] = [];
    for (const { group, skills: groupSkills } of groupedSkills) {
      rows.push({ type: 'header', group, count: groupSkills.length });
      for (let i = 0; i < groupSkills.length; i += columnCount) {
        rows.push({ type: 'cards', skills: groupSkills.slice(i, i + columnCount) });
      }
    }
    return rows;
  }, [groupedSkills, columnCount]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = virtualRows[index];
      return row?.type === 'header' ? 36 : 152; // header + margin, or card + gap
    },
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and search */}
      <div className="border-b border-gray-200 p-4 space-y-3 flex-shrink-0 bg-white">
        {/* Top row: Search + New Skill button */}
        <div className="flex items-center gap-3.5">
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
                <div className="animate-spin rounded-full h-5 w-5 border-4 border-gray-600 border-t-transparent"></div>
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
              className="btn btn-primary btn-sm flex items-center gap-1.5"
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
              className="btn btn-sm flex items-center gap-1.5 !bg-green-600 hover:!bg-green-700 text-white"
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

            {/* View mode toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Skill grid with virtual scrolling */}
      <div ref={scrollRef} data-testid="skills-list" className="flex-1 overflow-auto bg-white p-4">
        {filteredAndSortedSkills.length > 0 ? (
          viewMode === 'list' ? (
            /* List mode: grouped skills with headers */
            <div className="space-y-4">
              {groupedSkills.map(({ group, skills: groupSkills }) => (
                <div key={group?.id ?? 'ungrouped'} className="space-y-2">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-1">
                    {group ? (
                      <>
                        <span style={{ color: group.color }}>
                          <GroupIcon icon={group.icon} className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-semibold" style={{ color: group.color }}>
                          {tGroupField(group.name)}
                        </h3>
                        {tGroupField(group.description) && (
                          <span className="text-xs text-gray-500">
                            · {tGroupField(group.description)}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">({groupSkills.length})</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400"><GroupIcon className="w-4 h-4" /></span>
                        <h3 className="text-sm font-semibold text-gray-500">
                          {t('skills.ungrouped')}
                        </h3>
                        <span className="text-xs text-gray-400">({groupSkills.length})</span>
                      </>
                    )}
                  </div>
                  {groupSkills.map((skill) => {
                    const versionStatus = skillUpdates[skill.path];
                    return (
                      <div
                        key={skill.path}
                        className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                          skill.path === selectedSkillPath
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {/* Skill name + version badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {skill.name}
                            </span>
                            {skill.version && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded border border-gray-200">
                                v{skill.version}
                              </span>
                            )}
                            {versionStatus?.hasUpdate && (
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded border border-yellow-200">
                                {t('skills.updateAvailable')}
                              </span>
                            )}
                          </div>
                          {/* Description */}
                          {skill.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {skill.description}
                            </p>
                          )}
                          {/* Source URL */}
                          {skill.sourceMetadata?.type === 'registry' && skill.sourceMetadata.registryUrl && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {skill.sourceMetadata.registryUrl}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {onEditSkill && (
                            <button
                              onClick={() => onEditSkill(skill)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {onCopySkill && (
                            <button
                              onClick={() => onCopySkill(skill)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={t('common.copy')}
                              aria-label={t('common.copy')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          {onOpenFolder && (
                            <button
                              onClick={() => onOpenFolder(skill)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={t('skills.openFolder')}
                              aria-label={t('skills.openFolder')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </button>
                          )}
                          {onDeleteSkill && (
                            <button
                              onClick={() => onDeleteSkill(skill)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            /* Grid mode: virtualized card grid */
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const row = virtualRows[virtualItem.index];
                if (!row) return null;

                if (row.type === 'header') {
                  const g = row.group;
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: virtualItem.start,
                        left: 0,
                        width: '100%',
                        height: virtualItem.size,
                      }}
                      className="flex items-center gap-2 mb-1"
                    >
                      {g ? (
                        <>
                          <span style={{ color: g.color }}>
                            <GroupIcon icon={g.icon} className="w-5 h-5" />
                          </span>
                          <h3 className="text-sm font-semibold" style={{ color: g.color }}>
                            {tGroupField(g.name)}
                          </h3>
                          {tGroupField(g.description) && (
                            <span className="text-xs text-gray-500">
                              · {tGroupField(g.description)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">({row.count})</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400"><GroupIcon className="w-5 h-5" /></span>
                          <h3 className="text-sm font-semibold text-gray-500">
                            {t('skills.ungrouped')}
                          </h3>
                          <span className="text-xs text-gray-400">({row.count})</span>
                        </>
                      )}
                    </div>
                  );
                }

                // Card row
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: virtualItem.start,
                      left: 0,
                      width: '100%',
                      height: virtualItem.size,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                      gap: '14px',
                      alignContent: 'start',
                    }}
                  >
                    {row.skills.map((skill) => {
                      const versionStatus = skillUpdates[skill.path];
                      const matchResult = keywordMatches.get(skill.path);
                      return (
                        <SkillCard
                          key={skill.path}
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
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )) : (
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
