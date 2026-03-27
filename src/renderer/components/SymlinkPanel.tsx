/**
 * SymlinkPanel Component
 *
 * A dropdown panel for managing symlinks to multiple AI agent tools and project directories.
 * Supports enabling/disabling links to each target independently.
 * Uses a three-column grid layout for better space utilization.
 * Project directories are shown first (higher priority).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentTool } from '../../shared/types';

interface SymlinkPanelProps {
  /** Skill name */
  skillName: string;
  /** Skill path */
  skillPath: string;
  /** Whether the panel is in read-only mode */
  readOnly?: boolean;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Get tool icon by ID - simplified brand-colored icons
 */
function getToolIcon(toolId: string, className = "w-5 h-5"): JSX.Element {
  const icons: Record<string, { color: string; icon: JSX.Element }> = {
    'claude-code': {
      color: '#D97706',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
    },
    'cursor': {
      color: '#000000',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
    },
    'cline': {
      color: '#FF6B35',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ),
    },
    'windsurf': {
      color: '#0EA5E9',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/>
        </svg>
      ),
    },
    'gemini': {
      color: '#4285F4',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      ),
    },
    'aider': {
      color: '#8B5CF6',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
    },
    'copilot': {
      color: '#000000',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      ),
    },
    'continue': {
      color: '#10B981',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      ),
    },
    'amazon-q': {
      color: '#FF9900',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      ),
    },
    'codium': {
      color: '#6366F1',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold">Co</text>
        </svg>
      ),
    },
    'tabnine': {
      color: '#6B7280',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/>
        </svg>
      ),
    },
    'codeium': {
      color: '#09B6A2',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
        </svg>
      ),
    },
    'sourcegraph-cody': {
      color: '#A855F7',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ),
    },
    'replit-ai': {
      color: '#F26207',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    'code-whisperer': {
      color: '#FF9900',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.5 2c-1.38 0-2.5 1.12-2.5 2.5V11H5c-1.1 0-2 .9-2 2v6.5C3 21.43 4.57 23 6.5 23s3.5-1.57 3.5-3.5V13h7v6.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V13c0-1.1-.9-2-2-2h-2V4.5c0-1.38-1.12-2.5-2.5-2.5h-6z"/>
        </svg>
      ),
    },
    'blackbox-ai': {
      color: '#000000',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2"/>
        </svg>
      ),
    },
    'pearai': {
      color: '#22C55E',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c-4 0-7 3-7 7 0 2.38 1.19 4.47 3 5.74V17c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-2.26c1.81-1.27 3-3.36 3-5.74 0-4-3-7-7-7z"/>
        </svg>
      ),
    },
    'aicode': {
      color: '#3B82F6',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
      ),
    },
    'twinny': {
      color: '#EC4899',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="12" r="4"/>
          <circle cx="16" cy="12" r="4"/>
        </svg>
      ),
    },
    'bito': {
      color: '#6366F1',
      icon: (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
        </svg>
      ),
    },
  };

  const tool = icons[toolId];
  if (tool) {
    return <span style={{ color: tool.color }}>{tool.icon}</span>;
  }

  // Default icon for unknown tools
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#6B7280' }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default function SymlinkPanel({
  skillName,
  skillPath,
  readOnly = false,
  onError,
}: SymlinkPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded
  const [installedTools, setInstalledTools] = useState<AgentTool[]>([]);
  const [symlinkStatus, setSymlinkStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTool, setUpdatingTool] = useState<string | null>(null);

  /**
   * Load installed tools and symlink status
   */
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);

        // Load installed tools (includes project directories first)
        const toolsResponse = await window.electronAPI.getInstalledTools();
        if (!toolsResponse.success || !toolsResponse.data) {
          throw new Error(toolsResponse.error?.message || 'Failed to load installed tools');
        }

        if (!isMounted) return;
        setInstalledTools(toolsResponse.data);

        // Load symlink status for this skill
        const statusResponse = await window.electronAPI.getMultiSymlinkStatus(skillName);
        if (!statusResponse.success) {
          throw new Error(statusResponse.error?.message || 'Failed to load symlink status');
        }

        if (!isMounted) return;
        setSymlinkStatus(statusResponse.data || {});
      } catch (error) {
        console.error('Failed to load symlink data:', error);
        onError?.(error instanceof Error ? error.message : 'Failed to load symlink data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [skillName, onError]);

  /**
   * Count enabled targets
   */
  const enabledCount = Object.values(symlinkStatus).filter(Boolean).length;

  /**
   * Handle toggling a tool's symlink
   */
  const handleToggle = useCallback(
    async (toolId: string, enabled: boolean) => {
      if (readOnly) return;

      try {
        setUpdatingTool(toolId);

        const response = await window.electronAPI.updateSymlinkTarget({
          skillName,
          skillPath,
          toolId,
          enabled,
        });

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to update symlink');
        }

        // Update local state
        setSymlinkStatus((prev) => ({
          ...prev,
          [toolId]: enabled,
        }));
      } catch (error) {
        console.error('Failed to toggle symlink:', error);
        onError?.(error instanceof Error ? error.message : 'Failed to update symlink');
      } finally {
        setUpdatingTool(null);
      }
    },
    [skillName, skillPath, readOnly, onError]
  );

  /**
   * Render a single target card for grid layout
   */
  const renderTargetCard = (tool: AgentTool) => {
    const isEnabled = symlinkStatus[tool.id] ?? false;
    const isUpdating = updatingTool === tool.id;
    const isProject = tool.type === 'project';

    return (
      <div
        key={tool.id}
        className={`relative p-3 rounded-lg border transition-all cursor-pointer ${
          isEnabled
            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => handleToggle(tool.id, !isEnabled)}
      >
        {/* Loading indicator */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isProject ? (
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v2H2V6z" />
                <path fillRule="evenodd" d="M2 10v6a2 2 0 002 2h12a2 2 0 002-2v-6H2z" clipRule="evenodd" />
              </svg>
            ) : (
              getToolIcon(tool.id)
            )}
          </div>

          {/* Name and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${
                isEnabled ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {tool.name}
              </span>
              {isEnabled && (
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5" title={tool.skillsDir}>
              {tool.skillsDir.replace('~/', '~/')}
            </div>
          </div>

          {/* Toggle switch */}
          <button
            data-testid={`symlink-toggle-${tool.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(tool.id, !isEnabled);
            }}
            disabled={readOnly || isUpdating}
            className={`relative inline-flex h-5 w-9 items-center rounded-full
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
              isEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={isEnabled}
            aria-label={`Link to ${tool.name}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full
                bg-white transition-transform shadow ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  // Separate project directories and AI tools
  const projectDirs = installedTools.filter((t) => t.type === 'project');
  const aiTools = installedTools.filter((t) => t.type !== 'project');

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Header bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            data-testid="symlink-panel-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            disabled={readOnly || isLoading}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{t('symlink.linkedTo')}</span>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {enabledCount} active
            </span>
          </button>

          <div data-testid="symlink-status" className="flex items-center gap-2 text-sm">
            {enabledCount > 0 ? (
              <>
                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-700">{t('symlink.linked')}</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-500">{t('symlink.notLinked')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded panel - three column grid layout */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-4">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2" />
              {t('symlink.loadingTargets')}
            </div>
          ) : installedTools.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {t('symlink.noTargetsAvailable')}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Project directories section */}
              {projectDirs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v2H2V6z" />
                      <path fillRule="evenodd" d="M2 10v6a2 2 0 002 2h12a2 2 0 002-2v-6H2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      Project Directories
                    </span>
                    <span className="text-xs text-amber-600">High Priority</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {projectDirs.map(renderTargetCard)}
                  </div>
                </div>
              )}

              {/* AI Tools section */}
              {aiTools.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      AI Agent Tools
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {aiTools.map(renderTargetCard)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {t('symlink.helpText')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
