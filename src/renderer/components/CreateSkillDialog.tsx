/**
 * CreateSkillDialog Component
 *
 * Dialog for creating new skills with name input and directory selection
 */

import React, { useState, useCallback } from 'react';

interface CreateSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSkill: (name: string, directory: 'project' | 'global') => Promise<void>;
  defaultDirectory: 'project' | 'global';
}

export default function CreateSkillDialog({
  isOpen,
  onClose,
  onCreateSkill,
  defaultDirectory,
}: CreateSkillDialogProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [directory, setDirectory] = useState<'project' | 'global'>(defaultDirectory);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Reset form state when dialog opens/closes
   */
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDirectory(defaultDirectory);
      setError(null);
      setIsCreating(false);
    }
  }, [isOpen, defaultDirectory]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate name
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Skill name is required');
        return;
      }

      if (trimmedName.length > 100) {
        setError('Skill name must be 100 characters or less');
        return;
      }

      if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
        setError('Skill name can only contain letters, numbers, spaces, hyphens, and underscores');
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        await onCreateSkill(trimmedName, directory);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create skill';
        setError(message);
        console.error('Create skill error:', err);
      } finally {
        setIsCreating(false);
      }
    },
    [name, directory, onCreateSkill, onClose]
  );

  /**
   * Handle escape key to close
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose();
      }
    },
    [isCreating, onClose]
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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-300 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Create New Skill</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
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
          {/* Skill Name */}
          <div className="mb-4">
            <label
              htmlFor="skill-name"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Skill Name
            </label>
            <input
              type="text"
              id="skill-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="My New Skill"
              className="input w-full"
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Directory Selection */}
          <div className="mb-4">
            <label
              htmlFor="directory"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Save Location
            </label>
            <select
              id="directory"
              value={directory}
              onChange={(e) => setDirectory(e.target.value as 'project' | 'global')}
              className="select w-full"
              disabled={isCreating}
            >
              <option value="project">Project Directory</option>
              <option value="global">Global Directory</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
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
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
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
                A new directory will be created with a{' '}
                <code className="px-1 py-0.5 bg-slate-200 rounded text-blue-800">
                  skill.md
                </code>{' '}
                template file.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="btn btn-primary"
            >
              {isCreating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                  Creating...
                </>
              ) : (
                'Create Skill'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
