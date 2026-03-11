/**
 * DirectoryChangeDialog Component
 *
 * Dialog for changing the current project directory - Modern minimalist design
 */

import React, { useState, useCallback } from 'react';

interface DirectoryChangeDialogProps {
  isOpen: boolean;
  currentDirectory: string;
  onClose: () => void;
  onChangeDirectory: (newDirectory: string) => Promise<void>;
}

export default function DirectoryChangeDialog({
  isOpen,
  currentDirectory,
  onClose,
  onChangeDirectory,
}: DirectoryChangeDialogProps): JSX.Element | null {
  const [directory, setDirectory] = useState(currentDirectory);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  /**
   * Reset form state when dialog opens
   */
  React.useEffect(() => {
    if (isOpen) {
      setDirectory(currentDirectory);
      setError(null);
      setIsValidating(false);
      setIsChanging(false);
    }
  }, [isOpen, currentDirectory]);

  /**
   * Handle browse button click
   */
  const handleBrowse = useCallback(async () => {
    try {
      // Use Electron's dialog API if available
      const result = await window.electronAPI.selectDirectory();
      if (result && !result.canceled && result.filePaths.length > 0) {
        setDirectory(result.filePaths[0]);
        setError(null);
      }
    } catch (err) {
      // Fallback to prompt if dialog API is not available
      const result = prompt('Enter Claude project directory path:');
      if (result) {
        setDirectory(result);
        setError(null);
      }
      console.error('Browse error:', err);
    }
  }, []);

  /**
   * Validate directory is a Claude project
   */
  const validateDirectory = useCallback(async (dir: string): Promise<boolean> => {
    if (!dir) {
      setError('Please select a directory');
      return false;
    }

    if (dir === currentDirectory) {
      setError('Please select a different directory');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Remove trailing slash for consistency
      const cleanDir = dir.replace(/[\\/]+$/, '');

      // Validate via IPC by checking if the directory exists
      const testConfig = {
        projectDirectory: cleanDir,
        defaultInstallDirectory: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      // Try to list skills - if directory is invalid, this will fail
      const skills = await window.electronAPI.listSkills(testConfig);

      if (!skills.success) {
        setError('Invalid Claude project directory. The directory must contain a .claude folder.');
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate directory';
      setError(message);
      console.error('Validation error:', err);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [currentDirectory]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const isValid = await validateDirectory(directory);
      if (!isValid) return;

      setIsChanging(true);
      try {
        await onChangeDirectory(directory);
      } catch (err) {
        setError('Failed to change directory');
        console.error('Change error:', err);
      } finally {
        setIsChanging(false);
      }
    },
    [directory, validateDirectory, onChangeDirectory]
  );

  /**
   * Handle escape key to close
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isChanging && !isValidating) {
        onClose();
      }
    },
    [isChanging, isValidating, onClose]
  );

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isChanging && !isValidating) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#DE2910' }}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Switch Project Directory</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isChanging || isValidating}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Directory Input */}
          <div className="mb-4">
            <label
              htmlFor="directory"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Project Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="directory"
                value={directory}
                onChange={(e) => {
                  setDirectory(e.target.value);
                  setError(null);
                }}
                placeholder="/path/to/your/project"
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                disabled={isValidating || isChanging}
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50"
                disabled={isValidating || isChanging}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Current Directory Info */}
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Current directory:</p>
            <p className="text-sm text-gray-700 font-mono truncate">{currentDirectory}</p>
          </div>

          {/* Info */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-700">
                The new directory must contain a{' '}
                <code className="px-1.5 py-0.5 bg-white rounded text-blue-700 font-mono text-xs">
                  .claude
                </code>{' '}
                folder with skills.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isChanging || isValidating}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!directory || directory === currentDirectory || isChanging || isValidating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChanging || isValidating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 inline"
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
                  {isValidating ? 'Validating...' : 'Switching...'}
                </>
              ) : (
                'Switch Directory'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
