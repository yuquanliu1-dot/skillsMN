/**
 * Sidebar Navigation Component
 *
 * Modern narrow sidebar with icon-based navigation for minimalist three-column layout
 */

import { useState, useEffect } from 'react';
import type { Configuration } from '../../shared/types';

export type ViewType = 'skills' | 'discover' | 'private-repos';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSettingsClick: () => void;
  config: Configuration | null;
}

export default function Sidebar({
  currentView,
  onViewChange,
  onSettingsClick,
  config,
}: SidebarProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null); // null = checking

  // Check Claude CLI installation status
  useEffect(() => {
    const checkClaudeInstall = async () => {
      try {
        const result = await window.electronAPI.checkClaudeInstall();
        setClaudeInstalled(result.data?.installed ?? false);
      } catch {
        setClaudeInstalled(false);
      }
    };

    checkClaudeInstall();
  }, []);

  const navItems = [
    {
      id: 'skills' as const,
      label: 'Local Skills',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Yellow folder icon for local skills */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      description: 'Local Skills',
      disabled: !config?.projectDirectories || config.projectDirectories.length === 0,
    },
    {
      id: 'discover' as const,
      label: 'Search on skills.sh',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Blue cloud with search icon for internet/discover skills */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l3 3m0-3l3 3"
            opacity={0.6}
          />
        </svg>
      ),
      description: 'Find public skills on skills.sh',
      disabled: !config?.projectDirectories || config.projectDirectories.length === 0,
    },
    {
      id: 'private-repos' as const,
      label: 'Private Repos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Folder with lock icon for private repositories */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-2-4a2 2 0 114 0v1h-4v-1z"
          />
        </svg>
      ),
      description: 'Manage private repositories',
      disabled: !config?.projectDirectories || config.projectDirectories.length === 0,
    },
  ];

  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col shadow-sm" data-testid="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 flex justify-center">
        <div
          className="w-12 h-12 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          title="skillsMN"
        >
          <span className="font-bold text-xl tracking-tight" style={{ color: '#DE2910' }}>SKM</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onViewChange(item.id)}
            disabled={item.disabled}
            onMouseEnter={() => setShowTooltip(item.id)}
            onMouseLeave={() => setShowTooltip(null)}
            className={`
              w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative
              ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                  : item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
              }
            `}
            data-testid={`nav-${item.id}`}
          >
            {item.icon}
            {/* Tooltip */}
            {showTooltip === item.id && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg animate-fade-in">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-2 border-t border-gray-100 space-y-1">
        {/* Settings Button */}
        <button
          data-testid="settings-button"
          onClick={onSettingsClick}
          onMouseEnter={() => setShowTooltip('settings')}
          onMouseLeave={() => setShowTooltip(null)}
          className="w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative text-gray-500 hover:text-blue-600 hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {/* Tooltip */}
          {showTooltip === 'settings' && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg animate-fade-in">
              Settings
            </div>
          )}
        </button>

        {/* Claude Status Indicator */}
        <button
          onMouseEnter={() => setShowTooltip('claude-status')}
          onMouseLeave={() => setShowTooltip(null)}
          className={`w-full aspect-square rounded-xl flex items-center justify-center relative transition-colors ${
            claudeInstalled === false
              ? 'bg-red-50 hover:bg-red-100'
              : 'hover:bg-gray-50'
          }`}
        >
          {/* Claude Icon */}
          <svg
            className={`w-5 h-5 ${claudeInstalled === false ? 'animate-pulse' : ''}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: claudeInstalled === null ? '#9CA3AF' : (claudeInstalled ? '#D97706' : '#EF4444') }}
          >
            {/* Claude-style abstract brain/AI icon */}
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>

          {/* Warning indicator for not installed */}
          {claudeInstalled === false && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </span>
          )}

          {/* Tooltip */}
          {showTooltip === 'claude-status' && (
            <div className={`absolute left-full ml-2 px-3 py-2 text-xs rounded z-50 shadow-lg animate-fade-in ${
              claudeInstalled === false
                ? 'bg-red-600 text-white whitespace-normal w-48'
                : 'bg-slate-800 text-white whitespace-nowrap'
            }`}>
              {claudeInstalled === null ? (
                'Checking Claude CLI...'
              ) : claudeInstalled ? (
                <>
                  <span className="font-medium">Claude CLI installed</span>
                  <span className="block text-slate-300 mt-0.5">AI features available</span>
                </>
              ) : (
                <>
                  <span className="font-medium">Claude CLI not installed</span>
                  <span className="block text-red-200 mt-1 text-[11px] leading-relaxed">
                    AI-assisted skill generation and editing features will be unavailable.
                  </span>
                  <span className="block text-red-200 mt-1 text-[11px]">
                    Install with: <code className="bg-red-700/50 px-1 rounded">npm install -g @anthropic-ai/claude-code</code>
                  </span>
                </>
              )}
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
