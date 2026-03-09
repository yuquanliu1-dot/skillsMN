/**
 * Settings Component
 *
 * Configuration panel for user preferences
 */

import { useState, useEffect } from 'react';
import type { Configuration, InstallDirectory, EditorMode } from '../../shared/types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: Configuration | null;
  onSave: (config: Partial<Configuration>) => Promise<void>;
}

export default function Settings({ isOpen, onClose, config, onSave }: SettingsProps): JSX.Element | null {
  const [defaultInstallDirectory, setDefaultInstallDirectory] = useState<InstallDirectory>('project');
  const [editorDefaultMode, setEditorDefaultMode] = useState<EditorMode>('edit');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Load current settings when dialog opens
   */
  useEffect(() => {
    if (isOpen && config) {
      setDefaultInstallDirectory(config.defaultInstallDirectory);
      setEditorDefaultMode(config.editorDefaultMode);
      setAutoRefresh(config.autoRefresh);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, config]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave({
        defaultInstallDirectory,
        editorDefaultMode,
        autoRefresh,
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle escape key to close
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Settings</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {/* Default Install Directory */}
          <div className="mb-4">
            <label
              htmlFor="default-install-directory"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Default Install Directory
            </label>
            <select
              id="default-install-directory"
              value={defaultInstallDirectory}
              onChange={(e) => setDefaultInstallDirectory(e.target.value as InstallDirectory)}
              className="select w-full"
              disabled={isSaving}
            >
              <option value="project">Project Directory</option>
              <option value="global">Global Directory</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Where new skills are created by default
            </p>
          </div>

          {/* Editor Default Mode */}
          <div className="mb-4">
            <label
              htmlFor="editor-default-mode"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Editor Default Mode
            </label>
            <select
              id="editor-default-mode"
              value={editorDefaultMode}
              onChange={(e) => setEditorDefaultMode(e.target.value as EditorMode)}
              className="select w-full"
              disabled={isSaving}
            >
              <option value="edit">Edit Mode</option>
              <option value="preview">Preview Mode</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Default mode when opening skill editor
            </p>
          </div>

          {/* Auto Refresh */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                disabled={isSaving}
              />
              <div>
                <span className="text-sm font-medium text-slate-300">Auto Refresh</span>
                <p className="text-xs text-slate-500">
                  Automatically refresh skill list when files change
                </p>
              </div>
            </label>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
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
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
