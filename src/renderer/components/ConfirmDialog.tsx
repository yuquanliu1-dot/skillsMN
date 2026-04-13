/**
 * ConfirmDialog Component
 *
 * Reusable confirmation dialog for general confirmations
 * Used to replace window.confirm calls with styled UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export type ConfirmDialogType = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  /** Additional details to show in the dialog */
  details?: string;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  details,
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const isDisabled = isLoading || isProcessing;

  /**
   * Reset state when dialog opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      // Focus cancel button when dialog opens
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    }
  }, [isOpen]);

  /**
   * Handle confirmation
   */
  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Let the parent handle the error
      console.error('Confirm action error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm, onClose]);

  /**
   * Handle escape key to close
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDisabled) {
        onClose();
      }
    },
    [isDisabled, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30',
          headerBorder: 'border-red-100 dark:border-red-900/30',
          iconBg: 'bg-red-100 dark:bg-red-900/50',
          iconColor: 'text-red-600 dark:text-red-400',
          buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
        };
      case 'info':
        return {
          headerBg: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
          headerBorder: 'border-blue-100 dark:border-blue-900/30',
          iconBg: 'bg-blue-100 dark:bg-blue-900/50',
          iconColor: 'text-blue-600 dark:text-blue-400',
          buttonBg: 'bg-primary hover:bg-primary-600 dark:bg-blue-600 dark:hover:bg-blue-500',
        };
      case 'warning':
      default:
        return {
          headerBg: 'from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30',
          headerBorder: 'border-amber-100 dark:border-amber-900/30',
          iconBg: 'bg-amber-100 dark:bg-amber-900/50',
          iconColor: 'text-amber-600 dark:text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isDisabled) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        data-testid="confirm-dialog"
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/50 dark:border-slate-700/50 overflow-hidden dialog-content animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-r ${styles.headerBg} px-6 py-5 border-b ${styles.headerBorder}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
                <svg
                  className={`w-6 h-6 ${styles.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {getIcon().props.children}
                </svg>
              </div>
              <div>
                <h2
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  {title}
                </h2>
              </div>
            </div>
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isDisabled}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
              aria-label={t('common.close')}
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
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {message}
          </p>

          {details && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {details}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3.5 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
          <button
            data-testid="confirm-dialog-cancel"
            onClick={onClose}
            disabled={isDisabled}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            data-testid="confirm-dialog-confirm"
            onClick={handleConfirm}
            disabled={isDisabled}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors min-w-[100px]`}
          >
            {isDisabled ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
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
                {t('common.loading')}
              </>
            ) : (
              confirmText || t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
