/**
 * Search Results List Component
 *
 * Displays search results with virtual scrolling for performance
 */

import React from 'react';
import { SearchSkillResult } from '../../../shared/types';
import SearchResultCard from './SkillResultCard';
import { SkillResultCard } from './SkillResultCard';

interface SearchResultsListProps {
  results: SearchSkillResult[];
  onInstall?: (skill: SearchSkillResult) => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({ results, onInstall }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No skills found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((skill) => (
        <SkillResultCard
          key={skill.id}
          skill={skill}
          onInstall={onInstall}
        />
      ))}
    </div>
  );
};
