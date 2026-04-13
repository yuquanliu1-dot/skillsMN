/**
 * CopySkillDialog Component
 *
 * Dialog for copying a skill with a new name
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../../shared/types';

interface CopySkillDialogProps {
  skill: Skill;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  existingSkillNames?: string[]; // Names of existing skills for conflict detection
}

export default function CopySkillDialog({
  skill,
  isOpen,
  onClose,
  onConfirm,
  existingSkillNames = [],
}: CopySkillDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  /**
   * Generate a unique name that doesn't conflict with existing skills
   * Pattern: original-name-copy, original-name-copy-1, original-name-copy-2, etc.
   */
  const generateUniqueName = (baseName: string, existingNames: string[]): string => {
    const existingSet = new Set(existingNames.map(n => n.toLowerCase()));

    // Try the base name first
    const baseCopyName = `${baseName}-copy`;
    if (!existingSet.has(baseCopyName.toLowerCase())) {
      return baseCopyName;
    }

    // Try incrementing numbers until we find an available name
    let counter = 1;
    while (existingSet.has(`${baseCopyName}-${counter}`.toLowerCase())) {
      counter++;
    }
    return `${baseCopyName}-${counter}`;
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Generate a unique default name
      const uniqueName = generateUniqueName(skill.name, existingSkillNames);
      setNewName(uniqueName);
      setError(null);
      setIsCopying(false);
    }
  }, [isOpen, skill.name, existingSkillNames]);

  if (!isOpen) return null;

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return t('skills.skillNameRequired');
    }

    if (name.length > 100) {
      return t('skills.skillNameMaxLength');
    }

    // Check for Chinese characters
    if (/[\u4e00-\u9fa5]/.test(name)) {
      return t('skillCard.copyNameNoChinese');
    }

    // Check for invalid characters (only allow letters, numbers, hyphens, underscores, spaces)
    if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
      return t('skillCard.copyNameInvalidChars');
    }

    return null;
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    // Clear error when user types
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateName(newName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCopying(true);
    setError(null);

    try {
      await onConfirm(newName.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('skillCard.copySkill')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Info box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-4 py-3 rounded text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">{t('skillCard.copyInfo')}</p>
                  <p className="text-xs mt-1">{t('skillCard.copyInfoDescription')}</p>
                </div>
              </div>
            </div>

            {/* Original skill name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('skillCard.originalName')}
              </label>
              <div className="text-slate-900 dark:text-slate-100">{skill.name}</div>
            </div>

            {/* New skill name input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('skillCard.newName')}
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('skillCard.newNamePlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={isCopying}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Name format hint */}
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('skillCard.copyNameHint')}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCopying}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isCopying || !newName.trim()}
              className="px-4 py-2 bg-primary dark:bg-blue-600 text-white rounded hover:bg-primary-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCopying ? t('common.creating') : t('skillCard.copySkill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
