/**
 * useRegistrySearch Hook
 *
 * React hook for searching skills in the registry with debouncing
 */

import { useState, useEffect, useCallback } from 'react';
import { searchRegistry } from '../services/registryClient';
import { SearchSkillResult } from '../../shared/types';

export interface UseRegistrySearchResult {
  query: string;
  results: SearchSkillResult[];
  isLoading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
}

export function useRegistrySearch(debounceMs: number = 400): UseRegistrySearchResult {
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

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchRegistry(searchQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debounceMs]
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

  return {
    query,
    results,
    isLoading,
    error,
    setQuery,
  };
}
