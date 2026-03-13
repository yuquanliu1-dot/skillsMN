/**
 * AI Skill Creation Dialog Component
 *
 * Dialog for AI-powered skill creation with streaming preview and tool feedback
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { ipcClient } from '../services/ipcClient';

interface AISkillCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  directory: 'project' | 'global';
  onSkillCreated: () => void;
}

export const AISkillCreationDialog: React.FC<AISkillCreationDialogProps> = ({
  isOpen,
  onClose,
  directory,
  onSkillCreated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [directoryPath, setDirectoryPath] = useState<string>('');

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
   * Load directory path when dialog opens
   */
  useEffect(() => {
    if (isOpen) {
      async function loadDirectoryPath() {
        try {
          const config = await ipcClient.loadConfig();
          if (directory === 'project' && config.projectDirectory) {
            setDirectoryPath(`${config.projectDirectory}/.claude/skills`);
          } else {
            setDirectoryPath('Global Skills Directory');
          }
        } catch (error) {
          console.error('Failed to load directory path:', error);
          setDirectoryPath(directory === 'project' ? 'Project Skills Directory' : 'Global Skills Directory');
        }
      }
      loadDirectoryPath();
    }
  }, [isOpen, directory]);

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

    // Build context with target directory info
    const skillContext = {
      targetDirectory: directory,
      targetPath: directoryPath,
    };

    // Pass target path as part of the request
    await generate(prompt, 'new', skillContext);
  }, [prompt, directory, directoryPath, generate]);

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

      console.log('Creating skill:', skillName, 'in directory:', directory);

      const newSkill = await ipcClient.createSkill(skillName, directory);
      await ipcClient.updateSkill(newSkill.path, content);

      console.log('Skill created successfully');
      onClose();
      onSkillCreated();
    } catch (error) {
      console.error('Failed to create skill:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create skill';
      alert('Failed to create skill: ' + errorMsg);
    }
  }, [content, directory, parseSkillNameFromFrontmatter, onClose, onSkillCreated]);

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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStreaming) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Skill Creator</h2>
              <p className="text-sm text-white/80">Powered by Claude</p>
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
          {/* Top Section - Directory Info */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="font-medium">Save to:</span>
              <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200 flex-1 truncate">
                {directoryPath || 'Loading...'}
              </code>
            </div>
          </div>

          {/* Middle Section - Preview & Tools */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Tool Calls */}
            {toolCalls.length > 0 && (
              <div className="mb-4 space-y-2">
                {toolCalls.map((tool, index) => (
                  <div key={index} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-blue-900">{tool.name}</div>
                      {tool.input && (
                        <pre className="text-xs text-blue-700 mt-1 whitespace-pre-wrap break-words">
                          {typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Preview</label>
                {isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    <span>Streaming...</span>
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Complete</span>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-300 rounded-lg p-4 min-h-[300px]">
                {error ? (
                  <div className="text-red-600 text-sm">
                    <div className="font-medium mb-1">Error</div>
                    <div>{error}</div>
                  </div>
                ) : content ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    {content}
                    {isStreaming && <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-1">|</span>}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7l2-4h10l2 4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                      <p>Generated content will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section - Input & Controls */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white space-y-3">
            {/* Input */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isStreaming}
                placeholder="Describe the skill you want to create..."
                className="w-full h-20 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                maxLength={2000}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {prompt.length}/2000
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {isIdle && (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 btn bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate
                </button>
              )}

              {isStreaming && (
                <button
                  onClick={stop}
                  className="flex-1 btn bg-red-500 hover:bg-red-600 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
                  </svg>
                  Stop
                </button>
              )}

              {!isIdle && !isStreaming && (
                <>
                  <button
                    onClick={retry}
                    className="flex-1 btn bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </button>
                  {isComplete && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg px-4 py-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Skill created successfully!</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
