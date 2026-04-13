/**
 * LocalSkillPreviewDrawer Component
 *
 * Right-side drawer for previewing local skill content with:
 * - Enhanced Markdown rendering with syntax highlighting
 * - Symlink management panel
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';
import type { Skill } from '../../shared/types';
import SymlinkPanel from './SymlinkPanel';

interface LocalSkillPreviewDrawerProps {
  isOpen: boolean;
  skill: Skill | null;
  onClose: () => void;
  onEdit?: (skill: Skill) => void;
}

export default function LocalSkillPreviewDrawer({
  isOpen,
  skill,
  onClose,
  onEdit,
}: LocalSkillPreviewDrawerProps): JSX.Element | null {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && skill) {
      loadSkillContent();
    }
  }, [isOpen, skill]);

  const loadSkillContent = async () => {
    if (!skill) return;
    setIsLoading(true);
    try {
      const response = await window.electronAPI.getSkill(skill.path);
      if (response.success && response.data) {
        setContent(response.data.content);
      }
    } catch (error) {
      console.error('Failed to load skill content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !skill) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Right-side Drawer */}
      <div className="fixed right-0 top-0 h-full w-[700px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {skill.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {skill.source === 'global' ? t('skills.global', 'Global') : t('skills.local', 'Local')}
              <span className="text-gray-400 mx-1">•</span>
              <span className="truncate">{skill.path}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content with collapsible Link panel */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-3.5">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Symlink Panel - uses the shared component with collapsible functionality */}
              <SymlinkPanel
                skillName={skill.name}
                skillPath={skill.path}
              />

              {/* Skill Content */}
              <div className="px-8 py-6">
                <MarkdownRenderer content={content} mode="full" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white flex gap-3.5 justify-end">
          {onEdit && (
            <button
              onClick={() => onEdit(skill)}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('common.edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-secondary border border-gray-300"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </>
  );
}
