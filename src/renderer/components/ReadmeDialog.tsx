/**
 * ReadmeDialog Component
 *
 * Displays repository README.md content using Monaco Editor (read-only mode)
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco to use local installation
loader.config({ monaco });

/**
 * Map theme name to Monaco Editor theme
 */
const getMonacoTheme = (theme: 'light' | 'dark'): 'vs' | 'vs-dark' => {
  const themeMap: Record<'light' | 'dark', 'vs' | 'vs-dark'> = {
    light: 'vs',
    dark: 'vs-dark',
  };
  return themeMap[theme];
};

interface ReadmeDialogProps {
  repoId: string;
  repoName: string;
  onClose: () => void;
}

export default function ReadmeDialog({ repoId, repoName, onClose }: ReadmeDialogProps): JSX.Element {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Detect theme from system
  useEffect(() => {
    const detectTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    };

    detectTheme();

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectTheme);

    return () => {
      mediaQuery.removeEventListener('change', detectTheme);
    };
  }, []);

  useEffect(() => {
    const fetchReadme = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await window.electronAPI.getRepoReadme(repoId);
        if (response.success && response.data) {
          setContent(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch README');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch README';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadme();
  }, [repoId]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="readme-dialog-title"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2
                id="readme-dialog-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
                title={repoName}
              >
                README - {repoName}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Failed to Load README
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                    {error}
                  </p>
                </div>
              ) : (
                <div className="h-full">
                  <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    language="markdown"
                    value={content}
                    theme={getMonacoTheme(theme)}
                    options={{
                      readOnly: true,
                      domReadOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      lineHeight: 1.6,
                      padding: { top: 16, bottom: 16 },
                      lineNumbers: 'off',
                      glyphMargin: false,
                      folding: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      renderWhitespace: 'selection',
                      bracketPairColorization: { enabled: true },
                      wordWrap: 'on',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
