/**
 * SkillPreview Component
 *
 * Modal for previewing skill content from GitHub
 */

import { useState, useEffect } from 'react';

interface SkillPreviewProps {
  downloadUrl: string;
  onClose: () => void;
  onInstall: (repositoryName: string, skillFilePath: string, downloadUrl: string) => void;
}

export default function SkillPreview({ downloadUrl, onClose, onInstall }: SkillPreviewProps): JSX.Element {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Preview Skill</h3>
            <p className="text-sm text-slate-400 mt-1">
              {repositoryName} - {skillFilePath}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded border border-slate-700 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onInstall(repositoryName, skillFilePath || 'skill.md', downloadUrl)}
            disabled={isLoading || !!error}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
          >
            Install Skill
          </button>
        </div>
      </div>
    </div>
  );
}
