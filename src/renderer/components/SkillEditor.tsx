/**
 * SkillEditor Component
 *
 * Monaco Editor for editing skill.md files with YAML + Markdown syntax highlighting
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import type { Skill } from '../../shared/types';

// Configure Monaco to use local installation instead of CDN
loader.config({ monaco });

interface SkillEditorProps {
  skill: Skill;
  onClose: () => void;
  onSave: (content: string, loadedLastModified: number) => Promise<void>;
  isInline?: boolean;
}

export default function SkillEditor({ skill, onClose, onSave, isInline = false }: SkillEditorProps): JSX.Element {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [loadedLastModified, setLoadedLastModified] = useState<number | null>(null);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);
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

        console.log('[SkillEditor] Starting to load skill:', skill.path);
        console.log('[SkillEditor] Skill object:', skill);

        // Check if electronAPI is available
        if (!window.electronAPI || !window.electronAPI.getSkill) {
          throw new Error('Electron API not available. This should not happen in production.');
        }

        console.log('[SkillEditor] Calling getSkill API...');
        const response = await window.electronAPI.getSkill(skill.path);
        console.log('[SkillEditor] API Response:', response);
        console.log('[SkillEditor] Response success?', response.success);
        console.log('[SkillEditor] Response data?', response.data);
        console.log('[SkillEditor] Response data type?', typeof response.data);
        if (response.data) {
          console.log('[SkillEditor] Response data keys:', Object.keys(response.data));
          console.log('[SkillEditor] Has content?', 'content' in response.data);
          console.log('[SkillEditor] Has metadata?', 'metadata' in response.data);
        }

        if (!isMounted) {
          console.log('[SkillEditor] Component unmounted, aborting');
          return;
        }

        if (!response.success) {
          throw new Error(response.error?.message || 'API returned failure');
        }

        if (!response.data) {
          throw new Error('API returned success but no data');
        }

        console.log('[SkillEditor] Content loaded successfully, length:', response.data.content.length);
        setContent(response.data.content);
        setLoadedLastModified(new Date(skill.lastModified).getTime());
        setHasUnsavedChanges(false);
      } catch (err) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : 'Failed to load skill content';
        console.error('[SkillEditor] Load error:', err);
        setError(`Failed to load skill: ${message}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('[SkillEditor] Loading complete, isLoading set to false');
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

    // Focus editor
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

      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new auto-save timer (2 seconds debounce)
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

      // Update loadedLastModified after successful save
      setLoadedLastModified(Date.now());

      console.log('Skill auto-saved successfully');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to auto-save';

      // Check for external modification error
      if (err?.code === 'EXTERNAL_MODIFICATION') {
        // Don't show error for auto-save, let user handle it manually
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

    // Cancel auto-save timer
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

      // Update loadedLastModified after successful save
      setLoadedLastModified(Date.now());

      console.log('Skill saved successfully');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to save skill';

      // Check for external modification error
      if (err?.code === 'EXTERNAL_MODIFICATION') {
        setError('File has been modified externally. Please reload or overwrite.');
        // TODO: Show external change dialog (T083)
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
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Ctrl+W to close
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
          onClose();
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave, onClose]);

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
   * Detect external changes to skill (T082)
   */
  useEffect(() => {
    if (!skill || isLoading || !loadedLastModified) return;

    const currentLastModified = new Date(skill.lastModified).getTime();

    // Check if file has been modified externally
    if (currentLastModified > loadedLastModified) {
      if (!hasUnsavedChanges) {
        // Auto-reload if no unsaved changes
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
        // Show warning if there are unsaved changes
        console.log('External change detected with unsaved changes');
        setExternalChangeDetected(true);
      }
    }
  }, [skill.lastModified, loadedLastModified, hasUnsavedChanges, skill.path, isLoading]);

  const containerClasses = isInline
    ? "h-full flex flex-col bg-white"
    : "fixed inset-0 bg-gray-50 flex flex-col z-50";

  const headerBg = isInline ? "bg-white border-gray-200" : "bg-white border-gray-200";
  const borderColor = isInline ? "border-gray-200" : "border-gray-200";
  const footerBg = isInline ? "bg-gray-50 border-gray-200" : "bg-gray-50 border-gray-200";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={`border-b ${borderColor} px-4 py-3 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`badge ${skill.source === 'project' ? 'badge-project' : 'badge-global'}`}
              >
                {skill.source === 'project' ? 'Project' : 'Global'}
              </span>
              {hasUnsavedChanges && (
                <span className="text-yellow-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {autoSaveStatus === 'pending' ? 'Auto-saving in 2s...' : autoSaveStatus === 'saving' ? 'Auto-saving...' : 'Unsaved'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="btn btn-primary flex items-center gap-2"
            aria-label="Save skill"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save
              </>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={() => {
              if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
                onClose();
              }
            }}
            className="btn btn-secondary flex items-center gap-2"
            aria-label="Close editor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* External change warning (T082) */}
      {externalChangeDetected && (
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-yellow-700">
                This file has been modified externally. You have unsaved changes.
              </p>
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
                className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition-colors cursor-pointer"
              >
                Reload
              </button>
              <button
                onClick={() => setExternalChangeDetected(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
              >
                Keep Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <div className="text-gray-600">Loading skill content...</div>
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      {!isLoading && (
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorDidMount}
            theme="light"
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 16 },
            }}
          />
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className={`border-t ${borderColor} px-4 py-2 ${footerBg} flex items-center justify-between text-xs text-gray-500`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">S</kbd>
            <span>Save</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">W</kbd>
            <span>Close</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Esc</kbd>
            <span>Close</span>
          </span>
        </div>
        <div>
          Modified: {new Date(skill.lastModified).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
