/**
 * SkillCard Component
 *
 * Fixed-height card for virtualized skill list
 * Height: 80px (fixed)
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
      {/* Fixed height card: 96px total, 88px content + 8px bottom margin */}
      <div
        className={`
          relative h-[88px] bg-white border border-gray-200 rounded-lg py-2.5 px-4 cursor-pointer
          transition-all duration-200 hover:shadow-md hover:border-blue-300
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label={`Skill: ${skill.name}`}
        aria-selected={isSelected}
      >
        {/* Top row: Name + Badges + Actions */}
        <div className="flex items-center justify-between h-5 mb-1.5">
          {/* Left: Name + Badges */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {skill.name}
            </h3>

            {/* Source Badge */}
            <span className={`
              inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0
              ${skill.source === 'project'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'}
            `}>
              {skill.source === 'project' ? 'P' : 'G'}
            </span>

            {/* Source Type Badge */}
            {skill.sourceMetadata?.type === 'registry' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-700 flex-shrink-0">
                Registry
              </span>
            )}
            {skill.sourceMetadata?.type === 'private-repo' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 flex-shrink-0">
                Private
              </span>
            )}

            {/* Update Badge */}
            {hasUpdate && updateProgress !== 'success' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 flex-shrink-0 animate-pulse">
                Update
              </span>
            )}

            {/* Success Badge */}
            {updateProgress === 'success' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                ✓
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Update Button */}
            {hasUpdate && onUpdate && updateProgress !== 'success' && (
              <button
                onClick={handleUpdateClick}
                disabled={updateProgress === 'updating'}
                className="px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProgress === 'updating' ? '...' : 'Update'}
              </button>
            )}

            {/* Open Folder Button */}
            {onOpenFolder && (
              <button
                onClick={handleOpenFolder}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Open folder"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-red-50 rounded"
                aria-label="Delete"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Arrow */}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Middle row: Description */}
        {skill.description && (
          <div className="h-4 mb-1.5">
            <p
              ref={descriptionRef}
              className="text-xs text-gray-600 line-clamp-1"
              title={isTruncated ? skill.description : undefined}
            >
              {skill.description}
            </p>
          </div>
        )}

        {/* Bottom row: Metadata */}
        <div className="flex items-center gap-4 h-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(skill.lastModified).toLocaleDateString()}
          </span>
          {skill.resourceCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {skill.resourceCount}
            </span>
          )}
          {skill.sourceMetadata && 'installedAt' in skill.sourceMetadata && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {new Date(skill.sourceMetadata.installedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Update Dialog */}
      {showUpdateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl">
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

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">This will replace the current skill</p>
                    <p className="text-xs mt-1">Any local modifications will be overwritten.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
                <div className="text-gray-900">{skill.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Install Location</label>
                <div className="text-gray-900 text-sm font-mono">{skill.path}</div>
              </div>

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
                    Saves a copy with a timestamp suffix
                  </div>
                </div>
              </label>
            </div>

            <div className="border-t border-gray-200 p-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
