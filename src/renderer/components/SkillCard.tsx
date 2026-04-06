/**
 * SkillCard Component
 *
 * Fixed-height card for virtualized skill list with content truncation
 * Height: 128px (fixed)
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Skill, VersionComparison } from '../../shared/types';
import TagGroupPopup from './TagGroupPopup';

interface SkillCardProps {
  skill: Skill;
  onClick?: (skill: Skill) => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onCopy?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void | Promise<void>;
  onSelect?: (skill: Skill) => void;
  isSelected?: boolean;
  versionStatus?: VersionComparison;
  onUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
  onTagAssigned?: () => void;
  onNavigateToSettings?: () => void;
}

export default function SkillCard({
  skill,
  onClick,
  onEdit,
  onDelete,
  onCopy,
  onOpenFolder,
  onSelect,
  isSelected,
  versionStatus,
  onUpdate,
  onTagAssigned,
  onNavigateToSettings,
}: SkillCardProps): JSX.Element {
  const { t } = useTranslation();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [createBackup, setCreateBackup] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Tag group popup state
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');

  const hasUpdate = versionStatus?.hasUpdate || false;

  useEffect(() => {
    if (descriptionRef.current && skill.description) {
      const element = descriptionRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [skill.description]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(skill);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(skill);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete?.(skill);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(skill);
  };

  const handleOpenFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await onOpenFolder?.(skill);
    } catch (error) {
      // Error is already handled by the parent component
      console.error('Failed to open folder:', error);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCopy?.(skill);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit?.(skill);
  };

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowUpdateDialog(true);
    setUpdateProgress('idle');
    setErrorMessage(null);
  };

  const handleConfirmUpdate = async () => {
    if (!onUpdate) return;

    setUpdateProgress('updating');
    setErrorMessage(null);

    try {
      await onUpdate(skill, createBackup);
      setUpdateProgress('success');
      setShowUpdateDialog(false);

      setTimeout(() => {
        setUpdateProgress('idle');
      }, 2000);
    } catch (error) {
      setUpdateProgress('error');
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTag(tag);
    setShowTagPopup(true);
  };

  const handleAssignTag = async (tag: string, groupId: string | null) => {
    try {
      if (groupId) {
        await window.electronAPI.addTagToGroup(groupId, tag);
      } else {
        // Remove tag from any group it's in
        const groups = await window.electronAPI.listSkillGroups();
        if (groups.success && groups.data) {
          for (const group of groups.data) {
            if (group.tags.includes(tag)) {
              await window.electronAPI.removeTagFromGroup(group.id, tag);
            }
          }
        }
      }
      // Notify parent to refresh skill list
      onTagAssigned?.();
    } catch (error) {
      console.error('Failed to assign tag:', error);
      throw error;
    }
  };

  return (
    <>
      {/* Fixed height card: 128px */}
      <article
        className={`relative h-[136px] mb-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer overflow-hidden ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label={`Skill: ${skill.name}`}
        aria-selected={isSelected}
        data-testid="skill-card"
      >
        {/* Top row: Name + Badges + Actions */}
        <div className="flex items-center justify-between gap-2 mb-2 h-[28px]">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-shrink" title={skill.name} data-testid="skill-name">
              {skill.name}
            </h4>

              {/* Source Type Badge - Show "Local" badge if source is NOT registry, private-repo, or git-import */}
              {skill.sourceMetadata?.type !== 'registry' && skill.sourceMetadata?.type !== 'private-repo' && skill.sourceMetadata?.type !== 'git-import' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0" title={t('skillCard.localHint')}>
                  {t('skillCard.local')}
                </span>
              )}
              {skill.sourceMetadata?.type === 'registry' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 flex-shrink-0 border-0" title={t('skillCard.registryHint', { source: skill.sourceMetadata.source })}>
                  {t('skillCard.registry')}
                </span>
              )}
              {skill.sourceMetadata?.type === 'private-repo' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0 border-0" title={t('skillCard.sharedHint', { repo: skill.sourceMetadata.repoPath })}>
                  {t('skillCard.shared')}
                </span>
              )}
              {skill.sourceMetadata?.type === 'git-import' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 flex-shrink-0 border-0" title={`${skill.sourceMetadata.provider}: ${skill.sourceMetadata.repoPath}`}>
                  {skill.sourceMetadata.provider === 'github' ? 'GitHub' : 'GitLab'}
                </span>
              )}

              {/* Symlink Target Count Badge - Simple compact badge */}
              {(skill.symlinkTargetCount ?? 0) > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex-shrink-0"
                  title={t('skillCard.linkCount', { count: skill.symlinkTargetCount })}
                >
                  {skill.symlinkTargetCount}
                </span>
              )}

              {/* Version */}
              {skill.version && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0">
                  v{skill.version}
                </span>
              )}


              {/* Success Badge */}
              {updateProgress === 'success' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0">
                  ✓
                </span>
              )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit Button - hidden when update button is visible */}
            {onEdit && !(hasUpdate && onUpdate && updateProgress !== 'success') && (
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                aria-label={t('skillCard.edit')}
                title={t('skillCard.editHint')}
              >
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Update Button - with pulse animation */}
            {hasUpdate && onUpdate && updateProgress !== 'success' && (
              <button
                onClick={handleUpdateClick}
                disabled={updateProgress === 'updating'}
                className="btn text-xs px-3 py-1 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 animate-pulse"
              >
                {updateProgress === 'updating' ? '...' : t('skillCard.update')}
              </button>
            )}

            {/* Open Folder Button */}
            {onOpenFolder && (
              <button
                onClick={handleOpenFolder}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                aria-label={t('skillCard.openFolder')}
                title={t('skillCard.openFolderHint')}
              >
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}

            {/* Copy Button */}
            {onCopy && (
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                aria-label={t('skillCard.copy')}
                title={t('skillCard.copyHint')}
              >
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                data-testid="delete-button"
                onClick={handleDelete}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                aria-label={t('skillCard.delete')}
                title={t('skillCard.deleteHint')}
              >
                <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Middle row: Description */}
        <div className="mb-2">
          {skill.description && (
            <p
              ref={descriptionRef}
              className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1"
              title={isTruncated ? skill.description : undefined}
            >
              {skill.description}
            </p>
          )}
        </div>

        {/* Source Info row */}
        {skill.sourceMetadata && skill.sourceMetadata.type !== 'local' && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate" title={
              skill.sourceMetadata.type === 'registry'
                ? `${skill.sourceMetadata.source}/${skill.sourceMetadata.skillId}`
                : skill.sourceMetadata.type === 'private-repo'
                ? `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`
                : skill.sourceMetadata.type === 'git-import'
                ? `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`
                : ''
            }>
              {skill.sourceMetadata.type === 'registry' && `${skill.sourceMetadata.source}/${skill.sourceMetadata.skillId}`}
              {skill.sourceMetadata.type === 'private-repo' && `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`}
              {skill.sourceMetadata.type === 'git-import' && `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`}
            </span>
          </div>
        )}

        {/* Bottom row: Metadata */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {/* Author */}
          {skill.author && (
            <span className="flex items-center gap-1 min-w-0">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 010 8zm12-4a4 4 0 11-8 0 4 4 0 010-8z" />
              </svg>
              <span className="truncate max-w-[120px]" title={skill.author}>{skill.author}</span>
            </span>
          )}

          {/* Tags */}
          {skill.tags && skill.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden flex-1">
              {skill.tags.slice(0, 3).map((tag, index) => (
                <button
                  key={index}
                  onClick={(e) => handleTagClick(e, tag)}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 flex-shrink-0 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                  title={`${tag} - ${t('skillCard.clickToAssignGroup', 'Click to assign to group')}`}
                >
                  {tag}
                </button>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">+{skill.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Update Dialog - rendered via Portal to escape overflow-hidden */}
      {showUpdateDialog && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('skillCard.updateSkill')}</h3>
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 rounded text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">{t('skillCard.updateWarning')}</p>
                    <p className="text-xs mt-1">{t('skillCard.localModificationsOverwritten')}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('skills.skillName')}</label>
                <div className="text-slate-900 dark:text-slate-100">{skill.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('skills.location')}</label>
                <div className="text-slate-900 dark:text-slate-100 text-sm font-mono">{skill.path}</div>
              </div>

              {/* Version info */}
              {versionStatus && (
                <div className="flex gap-4 text-sm">
                  {versionStatus.localVersion && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('skillCard.localVersion')}: </span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{versionStatus.localVersion}</span>
                    </div>
                  )}
                  {versionStatus.remoteVersion && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('skillCard.remoteVersion')}: </span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{versionStatus.remoteVersion}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Commits list */}
              {versionStatus?.commits && versionStatus.commits.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('skillCard.newCommits')} ({versionStatus.commitsAhead || versionStatus.commits.length})
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded divide-y divide-slate-200 dark:divide-slate-600">
                    {versionStatus.commits.map((commit, index) => (
                      <div key={commit.sha} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="flex items-start gap-2">
                          <code className="text-xs text-blue-600 dark:text-blue-400 font-mono flex-shrink-0">{commit.shortSha}</code>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 dark:text-slate-100 truncate" title={commit.message}>{commit.message}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {commit.author} • {commit.date ? new Date(commit.date).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={createBackup}
                  onChange={(e) => setCreateBackup(e.target.checked)}
                  className="w-4 h-4 text-blue-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">{t('skillCard.createBackup')}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {t('skillCard.backupDescription')}
                  </div>
                </div>
              </label>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
              >
                {t('skillCard.updateSkill')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tag Group Popup */}
      <TagGroupPopup
        isOpen={showTagPopup}
        tag={selectedTag}
        onClose={() => setShowTagPopup(false)}
        onAssign={handleAssignTag}
        onNavigateToSettings={onNavigateToSettings}
      />
    </>
  );
}
