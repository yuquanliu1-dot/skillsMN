/**
 * Keyword Editor Component
 *
 * Edit keywords for skill groups
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SkillGroup } from '../../shared/types';
import GroupIcon from './GroupIcon';

interface KeywordEditorProps {
  group: SkillGroup;
  onUpdate: (groupId: string, keywords: string[]) => Promise<void>;
  onCancel: () => void;
}

export default function KeywordEditor({ group, onUpdate, onCancel }: KeywordEditorProps): JSX.Element {
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState(group.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setKeywords(group.keywords || []);
  }, [group]);

  /**
   * Helper function to translate group field if it's an i18n key
   */
  const tGroupField = (value: string | undefined): string => {
    if (!value) return '';
    if (value.startsWith('skillGroups.') || value.includes('.')) {
      const translated = t(value);
      if (translated && translated !== value) {
        return translated;
      }
    }
    return value;
  };

  /**
   * Get display name for the group
   */
  const getGroupDisplayName = (): string => {
    return tGroupField(group.name);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onUpdate(group.id, keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update keywords');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-3.5">
              <span style={{ color: group.color }}>
                <GroupIcon icon={group.icon} className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {getGroupDisplayName()}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('skillGroups.keywords.description')}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">{t('skillGroups.keywords.instructions')}</p>
                <ul className="space-y-1 text-xs">
                  {(t('skillGroups.keywords.instructionDetails', { returnObjects: true }) as string[]).map((detail: string, index: number) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Add Keyword Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('skillGroups.keywords.addKeyword')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('skillGroups.keywords.addPlaceholder')}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleAddKeyword}
                className="btn btn-primary btn-sm"
              >
                {t('common.add')}
              </button>
            </div>
          </div>

          {/* Keywords List */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('skillGroups.keywords.currentKeywords')} ({keywords.length})
            </label>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[100px] bg-slate-50 dark:bg-slate-900">
              {keywords.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center w-full py-8">
                  {t('skillGroups.keywords.noKeywords')}
                </p>
              ) : (
                keywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg group"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                      aria-label={`Remove ${keyword}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3.5 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="btn btn-secondary disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('skillGroups.keywords.cancelButton')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-4 border-white border-t-transparent"></div>
                {t('skillGroups.keywords.saving')}
              </>
            ) : (
              t('skillGroups.keywords.saveButton')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
