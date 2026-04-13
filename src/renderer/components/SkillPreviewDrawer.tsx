/**
 * SkillPreviewDrawer Component
 *
 * Right-side drawer for previewing skill content with enhanced Markdown rendering
 * Features: syntax highlighting, copy code button, better typography
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';

interface SkillPreviewDrawerProps {
  isOpen: boolean;
  skillName: string;
  skillSource: string;
  content: string;
  onClose: () => void;
  onInstall?: () => void;
  isInstalling?: boolean;
}

export default function SkillPreviewDrawer({
  isOpen,
  skillName,
  skillSource,
  content,
  onClose,
  onInstall,
  isInstalling = false,
}: SkillPreviewDrawerProps): JSX.Element | null {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && content) {
      setIsLoading(false);
    } else if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, content]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Right-side Drawer */}
      <div className="fixed right-0 top-0 h-full w-[680px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {skillName}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              {skillSource}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon ml-4"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-3.5">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="px-8 py-6">
              <MarkdownRenderer content={content} mode="full" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white flex gap-3.5 justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary border border-gray-300"
          >
            {t('common.close')}
          </button>
          {onInstall && (
            <button
              onClick={onInstall}
              disabled={isInstalling}
              className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.installing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('discover.install', 'Install Skill')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
