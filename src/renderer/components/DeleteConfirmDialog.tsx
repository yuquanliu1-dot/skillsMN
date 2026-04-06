/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for skill deletion with recycle bin warning
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../../shared/types';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  skill: Skill | null;
  onClose: () => void;
  onConfirm: (skill: Skill) => Promise<void>;
}

export default function DeleteConfirmDialog({
  isOpen,
  skill,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Reset state when dialog opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setError(null);
      // Focus cancel button when dialog opens
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    }
  }, [isOpen]);

  /**
   * Handle confirmation
   */
  const handleConfirm = useCallback(async () => {
    if (!skill) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(skill);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete skill';
      setError(message);
      console.error('Delete skill error:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [skill, onConfirm, onClose]);

  /**
   * Handle escape key to close
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    },
    [isDeleting, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !skill) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isDeleting) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Dialog - Modern card style */}
      <div
        ref={dialogRef}
        data-testid="delete-confirm-dialog"
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/50 dark:border-slate-700/50 overflow-hidden dialog-content animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with gradient accent */}
        <div className="relative bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 px-6 py-5 border-b border-red-100 dark:border-red-900/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center shadow-sm">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="delete-dialog-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  {t('delete.title')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('delete.cannotBeUndone')}
                </p>
              </div>
            </div>
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isDeleting}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Skill name highlight */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('delete.confirmDelete')}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{skill.name}</p>
            </div>
          </div>

          {/* Warning info */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t('delete.willMoveToRecycleBin')}
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  {t('delete.recycleBinDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Skill info - compact badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source badge */}
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('delete.source')}</span>
            {/* Show "Local" badge if source is NOT registry or private-repo */}
            {skill.sourceMetadata?.type !== 'registry' && skill.sourceMetadata?.type !== 'private-repo' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {t('skillCard.local')}
              </span>
            )}
            {skill.sourceMetadata?.type === 'registry' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
                {t('skillCard.registry')}
              </span>
            )}
            {skill.sourceMetadata?.type === 'private-repo' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {t('skillCard.shared')}
              </span>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {t('delete.deletionFailed')}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Modern button layout */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
          <button
            data-testid="cancel-delete-button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            data-testid="confirm-delete-button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('common.deleting')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {t('common.delete')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
