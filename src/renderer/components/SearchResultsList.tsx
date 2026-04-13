/**
 * Search Results List Component
 *
 * Displays search results in a simple grid layout (no grouping)
 * Sorted by installs (descending) by default
 */

import React, { useMemo } from 'react';
import { SearchSkillResult } from '../../shared/types';
import { SkillResultCard } from './SkillResultCard';

interface SearchResultsListProps {
  results: SearchSkillResult[];
  targetDirectory: string;
  onInstallComplete?: (skill: SearchSkillResult) => void;
  onSkillClick?: (skill: SearchSkillResult) => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  targetDirectory,
  onInstallComplete,
  onSkillClick
}) => {
  // Sort results by installs (descending) by default
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => (b.installs || 0) - (a.installs || 0));
  }, [results]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {sortedResults.map((skill) => (
        <SkillResultCard
          key={skill.skillId}
          skill={skill}
          targetDirectory={targetDirectory}
          onInstallComplete={onInstallComplete}
          onSkillClick={onSkillClick}
        />
      ))}
    </div>
  );
};
