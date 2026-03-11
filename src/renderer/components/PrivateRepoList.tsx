/**
 * PrivateRepoList Component
 *
 * Displays and browses skills from configured private repositories
 */

import { useState, useEffect } from 'react';
import type { PrivateRepo, PrivateSkill } from '../../shared/types';
import PrivateSkillCard from './PrivateSkillCard';

interface PrivateRepoListProps {
  onInstallSkill?: (skill: PrivateSkill, repo: PrivateRepo) => void;
}

/**
 * Check if an error message indicates an authentication failure
 */
function isAuthenticationError(message: string): boolean {
  const authErrorPatterns = [
    'authentication failed',
    '401',
    'unauthorized',
    'invalid pat',
    'invalid token',
    'token expired',
    'bad credentials',
    'access token',
  ];
  const lowerMessage = message.toLowerCase();
  return authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Log performance warning if operation exceeds target time
 */
function logPerformance(operation: string, startTime: number, targetMs: number = 100): void {
  const elapsed = performance.now() - startTime;
  if (elapsed > targetMs) {
    console.warn(`[Performance] ${operation} took ${elapsed.toFixed(2)}ms (target: <${targetMs}ms)`);
  }
}

export default function PrivateRepoList({ onInstallSkill }: PrivateRepoListProps): JSX.Element {
  const [repositories, setRepositories] = useState<PrivateRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [skills, setSkills] = useState<PrivateSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50); // Pagination for large lists

  /**
   * Load repositories on mount
   */
  useEffect(() => {
    loadRepositories();
  }, []);

  /**
   * Reset visible count when skills are loaded
   */
  useEffect(() => {
    setVisibleCount(50);
  }, [skills.length]);

  /**
   * Load skills when repository is selected
   */
  useEffect(() => {
    if (selectedRepoId) {
      loadSkills(selectedRepoId);
    } else {
      setSkills([]);
    }
  }, [selectedRepoId]);

  const loadRepositories = async () => {
    const startTime = performance.now();
    setIsLoadingRepos(true);
    setError(null);
    try {
      const response = await window.electronAPI.listPrivateRepos();
      if (response.success && response.data) {
        setRepositories(response.data);
        // Auto-select first repository if available
        if (response.data.length > 0 && !selectedRepoId) {
          setSelectedRepoId(response.data[0].id);
        }
      } else {
        setError(response.error?.message || 'Failed to load repositories');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(message);
      console.error('Load repos error:', err);
    } finally {
      setIsLoadingRepos(false);
      logPerformance('loadRepositories', startTime);
    }
  };

  const loadSkills = async (repoId: string, forceRefresh: boolean = false) => {
    const startTime = performance.now();
    setIsLoadingSkills(true);
    setError(null);
    setIsAuthError(false);
    try {
      const response = await window.electronAPI.getPrivateRepoSkills(repoId);
      if (response.success && response.data) {
        setSkills(response.data);
      } else {
        // Check for authentication errors
        const errorMsg = response.error?.message || 'Failed to load skills';
        const errorCode = response.error?.code;

        if (errorCode === 'AUTH_FAILED' || isAuthenticationError(errorMsg)) {
          setIsAuthError(true);
          setError('Authentication failed. Your PAT may have expired or been revoked.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load skills';
      // Check for authentication-related errors
      if (isAuthenticationError(message)) {
        setIsAuthError(true);
        setError('Authentication failed. Your PAT may have expired or been revoked.');
      } else {
        setError(message);
      }
      console.error('Load skills error:', err);
    } finally {
      setIsLoadingSkills(false);
      logPerformance('loadSkills', startTime);
    }
  };

  const handleSearch = async () => {
    if (!selectedRepoId || !searchQuery.trim()) {
      // If no query, reload all skills
      loadSkills(selectedRepoId!);
      return;
    }

    setIsLoadingSkills(true);
    setError(null);
    try {
      const response = await window.electronAPI.searchPrivateRepoSkills({
        repoId: selectedRepoId,
        query: searchQuery.trim(),
      });
      if (response.success && response.data) {
        setSkills(response.data);
      } else {
        setError(response.error?.message || 'Failed to search skills');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search skills';
      setError(message);
      console.error('Search skills error:', err);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedRepoId) return;

    setIsRefreshing(true);
    setError(null);
    try {
      await loadSkills(selectedRepoId, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInstallSkill = (skill: PrivateSkill) => {
    const repo = repositories.find(r => r.id === selectedRepoId);
    if (repo && onInstallSkill) {
      onInstallSkill(skill, repo);
    }
  };

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  if (isLoadingRepos) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-300">No repositories configured</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add a private repository in Settings to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 dark:text-slate-100 mb-2">
          Private Repositories
        </h2>
        <p className="text-sm text-slate-400 dark:text-slate-400">
          Browse and install skills from your team's private repositories
        </p>
      </div>

      {/* Repository Selector */}
      <div className="mb-4">
        <label
          htmlFor="repo-select"
          className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-2"
        >
          Select Repository
        </label>
        <select
          id="repo-select"
          value={selectedRepoId || ''}
          onChange={(e) => setSelectedRepoId(e.target.value)}
          className="select w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
          disabled={isLoadingSkills}
          aria-label="Select a private repository"
          aria-busy={isLoadingSkills}
        >
          {repositories.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.displayName || `${repo.owner}/${repo.repo}`}
            </option>
          ))}
        </select>
      </div>

      {/* Search and Refresh Controls */}
      {selectedRepoId && (
        <div className="mb-4 flex gap-3" role="search" aria-label="Search skills">
          <div className="flex-1">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search skills..."
              className="input w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
              disabled={isLoadingSkills}
              aria-label="Search skills in repository"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoadingSkills || !searchQuery.trim()}
            className="btn btn-secondary"
            aria-label="Search skills"
          >
            Search
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoadingSkills || isRefreshing}
            className="btn btn-secondary"
            title="Refresh skills list"
            aria-label="Refresh skills list from repository"
          >
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-300"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-4 p-3 bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 dark:border-red-500/30 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2 flex-1">
              <svg
                className="w-5 h-5 text-red-400 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-400 dark:text-red-400">{error}</p>
                {isAuthError && (
                  <p className="text-xs text-red-300 dark:text-red-300 mt-1">
                    Go to{' '}
                    <button
                      onClick={() => {
                        // Navigate to Settings - this assumes there's a way to switch views
                        // In a real app, you'd use React Router or context
                        window.dispatchEvent(new CustomEvent('navigate-to-settings'));
                      }}
                      className="underline hover:text-red-200 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                      aria-label="Navigate to Settings to update PAT"
                    >
                      Settings
                    </button>
                    {' '}to update your PAT.
                  </p>
                )}
              </div>
            </div>
            {!isAuthError && (
              <button
                onClick={() => selectedRepoId && loadSkills(selectedRepoId)}
                className="btn btn-secondary text-xs ml-2"
                aria-label="Retry loading skills"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skills List */}
      {isLoadingSkills ? (
        <div
          className="flex items-center justify-center py-12"
          role="status"
          aria-live="polite"
          aria-label="Loading skills"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 dark:border-blue-400"></div>
          <span className="sr-only">Loading skills...</span>
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12" role="status">
          <svg
            className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-300 dark:text-slate-300">
            No skills found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            {searchQuery
              ? 'Try a different search term'
              : 'This repository does not contain any skill directories'}
          </p>
        </div>
      ) : (
        <>
          <ul
            className="flex-1 overflow-y-auto space-y-3"
            role="list"
            aria-label="Available skills from repository"
          >
            {skills.slice(0, visibleCount).map((skill) => (
              <li key={skill.path}>
                <PrivateSkillCard
                  skill={skill}
                  repo={selectedRepo!}
                  onInstallComplete={() => loadSkills(selectedRepo!.id)}
                />
              </li>
            ))}
          </ul>

          {/* Load More Button for Large Lists */}
          {skills.length > visibleCount && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisibleCount(prev => prev + 50)}
                className="btn btn-secondary"
                aria-label={`Load more skills (${skills.length - visibleCount} remaining)`}
              >
                Load More ({skills.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {/* Skills Count Indicator */}
          {skills.length > 50 && (
            <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Showing {Math.min(visibleCount, skills.length)} of {skills.length} skills
            </div>
          )}
        </>
      )}
    </div>
  );
}
