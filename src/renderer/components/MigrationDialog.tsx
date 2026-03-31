/**
 * MigrationDialog Component
 *
 * Dialog for migrating existing skills from project directories to application directory
 * Supports MOVE mode with user-controlled deletion of source files
 */

import { useState, useEffect } from 'react';
import type { Skill, MigrationOptions, MigrationProgress } from '../../shared/types';

interface MigrationDialogProps {
  isOpen: boolean;
  skills: Skill[];
  onMigrate: (skills: Skill[], options: MigrationOptions) => Promise<void>;
  onSkip: () => void;
}

export default function MigrationDialog({
  isOpen,
  skills,
  onMigrate,
  onSkip,
}: MigrationDialogProps): JSX.Element | null {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOriginals, setDeleteOriginals] = useState(false);

  const totalSkills = skills.length;

  // Listen for migration progress updates
  useEffect(() => {
    if (!isOpen) return;

    const handleProgress = (_event: any, progressData: MigrationProgress) => {
      setProgress(progressData);
    };

    window.electronAPI.onMigrationProgress?.(handleProgress);

    return () => {
      window.electronAPI.removeMigrationProgressListener?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      setError(null);

      // deleteOriginals determines whether to move (delete) or copy (keep) original files
      const options: MigrationOptions = {
        moveOrCopy: deleteOriginals ? 'move' : 'copy',
        deleteOriginals: deleteOriginals,
      };

      await onMigrate(skills, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Migrate Skills</h2>
          <p className="text-sm text-gray-600 mt-1">
            Found <strong>{totalSkills} skill{totalSkills !== 1 ? 's' : ''}</strong> in the added directory.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-4">
            Skills will be moved to the application directory.
          </p>

          {/* Delete original option */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">After migration:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteOriginals}
                  onChange={() => setDeleteOriginals(true)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Delete original files</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={!deleteOriginals}
                  onChange={() => setDeleteOriginals(false)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Keep original files</span>
              </label>
            </div>
          </div>

          {/* Progress bar */}
          {isMigrating && progress && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{progress.currentSkill}</span>
                <span className="text-sm text-gray-500">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {progress.currentIndex + 1} of {progress.totalSkills} skills
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Migration failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          {!isMigrating && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleMigrate}
            disabled={isMigrating || totalSkills === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMigrating ? 'Moving...' : `Move ${totalSkills} Skill${totalSkills !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
