/**
 * PrivateRepoList Component
 *
 * Displays and browses skills from configured private repositories
 * with grid layout and skill grouping
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrivateRepo, PrivateSkill, SkillGroup } from '../../shared/types';
import PrivateSkillCard from './PrivateSkillCard';

type SortBy = 'name' | 'modified';

interface GroupedSkills {
  group: SkillGroup | null;
  skills: PrivateSkill[];
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

interface PrivateRepoListProps {
  onInstallSkill?: (skill: PrivateSkill, repo: PrivateRepo) => void;
  onSkillClick?: (skill: PrivateSkill) => void;
  onNavigateToSettings?: () => void;
  onTagAssigned?: () => void;
  onLocalSkillsRefresh?: () => void; // Called when local skills should be refreshed (e.g., after install)
}

export default function PrivateRepoList({ onInstallSkill, onSkillClick, onNavigateToSettings, onTagAssigned, onLocalSkillsRefresh }: PrivateRepoListProps): JSX.Element {
  const { t } = useTranslation();
  const [repositories, setRepositories] = useState<PrivateRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [skills, setSkills] = useState<PrivateSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50); // Pagination for large lists
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to force refresh
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);

  // Load skill groups
  const loadSkillGroups = useCallback(async () => {
    try {
      const response = await window.electronAPI.listSkillGroups();
      if (response.success && response.data) {
        setSkillGroups(response.data);
      }
    } catch (error) {
      console.error('Failed to load skill groups:', error);
    }
  }, []);

  useEffect(() => {
    loadSkillGroups();
  }, [loadSkillGroups]);

  // Handle tag assigned callback
  const handleTagAssigned = useCallback(() => {
    loadSkillGroups();
    onTagAssigned?.();
  }, [loadSkillGroups, onTagAssigned]);

  // Filter and sort skills
  const filteredAndSortedSkills = useMemo(() => {
    if (!skills || skills.length === 0) return skills;

    let result = [...skills];

    // Filter by search query (matches name, description, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query) ||
          skill.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
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
  }, [skills, searchQuery, sortBy]);

  // Group skills by configured groups (based on tags)
  const groupedSkills = useMemo((): GroupedSkills[] => {
    const result: GroupedSkills[] = [];
    const assignedSkills = new Set<string>();

    // Create a map of tag to group
    const tagToGroup = new Map<string, SkillGroup>();
    for (const group of skillGroups) {
      for (const tag of group.tags) {
        tagToGroup.set(tag.toLowerCase(), group);
      }
    }

    // Group skills by their tags' group assignments
    for (const group of skillGroups) {
      const groupSkills: PrivateSkill[] = [];
      for (const skill of filteredAndSortedSkills) {
        if (assignedSkills.has(skill.path)) continue;

        // Check if any of the skill's tags belong to this group
        const skillTags = skill.tags || [];
        const hasGroupTag = skillTags.some(tag => {
          const assignedGroup = tagToGroup.get(tag.toLowerCase());
          return assignedGroup?.id === group.id;
        });

        if (hasGroupTag) {
          groupSkills.push(skill);
          assignedSkills.add(skill.path);
        }
      }
      if (groupSkills.length > 0) {
        result.push({ group, skills: groupSkills });
      }
    }

    // Ungrouped skills (skills without tags or tags not assigned to any group)
    const ungroupedSkills = filteredAndSortedSkills.filter(
      (skill) => !assignedSkills.has(skill.path)
    );
    if (ungroupedSkills.length > 0) {
      result.push({ group: null, skills: ungroupedSkills });
    }

    return result;
  }, [filteredAndSortedSkills, skillGroups]);

  /**
   * Load repositories on mount
   */
  useEffect(() => {
    loadRepositories();
  }, []);

  /**
   * Listen for private repo updates from Settings
   */
  useEffect(() => {
    const handlePrivateRepoUpdate = (event: CustomEvent<{ repoId: string; patUpdated: boolean; isNew?: boolean }>) => {
      console.log('[PrivateRepoList] Received private-repo-updated event:', event.detail);

      // If a new repo was added, reload the repositories list
      if (event.detail.isNew) {
        console.log('[PrivateRepoList] New repo added, reloading repositories');
        loadRepositories();
        return;
      }

      // If PAT was updated, trigger refresh
      if (event.detail.patUpdated) {
        // If this repo is currently selected, reload immediately
        if (event.detail.repoId === selectedRepoId) {
          console.log('[PrivateRepoList] Reloading skills for updated repo:', event.detail.repoId);
          loadSkills(event.detail.repoId);
        } else {
          // Otherwise, trigger a refresh trigger to reload repos
          setRefreshTrigger(prev => prev + 1);
        }
      }
    };

    window.addEventListener('private-repo-updated', handlePrivateRepoUpdate as EventListener);

    return () => {
      window.removeEventListener('private-repo-updated', handlePrivateRepoUpdate as EventListener);
    };
  }, [selectedRepoId]);

  /**
   * Reload skills when refresh trigger changes
   */
  useEffect(() => {
    if (refreshTrigger > 0 && selectedRepoId) {
      loadSkills(selectedRepoId);
    }
  }, [refreshTrigger]);

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
        <h3 className="mt-2 text-sm font-medium text-slate-300">{t('privateRepos.noRepositories')}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t('privateRepos.addInSettings')}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="private-repos-list" className="h-full flex flex-col">
      {/* Header with filters and search */}
      <div className="border-b border-gray-200 p-4 space-y-3 flex-shrink-0 bg-white">
        {/* Top row: Search + Refresh button */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('privateRepos.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoadingSkills || !selectedRepoId}
              aria-label="Search skills"
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
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoadingSkills || isRefreshing || !selectedRepoId}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh skills list"
            aria-label="Refresh skills list from repository"
          >
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
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

        {/* Bottom row: Repository selector + Tag filter + Skills count + Sort */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Repository selector */}
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="repo-select" className="text-sm text-gray-700 whitespace-nowrap">
              {t('privateRepos.repository')}
            </label>
            <select
              id="repo-select"
              value={selectedRepoId || ''}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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

          {/* Skills count and Sort */}
          {selectedRepoId && skills.length > 0 && (
            <>
              <span className="text-xs text-gray-500">
                {t('privateRepos.skillsCount', { count: filteredAndSortedSkills.length })}
              </span>

              {/* Sort by */}
              <div className="flex items-center gap-1 ml-auto">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select
                  id="sort-by-private"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                  aria-label="Sort by"
                  title="Sort skills"
                >
                  <option value="name">Name</option>
                  <option value="modified">Date</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

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
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {isLoadingSkills ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('privateRepos.errorLoadingSkills')}</h3>
            <p className="text-sm text-gray-600 text-center max-w-md mb-4">{error}</p>
            {isAuthError && (
              <p className="text-xs text-red-600 text-center mb-4">
                Go to{' '}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
                  }}
                  className="underline hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                  aria-label="Navigate to Settings to update PAT"
                >
                  Settings
                </button>
                {' '}to update your PAT.
              </p>
            )}
            {!isAuthError && (
              <button
                onClick={() => selectedRepoId && loadSkills(selectedRepoId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Retry loading skills"
              >
                Retry
              </button>
            )}
          </div>
        ) : filteredAndSortedSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? t('privateRepos.noSkillsFound') : t('privateRepos.noSkillsAvailable')}
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md">
              {searchQuery
                ? t('discover.noResultsFor', { query: searchQuery })
                : t('privateRepos.noSkillsInRepo')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedSkills.map(({ group, skills: groupSkills }) => (
              <div key={group?.id || 'ungrouped'}>
                {/* Group header */}
                {group && (
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xl"
                      style={{ color: group.color }}
                    >
                      {group.icon || '📁'}
                    </span>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: group.color }}
                    >
                      {group.name}
                    </h3>
                    {group.description && (
                      <span className="text-xs text-gray-500">
                        · {group.description}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      ({groupSkills.length})
                    </span>
                  </div>
                )}
                {!group && groupSkills.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl text-gray-400">📦</span>
                    <h3 className="text-sm font-semibold text-gray-500">
                      {t('skills.ungrouped')}
                    </h3>
                    <span className="text-xs text-gray-400">
                      ({groupSkills.length})
                    </span>
                  </div>
                )}

                {/* Skill cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupSkills.slice(0, visibleCount).map((skill) => (
                        <PrivateSkillCard
                      key={skill.path}
                      skill={skill}
                      repo={selectedRepo!}
                      onInstallComplete={() => {
                        loadSkills(selectedRepo!.id);
                        onLocalSkillsRefresh?.(); // Refresh local skills to show the new badge
                      }}
                      onSkillClick={onSkillClick}
                      onNavigateToSettings={onNavigateToSettings}
                      onTagAssigned={handleTagAssigned}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load More Button for Large Lists */}
            {filteredAndSortedSkills.length > visibleCount && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 50)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label={`Load more skills (${filteredAndSortedSkills.length - visibleCount} remaining)`}
                >
                  {t('privateRepos.loadMore', { count: filteredAndSortedSkills.length - visibleCount })}
                </button>
              </div>
            )}

            {/* Skills Count Indicator */}
            {filteredAndSortedSkills.length > 50 && (
              <div className="mt-2 text-center text-xs text-gray-500">
                {t('privateRepos.showingOf', { visible: Math.min(visibleCount, filteredAndSortedSkills.length), total: filteredAndSortedSkills.length })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
