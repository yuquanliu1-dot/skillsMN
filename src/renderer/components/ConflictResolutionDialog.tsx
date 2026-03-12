/**
 * ConflictResolutionDialog Component
 *
 * Dialog for resolving skill installation conflicts
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
  downloadUrl,
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
      <div className="bg-slate-800 rounded-lg w-full max-w-lg border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Skill Already Exists</h3>
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
          {/* Conflict Info */}
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded text-sm">
            A skill file with the same name already exists in your project directory.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Repository</label>
            <div className="text-slate-100">{repositoryName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Skill File</label>
            <div className="text-slate-100 font-mono text-sm">{skillFilePath}</div>
          </div>

          {/* Resolution Options */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Resolution Strategy</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="rename"
                  checked={resolution === 'rename'}
                  onChange={() => setResolution('rename')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">Rename (Recommended)</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Keep existing file and install new one with a different name
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="overwrite"
                  checked={resolution === 'overwrite'}
                  onChange={() => setResolution('overwrite')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">Overwrite</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Replace existing file with the new one (existing content will be lost)
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="skip"
                  checked={resolution === 'skip'}
                  onChange={() => setResolution('skip')}
                  className="w-4 h-4 text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">Skip</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Keep existing file and don't install the new one
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Apply to All Checkbox */}
          {remainingConflicts > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 mt-0.5 rounded"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium text-sm">
                    Apply to all remaining conflicts
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Use this resolution for all {remainingConflicts} remaining conflict{remainingConflicts !== 1 ? 's' : ''}
                  </div>
                </div>
              </label>
            </div>
          )}

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
            disabled={isResolving}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving || resolution === 'skip'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors flex items-center gap-2"
          >
            {isResolving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isResolving ? 'Resolving...' : resolution === 'skip' ? 'Skip Installation' : 'Apply Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}
