/**
 * Commit Changes Dialog
 *
 * Dialog for committing local changes to a repository
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill, VersionComparison } from '../../shared/types';
import { ipcClient } from '../services/ipcClient';

interface CommitChangesDialogProps {
  isOpen: boolean;
  skill: Skill;
  onClose: () => void;
  onSuccess: () => void;
  versionStatus?: VersionComparison;
}

export default function CommitChangesDialog({
  isOpen,
  skill,
  onClose,
  onSuccess,
  versionStatus,
}: CommitChangesDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<string>('');

  // Load skill content on mount
  useEffect(() => {
    if (isOpen) {
      loadSkillContent();
      // Set default commit message
      setCommitMessage(`Update skill: ${skill.name}`);
    }
  }, [isOpen, skill]);

  const loadSkillContent = async () => {
    try {
      const skillData = await ipcClient.getSkill(skill.path);
      setSkillContent(skillData.content);
    } catch (err) {
      setError('Failed to load skill content');
    }
  };

  const handleCommit = async () => {
    if (!skillContent) {
      setError('Skill content not loaded');
      return;
    }

    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    if (!skill.sourceMetadata || skill.sourceMetadata.type === 'local') {
      setError('This skill was not installed from a repository');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      let response;

      if (skill.sourceMetadata.type === 'private-repo') {
        // Commit to private repository
        response = await ipcClient.uploadSkillToPrivateRepo({
          repoId: skill.sourceMetadata.repoId,
          skillPath: skill.path,
          skillContent,
          skillName: skill.name,
          commitMessage,
        });
      } else if (skill.sourceMetadata.type === 'registry') {
        // For registry skills, we need to check if user has write access
        // For now, show an error
        setError('Committing changes to registry skills is not supported. Please upload as a new skill instead.');
        setIsCommitting(false);
        return;
      }

      if (response && response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response?.error?.message || 'Commit failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  const sourceInfo = skill.sourceMetadata?.type === 'private-repo'
    ? `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`
    : skill.sourceMetadata?.type === 'registry'
    ? `${skill.sourceMetadata.source}/${skill.sourceMetadata.skillId}`
    : 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-gray-200 dark:border-slate-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Commit Changes
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Skill Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Skill Name
            </label>
            <div className="text-gray-900 dark:text-slate-100 font-medium">{skill.name}</div>
          </div>

          {/* Source Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Repository
            </label>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="truncate" title={sourceInfo}>{sourceInfo}</span>
            </div>
          </div>

          {/* Version Conflict Warning */}
          {versionStatus?.hasUpdate && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 text-red-800 dark:text-red-200 px-4 py-3 rounded text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">{t('commit.versionConflict')}</p>
                  <p className="text-xs mt-1">
                    {t('commit.versionConflictDesc', {
                      local: versionStatus.localVersion || 'unknown',
                      remote: versionStatus.remoteVersion || 'unknown'
                    })}
                  </p>
                  <p className="text-xs mt-1 font-medium">{t('commit.versionConflictSuggestion')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Standard Warning Message */}
          {!versionStatus?.hasUpdate && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 rounded text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">{t('commit.willUpdate')}</p>
                  <p className="text-xs mt-1">{t('commit.willUpdateDesc')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Commit Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Commit Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isCommitting}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={isCommitting || !commitMessage.trim()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isCommitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Committing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Commit Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
