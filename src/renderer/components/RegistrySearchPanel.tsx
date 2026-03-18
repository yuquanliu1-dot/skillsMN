/**
 * Registry Search Panel Component
 *
 * Full search interface for skills.sh registry with results display
 */

import React, { useState } from 'react';
import { useRegistrySearch } from '../hooks/useRegistrySearch';
import { SearchIcon } from './icons/SearchIcon';
import { SearchResultsList } from './SearchResultsList';
import type { Configuration, SearchSkillResult } from '../../shared/types';

interface RegistrySearchPanelProps {
  config: Configuration | null;
  onInstallComplete?: () => void;
  onSkillClick?: (skill: SearchSkillResult) => void;
}

export const RegistrySearchPanel: React.FC<RegistrySearchPanelProps> = ({
  config,
  onInstallComplete,
  onSkillClick
}) => {
  const { query, results, isLoading, error, setQuery } = useRegistrySearch();
  const [hasSearched, setHasSearched] = useState(false);

  // Determine target directory for installation
  const targetDirectory = config?.projectDirectory || '';

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setHasSearched(value.trim().length > 0);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Discover Skills
          </h2>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for skills (e.g., data analysis, code review)..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              aria-label="Search skills"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Search across thousands of public skills from skills.sh registry
          </p>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm text-gray-600">Searching...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Error</h3>
              <p className="text-sm text-gray-600 text-center max-w-md mb-4">{error}</p>
              <button
                onClick={() => handleQueryChange(query)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Retry search"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State - No search yet */}
          {!hasSearched && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for Skills</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                Enter a search term to discover skills from the skills.sh registry
              </p>
            </div>
          )}

          {/* No Results State */}
          {hasSearched && !isLoading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Skills Found</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                No results for "{query}". Try a different search term.
              </p>
            </div>
          )}

          {/* Results List */}
          {hasSearched && !isLoading && !error && results.length > 0 && (
            <>
              <div className="mb-3 text-sm text-gray-600">
                Found {results.length} skill{results.length !== 1 ? 's' : ''}
              </div>
              <SearchResultsList
                results={results}
                targetDirectory={targetDirectory}
                onInstallComplete={onInstallComplete}
                onSkillClick={onSkillClick}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
