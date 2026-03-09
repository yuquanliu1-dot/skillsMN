/**
 * SkillList Component
 *
 * Displays list of skills with filtering, sorting, and search
 */

import React, { useState, useMemo } from 'react';
import type { Skill, FilterSource, SortBy } from '../../shared/types';
import SkillCard from './SkillCard';

interface SkillListProps {
  skills: Skill[];
  onSkillClick?: (skill: Skill) => void;
}

export default function SkillList({ skills, onSkillClick }: SkillListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');

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
        case 'description':
          return (a.description || '').localeCompare(b.description || '');
        default:
          return 0;
      }
    });

    return result;
  }, [skills, filterSource, searchQuery, sortBy]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and search */}
      <div className="border-b border-slate-700 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
            aria-label="Search skills"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500"
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

        {/* Filters and Sort */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Filter by source */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-source" className="text-sm text-slate-400">
              Filter:
            </label>
            <select
              id="filter-source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as FilterSource)}
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
            <label htmlFor="sort-by" className="text-sm text-slate-400">
              Sort by:
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="select"
              aria-label="Sort by"
            >
              <option value="name">Name</option>
              <option value="modified">Modified</option>
              <option value="description">Description</option>
            </select>
          </div>

          {/* Skill count */}
          <div className="ml-auto text-sm text-slate-400">
            {filteredAndSortedSkills.length} of {skills.length} skills
          </div>
        </div>
      </div>

      {/* Skill list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4">
          {filteredAndSortedSkills.map((skill) => (
            <SkillCard
              key={skill.path}
              skill={skill}
              onClick={onSkillClick}
            />
          ))}
          {filteredAndSortedSkills.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              {skills.length === 0
                ? 'No skills found. Create your first skill to get started.'
                : 'No skills match your search criteria.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
