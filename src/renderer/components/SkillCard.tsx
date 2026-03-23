/**
 * SkillCard Component
 *
 * Fixed-height card for virtualized skill list with content truncation
 * Height: 128px (fixed)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill, VersionComparison } from '../../shared/types';

interface SkillCardProps {
  skill: Skill;
  onClick?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onCopy?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  onSelect?: (skill: Skill) => void;
  isSelected?: boolean;
  versionStatus?: VersionComparison;
  onUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
  onUpload?: (skill: Skill) => Promise<void>;
}

export default function SkillCard({
  skill,
  onClick,
  onDelete,
  onCopy,
  onOpenFolder,
  onSelect,
  isSelected,
  versionStatus,
  onUpdate,
  onUpload,
}: SkillCardProps): JSX.Element {
  const { t } = useTranslation();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);
  const [updateProgress, setUpdateProgress] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const hasUpdate = versionStatus?.hasUpdate || false;
  const canUpload = versionStatus?.canUpload || false;

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

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenFolder?.(skill);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCopy?.(skill);
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

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowUploadDialog(true);
    setUploadProgress('idle');
    setErrorMessage(null);
  };

  const handleConfirmUpload = async () => {
    if (!onUpload) return;

    setUploadProgress('uploading');
    setErrorMessage(null);

    try {
      await onUpload(skill);
      setUploadProgress('success');
      setShowUploadDialog(false);

      setTimeout(() => {
        setUploadProgress('idle');
      }, 2000);
    } catch (error) {
      setUploadProgress('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <>
      {/* Fixed height card: 136px + 8px bottom margin */}
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
        <div className="flex items-start justify-between mb-2 h-[28px]">
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={skill.name} data-testid="skill-name">
                {skill.name}
              </h4>

              {/* Source Type Badge */}
              {skill.sourceMetadata?.type === 'local' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0" title="Created locally">
                  {t('skillCard.local')}
                </span>
              )}
              {skill.sourceMetadata?.type === 'registry' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 flex-shrink-0 border-0" title={`From ${skill.sourceMetadata.source}`}>
                  {t('skillCard.registry')}
                </span>
              )}
              {skill.sourceMetadata?.type === 'private-repo' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex-shrink-0 border-0" title={`From ${skill.sourceMetadata.repoPath}`}>
                  {t('skillCard.private')}
                </span>
              )}

              {/* Version */}
              {skill.version && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0">
                  v{skill.version}
                </span>
              )}

              {/* Update Badge */}
              {hasUpdate && updateProgress !== 'success' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex-shrink-0 border-0 animate-pulse">
                  {t('skillCard.update')}
                </span>
              )}

              {/* Upload Badge (for private repo skills with newer local version) */}
              {canUpload && uploadProgress !== 'success' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0 border-0 animate-pulse">
                  {t('skillCard.upload')}
                </span>
              )}

              {/* Success Badge */}
              {updateProgress === 'success' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0">
                  ✓
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Update Button */}
            {hasUpdate && onUpdate && updateProgress !== 'success' && (
              <button
                onClick={handleUpdateClick}
                disabled={updateProgress === 'updating'}
                className="btn text-xs px-3 py-1 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProgress === 'updating' ? '...' : t('skillCard.update')}
              </button>
            )}

            {/* Upload Button (for private repo skills with newer local version) */}
            {canUpload && onUpload && uploadProgress !== 'success' && (
              <button
                onClick={handleUploadClick}
                disabled={uploadProgress === 'uploading'}
                className="btn text-xs px-3 py-1 bg-purple-600 dark:bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-700 disabled:opacity-50"
              >
                {uploadProgress === 'uploading' ? '...' : t('skillCard.upload')}
              </button>
            )}

            {/* Open Folder Button */}
            {onOpenFolder && (
              <button
                onClick={handleOpenFolder}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                aria-label={t('skillCard.openFolder')}
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
              >
                <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Middle row: Description */}
        <div className="h-[20px] mb-2">
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
          <div className="h-[16px] mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate" title={
              skill.sourceMetadata.type === 'registry'
                ? `${skill.sourceMetadata.source}/${skill.sourceMetadata.skillId}`
                : skill.sourceMetadata.type === 'private-repo'
                ? `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`
                : ''
            }>
              {skill.sourceMetadata.type === 'registry' && `${skill.sourceMetadata.source}/${skill.sourceMetadata.skillId}`}
              {skill.sourceMetadata.type === 'private-repo' && `${skill.sourceMetadata.repoPath}/${skill.sourceMetadata.skillPath}`}
            </span>
          </div>
        )}

        {/* Bottom row: Metadata */}
        <div className="flex items-center gap-4 h-[16px] text-xs text-slate-500 dark:text-slate-400">
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
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 flex-shrink-0"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">+{skill.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Update Dialog */}
      {showUpdateDialog && (
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
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('skillCard.uploadSkill')}</h3>
              <button
                onClick={() => setShowUploadDialog(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200 px-4 py-3 rounded text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">{t('skillCard.uploadToPrivateRepo')}</p>
                    <p className="text-xs mt-1">
                      {t('skillCard.localVersionNewer', { local: skill.version || 'unknown', remote: versionStatus?.remoteVersion || 'unknown' })}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('skills.skillName')}</label>
                <div className="text-slate-900 dark:text-slate-100">{skill.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('skillCard.version')}</label>
                <div className="text-slate-900 dark:text-slate-100">
                  Local: {skill.version || 'unknown'} → Remote: {versionStatus?.remoteVersion || 'unknown'}
                </div>
              </div>

              {skill.sourceMetadata?.type === 'private-repo' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('skillCard.targetRepository')}</label>
                  <div className="text-slate-900 dark:text-slate-100 text-sm font-mono">
                    {skill.sourceMetadata.repoPath}/{skill.sourceMetadata.skillPath}
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="px-4 pb-2">
                <div className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</div>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowUploadDialog(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploadProgress === 'uploading'}
                className="px-4 py-2 bg-purple-600 dark:bg-purple-600 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {uploadProgress === 'uploading' ? t('common.uploading') : t('skillCard.uploadSkill')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
