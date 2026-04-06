/**
 * Registry Search Component
 *
 * Main search interface component with debounced search
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegistrySearch } from '../hooks/useRegistrySearch';
import { SearchIcon } from './icons/SearchIcon';

export const RegistrySearch: React.FC = () => {
  const { t } = useTranslation();
  const { query, results, isLoading, error, setQuery } = useRegistrySearch();

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder={t('registrySearch.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/500 focus:border-transparent transition-colors"
        />
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{t('registrySearch.searchError')}: {error}</p>
        </div>
      )}
    </div>
  );
};
