/**
 * SkillCard Component
 *
 * Displays individual skill metadata in a card format with update support
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Skill } from '../../shared/types';

interface SkillCardProps {
  skill: Skill;
  onClick?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  onSelect?: (skill: Skill) => void;
  isSelected?: boolean;
  hasUpdate?: boolean;
  onUpdate?: (skill: Skill, createBackup: boolean) => Promise<void>;
}

export default function SkillCard({
  skill,
  onClick,
  onDelete,
  onOpenFolder,
  onSelect,
  isSelected,
  hasUpdate = false,
  onUpdate,
}: SkillCardProps): JSX.Element {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);
  const [updateProgress, setUpdateProgress] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Check if description is truncated
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

      // Auto-dismiss success message after 2 seconds
      setTimeout(() => {
        setUpdateProgress('idle');
      }, 2000);
    } catch (error) {
      setUpdateProgress('error');
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    }
  };

  return (
    <>
      <div
        className={`card card-interactive group ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label={`Skill: ${skill.name}. ${isSelected ? 'Selected. ' : ''}${hasUpdate ? 'Update available. ' : ''}Click to edit.`}
        aria-selected={isSelected}
      >
        {/* Header Row: Title + Badges + Actions */}
        <div className="flex items-start justify-between gap-3 mb-1">
          {/* Left: Title + Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base text-slate-100">
                {skill.name}
              </h3>

              {/* Source Badge */}
              <span
                className={`badge ${
                  skill.source === 'project' ? 'badge-project' : 'badge-global'
                } flex-shrink-0`}
              >
                {skill.source === 'project' ? 'P' : 'G'}
              </span>

              {/* Private Repo Badge */}
              {skill.sourceRepoId && (
                <span className="badge bg-purple-100 text-purple-700 border-purple-200 flex-shrink-0">
                  Private
                </span>
              )}

              {/* Update Available Badge */}
              {hasUpdate && updateProgress !== 'success' && (
                <span className="badge bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0 animate-pulse">
                  Update Available
                </span>
              )}

              {/* Update Success Badge */}
              {updateProgress === 'success' && (
                <span className="badge bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                  ✓ Updated
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
                className={`opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-fast ${
                  updateProgress === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {updateProgress === 'idle' && 'Update'}
                {updateProgress === 'updating' && (
                  <span className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Updating...
                  </span>
                )}
                {updateProgress === 'error' && 'Retry'}
              </button>
            )}

            {/* Open Folder button */}
            {onOpenFolder && (
              <button
                onClick={handleOpenFolder}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/20 rounded-lg cursor-pointer transition-all duration-fast"
                aria-label={`Open folder for ${skill.name}`}
              >
                <svg className="w-5 h-5 text-text-muted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-error/20 rounded-lg cursor-pointer transition-all duration-fast"
                aria-label={`Delete ${skill.name}`}
              >
                <svg className="w-5 h-5 text-error hover:text-error-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Arrow icon */}
            <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors duration-fast" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Description - Full Width, max 2 lines with tooltip */}
        {skill.description && (
          <p
            ref={descriptionRef}
            className="text-sm text-text-secondary w-full mb-1 truncate-2"
            title={isTruncated ? skill.description : undefined}
          >
            {skill.description}
          </p>
        )}

        {/* Update Error Message */}
        {updateProgress === 'error' && errorMessage && (
          <div className="mb-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Update Failed</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(skill.lastModified).toLocaleDateString()}
          </span>
          {skill.resourceCount > 0 && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {skill.resourceCount} {skill.resourceCount === 1 ? 'file' : 'files'}
            </span>
          )}
          {skill.sourceRepoId && skill.installedAt && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Installed {new Date(skill.installedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Skill</h3>
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">This will replace the current skill</p>
                    <p className="text-xs mt-1">Any local modifications will be overwritten with the latest version from the repository.</p>
                  </div>
                </div>
              </div>

              {/* Skill Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
                <div className="text-gray-900">{skill.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Install Location</label>
                <div className="text-gray-900 text-sm font-mono">{skill.path}</div>
              </div>

              {/* Backup Option */}
              <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={createBackup}
                  onChange={(e) => setCreateBackup(e.target.checked)}
                  className="w-4 h-4 text-blue-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-medium">Create backup before update</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Saves a copy of the current skill with a timestamp suffix (e.g., skill-backup-2024-01-15)
                  </div>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Update Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
