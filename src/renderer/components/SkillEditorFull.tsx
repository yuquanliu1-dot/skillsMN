/**
 * SkillEditorFull Component
 *
 * Full-screen two-column layout for skill editing:
 * - Left column: Monaco Editor (without symlink panel)
 * - Right column: AI Assistant panel (always visible)
 *
 * For new skills: Only shows template in editor, doesn't save or create directory
 * until AI assistant creates the skill.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import type { Skill, SkillEditorConfig, Configuration, SkillFileTreeNode } from '../../shared/types';
import { AISkillSidebar } from './AISkillSidebar';
import { ipcClient } from '../services/ipcClient';
import { FileTreePanel } from './FileTreePanel';

// Configure Monaco to use local installation instead of CDN
loader.config({ monaco });

// Default SKILL.md template for new skills
const DEFAULT_SKILL_TEMPLATE = `---
name: ""
description: ""
---

# Skill Name

Describe what this skill does and when it should be used.

## Usage

Explain how to use this skill.

## Examples

Provide examples of how the skill works.
`;

interface SkillEditorFullProps {
  skill: Skill | null;  // null for new skill
  isNewSkill?: boolean;
  onClose: () => void;
  onSave: (content: string, loadedLastModified: number) => Promise<{ lastModified: number } | void>;
  config?: SkillEditorConfig;
  appConfig?: Configuration | null;
  onSkillCreated?: (skillInfo?: { name: string; path: string }) => void;
  onUploadSkill?: (skill: Skill) => void;
  onCommitChanges?: (skill: Skill) => void;
  onSkillModified?: (filePath?: string) => void;
}

export default function SkillEditorFull({
  skill,
  isNewSkill = false,
  onClose,
  onSave,
  config = {
    fontSize: 14,
    theme: 'light',
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    showMinimap: false,
    lineNumbers: 'on',
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    tabSize: 2,
    wordWrap: true,
  },
  appConfig,
  onSkillCreated,
  onUploadSkill,
  onCommitChanges,
  onSkillModified,
}: SkillEditorFullProps): JSX.Element {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>(isNewSkill ? DEFAULT_SKILL_TEMPLATE : '');
  const [isLoading, setIsLoading] = useState(!isNewSkill);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [loadedLastModified, setLoadedLastModified] = useState<number>(Date.now());
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  // File tree state
  const [isFileTreeVisible, setIsFileTreeVisible] = useState<boolean>(false);
  const [selectedFileNode, setSelectedFileNode] = useState<SkillFileTreeNode | null>(null);
  const [currentEditingPath, setCurrentEditingPath] = useState<string | null>(null);
  const [binaryFileError, setBinaryFileError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('markdown');

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load skill content on mount (only for existing skills)
  useEffect(() => {
    if (isNewSkill || !skill) {
      setIsLoading(false);
      return;
    }

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
        setLoadedLastModified(new Date(response.data.metadata.lastModified).getTime());
        setHasUnsavedChanges(false);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load skill content';
        setError(t('editor.failedToLoad', { error: message }));
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
  }, [skill?.path, skill?.lastModified, isNewSkill, t]);

  /**
   * Reload skill content from disk
   */
  const reloadSkillContent = useCallback(async () => {
    if (!skill || isNewSkill) return;
    try {
      const response = await window.electronAPI.getSkill(skill.path);
      if (response.success && response.data) {
        setContent(response.data.content);
        setLoadedLastModified(new Date(response.data.metadata.lastModified).getTime());
        setHasUnsavedChanges(false);
        setExternalChangeDetected(false);
      }
    } catch (err) {
      console.error('[SkillEditorFull] Failed to reload skill:', err);
    }
  }, [skill, isNewSkill]);

  /**
   * Handle file selection from file tree
   */
  const handleFileSelect = useCallback(async (fileNode: SkillFileTreeNode) => {
    if (!skill || fileNode.type === 'directory') return;

    if (hasUnsavedChanges) {
      const shouldSwitch = window.confirm(t('editor.unsavedChangesWarning'));
      if (!shouldSwitch) return;
      await onSave(content, loadedLastModified);
    }

    setIsLoading(true);
    setBinaryFileError(null);
    setSelectedFileNode(fileNode);

    try {
      if (fileNode.isMainFile || fileNode.name === 'SKILL.md') {
        const response = await window.electronAPI.getSkill(skill.path);
        if (response.success && response.data) {
          setContent(response.data.content);
          setCurrentEditingPath(null);
          setCurrentLanguage('markdown');
          setLoadedLastModified(new Date(skill.lastModified).getTime());
        }
      } else {
        const response = await ipcClient.readSkillFile(fileNode.absolutePath);
        if (response.isBinary) {
          setBinaryFileError(t('editor.binaryFileError', { fileName: fileNode.name }));
          setIsLoading(false);
          return;
        }
        setContent(response.content);
        setCurrentEditingPath(fileNode.absolutePath);
        setCurrentLanguage(response.language || 'plaintext');
        setLoadedLastModified(Date.now());
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, [hasUnsavedChanges, content, loadedLastModified, skill, onSave, t]);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Add custom context menu action for AI Rewrite
    editor.addAction({
      id: 'ai-rewrite',
      label: '✨ AI Rewrite',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed) => {
        const selection = ed.getSelection();
        if (!selection || selection.isEmpty()) return;
        // The AI assistant on the right will handle this
      },
    });

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

      // Auto-save for existing skills only
      if (config.autoSaveEnabled && !isNewSkill) {
        autoSaveTimerRef.current = setTimeout(() => {
          handleAutoSave(value);
        }, config.autoSaveDelay);
      }
    }
  }, [config.autoSaveEnabled, config.autoSaveDelay, isNewSkill]);

  /**
   * Auto-save handler (only for existing skills)
   */
  const handleAutoSave = useCallback(async (contentToSave: string) => {
    if (isNewSkill || !loadedLastModified) return;

    try {
      setAutoSaveStatus('saving');
      setIsSaving(true);
      setError(null);

      await onSave(contentToSave, loadedLastModified);
      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');
      setLoadedLastModified(Date.now());
    } catch (err: any) {
      if (err?.code === 'EXTERNAL_MODIFICATION') {
        setAutoSaveStatus('idle');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to auto-save');
      setAutoSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, loadedLastModified, isNewSkill]);

  /**
   * Manual save handler
   */
  const handleSave = useCallback(async () => {
    if (isNewSkill) {
      // For new skills, just mark as having unsaved changes
      // The AI assistant will handle the actual creation
      return;
    }
    if (isSaving || !hasUnsavedChanges || !loadedLastModified) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    try {
      setIsSaving(true);
      setAutoSaveStatus('saving');
      setError(null);

      const response = await onSave(content, loadedLastModified);

      if (response && response.lastModified) {
        setLoadedLastModified(new Date(response.lastModified).getTime());
      } else {
        setLoadedLastModified(Date.now());
      }

      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');
      setExternalChangeDetected(false);
    } catch (err: any) {
      if (err?.code === 'EXTERNAL_MODIFICATION') {
        setError(t('editor.fileModifiedExternally'));
      } else {
        setError(t('editor.failedToSave'));
      }
      setAutoSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  }, [content, hasUnsavedChanges, isSaving, loadedLastModified, onSave, isNewSkill, t]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave, onClose]);

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
   * Detect external changes (only for existing skills)
   */
  useEffect(() => {
    if (isNewSkill || !skill || isLoading || !loadedLastModified) return;

    const currentLastModified = new Date(skill.lastModified).getTime();

    if (currentLastModified > loadedLastModified) {
      if (!hasUnsavedChanges) {
        reloadSkillContent();
      } else {
        setExternalChangeDetected(true);
      }
    }
  }, [skill?.lastModified, loadedLastModified, hasUnsavedChanges, isLoading, isNewSkill, reloadSkillContent, skill]);

  /**
   * Handle AI skill creation callback
   */
  const handleSkillCreated = useCallback((skillInfo?: { name: string; path: string }) => {
    if (skillInfo) {
      onSkillCreated?.(skillInfo);
      onClose();
    }
  }, [onSkillCreated, onClose]);

  /**
   * Handle AI skill modification callback
   */
  const handleSkillModified = useCallback((filePath?: string) => {
    if (filePath && skill && filePath.includes(skill.path)) {
      reloadSkillContent();
    }
    onSkillModified?.(filePath);
  }, [skill, reloadSkillContent, onSkillModified]);

  // Get display name
  const displayName = isNewSkill ? t('editor.newSkill', 'New Skill') : skill?.name || 'Unknown';
  const isEditing = !isNewSkill && skill;

  return (
    <div data-testid="skill-editor" className="fixed inset-0 bg-gray-100 flex flex-col z-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isNewSkill ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                  {t('editor.newSkillBadge', 'New')}
                </span>
              ) : (
                <>
                  {skill?.sourceMetadata?.type === 'local' && (
                    <span className="badge badge-local">{t('skillCard.local')}</span>
                  )}
                  {skill?.sourceMetadata?.type === 'registry' && (
                    <span className="badge badge-registry">{skill.sourceMetadata.source}</span>
                  )}
                  {skill?.sourceMetadata?.type === 'private-repo' && (
                    <span className="badge badge-private">{t('skillCard.private')}</span>
                  )}
                </>
              )}
              {hasUnsavedChanges && (
                <span className="text-yellow-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {autoSaveStatus === 'saving' ? t('editor.autoSaving') : t('editor.unsaved')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Open Claude Code in Terminal button */}
          {isEditing && (
            <button
              onClick={async () => {
                if (skill?.path) {
                  // Get the skill directory (parent of SKILL.md or the skill folder)
                  const skillDir = skill.path.replace(/[\\/]SKILL\.md$/i, '');
                  try {
                    const result = await window.electronAPI.openClaudeInTerminal(skillDir);
                    if (!result.success) {
                      setError(t('editor.failedToOpenTerminal', 'Failed to open terminal'));
                    }
                  } catch (err) {
                    setError(t('editor.failedToOpenTerminal', 'Failed to open terminal'));
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              title={t('editor.openClaudeInTerminal', 'Open Claude Code in terminal to test this skill')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('editor.testInClaude', 'Test in Claude')}
            </button>
          )}

          {/* Upload to Repository button */}
          {isEditing && onUploadSkill && skill && (
            <button
              onClick={() => onUploadSkill(skill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('editor.upload')}
            </button>
          )}

          {/* Commit Changes button */}
          {isEditing && onCommitChanges && skill?.sourceMetadata && skill.sourceMetadata.type !== 'local' && hasUnsavedChanges && (
            <button
              onClick={() => onCommitChanges(skill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('editor.commitChanges')}
            </button>
          )}

          {/* Save button */}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {t('editor.saving')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {t('editor.save')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* External change warning */}
      {externalChangeDetected && (
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-700">{t('editor.externalChangeDetected')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reloadSkillContent}
                className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition-colors cursor-pointer"
              >
                {t('editor.reload')}
              </button>
              <button
                onClick={() => setExternalChangeDetected(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
              >
                {t('editor.keepChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Editor */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
          {/* File Tree Panel - only for existing skills in application directory */}
          {isEditing && skill?.source === 'application' && (
            <FileTreePanel
              skillPath={skill.path}
              selectedFile={currentEditingPath || ''}
              onFileSelect={handleFileSelect}
              isVisible={isFileTreeVisible}
              onToggle={() => setIsFileTreeVisible(!isFileTreeVisible)}
            />
          )}

          {/* Current file indicator */}
          {currentEditingPath && !currentEditingPath.endsWith('SKILL.md') && selectedFileNode && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm text-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t('editor.editingFile')}: <strong>{selectedFileNode.name}</strong></span>
            </div>
          )}

          {/* Binary file error */}
          {binaryFileError && (
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm">{binaryFileError}</p>
                </div>
                <button onClick={() => setBinaryFileError(null)} className="text-yellow-600 hover:text-yellow-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <div className="text-gray-600">{t('editor.loadingContent')}</div>
              </div>
            </div>
          )}

          {/* Monaco Editor */}
          {!isLoading && (
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                language={currentLanguage}
                value={content}
                onChange={handleContentChange}
                onMount={handleEditorDidMount}
                theme={config.theme}
                options={{
                  fontSize: config.fontSize,
                  fontFamily: config.fontFamily,
                  fontLigatures: true,
                  lineNumbers: config.lineNumbers,
                  minimap: { enabled: config.showMinimap },
                  wordWrap: config.wordWrap ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: config.tabSize,
                  insertSpaces: true,
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  padding: { top: 16 },
                  readOnly: false,
                }}
              />
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">S</kbd>
                <span>{t('editor.save')}</span>
              </span>
              {!isNewSkill && skill && (
                <span>{t('editor.modified')}: {new Date(skill.lastModified).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - AI Assistant */}
        <div className="w-[420px] flex-shrink-0">
          <AISkillSidebar
            isOpen={true}
            onClose={() => {}} // Don't allow closing the sidebar in this view
            onSkillCreated={handleSkillCreated}
            onSkillModified={handleSkillModified}
            config={appConfig}
            currentSkillContent={content}
            currentSkillName={isNewSkill ? undefined : skill?.name}
            currentSkillPath={isNewSkill ? undefined : skill?.path}
          />
        </div>
      </div>
    </div>
  );
}
