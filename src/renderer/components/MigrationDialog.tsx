/**
 * MigrationDialog Component
 *
 * Dialog for migrating existing skills from project directories to application directory
 * Supports MOVE mode with user-controlled deletion of source files
 * Supports conflict resolution strategies: rename, skip, overwrite
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill, MigrationOptions, MigrationProgress, ConflictStrategy } from '../../shared/types';

interface MigrationDialogProps {
  isOpen: boolean;
  skills: Skill[];
  targetDirectory: string;
  onMigrate: (skills: Skill[], options: MigrationOptions) => Promise<void>;
  onSkip: () => void;
}

export default function MigrationDialog({
  isOpen,
  skills,
  targetDirectory,
  onMigrate,
  onSkip,
}: MigrationDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('rename');

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
        conflictStrategy: conflictStrategy,
      };

      await onMigrate(skills, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('migration.migrationFailed'));
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('migration.title')}</h2>
          <p className="text-sm text-gray-600 mt-1"
            dangerouslySetInnerHTML={{
              __html: t('migration.foundSkills', { count: totalSkills })
            }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Migration paths display */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-slate-500 min-w-[60px]">{t('migration.sourceLabel')}</span>
                <div className="flex-1">
                  {skills.length === 1 ? (
                    <span className="text-xs text-slate-700 font-mono break-all">{skills[0].path}</span>
                  ) : (
                    <div className="space-y-1">
                      {skills.slice(0, 3).map((skill, index) => (
                        <div key={index} className="text-xs text-slate-700 font-mono break-all">
                          {skill.path}
                        </div>
                      ))}
                      {skills.length > 3 && (
                        <div className="text-xs text-slate-500">
                          {t('migration.moreSkills', { count: skills.length - 3 })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-slate-500 min-w-[60px]">{t('migration.targetLabel')}</span>
                <span className="text-xs text-slate-700 font-mono break-all">{targetDirectory}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-4">
            {t('migration.skillsWillBeMoved')}
          </p>

          {/* Conflict resolution strategy */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('migration.ifSkillExists')}</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflictStrategy"
                  checked={conflictStrategy === 'rename'}
                  onChange={() => setConflictStrategy('rename')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">{t('migration.rename')}</span>
                  <p className="text-xs text-gray-500">{t('migration.renameDescription')}</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflictStrategy"
                  checked={conflictStrategy === 'skip'}
                  onChange={() => setConflictStrategy('skip')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">{t('migration.skip')}</span>
                  <p className="text-xs text-gray-500">{t('migration.skipDescription')}</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflictStrategy"
                  checked={conflictStrategy === 'overwrite'}
                  onChange={() => setConflictStrategy('overwrite')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">{t('migration.overwrite')}</span>
                  <p className="text-xs text-gray-500">{t('migration.overwriteDescription')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Delete original option */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('migration.afterMigration')}</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteOriginals}
                  onChange={() => setDeleteOriginals(true)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('migration.deleteOriginalFiles')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={!deleteOriginals}
                  onChange={() => setDeleteOriginals(false)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('migration.keepOriginalFiles')}</span>
              </label>
            </div>
          </div>

          {/* Progress bar */}
          {isMigrating && progress && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {progress.renamedTo
                    ? `${progress.currentSkill} → ${progress.renamedTo}`
                    : progress.currentSkill}
                </span>
                <span className="text-sm text-gray-500">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('migration.ofSkills', { current: progress.currentIndex + 1, total: progress.totalSkills })}
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
                  <p className="text-sm font-medium text-red-800">{t('migration.migrationFailed')}</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3.5">
          {!isMigrating && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {t('common.skip')}
            </button>
          )}
          <button
            onClick={handleMigrate}
            disabled={isMigrating || totalSkills === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMigrating ? t('migration.moving') : t('migration.moveSkills', { count: totalSkills })}
          </button>
        </div>
      </div>
    </div>
  );
}
