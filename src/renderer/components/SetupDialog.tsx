/**
 * Setup Dialog Component
 *
 * First-time setup dialog for configuring Claude project directory
 */

import React, { useState, useCallback } from 'react';

interface SetupDialogProps {
  onComplete: (projectDirectory: string) => Promise<void>;
}

export default function SetupDialog({ onComplete }: SetupDialogProps): JSX.Element {
  const [directory, setDirectory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * Handle browse button click
   */
  const handleBrowse = useCallback(async () => {
    try {
      // For now, we'll just show a text input
      // In a real app, we'd use Electron's dialog API
      const result = prompt('Enter Claude project directory path:');
      if (result) {
        setDirectory(result);
        setError(null);
      }
    } catch (err) {
      setError('Failed to open directory browser');
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

    setIsValidating(true);
    setError(null);

    try {
      // Remove trailing slash for consistency
      const cleanDir = dir.replace(/[\\/]+$/, '');

      // Validate via IPC by checking if the directory exists
      // For now, we'll check if we can list skills from it
      const testConfig = {
        projectDirectory: cleanDir,
        projectDirectories: [cleanDir],
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
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const isValid = await validateDirectory(directory);
      if (!isValid) return;

      setIsCompleting(true);
      try {
        await onComplete(directory);
      } catch (err) {
        setError('Failed to save configuration');
        console.error('Complete error:', err);
      } finally {
        setIsCompleting(false);
      }
    },
    [directory, validateDirectory, onComplete]
  );

  return (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Welcome to skillsMN
          </h2>
          <p className="text-slate-600">
            Select your Claude project directory to get started. This is where
            your local skills are stored.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Directory Input */}
          <div className="mb-4">
            <label
              htmlFor="directory"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Claude Project Directory
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
                className="input flex-1"
                disabled={isValidating || isCompleting}
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="btn btn-secondary"
                disabled={isValidating || isCompleting}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> Select a directory that contains a{' '}
              <code className="px-1 py-0.5 bg-slate-100 rounded text-blue-600">
                .claude
              </code>{' '}
              folder. This is typically your Claude Code project root.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!directory || isValidating || isCompleting}
            >
              {isCompleting ? 'Setting up...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
