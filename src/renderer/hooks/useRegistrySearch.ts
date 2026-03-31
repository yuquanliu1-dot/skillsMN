/**
 * useRegistrySearch Hook
 *
 * React hook for searching skills in the registry with debouncing
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { searchRegistry } from '../services/registryClient';
import { SearchSkillResult } from '../../shared/types';

export interface UseRegistrySearchResult {
  query: string;
  results: SearchSkillResult[];
  isLoading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  refresh: () => void;
}

export function useRegistrySearch(debounceMs: number = 400): UseRegistrySearchResult {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchSkillResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setError(null);
        return;
      }

      // Validate minimum query length before making API call
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setError(t('discover.queryTooShort'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchRegistry(searchQuery);
        setResults(searchResults);
      } catch (err) {
        // Check if it's a "query too short" error from the backend
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        if (errorMessage === 'QUERY_TOO_SHORT' || errorMessage.includes('at least 2 characters')) {
          setError(t('discover.queryTooShort'));
        } else {
          setError(errorMessage);
        }
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debounceMs, t]
  );

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearch(query);
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, debounceMs]);

  // Refresh function to re-run current search
  const refresh = useCallback(() => {
    if (query.trim()) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);

  return {
    query,
    results,
    isLoading,
    error,
    setQuery,
    refresh,
  };
}
