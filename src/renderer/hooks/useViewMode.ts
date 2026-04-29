/**
 * useViewMode Hook
 *
 * Manages view mode state with localStorage persistence
 * Each list gets its own storage key for independent preferences
 */

import { useState, useCallback } from 'react';

export type ViewMode = 'grid' | 'list';

const STORAGE_KEYS = {
  skillList: 'skillList-viewMode',
  privateRepo: 'privateRepo-viewMode',
  registry: 'registry-viewMode',
} as const;

export type ViewModeStorageKey = keyof typeof STORAGE_KEYS;

function getStorageKey(key: ViewModeStorageKey): string {
  return STORAGE_KEYS[key];
}

function getInitialViewMode(storageKey: string): ViewMode {
  if (typeof window === 'undefined') return 'grid';

  const stored = localStorage.getItem(storageKey);
  if (stored === 'list' || stored === 'grid') {
    return stored;
  }
  return 'grid';
}

export function useViewMode(storageKey: ViewModeStorageKey): {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
} {
  const key = getStorageKey(storageKey);
  const [viewMode, setViewModeState] = useState<ViewMode>(() => getInitialViewMode(key));

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(key, mode);
  }, [key]);

  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
  }, [viewMode, setViewMode]);

  return { viewMode, setViewMode, toggleViewMode };
}
