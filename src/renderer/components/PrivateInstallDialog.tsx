/**
 * PrivateInstallDialog Component
 *
 * Simplified dialog for installing a skill from a private repository
 * All skills are installed to the centralized application directory
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrivateSkill, PrivateRepo } from '../../shared/types';

interface PrivateInstallDialogProps {
  skill: PrivateSkill;
  repo: PrivateRepo;
  onClose: () => void;
  onInstall: (conflictResolution?: 'overwrite' | 'rename' | 'skip') => void;
  onConflict: () => void;
}

export default function PrivateInstallDialog({
  skill,
  repo,
  onClose,
  onInstall,
  onConflict,
}: PrivateInstallDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      const response = await window.electronAPI.installPrivateRepoSkill({
        repoId: repo.id,
        skillPath: skill.path,
      });

      // Check actual installation result from response.data
      if (response.success && response.data?.success) {
        onInstall();
      } else if (response.data?.error === 'CONFLICT' || response.error?.code === 'CONFLICT') {
        onConflict();
      } else {
        setError(response.data?.error || response.error?.message || t('install.installationFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('install.installationFailed'));
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('install.title')}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={t('common.close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Repository Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('install.repository')}</div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {repo.displayName || `${repo.owner}/${repo.repo}`}
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {repo.provider === 'gitlab' ? 'GitLab' : 'GitHub'}
            </span>
          </div>

          {/* Skill Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('install.skillName')}</label>
            <div className="text-slate-900 dark:text-slate-100 font-medium">{skill.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('install.pathInRepo')}</label>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded">
              {skill.path}
            </div>
          </div>

          {skill.lastCommitMessage && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('install.latestCommit')}</label>
              <div className="text-slate-600 dark:text-slate-400 text-sm">{skill.lastCommitMessage}</div>
            </div>
          )}

          {/* Install Location Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('install.installLocation')}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('install.installLocationHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 transition-colors flex items-center gap-2"
          >
            {isInstalling && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isInstalling ? t('install.installing') : t('install.installToLibrary')}
          </button>
        </div>
      </div>
    </div>
  );
}
