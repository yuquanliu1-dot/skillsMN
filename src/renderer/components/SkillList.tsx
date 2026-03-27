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

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
  onSkillSelect?: (skill: Skill) => void;
  onCreateSkill?: () => void;
  onEditSkill?: (skill: Skill) => void;
  onDeleteSkill?: (skill: Skill) => void;
  onCopySkill?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  selectedSkillPath?: string | null;
  skillUpdates?: Record<string, VersionComparison>;
  onSkillUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
  onSkillUpload?: (skill: Skill) => Promise<void>;
  onNavigateToSettings?: () => void;
  onTagAssigned?: () => void;
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
  onEditSkill,
  onDeleteSkill,
  onCopySkill,
  onOpenFolder,
  selectedSkillPath,
  skillUpdates = {},
  onSkillUpdate,
  onSkillUpload,
  onNavigateToSettings,
  onTagAssigned,
}: SkillListProps): JSX.Element {
  const { t } = useTranslation();
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

  // Group skills by configured groups (based on tags)
  const groupedSkills = useMemo((): GroupedSkills[] => {
    const result: GroupedSkills[] = [];
    const assignedSkills = new Set<string>();

    // Create a map of tag to group
    const tagToGroup = new Map<string, SkillGroup>();
    for (const group of skillGroups) {
      for (const tag of group.tags) {
        tagToGroup.set(tag.toLowerCase(), group);
      }
    }

    // Group skills by their tags' group assignments
    for (const group of skillGroups) {
      const groupSkills: Skill[] = [];
      for (const skill of filteredAndSortedSkills) {
        if (assignedSkills.has(skill.path)) continue;

        // Check if any of the skill's tags belong to this group
        const skillTags = skill.tags || [];
        const hasGroupTag = skillTags.some(tag => {
          const assignedGroup = tagToGroup.get(tag.toLowerCase());
          return assignedGroup?.id === group.id;
        });

        if (hasGroupTag) {
          groupSkills.push(skill);
          assignedSkills.add(skill.path);
        }
      }
      if (groupSkills.length > 0) {
        result.push({ group, skills: groupSkills });
      }
    }

    // Ungrouped skills (skills without tags or tags not assigned to any group)
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

  const handleSkillUpdate = useCallback(async (skill: Skill, createBackup: boolean): Promise<void> => {
    if (onSkillUpdate) {
      await onSkillUpdate(skill, createBackup);
    } else {
      // Default implementation using IPC
      await ipcClient.updateSkillFromSource(skill.path, createBackup);
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
                      {group.name}
                    </h3>
                    {group.description && (
                      <span className="text-xs text-gray-500">
                        · {group.description}
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

                {/* Skill cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupSkills.map((skill) => {
                    const versionStatus = skillUpdates[skill.path];
                    return (
                      <SkillCard
                        key={skill.path}
                        skill={skill}
                        onClick={onSkillClick}
                        onEdit={onEditSkill}
                        onSelect={onSkillSelect}
                        onDelete={onDeleteSkill}
                        onCopy={onCopySkill}
                        onOpenFolder={onOpenFolder}
                        isSelected={skill.path === selectedSkillPath}
                        versionStatus={versionStatus}
                        onUpdate={handleSkillUpdate}
                        onUpload={onSkillUpload}
                        onNavigateToSettings={onNavigateToSettings}
                        onTagAssigned={handleTagAssigned}
                      />
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
