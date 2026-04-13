/**
 * SearchPanel Component
 *
 * Search interface for discovering public GitHub skills
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SearchResult, RateLimitInfo } from '../../shared/types';
import SearchResultCard from './SearchResultCard';
import SkillPreview from './SkillPreview';
import ConflictResolutionDialog from './ConflictResolutionDialog';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallComplete: () => void;
  isInline?: boolean;
}

export default function SearchPanel({ isOpen, onClose, onInstallComplete, isInline = false }: SearchPanelProps): JSX.Element | null {
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

  // AbortController for search cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Search function with cancellation support
  const performSearch = useCallback(async (searchQuery: string, page: number) => {
    // Cancel previous search if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this search
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (!searchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.searchGitHub(searchQuery, page);

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Search failed');
      }

      const { results: searchResults, totalCount, rateLimit: rateLimitInfo } = response.data;

      if (page === 1) {
        setResults(searchResults);
      } else {
        setResults((prev) => [...prev, ...searchResults]);
      }

      setTotalCount(totalCount);
      setHasMore(searchResults.length === 30);
      setRateLimit(rateLimitInfo);
      setCurrentPage(page);
    } catch (err) {
      // Don't show error if request was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced search with cancellation
  const debouncedSearch = useCallback(
    debounce(performSearch, 500),
    [performSearch]
  );

  // Search when query changes
  useEffect(() => {
    if (query.trim()) {
      setCurrentPage(1);
      setResults([]);
      debouncedSearch(query, 1);
    } else {
      setResults([]);
      setTotalCount(0);
      setError(null);
    }

    // Cleanup: Cancel search on unmount or query change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debouncedSearch]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore || isLoading) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading && query.trim()) {
          performSearch(query, currentPage + 1);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(loaderRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, currentPage, query, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  // Install from InstallDialog
  const handleInstallFromDialog = async (targetDirectory: 'project' | 'global', conflictResolution?: 'overwrite' | 'rename' | 'skip') => {
    if (!installingSkill) return;

    try {
      const response = await window.electronAPI.installGitHubSkill({
        repositoryName: installingSkill.repositoryName,
        skillFilePath: installingSkill.skillFilePath,
        downloadUrl: installingSkill.downloadUrl,
        targetDirectory,
        conflictResolution,
      });

      if (response.success) {
        setInstallingSkill(null);
        onInstallComplete();
      } else if (response.error?.code === 'CONFLICT') {
        handleConflict(
          installingSkill.repositoryName,
          installingSkill.skillFilePath,
          installingSkill.downloadUrl
        );
      }
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  // Conflict resolution handler (for ConflictResolutionDialog component)
  const handleConflictResolve = async (resolution: 'overwrite' | 'rename' | 'skip', applyToAll?: boolean) => {
    if (!conflictSkill) return;

    try {
      // If applyToAll is checked, set the preference in the backend
      if (applyToAll) {
        await window.electronAPI.setGitHubConflictPreference(resolution);
      }

      // Perform the installation with the chosen resolution
      const response = await window.electronAPI.installGitHubSkill({
        repositoryName: conflictSkill.repositoryName,
        skillFilePath: conflictSkill.skillFilePath,
        downloadUrl: conflictSkill.downloadUrl,
        targetDirectory: 'project', // Default to project directory
        conflictResolution: resolution,
      });

      if (response.success) {
        setConflictSkill(null);
        onInstallComplete();
      } else {
        console.error('Conflict resolution failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  if (!isOpen && !isInline) return null;

  // Debug: Log rendering state
  console.log('SearchPanel rendering:', { isOpen, isInline, query, results: results.length });

  const containerClasses = isInline
    ? "flex-1 flex flex-col bg-white overflow-hidden"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  const panelClasses = isInline
    ? "flex-1 flex flex-col overflow-hidden"
    : "bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200 shadow-lg";

  return (
    <div className={containerClasses}>
      <div className={panelClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Discover Public Skills</h2>
            {rateLimit && (
              <div className="text-xs text-gray-500">
                API Limit: {rateLimit.remaining}/{rateLimit.limit}
              </div>
            )}
          </div>
          {!isInline && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for Claude Code skills on GitHub..."
              className="w-full bg-white text-gray-900 border border-gray-300 rounded px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
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
            <div className="mt-2 text-sm text-gray-600">Found {totalCount} repositories</div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Search Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  if (query.trim()) {
                    performSearch(query, 1);
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100
                           hover:bg-red-200 rounded-md transition-colors duration-200
                           border border-red-300"
                aria-label="Retry search"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Empty State: No query yet */}
          {results.length === 0 && !isLoading && !query && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Public Skills</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                Search for Claude Code skills on GitHub. Try keywords like "react", "typescript", or "testing".
              </p>
            </div>
          )}

          {/* Empty State: No results found */}
          {results.length === 0 && !isLoading && query && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No skills found</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                No results found for "{query}". Try different keywords or check your spelling.
              </p>
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
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-gray-600">Searching...</span>
              </div>
            </div>
          )}

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="h-20 flex items-center justify-center">
            {hasMore && !isLoading && query.trim() && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-4 border-gray-400 border-t-transparent"></div>
                <span>Loading more...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Preview Modal - render in third column when inline */}
      {!isInline && previewingUrl && (
        <SkillPreview
          downloadUrl={previewingUrl}
          onClose={() => setPreviewingUrl(null)}
          onInstall={(repo, path, url) => {
            setPreviewingUrl(null);
            handleInstall(repo, path, url);
          }}
        />
      )}

      {/* Install Dialog - render in third column when inline */}
      {!isInline && installingSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Install Skill</h3>
            <p className="text-sm text-gray-600 mb-4">
              Install {installingSkill.skillFilePath} from {installingSkill.repositoryName}?
            </p>
            <div className="flex gap-3.5 justify-end">
              <button
                onClick={() => setInstallingSkill(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleInstallFromDialog('project')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Install to Project
              </button>
              <button
                onClick={() => handleInstallFromDialog('global')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Install to Global
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Dialog - render in third column when inline */}
      {!isInline && conflictSkill && (
        <ConflictResolutionDialog
          repositoryName={conflictSkill.repositoryName}
          skillFilePath={conflictSkill.skillFilePath}
          downloadUrl={conflictSkill.downloadUrl}
          onClose={() => setConflictSkill(null)}
          onResolve={handleConflictResolve}
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
