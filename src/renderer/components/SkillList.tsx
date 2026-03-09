/**
 * SkillList Component
 *
 * Displays list of skills with filtering, sorting, search, and virtualization
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Skill, FilterSource, SortBy } from '../../shared/types';
import SkillCard from './SkillCard';

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
  onSkillSelect?: (skill: Skill) => void;
  onCreateSkill?: () => void;
  onDeleteSkill?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  selectedSkillPath?: string | null;
}

// Card height + gap (80px card + 16px gap)
const CARD_HEIGHT = 96;

export default function SkillList({ skills, onSkillClick, onSkillSelect, onCreateSkill, onDeleteSkill, onOpenFolder, selectedSkillPath }: SkillListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const listRef = useRef<List>(null);

  /**
   * Filter and sort skills based on current state
   */
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

  /**
   * Reset scroll when filters change
   */
  const handleFilterChange = useCallback((newFilter: FilterSource) => {
    setFilterSource(newFilter);
    listRef.current?.scrollTo(0);
  }, []);

  const handleSortChange = useCallback((newSort: SortBy) => {
    setSortBy(newSort);
    listRef.current?.scrollTo(0);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    listRef.current?.scrollTo(0);
  }, []);

  /**
   * Virtualized row renderer
   */
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const skill = filteredAndSortedSkills[index];
      if (!skill) return null;

      return (
        <div style={{ ...style, paddingBottom: '16px' }}>
          <SkillCard
            skill={skill}
            onClick={onSkillClick}
            onSelect={onSkillSelect}
            onDelete={onDeleteSkill}
            onOpenFolder={onOpenFolder}
            isSelected={skill.path === selectedSkillPath}
          />
        </div>
      );
    },
    [filteredAndSortedSkills, onSkillClick, onSkillSelect, onDeleteSkill, onOpenFolder, selectedSkillPath]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and search */}
      <div className="border-b border-border p-4 space-y-3 flex-shrink-0">
        {/* Top row: Search + New Skill button */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input w-full pl-10"
              aria-label="Search skills"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted"
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
              className="btn btn-primary flex items-center gap-2"
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

        {/* Filters and Sort */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Filter by source */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-source" className="text-sm text-text-secondary">
              Filter:
            </label>
            <select
              id="filter-source"
              value={filterSource}
              onChange={(e) => handleFilterChange(e.target.value as FilterSource)}
              className="select"
              aria-label="Filter by source"
            >
              <option value="all">All</option>
              <option value="project">Project</option>
              <option value="global">Global</option>
            </select>
          </div>

          {/* Sort by */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by" className="text-sm text-text-secondary">
              Sort by:
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortBy)}
              className="select"
              aria-label="Sort by"
            >
              <option value="name">Name</option>
              <option value="modified">Modified</option>
            </select>
          </div>

          {/* Skill count */}
          <div className="ml-auto text-sm text-text-muted">
            {filteredAndSortedSkills.length} of {skills.length} skills
          </div>
        </div>
      </div>

      {/* Skill list with virtualization */}
      <div className="flex-1">
        {filteredAndSortedSkills.length > 0 ? (
          <List
            ref={listRef}
            height={window.innerHeight - 200} // Approximate visible height
            itemCount={filteredAndSortedSkills.length}
            itemSize={CARD_HEIGHT}
            width="100%"
            className="p-4"
          >
            {Row}
          </List>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center text-text-muted">
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
