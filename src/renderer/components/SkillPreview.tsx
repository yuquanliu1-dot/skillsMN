/**
 * SkillPreview Component
 *
 * Right-side drawer for previewing skill content from GitHub with Markdown rendering
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';

interface SkillPreviewProps {
  downloadUrl: string;
  onClose: () => void;
  onInstall: (repositoryName: string, skillFilePath: string, downloadUrl: string) => void;
}

export default function SkillPreview({ downloadUrl, onClose, onInstall }: SkillPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract repository name and path from URL
  const extractInfo = (url: string) => {
    // URL format: https://raw.githubusercontent.com/owner/repo/branch/path/to/skill.md
    const match = url.match(/githubusercontent\.com\/(.+?)\/(.+?)\/(.+?)\/(.+)/);
    if (match) {
      const [, owner, repo, , path] = match;
      return {
        repositoryName: `${owner}/${repo}`,
        skillFilePath: path,
      };
    }
    return { repositoryName: 'unknown', skillFilePath: 'skill.md' };
  };

  const { repositoryName, skillFilePath } = extractInfo(downloadUrl);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await window.electronAPI.previewGitHubSkill(downloadUrl);
        if (response.success && response.data) {
          setContent(response.data.content);
        } else {
          setError(response.error?.message || 'Failed to load skill content');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skill content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [downloadUrl]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Right-side Drawer */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {t('discover.previewSkill', 'Preview Skill')}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {repositoryName} · {skillFilePath}
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3.5">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-gray-500">{t('common.loading')}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <MarkdownRenderer content={content} mode="full" />
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
          <button
            onClick={() => onInstall(repositoryName, skillFilePath || 'skill.md', downloadUrl)}
            disabled={isLoading || !!error}
            className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('discover.install', 'Install Skill')}
          </button>
        </div>
      </div>
    </>
  );
}
