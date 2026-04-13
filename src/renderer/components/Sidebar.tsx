/**
 * Sidebar Navigation Component
 *
 * Modern narrow sidebar with icon-based navigation for minimalist three-column layout
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null); // null = checking
  const [claudeVersion, setClaudeVersion] = useState<string | null>(null);

  // Check Claude CLI installation status
  useEffect(() => {
    const checkClaudeInstall = async () => {
      try {
        const result = await window.electronAPI.checkClaudeInstall();
        setClaudeInstalled(result.data?.installed ?? false);
        setClaudeVersion(result.data?.version ?? null);
      } catch (error) {
        console.error('[Sidebar] Claude install check error:', error);
        setClaudeInstalled(false);
        setClaudeVersion(null);
      }
    };

    checkClaudeInstall();
  }, []);

  const navItems = [
    {
      id: 'skills' as const,
      label: t('sidebar.localSkills'),
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
      description: t('sidebar.localSkillsDescription'),
      disabled: false,
    },
    {
      id: 'private-repos' as const,
      label: t('sidebar.privateRepos'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Users/share icon for shared skill library */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      description: t('sidebar.privateReposDescription'),
      disabled: false,
    },
    {
      id: 'discover' as const,
      label: t('sidebar.searchOnInternet'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Globe icon for internet search */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
      description: t('sidebar.discoverDescription'),
      disabled: false,
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
          <span className="font-bold text-card-title tracking-tight" style={{ color: '#DE2910' }}>SKM</span>
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
                  : 'text-gray-500 hover:text-blue-600 hover:bg-white'
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
          className="w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative text-gray-500 hover:text-blue-600 hover:bg-white"
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
              {t('sidebar.settings')}
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
              : 'hover:bg-white'
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
                ? 'bg-red-600 text-white whitespace-normal w-64 bottom-0'
                : 'bg-slate-800 text-white whitespace-nowrap'
            }`}>
              {(() => {
                console.log('[Sidebar] Rendering tooltip, claudeInstalled:', claudeInstalled, 'claudeVersion:', claudeVersion);
                return null;
              })()}
              {claudeInstalled === null ? (
                t('claudeStatus.checking')
              ) : claudeInstalled ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('claudeStatus.installed')}</span>
                    {claudeVersion ? (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                        v{claudeVersion}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">(version unknown)</span>
                    )}
                  </div>
                  <span className="block text-slate-300 mt-0.5">{t('claudeStatus.aiFeaturesAvailable')}</span>
                </>
              ) : (
                <>
                  <span className="font-medium block">{t('claudeStatus.notInstalled')}</span>
                  <span className="block text-red-200 mt-1 text-[11px] leading-relaxed">
                    {t('claudeStatus.aiFeaturesUnavailable')}
                  </span>
                  <span className="block text-red-200 mt-1.5 text-[11px]">
                    {t('claudeStatus.installWith')}
                  </span>
                  <code className="block bg-red-700/50 px-2 py-1 rounded mt-1 text-[10px] break-all">
                    {t('claudeStatus.installCommand')}
                  </code>
                </>
              )}
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
