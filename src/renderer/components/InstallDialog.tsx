/**
 * InstallDialog Component
 *
 * Dialog for installing a skill with directory selection
 */

import { useState, useEffect } from 'react';
import type { InstallProgress } from '../../shared/types';

interface InstallDialogProps {
  repositoryName: string;
  skillFilePath: string;
  downloadUrl: string;
  onClose: () => void;
  onInstall: (targetDirectory: 'project' | 'global', conflictResolution?: 'overwrite' | 'rename' | 'skip') => void;
  onConflict: () => void;
}

export default function InstallDialog({
  repositoryName,
  skillFilePath,
  downloadUrl,
  onClose,
  onInstall,
  onConflict,
}: InstallDialogProps): JSX.Element {
  const [targetDirectory, setTargetDirectory] = useState<'project' | 'global'>('project');
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      const response = await window.electronAPI.installGitHubSkill({
        repositoryName,
        skillFilePath,
        downloadUrl,
        targetDirectory,
      });

      if (response.success) {
        onInstall(targetDirectory);
      } else if (response.error?.code === 'CONFLICT') {
        onConflict();
      } else {
        setError(response.error?.message || 'Installation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Install Skill</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Skill Info */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Repository</label>
            <div className="text-slate-100">{repositoryName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Skill File</label>
            <div className="text-slate-100 font-mono text-sm">{skillFilePath}</div>
          </div>

          {/* Directory Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Install To</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="targetDirectory"
                  value="project"
                  checked={targetDirectory === 'project'}
                  onChange={() => setTargetDirectory('project')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">Project Directory</div>
                  <div className="text-xs text-slate-400">Available only to this project</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="targetDirectory"
                  value="global"
                  checked={targetDirectory === 'global'}
                  onChange={() => setTargetDirectory('global')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">Global Directory</div>
                  <div className="text-xs text-slate-400">Available to all Claude projects</div>
                </div>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors flex items-center gap-2"
          >
            {isInstalling && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}
