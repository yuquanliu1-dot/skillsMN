/**
 * Search Results List Component
 *
 * Displays search results in a simple grid layout (no grouping)
 */

import React from 'react';
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {results.map((skill) => (
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
