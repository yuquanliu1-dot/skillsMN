/**
 * SkillEditorPanel Component
 *
 * Third-column panel for viewing and editing skill.md files with Monaco Editor
 * Modern minimalist design
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import type { Skill } from '../../shared/types';
import { AIAssistPanel } from './AIAssistPanel';

// Configure Monaco to use local installation instead of CDN
loader.config({ monaco });

interface SkillEditorPanelProps {
  skill: Skill;
  onClose: () => void;
  onSave: (content: string, loadedLastModified?: number) => Promise<void>;
}

export default function SkillEditorPanel({ skill, onClose, onSave }: SkillEditorPanelProps): JSX.Element {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [loadedLastModified, setLoadedLastModified] = useState<number | null>(null);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);
  const [isAIAssistPanelOpen, setIsAIAssistPanelOpen] = useState<boolean>(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load skill content on mount
   */
  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await window.electronAPI.getSkill(skill.path);

        if (!isMounted) return;

        if (!response.success) {
          throw new Error(response.error?.message || 'API returned failure');
        }

        if (!response.data) {
          throw new Error('API returned success but no data');
        }

        setContent(response.data.content);
        setLoadedLastModified(new Date(skill.lastModified).getTime());
        setHasUnsavedChanges(false);
      } catch (err) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : 'Failed to load skill content';
        console.error('[SkillEditorPanel] Load error:', err);
        setError(`Failed to load skill: ${message}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [skill.path, skill.lastModified]);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  /**
   * Handle content changes
   */
  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setHasUnsavedChanges(true);
      setAutoSaveStatus('pending');

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave(value);
      }, 2000);
    }
  }, []);

  /**
   * Auto-save handler
   */
  const handleAutoSave = useCallback(async (contentToSave: string) => {
    if (!loadedLastModified) return;

    try {
      setAutoSaveStatus('saving');
      setIsSaving(true);
      setError(null);

      await onSave(contentToSave, loadedLastModified);
      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');
      setLoadedLastModified(Date.now());

      console.log('Skill auto-saved successfully');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to auto-save';

      if (err?.code === 'EXTERNAL_MODIFICATION') {
        console.warn('External modification detected during auto-save');
        setAutoSaveStatus('idle');
        return;
      }

      setError(message);
      setAutoSaveStatus('idle');
      console.error('Auto-save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, loadedLastModified]);

  /**
   * Save skill content
   */
  const handleSave = useCallback(async () => {
    if (isSaving || !hasUnsavedChanges || !loadedLastModified) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    try {
      setIsSaving(true);
      setAutoSaveStatus('saving');
      setError(null);

      await onSave(content, loadedLastModified);
      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');
      setExternalChangeDetected(false);
      setLoadedLastModified(Date.now());

      console.log('Skill saved successfully');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to save skill';

      if (err?.code === 'EXTERNAL_MODIFICATION') {
        setError('File has been modified externally. Please reload or overwrite.');
      } else {
        setError(message);
      }

      setAutoSaveStatus('idle');
      console.error('Save skill error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [content, hasUnsavedChanges, isSaving, loadedLastModified, onSave]);

  /**
   * Get cursor position from Monaco Editor
   */
  const getCursorPosition = useCallback((): number => {
    if (!editorRef.current) return 0;
    const position = editorRef.current.getPosition();
    if (!position) return 0;
    const model = editorRef.current.getModel();
    if (!model) return 0;
    return model.getOffsetAt(position);
  }, []);

  /**
   * Get selected text from Monaco Editor
   */
  const getSelectedText = useCallback((): string | undefined => {
    if (!editorRef.current) return undefined;
    const selection = editorRef.current.getSelection();
    if (!selection) return undefined;
    const model = editorRef.current.getModel();
    if (!model) return undefined;
    return model.getValueInRange(selection);
  }, []);

  /**
   * Handle applying AI-generated content to editor
   */
  const handleApplyAIContent = useCallback((generatedContent: string) => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    if (!model) return;

    // If there's a selection, replace it (replace mode)
    if (selection && !selection.isEmpty()) {
      editorRef.current.executeEdits('ai-assist', [
        {
          range: selection,
          text: generatedContent,
        },
      ]);
    } else {
      // Otherwise, insert at cursor position (insert/new mode)
      const position = editorRef.current.getPosition();
      if (position) {
        editorRef.current.executeEdits('ai-assist', [
          {
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: generatedContent,
          },
        ]);
      }
    }

    setHasUnsavedChanges(true);
  }, []);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+G: Toggle AI Assist Panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setIsAIAssistPanelOpen((prev) => !prev);
      }

      // Ctrl+S: Save skill
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave]);

  /**
   * Prevent navigation with unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /**
   * Cleanup auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Detect external changes to skill
   */
  useEffect(() => {
    if (!skill || isLoading || !loadedLastModified) return;

    const currentLastModified = new Date(skill.lastModified).getTime();

    if (currentLastModified > loadedLastModified) {
      if (!hasUnsavedChanges) {
        console.log('External change detected, auto-reloading');

        async function reloadContent() {
          try {
            const response = await window.electronAPI.getSkill(skill.path);
            if (response.success && response.data) {
              setContent(response.data.content);
              setLoadedLastModified(currentLastModified);
            }
          } catch (err) {
            console.error('Failed to reload skill:', err);
          }
        }

        reloadContent();
      } else {
        console.log('External change detected with unsaved changes');
        setExternalChangeDetected(true);
      }
    }
  }, [skill.lastModified, loadedLastModified, hasUnsavedChanges, skill.path, isLoading]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Modern Minimalist Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          {/* Top row: Title + Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{skill.name}</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      skill.source === 'project'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {skill.source === 'project' ? 'Project' : 'Global'}
                  </span>
                  {skill.description && (
                    <span className="text-xs text-gray-400 truncate max-w-xs">
                      {skill.description}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save Status */}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {autoSaveStatus === 'pending' ? 'Saving...' : autoSaveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                aria-label="Save skill"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
                    onClose();
                  }
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close editor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom row: Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>Path: <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{skill.path}</code></span>
              <span>Modified: {new Date(skill.lastModified).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">S</kbd>
                <span className="ml-1">Save</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* External Change Warning */}
        {externalChangeDetected && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-700">File modified externally. You have unsaved changes.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await window.electronAPI.getSkill(skill.path);
                      if (response.success && response.data) {
                        setContent(response.data.content);
                        setLoadedLastModified(new Date(skill.lastModified).getTime());
                        setHasUnsavedChanges(false);
                        setExternalChangeDetected(false);
                        setError(null);
                      }
                    } catch (err) {
                      console.error('Failed to reload skill:', err);
                    }
                  }}
                  className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors"
                >
                  Reload
                </button>
                <button
                  onClick={() => setExternalChangeDetected(false)}
                  className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Keep
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
              <div className="text-sm text-gray-500">Loading skill content...</div>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorDidMount}
            theme="vs-light"
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              minimap: { enabled: true },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />
        )}
      </div>

      {/* AI Assist Panel */}
      {isAIAssistPanelOpen && (
        <AIAssistPanel
          onApply={handleApplyAIContent}
          onClose={() => setIsAIAssistPanelOpen(false)}
          editorContent={content}
          cursorPosition={getCursorPosition()}
          selectedText={getSelectedText()}
        />
      )}
    </div>
  );
}
