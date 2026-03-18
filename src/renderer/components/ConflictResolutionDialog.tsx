/**
 * ConflictResolutionDialog Component
 *
 * Dialog for resolving skill installation conflicts
 * Styled to match the main application dialog style
 */

import { useState } from 'react';

interface ConflictResolutionDialogProps {
  repositoryName: string;
  skillFilePath: string;
  downloadUrl: string;
  onClose: () => void;
  onResolve: (resolution: 'overwrite' | 'rename' | 'skip', applyToAll?: boolean) => void;
  remainingConflicts?: number;
}

export default function ConflictResolutionDialog({
  repositoryName,
  skillFilePath,
  onClose,
  onResolve,
  remainingConflicts = 0,
}: ConflictResolutionDialogProps): JSX.Element {
  const [resolution, setResolution] = useState<'overwrite' | 'rename' | 'skip'>('rename');
  const [applyToAll, setApplyToAll] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    setIsResolving(true);
    setError(null);

    try {
      await onResolve(resolution, applyToAll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Skill Already Exists</h3>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Conflict Info */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 rounded text-sm">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>A skill with this name already exists in your skills library.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Repository</label>
            <div className="text-slate-900 dark:text-slate-100">{repositoryName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Skill Path</label>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-sm bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded">
              {skillFilePath}
            </div>
          </div>

          {/* Resolution Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resolution Strategy</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="rename"
                  checked={resolution === 'rename'}
                  onChange={() => setResolution('rename')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">Rename (Recommended)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Keep existing skill and install new one with a different name
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="overwrite"
                  checked={resolution === 'overwrite'}
                  onChange={() => setResolution('overwrite')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">Overwrite</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Replace existing skill (existing content will be lost)
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="skip"
                  checked={resolution === 'skip'}
                  onChange={() => setResolution('skip')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">Skip</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Keep existing skill and don't install
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Apply to All Checkbox */}
          {remainingConflicts > 0 && (
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 mt-0.5 rounded"
                />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-slate-100 font-medium text-sm">
                    Apply to all remaining conflicts
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use this resolution for all {remainingConflicts} remaining conflict{remainingConflicts !== 1 ? 's' : ''}
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isResolving}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving || resolution === 'skip'}
            className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
              resolution === 'skip'
                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                : 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700'
            }`}
          >
            {isResolving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isResolving ? 'Resolving...' : resolution === 'skip' ? 'Skip Installation' : 'Apply Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}
