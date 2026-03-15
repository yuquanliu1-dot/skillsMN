/**
 * SkillList Component
 *
 * Virtualized list with fixed-height items (80px each)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Skill, FilterSource, SortBy } from '../../shared/types';
import { SKILL_LIST_ITEM_HEIGHT } from '../../shared/constants';
import SkillCard from './SkillCard';
import { ipcClient } from '../services/ipcClient';

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
  onSkillSelect?: (skill: Skill) => void;
  onCreateSkill?: () => void;
  onDeleteSkill?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  selectedSkillPath?: string | null;
  skillUpdates?: Record<string, { hasUpdate: boolean; remoteSHA?: string }>;
  onSkillUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
  onSkillUpload?: (skill: Skill) => void;
}

export default function SkillList({
  skills,
  onSkillClick,
  onSkillSelect,
  onCreateSkill,
  onDeleteSkill,
  onOpenFolder,
  selectedSkillPath,
  skillUpdates = {},
  onSkillUpdate,
  onSkillUpload,
}: SkillListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Filter and sort skills
  const filteredAndSortedSkills = useMemo(() => {
    let result = [...skills];

    // Filter by source
    if (filterSource !== 'all') {
      result = result.filter((skill) => skill.source === filterSource);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query)
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
      const updateInfo = skillUpdates[skill.path];

      return (
        <div style={style} className="px-4 py-2">
          <SkillCard
            skill={skill}
            onClick={onSkillClick}
            onSelect={onSkillSelect}
            onDelete={onDeleteSkill}
            onOpenFolder={onOpenFolder}
            isSelected={skill.path === selectedSkillPath}
            hasUpdate={updateInfo?.hasUpdate || false}
            onUpdate={handleSkillUpdate}
            onUpload={onSkillUpload}
          />
        </div>
      );
    },
    [filteredAndSortedSkills, onSkillClick, onSkillSelect, onDeleteSkill, onOpenFolder, selectedSkillPath, skillUpdates, handleSkillUpdate, onSkillUpload]
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
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search skills"
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
              onClick={onCreateSkill}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Create new skill"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="hidden sm:inline">New Skill</span>
            </button>
          )}
        </div>

        {/* Bottom row: Filters + Sort (with icons) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Skill count */}
          <span className="text-xs text-gray-500">
            {filteredAndSortedSkills.length}/{skills.length} skills
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
                aria-label="Filter by source"
                title="Filter skills"
              >
                <option value="all">All</option>
                <option value="project">Project</option>
                <option value="global">Global</option>
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
                aria-label="Sort by"
                title="Sort skills"
              >
                <option value="name">Name</option>
                <option value="modified">Date</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Skill list with virtualization */}
      <div ref={listRef} className="flex-1 overflow-hidden bg-gray-50">
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
                ? 'No skills found. Create your first skill to get started.'
                : 'No skills match your search criteria.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
