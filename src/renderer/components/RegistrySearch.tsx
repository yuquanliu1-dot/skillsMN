/**
 * Registry Search Component
 *
 * Main search interface component with debounced search
 */

import React, { useState } from 'react';
import { useRegistrySearch } from '../hooks/useRegistrySearch';
import { SearchIcon } from './icons/SearchIcon';

export const RegistrySearch: React.FC = () => {
  const { query, results, isLoading, error, setQuery } = useRegistrySearch();

  return (
    <div className="mb-6">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search skills in registry..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-4 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/500 focus:border-transparent transition-colors"
        />
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"></div>
            <span className="text-primary font-medium ml-2">Loading...</span>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-sm p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
