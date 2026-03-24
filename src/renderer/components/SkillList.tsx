/**
 * SkillList Component
 *
 * Virtualized list with fixed-height items (80px each)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList as List } from 'react-window';
import type { Skill, FilterSource, SortBy, VersionComparison } from '../../shared/types';
import { SKILL_LIST_ITEM_HEIGHT } from '../../shared/constants';
import SkillCard from './SkillCard';
import { ipcClient } from '../services/ipcClient';

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
  onSkillSelect?: (skill: Skill) => void;
  onCreateSkill?: () => void;
  onDeleteSkill?: (skill: Skill) => void;
  onCopySkill?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  selectedSkillPath?: string | null;
  skillUpdates?: Record<string, VersionComparison>;
  onSkillUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
  onSkillUpload?: (skill: Skill) => Promise<void>;
}

export default function SkillList({
  skills,
  onSkillClick,
  onSkillSelect,
  onCreateSkill,
  onDeleteSkill,
  onCopySkill,
  onOpenFolder,
  selectedSkillPath,
  skillUpdates = {},
  onSkillUpdate,
  onSkillUpload,
}: SkillListProps): JSX.Element {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Extract all unique tags from skills
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    skills.forEach((skill) => {
      skill.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [skills]);

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

    // Filter by tag
    if (filterTag !== 'all') {
      result = result.filter((skill) => skill.tags?.includes(filterTag));
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
  }, [skills, filterSource, filterTag, searchQuery, sortBy]);

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

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const skill = filteredAndSortedSkills[index];
      const versionStatus = skillUpdates[skill.path];

      return (
        <div style={style}>
          <div className="px-4">
            <SkillCard
              skill={skill}
              onClick={onSkillClick}
              onSelect={onSkillSelect}
              onDelete={onDeleteSkill}
              onCopy={onCopySkill}
              onOpenFolder={onOpenFolder}
              isSelected={skill.path === selectedSkillPath}
              versionStatus={versionStatus}
              onUpdate={handleSkillUpdate}
              onUpload={onSkillUpload}
            />
          </div>
        </div>
      );
    },
    [filteredAndSortedSkills, onSkillClick, onSkillSelect, onDeleteSkill, onCopySkill, onOpenFolder, selectedSkillPath, skillUpdates, handleSkillUpdate, onSkillUpload]
  );

  // Update list height on container resize
  useEffect(() => {
    const updateHeight = () => {
      if (listRef.current) {
        const rect = listRef.current.getBoundingClientRect();
        setListHeight(rect.height);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

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
              className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label={t('skills.createSkill')}
              title={t('skills.newSkill')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
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

            {/* Filter by tag */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <select
                  id="filter-tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                  aria-label={t('skills.filterByTag')}
                  title={t('skills.filterByTag')}
                >
                  <option value="all">{t('skills.allTags')}</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* Skill list with virtualization */}
      <div ref={listRef} data-testid="skills-list" className="flex-1 overflow-hidden bg-gray-50 pt-2">
        {filteredAndSortedSkills.length > 0 ? (
          <List
            height={listHeight - 8}
            itemCount={filteredAndSortedSkills.length}
            itemSize={SKILL_LIST_ITEM_HEIGHT}
            width="100%"
            className="scrollbar-thin"
          >
            {Row}
          </List>
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
