/**
 * InstallDialog Component
 *
 * Modal dialog for installing skills from the registry
 * All skills are installed to the centralized application directory
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from './icons/XMarkIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface InstallDialogProps {
  isOpen: boolean;
  skillName: string;
  skillId: string;
  source: string;
  onClose: () => void;
  onInstall: () => Promise<void>;
  isInstalling: boolean;
  installProgress?: string;
  installError?: string;
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
  installError,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap - focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
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
    try {
      await onInstall();
      // Only close on success - errors are displayed in the dialog
      onClose();
    } catch (err: any) {
      // Error is handled by parent component and passed via installError prop
      console.error('Install error:', err);
    }
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
              {t('install.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {skillName}
            </p>
          </div>
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded"
            aria-label={t('common.close')}
            disabled={isInstalling}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Skill Info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('install.source')}</p>
            <p className="text-sm font-mono text-slate-900 dark:text-white">{source}</p>
          </div>

          {/* Installation Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('install.installToAppDirectory')} {t('install.configureSymlinkAfter')}
            </p>
          </div>

          {/* Progress */}
          {isInstalling && installProgress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
              <div className="flex items-center gap-3.5">
                <div className="animate-spin rounded-full h-5 w-5 border-4 border-primary border-t-transparent" />
                <p className="text-sm text-primary font-medium">{installProgress}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {installError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3">
              <div className="flex items-start gap-3.5">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{t('install.installationFailed')}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{installError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3.5 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="btn btn-primary btn-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {isInstalling ? t('install.installing') : t('install.install')}
          </button>
        </div>
      </div>
    </div>
  );
};
