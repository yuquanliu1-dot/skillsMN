/**
 * PrivateInstallDialog Component
 *
 * Dialog for installing a skill from a private repository with directory selection
 */

import { useState } from 'react';
import type { PrivateSkill, PrivateRepo } from '../../shared/types';

interface PrivateInstallDialogProps {
  skill: PrivateSkill;
  repo: PrivateRepo;
  onClose: () => void;
  onInstall: (targetDirectory: 'project' | 'global', conflictResolution?: 'overwrite' | 'rename' | 'skip') => void;
  onConflict: () => void;
}

export default function PrivateInstallDialog({
  skill,
  repo,
  onClose,
  onInstall,
  onConflict,
}: PrivateInstallDialogProps): JSX.Element {
  const [targetDirectory, setTargetDirectory] = useState<'project' | 'global'>('project');
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      const response = await window.electronAPI.installPrivateRepoSkill({
        repoId: repo.id,
        skillPath: skill.path,
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
          <h3 className="text-lg font-semibold text-slate-100">Install Skill from Private Repository</h3>
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
          {/* Repository Info */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Repository</label>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12z" />
              </svg>
              <div className="text-slate-100">{repo.displayName || `${repo.owner}/${repo.repo}`}</div>
            </div>
          </div>

          {/* Skill Info */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Skill Name</label>
            <div className="text-slate-100">{skill.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Skill Path</label>
            <div className="text-slate-100 font-mono text-sm">{skill.path}</div>
          </div>

          {skill.lastCommitMessage && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Latest Commit</label>
              <div className="text-slate-100 text-sm">{skill.lastCommitMessage}</div>
            </div>
          )}

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
