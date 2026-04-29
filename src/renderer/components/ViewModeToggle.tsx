/**
 * ViewModeToggle Component
 *
 * Toggle button group for switching between grid and list view modes
 * Placed in toolbar area, after sort controls
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewMode } from '../hooks/useViewMode';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5 bg-gray-50">
      {/* Grid mode button */}
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded transition-colors ${
          viewMode === 'grid'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        title={t('viewMode.card')}
        aria-label={t('viewMode.card')}
        aria-pressed={viewMode === 'grid'}
      >
        {/* Grid icon (heroicons: view-grid) */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>

      {/* List mode button */}
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded transition-colors ${
          viewMode === 'list'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        title={t('viewMode.list')}
        aria-label={t('viewMode.list')}
        aria-pressed={viewMode === 'list'}
      >
        {/* List icon (heroicons: view-list) */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
};
