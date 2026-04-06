/**
 * AI Skill Creation Dialog Component
 *
 * Dialog for AI-powered skill creation with streaming preview and tool feedback
 * All skills are saved to the centralized application directory
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { ipcClient } from '../services/ipcClient';
import type { Configuration } from '../../shared/types';

interface AISkillCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated: () => void;
  config: Configuration | null;
  /** Callback to show toast notification */
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AISkillCreationDialog: React.FC<AISkillCreationDialogProps> = ({
  isOpen,
  onClose,
  onSkillCreated,
  config,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');

  const {
    status,
    content,
    error,
    toolCalls,
    isStreaming,
    isComplete,
    isIdle,
    generate,
    stop,
    retry,
    reset,
  } = useAIGeneration({
    onComplete: () => {
      console.log('AI skill generation complete - file created by Agent SDK');
      // Refresh skill list but keep dialog open
      onSkillCreated();
    },
    onError: (errorMessage) => {
      console.error('AI skill generation error:', errorMessage);
    },
  });

  /**
   * Reset state when dialog opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      reset();
    }
  }, [isOpen, reset]);

  /**
   * Handle generate button click
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    // Skills are always saved to the centralized application directory
    const targetDirectory = config?.applicationSkillsDirectory;

    if (!targetDirectory) {
      console.error('No application skills directory configured');
      return;
    }

    // Pass the target directory to AI so it knows where to create the skill
    await generate(prompt, 'new', {
      targetPath: targetDirectory,
    });
  }, [prompt, generate, config]);

  /**
   * Parse skill name from YAML frontmatter
   */
  const parseSkillNameFromFrontmatter = useCallback((content: string): string | null => {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.error('No YAML frontmatter found in content');
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    if (!nameMatch) {
      console.error('No name field found in frontmatter');
      return null;
    }

    return nameMatch[1].trim();
  }, []);

  /**
   * Handle apply button click - create the skill
   */
  const handleApply = useCallback(async () => {
    if (!content) {
      return;
    }

    try {
      const skillName = parseSkillNameFromFrontmatter(content);
      if (!skillName) {
        console.error('Failed to parse skill name');
        return;
      }

      console.log('Creating skill:', skillName);

      // Create skill (always in application directory)
      const newSkill = await ipcClient.createSkill(skillName);
      await ipcClient.updateSkill(newSkill.path, content);

      console.log('Skill created successfully');
      onClose();
      onSkillCreated();
    } catch (error) {
      console.error('Failed to create skill:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create skill';
      onShowToast?.(`Failed to create skill: ${errorMsg}`, 'error');
    }
  }, [content, parseSkillNameFromFrontmatter, onClose, onSkillCreated, onShowToast]);

  /**
   * Handle escape key to close
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isStreaming) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, isStreaming, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="ai-creation-dialog"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStreaming) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('aiSidebar.title')}</h2>
              <p className="text-sm text-white/80">{t('aiSidebar.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isStreaming}
            className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Section - Info */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('skills.savedToLibraryShort')}</span>
            </div>
          </div>

          {/* Middle Section - Unified Preview Window */}
          <div className="flex-1 flex flex-col overflow-hidden p-6 bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('aiDialog.preview')}</label>
              <div className="flex items-center gap-3">
                {isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                    <span>{t('aiDialog.streaming')}</span>
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('aiDialog.complete')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Unified Preview Window */}
            <div data-testid="ai-preview-window" className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden flex flex-col">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {error ? (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    <div className="font-medium mb-1">{t('common.error')}</div>
                    <div>{error}</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tool Calls */}
                    {toolCalls.length > 0 && (
                      <div className="space-y-2">
                        {toolCalls.map((tool, index) => (
                          <div key={index} className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-blue-900 dark:text-blue-300">{tool.name}</div>
                              {tool.input && (
                                <pre className="text-xs text-blue-700 dark:text-blue-400 mt-1 whitespace-pre-wrap break-words">
                                  {typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Generated Content */}
                    {content ? (
                      <div>
                        {toolCalls.length > 0 && (
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 mt-2">
                            {t('aiDialog.generatedSkill')}
                          </div>
                        )}
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                          {content}
                          {isStreaming && <span className="inline-block w-2 h-4 bg-blue-600 dark:bg-blue-400 animate-pulse ml-1">|</span>}
                        </pre>
                      </div>
                    ) : toolCalls.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm min-h-[200px]">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7l2-4h10l2 4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                          </svg>
                          <p>{t('aiDialog.contentWillAppear')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section - Input & Controls */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            {/* Input */}
            <div className="relative">
              <textarea
                data-testid="ai-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isStreaming}
                placeholder={t('aiDialog.promptPlaceholder')}
                className="w-full h-20 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                maxLength={2000}
              />
              <div data-testid="ai-char-count" className="absolute bottom-2 right-2 text-xs text-slate-400 dark:text-slate-500">
                {prompt.length}/2000
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {isIdle && (
                <button
                  data-testid="ai-generate-button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title={t('aiDialog.generateSkill')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              )}

              {isStreaming && (
                <button
                  onClick={stop}
                  className="flex-1 btn bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                  title={t('aiDialog.stopGeneration')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
                  </svg>
                </button>
              )}

              {!isIdle && !isStreaming && (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title={t('aiDialog.generateAgain')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
