/**
 * Registry Search Panel Component
 *
 * Full search interface for skills.sh registry with results display
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegistrySearch } from '../hooks/useRegistrySearch';
import { useViewMode } from '../hooks/useViewMode';
import { checkSkillInstalled, installFromRegistry, onInstallProgress } from '../services/registryClient';
import { SearchIcon } from './icons/SearchIcon';
import { SearchResultsList } from './SearchResultsList';
import { ViewModeToggle } from './ViewModeToggle';
import { InstallDialog } from './InstallDialog';
import type { Configuration, SearchSkillResult } from '../../shared/types';

type SortBy = 'name' | 'installs';

// Sub-component: List item for registry search list mode
const RegistrySearchListItem: React.FC<{
  skill: SearchSkillResult;
  targetDirectory: string;
  onInstallComplete?: (skill: SearchSkillResult) => void;
  onSkillClick?: (skill: SearchSkillResult) => void;
}> = ({ skill, targetDirectory, onInstallComplete, onSkillClick }) => {
  const { t } = useTranslation();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [installError, setInstallError] = useState('');
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Check if skill is already installed
  useEffect(() => {
    let cancelled = false;
    checkSkillInstalled(skill.skillId, targetDirectory).then((status) => {
      if (!cancelled) setIsInstalled(status.installed);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [skill.skillId, targetDirectory]);

  // Listen for skills:refresh event
  useEffect(() => {
    const handleRefresh = () => {
      checkSkillInstalled(skill.skillId, targetDirectory).then((status) => {
        setIsInstalled(status.installed);
      }).catch(() => {});
    };
    const unsub = window.electronAPI.onSkillsRefresh(handleRefresh);
    return unsub;
  }, [skill.skillId, targetDirectory]);

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallProgress('Starting installation...');
    setInstallError('');
    const unsubscribe = onInstallProgress((progress) => setInstallProgress(progress.message));
    try {
      await installFromRegistry({ source: skill.source, skillId: skill.skillId }, targetDirectory);
      setIsInstalled(true);
      setShowDialog(false);
      onInstallComplete?.(skill);
    } catch (error: any) {
      setInstallError(error.message || 'Installation failed');
    } finally {
      setIsInstalling(false);
      setInstallProgress('');
      unsubscribe();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => onSkillClick?.(skill)}>
        {/* Name + Source */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">{skill.name}</h3>
            {isInstalled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('install.installed')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 truncate">{skill.source}</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {skill.installs.toLocaleString()} {t('skills.installs')}
            </span>
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={() => { setInstallError(''); setShowDialog(true); }}
          disabled={isInstalling || isInstalled}
          className={`btn btn-sm flex-shrink-0 ${isInstalled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isInstalling ? 'bg-blue-400 text-white cursor-wait' : 'btn-primary'}`}
          aria-label={isInstalled ? 'Already installed' : isInstalling ? 'Installing...' : 'Install skill'}
        >
          {isInstalling ? (
            <span className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            </span>
          ) : isInstalled ? (
            t('install.installed')
          ) : (
            t('install.install')
          )}
        </button>
      </div>

      {showDialog && (
        <InstallDialog
          isOpen={showDialog}
          skillName={skill.name}
          skillId={skill.skillId}
          source={skill.source}
          onClose={() => setShowDialog(false)}
          onInstall={handleInstall}
          isInstalling={isInstalling}
          installProgress={installProgress}
          installError={installError}
        />
      )}
    </>
  );
};

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
  const { t } = useTranslation();
  const { query, results, isLoading, error, setQuery, refresh } = useRegistrySearch();
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('installs');
  const { viewMode, setViewMode } = useViewMode('registry');

  // Determine target directory for installation
  // Always install to the centralized application directory
  const targetDirectory = config?.applicationSkillsDirectory || '';

  // Listen for skills:refresh event to update install status
  useEffect(() => {
    const handleSkillsRefresh = () => {
      // Re-run search to update install status if we have an active search
      if (hasSearched && query.trim()) {
        refresh();
      }
    };

    const unsubscribe = window.electronAPI.onSkillsRefresh(handleSkillsRefresh);

    return () => {
      unsubscribe();
    };
  }, [hasSearched, query, refresh]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setHasSearched(value.trim().length > 0);
  };

  // Sort results
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return results;

    const sorted = [...results];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'installs':
          return b.installs - a.installs;
        default:
          return 0;
      }
    });

    return sorted;
  }, [results, sortBy]);

  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-3 flex-shrink-0">
        {/* Top row: Search */}
        <div className="flex items-center gap-3.5">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('discover.searchPlaceholder')}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search skills"
              data-testid="search-input"
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
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: Results Count + Sort */}
        {hasSearched && !isLoading && !error && sortedResults && sortedResults.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">
              {t('discover.resultsCount', { count: sortedResults.length })}
            </span>

            <div className="flex items-center gap-1 ml-auto">
              {/* Sort by */}
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select
                  id="sort-by-registry"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortBy)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                  aria-label="Sort by"
                  title="Sort results"
                >
                  <option value="name">{t('skills.name')}</option>
                  <option value="installs">{t('skills.installs')}</option>
                </select>
              </div>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3.5">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className="text-sm text-gray-600">{t('discover.searching')}</span>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('discover.searchError')}</h3>
            <p className="text-sm text-gray-600 text-center max-w-md mb-4">{error}</p>
            <button
              onClick={() => handleQueryChange(query)}
              className="btn btn-primary"
              aria-label={t('discover.retry')}
            >
              {t('discover.retry')}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('discover.searchForSkills')}</h3>
            <p className="text-sm text-gray-600 text-center max-w-md">
              {t('discover.searchDescription')}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('discover.noSkillsFound')}</h3>
            <p className="text-sm text-gray-600 text-center max-w-md">
              {t('discover.noResultsFor', { query })}
            </p>
          </div>
        )}

        {/* Results List with Grid and Grouping */}
        {hasSearched && !isLoading && !error && sortedResults && sortedResults.length > 0 && (
          viewMode === 'list' ? (
            <div className="space-y-2">
              {sortedResults.map((skill) => (
                <RegistrySearchListItem
                  key={skill.skillId}
                  skill={skill}
                  targetDirectory={targetDirectory}
                  onInstallComplete={onInstallComplete}
                  onSkillClick={onSkillClick}
                />
              ))}
            </div>
          ) : (
            <SearchResultsList
              results={sortedResults}
              targetDirectory={targetDirectory}
              onInstallComplete={onInstallComplete}
              onSkillClick={onSkillClick}
            />
          )
        )}
      </div>
    </div>
  );
};
