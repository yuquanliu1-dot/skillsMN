/**
 * Permission Request Panel Component
 *
 * Displays pending permission requests from the AI agent
 * Allows users to approve/deny tool executions
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PendingPermissionRequest } from '../../shared/types';

interface PermissionRequestPanelProps {
  requests: PendingPermissionRequest[];
  onResolve: (requestId: string, allow: boolean, remember?: string) => void;
  onDismiss: (requestId: string) => void;
}

/**
 * Format tool input for display
 */
function formatToolInput(toolName: string, input: any): JSX.Element {
  if (!input || typeof input !== 'object') {
    return <span className="text-slate-600">{String(input)}</span>;
  }

  switch (toolName) {
    case 'Bash':
      return (
        <div className="space-y-1">
          <code className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-mono block">
            $ {input.command}
          </code>
          {input.timeout && (
            <span className="text-slate-400 text-[10px]">Timeout: {input.timeout}ms</span>
          )}
        </div>
      );

    case 'Write':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </span>
            <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
          </div>
          {input.content && (
            <div className="bg-slate-100 rounded p-2 max-h-32 overflow-y-auto">
              <pre className="text-slate-600 whitespace-pre-wrap break-words text-[10px] font-mono">
                {input.content.length > 500 ? input.content.substring(0, 500) + '...' : input.content}
              </pre>
            </div>
          )}
        </div>
      );

    case 'Edit':
      return (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">✏️</span>
            <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
          </div>
          {input.old_string && (
            <div className="bg-red-50 rounded p-2">
              <span className="text-red-500 font-medium">- Old:</span>
              <pre className="text-slate-600 whitespace-pre-wrap text-[10px] mt-1">
                {input.old_string.substring(0, 200)}{input.old_string.length > 200 ? '...' : ''}
              </pre>
            </div>
          )}
          {input.new_string && (
            <div className="bg-green-50 rounded p-2">
              <span className="text-green-500 font-medium">+ New:</span>
              <pre className="text-slate-600 whitespace-pre-wrap text-[10px] mt-1">
                {input.new_string.substring(0, 200)}{input.new_string.length > 200 ? '...' : ''}
              </pre>
            </div>
          )}
        </div>
      );

    case 'Read':
      return (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400">📖</span>
          <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
        </div>
      );

    default:
      // Generic display for unknown tools
      const keys = Object.keys(input);
      if (keys.length === 0) {
        return <span className="text-slate-400 text-xs">No parameters</span>;
      }
      return (
        <div className="space-y-0.5 text-xs">
          {keys.slice(0, 5).map(key => (
            <div key={key} className="flex gap-1">
              <span className="text-slate-500">{key}:</span>
              <span className="text-slate-700 truncate max-w-[200px]">
                {typeof input[key] === 'string' ? input[key] : JSON.stringify(input[key])}
              </span>
            </div>
          ))}
          {keys.length > 5 && <span className="text-slate-400">+{keys.length - 5} more</span>}
        </div>
      );
  }
}

/**
 * Get risk level for a tool
 */
function getToolRiskLevel(toolName: string): 'low' | 'medium' | 'high' {
  const highRiskTools = ['Bash', 'Write', 'Edit'];
  const mediumRiskTools = ['Glob', 'Grep', 'NotebookEdit'];

  if (highRiskTools.includes(toolName)) return 'high';
  if (mediumRiskTools.includes(toolName)) return 'medium';
  return 'low';
}

/**
 * Get risk badge color
 */
function getRiskBadgeColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200';
  }
}

export const PermissionRequestPanel: React.FC<PermissionRequestPanelProps> = ({
  requests,
  onResolve,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [rememberChoice, setRememberChoice] = useState<Record<string, boolean>>({});

  const handleAllow = useCallback((requestId: string, toolName: string, input: any) => {
    const remember = rememberChoice[requestId];
    let rememberEntry: string | undefined;

    if (remember) {
      // For Bash commands, create a pattern like "Bash(command:*)"
      if (toolName === 'Bash' && input?.command) {
        const command = input.command as string;
        // Extract the base command (first word)
        const baseCommand = command.trim().split(/\s+/)[0];
        rememberEntry = `Bash(${baseCommand}:*)`;
      } else {
        rememberEntry = toolName;
      }
    }

    onResolve(requestId, true, rememberEntry);
  }, [rememberChoice, onResolve]);

  const handleDeny = useCallback((requestId: string) => {
    onResolve(requestId, false);
  }, [onResolve]);

  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const riskLevel = getToolRiskLevel(request.toolName);
        const riskColor = getRiskBadgeColor(riskLevel);

        return (
          <div
            key={request.requestId}
            className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-medium text-slate-700 text-sm">
                  {t('permissions.toolRequest', { tool: request.toolName })}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${riskColor}`}>
                {t(`permissions.risk.${riskLevel}`)}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              <div className="text-xs text-slate-500">
                {t('permissions.toolWantsTo')} <span className="font-medium text-slate-700">{request.toolName}</span>
              </div>

              {/* Tool input details */}
              <div className="bg-slate-50 rounded-lg p-2">
                {formatToolInput(request.toolName, request.input)}
              </div>

              {/* Remember choice option */}
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberChoice[request.requestId] || false}
                  onChange={(e) => setRememberChoice(prev => ({
                    ...prev,
                    [request.requestId]: e.target.checked,
                  }))}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t('permissions.rememberChoice')}</span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAllow(request.requestId, request.toolName, request.input)}
                  className="btn btn-sm !bg-green-600 hover:!bg-green-700 text-white flex-1 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('permissions.allow')}
                </button>
                <button
                  onClick={() => handleDeny(request.requestId)}
                  className="btn btn-danger btn-sm flex-1 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('permissions.deny')}
                </button>
                <button
                  onClick={() => onDismiss(request.requestId)}
                  className="btn btn-secondary btn-sm"
                  title={t('permissions.dismiss')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionRequestPanel;
