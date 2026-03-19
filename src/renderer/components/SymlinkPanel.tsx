/**
 * SymlinkPanel Component
 *
 * A dropdown panel for managing symlinks to multiple AI agent tools.
 * Supports enabling/disabling links to each tool independently.
 */

import { useState, useEffect, useCallback } from 'react';
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

export default function SymlinkPanel({
  skillName,
  skillPath,
  readOnly = false,
  onError,
}: SymlinkPanelProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
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

        // Load installed tools
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
   * Format skills directory path for display
   */
  const formatPath = (path: string): string => {
    return path.replace('~/', '~/');
  };

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
            <span>Link to AI Tools:</span>
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
                <span className="text-green-700">Linked</span>
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
                <span className="text-gray-500">Not linked</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2" />
              Loading installed tools...
            </div>
          ) : installedTools.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No AI agent tools detected. Install a tool like Claude Code, Cursor, or Cline to enable linking.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {installedTools.map((tool) => {
                const isEnabled = symlinkStatus[tool.id] ?? false;
                const isUpdating = updatingTool === tool.id;

                return (
                  <div
                    key={tool.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Toggle switch */}
                      <button
                        data-testid={`symlink-toggle-${tool.id}`}
                        onClick={() => handleToggle(tool.id, !isEnabled)}
                        disabled={readOnly || isUpdating}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full
                          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          disabled:opacity-50 disabled:cursor-not-allowed ${
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

                      {/* Tool name */}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                        <div className="text-xs text-gray-500">{formatPath(tool.skillsDir)}</div>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                      {isUpdating && (
                        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      )}
                      {isEnabled && !isUpdating && (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help text */}
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-600">
              Enable linking to make this skill available in the selected AI tools. The skill will be symlinked to each tool's skills directory.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
