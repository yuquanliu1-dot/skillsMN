/**
 * InstallDialog Component
 *
 * Modal dialog for installing skills from the registry with tool selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface InstallDialogProps {
  isOpen: boolean;
  skillName: string;
  skillId: string;
  source: string;
  onClose: () => void;
  onInstall: (targetToolId: string) => Promise<void>;
  isInstalling: boolean;
  installProgress?: string;
}

/**
 * Error configuration with user-friendly messages and actions
 */
const ERROR_CONFIG: Record<string, {
  title: string;
  action: string;
  retryable: boolean;
  icon: 'git' | 'network' | 'disk' | 'skill' | 'generic';
}> = {
  GIT_NOT_FOUND: {
    title: 'Git Not Installed',
    action: 'Install Git from https://git-scm.com and restart the application',
    retryable: false,
    icon: 'git'
  },
  REPO_NOT_FOUND: {
    title: 'Repository Not Found',
    action: 'The skill repository may have been moved or deleted. Try searching for an alternative skill.',
    retryable: false,
    icon: 'generic'
  },
  PRIVATE_REPO: {
    title: 'Private Repository',
    action: 'This skill is in a private repository. Contact the skill author or search for public alternatives.',
    retryable: false,
    icon: 'generic'
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    action: 'Check your internet connection and try again',
    retryable: true,
    icon: 'network'
  },
  DISK_SPACE_ERROR: {
    title: 'Disk Space Error',
    action: 'Free up disk space and try again',
    retryable: false,
    icon: 'disk'
  },
  REGISTRY_SKILL_NOT_FOUND: {
    title: 'Skill Not Found',
    action: 'The specified skill was not found in the repository. Verify the skill ID.',
    retryable: false,
    icon: 'skill'
  },
  REGISTRY_INVALID_SKILL: {
    title: 'Invalid Skill Structure',
    action: 'The skill directory is missing required files (SKILL.md). Contact the skill author.',
    retryable: false,
    icon: 'skill'
  }
};

export const InstallDialog: React.FC<InstallDialogProps> = ({
  isOpen,
  skillName,
  skillId,
  source,
  onClose,
  onInstall,
  isInstalling,
  installProgress,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('claude-code');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap - focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Handle keyboard navigation (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && !isInstalling) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInstalling, onClose]);

  const handleInstall = async () => {
    setError(null);
    try {
      await onInstall(selectedTool);
      onClose();
    } catch (err: any) {
      setError({
        code: err.code || 'REGISTRY_INSTALLATION_ERROR',
        message: err.message || 'Installation failed'
      });
    }
  };

  const handleRetry = () => {
    setError(null);
    handleInstall();
  };

  const getErrorConfig = (errorCode: string) => {
    return ERROR_CONFIG[errorCode] || {
      title: 'Installation Failed',
      action: 'Please try again or search for an alternative skill',
      retryable: false,
      icon: 'generic' as const
    };
  };

  if (!isOpen) return null;

  const currentErrorConfig = error ? getErrorConfig(error.code) : null;
  const canRetry = currentErrorConfig?.retryable && !isInstalling;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isInstalling ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2
              id="dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Install Skill
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {skillName}
            </p>
          </div>
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded"
            aria-label="Close dialog"
            disabled={isInstalling}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Skill Info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source</p>
            <p className="text-sm font-mono text-slate-900 dark:text-white">{source}</p>
          </div>

          {/* Tool Selection */}
          {!error && (
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                Install to Tool
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="targetTool"
                    value="claude-code"
                    checked={selectedTool === 'claude-code'}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                    disabled={isInstalling}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Claude Code</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Install for Claude Code CLI</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="targetTool"
                    value="claude-desktop"
                    checked={selectedTool === 'claude-desktop'}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                    disabled={isInstalling}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Claude Desktop</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Install for Claude Desktop app</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Progress */}
          {isInstalling && installProgress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <p className="text-sm text-primary font-medium">{installProgress}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && currentErrorConfig && (
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                      {currentErrorConfig.title}
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      {error.message}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {currentErrorConfig.action}
                    </p>
                  </div>
                </div>
              </div>

              {/* Retry Button */}
              {canRetry && (
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors cursor-pointer"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!error && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              disabled={isInstalling}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
          </div>
        )}

        {/* Error Footer */}
        {error && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

