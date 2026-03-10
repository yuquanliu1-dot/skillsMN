/**
 * SearchPanel Component
 *
 * Search interface for discovering public GitHub skills
 */

import { useState, useEffect, useCallback } from 'react';
import type { SearchResult, RateLimitInfo } from '../../shared/types';
import SearchResultCard from './SearchResultCard';
import SkillPreview from './SkillPreview';
import InstallDialog from './InstallDialog';
import ConflictResolutionDialog from './ConflictResolutionDialog';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallComplete: () => void;
}

export default function SearchPanel({ isOpen, onClose, onInstallComplete }: SearchPanelProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const [installingSkill, setInstallingSkill] = useState<{
    repositoryName: string;
    skillFilePath: string;
    downloadUrl: string;
  } | null>(null);
  const [conflictSkill, setConflictSkill] = useState<{
    repositoryName: string;
    skillFilePath: string;
    downloadUrl: string;
  } | null>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, page: number) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalCount(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await window.electronAPI.searchGitHub(searchQuery, page);

        if (page === 1) {
          setResults(response.results);
        } else {
          setResults((prev) => [...prev, ...response.results]);
        }

        setTotalCount(response.totalCount);
        setHasMore(response.results.length === 30);
        setRateLimit(response.rateLimit);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  // Search when query changes
  useEffect(() => {
    if (query.trim()) {
      setCurrentPage(1);
      debouncedSearch(query, 1);
    } else {
      setResults([]);
      setTotalCount(0);
    }
  }, [query]);

  // Load more results
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      debouncedSearch(query, currentPage + 1);
    }
  };

  // Preview skill
  const handlePreview = (downloadUrl: string) => {
    setPreviewingUrl(downloadUrl);
  };

  // Install skill
  const handleInstall = (repositoryName: string, skillFilePath: string, downloadUrl: string) => {
    setInstallingSkill({ repositoryName, skillFilePath, downloadUrl });
  };

  // Handle conflict
  const handleConflict = (repositoryName: string, skillFilePath: string, downloadUrl: string) => {
    setInstallingSkill(null);
    setConflictSkill({ repositoryName, skillFilePath, downloadUrl });
  };

  // Install complete
  const handleInstallComplete = () => {
    setInstallingSkill(null);
    setConflictSkill(null);
    onInstallComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Discover Public Skills</h2>
            {rateLimit && (
              <div className="text-xs text-slate-400">
                API Limit: {rateLimit.remaining}/{rateLimit.limit}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for Claude Code skills on GitHub..."
              className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {totalCount > 0 && (
            <div className="mt-2 text-sm text-slate-400">Found {totalCount} repositories</div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 && !isLoading && query && (
            <div className="text-center text-slate-400 mt-8">No skills found for "{query}"</div>
          )}

          {results.length === 0 && !isLoading && !query && (
            <div className="text-center text-slate-400 mt-8">
              Search for Claude Code skills on GitHub
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <SearchResultCard
                key={`${result.repositoryName}-${index}`}
                result={result}
                onPreview={handlePreview}
                onInstall={handleInstall}
                onConflict={handleConflict}
              />
            ))}
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Load more button */}
          {hasMore && !isLoading && (
            <div className="flex justify-center py-4">
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Skill Preview Modal */}
      {previewingUrl && (
        <SkillPreview
          downloadUrl={previewingUrl}
          onClose={() => setPreviewingUrl(null)}
          onInstall={(repo, path, url) => {
            setPreviewingUrl(null);
            handleInstall(repo, path, url);
          }}
        />
      )}

      {/* Install Dialog */}
      {installingSkill && (
        <InstallDialog
          repositoryName={installingSkill.repositoryName}
          skillFilePath={installingSkill.skillFilePath}
          downloadUrl={installingSkill.downloadUrl}
          onClose={() => setInstallingSkill(null)}
          onInstall={handleInstallComplete}
          onConflict={() =>
            handleConflict(
              installingSkill.repositoryName,
              installingSkill.skillFilePath,
              installingSkill.downloadUrl
            )
          }
        />
      )}

      {/* Conflict Resolution Dialog */}
      {conflictSkill && (
        <ConflictResolutionDialog
          repositoryName={conflictSkill.repositoryName}
          skillFilePath={conflictSkill.skillFilePath}
          downloadUrl={conflictSkill.downloadUrl}
          onClose={() => setConflictSkill(null)}
          onResolve={handleInstallComplete}
        />
      )}
    </div>
  );
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
