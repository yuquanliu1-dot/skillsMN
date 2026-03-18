/**
 * CreateSkillDialog Component
 *
 * Dialog for creating new skills with name input
 * All skills are saved to the centralized application directory
 */

import React, { useState, useCallback } from 'react';

interface CreateSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSkill: (name: string) => Promise<void>;
  onOpenAICreation: () => void;
}

export default function CreateSkillDialog({
  isOpen,
  onClose,
  onCreateSkill,
  onOpenAICreation,
}: CreateSkillDialogProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Reset form state when dialog opens/closes
   */
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      setIsCreating(false);
    }
  }, [isOpen]);

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
        await onCreateSkill(trimmedName);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create skill';
        setError(message);
        console.error('Create skill error:', err);
      } finally {
        setIsCreating(false);
      }
    },
    [name, onCreateSkill, onClose]
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
      <div data-testid="create-skill-dialog" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create New Skill</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
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
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Skill Name
            </label>
            <input
              data-testid="skill-name-input"
              type="text"
              id="skill-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="My New Skill"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
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
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
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
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p>A new directory will be created with a <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-blue-800 dark:text-blue-300">skill.md</code> template file.</p>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Skill will be saved to your centralized skills library.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onOpenAICreation}
              disabled={isCreating}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z"
                />
              </svg>
              AI Create
            </button>
            <button
              data-testid="confirm-create-button"
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
