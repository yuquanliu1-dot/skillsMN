/**
 * Sidebar Navigation Component
 *
 * Modern narrow sidebar with icon-based navigation for minimalist three-column layout
 */

import { useState } from 'react';
import type { Configuration } from '../../shared/types';

export type ViewType = 'skills' | 'discover' | 'private-repos' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  config: Configuration | null;
  onChangeProjectDirectory?: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  config,
  onChangeProjectDirectory,
}: SidebarProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const navItems = [
    {
      id: 'skills' as const,
      label: 'Skills',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
      description: 'Local Skills',
      disabled: !config?.projectDirectory,
    },
    {
      id: 'discover' as const,
      label: 'Discover',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      description: 'Find public skills on GitHub',
      disabled: !config?.projectDirectory,
    },
    {
      id: 'private-repos' as const,
      label: 'Private Repos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      description: 'Manage private repositories',
      disabled: !config?.projectDirectory,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: (
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
      ),
      description: 'Configure settings',
      disabled: false,
    },
  ];

  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col shadow-sm">
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
            title={item.description}
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
        {/* Project Directory Switch Button */}
        {onChangeProjectDirectory && (
          <button
            onClick={onChangeProjectDirectory}
            onMouseEnter={() => setShowTooltip('directory')}
            onMouseLeave={() => setShowTooltip(null)}
            className="w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative text-gray-500 hover:text-blue-600 hover:bg-gray-50"
            title="Change project directory"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            {/* Tooltip */}
            {showTooltip === 'directory' && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg animate-fade-in">
                Switch Directory
              </div>
            )}
          </button>
        )}

        {/* Status Indicator */}
        <div
          className="w-full aspect-square rounded-xl flex items-center justify-center"
          title={config?.projectDirectory ? `Project: ${config.projectDirectory}` : 'Project not configured'}
        >
          <div
            className={`w-3 h-3 rounded-full ${
              config?.projectDirectory ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
