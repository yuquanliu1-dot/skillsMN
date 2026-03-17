/**
 * MigrationDialog Component
 *
 * Dialog for migrating existing skills from old locations to application directory
 */

import { useState, useEffect } from 'react';
import type { Skill, MigrationOptions, MigrationProgress } from '../../shared/types';

interface MigrationDialogProps {
  isOpen: boolean;
  globalSkills: Skill[];
  projectSkills: Skill[];
  onMigrate: (skills: Skill[], options: MigrationOptions) => Promise<void>;
  onSkip: () => void;
}

export default function MigrationDialog({
  isOpen,
  globalSkills,
  projectSkills,
  onMigrate,
  onSkip,
}: MigrationDialogProps): JSX.Element | null {
  const [moveOrCopy, setMoveOrCopy] = useState<'move' | 'copy'>('copy');
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSkills = globalSkills.length + projectSkills.length;
  const allSkills = [...globalSkills, ...projectSkills];

  // Listen for migration progress updates
  useEffect(() => {
    if (!isOpen) return;

    const handleProgress = (_event: any, progressData: MigrationProgress) => {
      setProgress(progressData);
    };

    // Remove any existing listener first
    window.electronAPI.onMigrationProgress?.(handleProgress);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      setError(null);

      const options: MigrationOptions = {
        moveOrCopy,
        deleteOriginals: moveOrCopy === 'move' && deleteOriginals,
      };

      await onMigrate(allSkills, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Migrate Existing Skills</h2>
          <p className="text-sm text-gray-600 mt-1">
            Skills found in old locations need to be migrated to the new centralized application directory.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Skills found */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Found existing skills in:</h3>
            <div className="space-y-2">
              {globalSkills.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span>Global directory: <strong>{globalSkills.length} skills</strong></span>
                </div>
              )}
              {projectSkills.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                  </svg>
                  <span>Project directories: <strong>{projectSkills.length} skills</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Migration options */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Migration options:</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="moveOrCopy"
                  value="copy"
                  checked={moveOrCopy === 'copy'}
                  onChange={() => {
                    setMoveOrCopy('copy');
                    setDeleteOriginals(false);
                  }}
                  disabled={isMigrating}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Copy skills (recommended)</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Keeps original files in place as backup
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="moveOrCopy"
                  value="move"
                  checked={moveOrCopy === 'move'}
                  onChange={() => setMoveOrCopy('move')}
                  disabled={isMigrating}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Move skills</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Transfers files to application directory
                  </p>
                </div>
              </label>

              {moveOrCopy === 'move' && (
                <label className="flex items-center gap-3 ml-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteOriginals}
                    onChange={(e) => setDeleteOriginals(e.target.checked)}
                    disabled={isMigrating}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Delete original files after migration
                  </span>
                </label>
              )}
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
                {progress.currentIndex + 1} of {progress.totalSkills} skills - {progress.operation}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
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
            {isMigrating ? 'Migrating...' : `Migrate ${totalSkills} Skills`}
          </button>
        </div>
      </div>
    </div>
  );
}
