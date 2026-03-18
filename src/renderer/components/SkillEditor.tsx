/**
 * SkillEditor Component
 *
 * Monaco Editor for editing skill.md files with YAML + Markdown syntax highlighting
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import type { Skill, AIGenerationMode, SkillEditorConfig } from '../../shared/types';
import { AIAssistantPopover } from './AIAssistantPopover';
import { ipcClient } from '../services/ipcClient';
import { useAIGeneration } from '../hooks/useAIGeneration';

// Configure Monaco to use local installation instead of CDN
loader.config({ monaco });

interface SkillEditorProps {
  skill: Skill;
  onClose: () => void;
  onSave: (content: string, loadedLastModified: number) => Promise<{ lastModified: number } | void>;
  isInline?: boolean;
  content?: string;
  readOnly?: boolean;
  config?: SkillEditorConfig;
  onUploadSkill?: (skill: Skill) => void;
  onCommitChanges?: (skill: Skill) => void;
}

export default function SkillEditor({
  skill,
  onClose,
  onSave,
  isInline = false,
  content: externalContent,
  readOnly = false,
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
  onUploadSkill,
  onCommitChanges,
}: SkillEditorProps): JSX.Element {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [loadedLastModified, setLoadedLastModified] = useState<number | null>(null);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);
  const [isAIRewritePopoverOpen, setIsAIRewritePopoverOpen] = useState<boolean>(false);
  const [rewriteSelection, setRewriteSelection] = useState<{ text: string; range: monaco.Range } | null>(null);
  const [rewritePopoverPosition, setRewritePopoverPosition] = useState<{ x: number; y: number } | undefined>();
  const [isAIInsertPopoverOpen, setIsAIInsertPopoverOpen] = useState<boolean>(false);
  const [insertPosition, setInsertPosition] = useState<{ line: number; column: number } | null>(null);
  const [insertPopoverPosition, setInsertPopoverPosition] = useState<{ x: number; y: number } | undefined>();
  const [symlinkEnabled, setSymlinkEnabled] = useState<boolean>(skill.isSymlinked ?? false);
  const [symlinkConfig, setSymlinkConfig] = useState(skill.symlinkConfig);
  const [claudeDirectories, setClaudeDirectories] = useState<string[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string>(skill.symlinkConfig?.claudeDirectory || '~/.claude/skills');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI generation hook for rewrite
  const { status: aiStatus, content: aiContent, generate, reset: resetAI } = useAIGeneration();

  /**
   * Load Claude directories on mount
   */
  useEffect(() => {
    async function loadClaudeDirectories() {
      try {
        const response = await window.electronAPI.getClaudeDirectories();
        if (response.success && response.data) {
          setClaudeDirectories(response.data);
        }
      } catch (error) {
        console.error('Failed to load Claude directories:', error);
      }
    }
    loadClaudeDirectories();
  }, []);

  /**
   * Sync symlink state when skill changes
   */
  useEffect(() => {
    setSymlinkEnabled(skill.isSymlinked ?? false);
    setSymlinkConfig(skill.symlinkConfig);
    setSelectedDirectory(skill.symlinkConfig?.claudeDirectory || '~/.claude/skills');
  }, [skill.path, skill.isSymlinked, skill.symlinkConfig]);

  /**
   * Load skill content on mount
   */
  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      try {
        setIsLoading(true);
        setError(null);

        // If external content is provided, use it directly
        if (externalContent !== undefined) {
          if (isMounted) {
            setContent(externalContent);
            setLoadedLastModified(Date.now());
            setIsLoading(false);
          }
          return;
        }

        // Otherwise, load from API
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
        // Use the actual file modification time from the API response, not from the skill prop
        // This ensures we have the precise filesystem timestamp for concurrent modification detection
        setLoadedLastModified(new Date(response.data.metadata.lastModified).getTime());
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

    // Add custom context menu action for AI Rewrite
    editor.addAction({
      id: 'ai-rewrite',
      label: 'AI Rewrite',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed) => {
        const selection = ed.getSelection();
        if (!selection || selection.isEmpty()) {
          return;
        }

        const model = ed.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);

        // Get cursor position for popover placement
        const position = ed.getPosition();
        if (!position) return;

        // Convert editor position to screen coordinates
        const editorCoords = ed.getScrolledVisiblePosition(position);
        const editorDomNode = ed.getDomNode();
        if (!editorCoords || !editorDomNode) return;

        const rect = editorDomNode.getBoundingClientRect();
        const screenX = rect.left + editorCoords.left;
        const screenY = rect.top + editorCoords.top;

        // Store selection and position, then open popover
        setRewriteSelection({
          text: selectedText,
          range: selection,
        });
        setRewritePopoverPosition({ x: screenX, y: screenY });
        setIsAIRewritePopoverOpen(true);
      },
    });

    // Add custom context menu action for AI Insert
    editor.addAction({
      id: 'ai-insert',
      label: 'AI Insert',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyI],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,
      run: (ed) => {
        const selection = ed.getSelection();
        // Only show if there's NO selection (empty selection means cursor is just positioned)
        if (!selection || !selection.isEmpty()) {
          return;
        }

        // Get cursor position for popover placement
        const position = ed.getPosition();
        if (!position) return;

        // Convert editor position to screen coordinates
        const editorCoords = ed.getScrolledVisiblePosition(position);
        const editorDomNode = ed.getDomNode();
        if (!editorCoords || !editorDomNode) return;

        const rect = editorDomNode.getBoundingClientRect();
        const screenX = rect.left + editorCoords.left;
        const screenY = rect.top + editorCoords.top;

        // Store cursor position and open popover
        setInsertPosition({
          line: position.lineNumber,
          column: position.column,
        });
        setInsertPopoverPosition({ x: screenX, y: screenY });
        setIsAIInsertPopoverOpen(true);
      },
    });

    // Focus editor
    editor.focus();
  };

  /**
   * Handle content changes
   * Skip auto-save in read-only mode
   */
  const handleContentChange = useCallback((value: string | undefined) => {
    // Skip content change handling in read-only mode
    if (readOnly) return;
    if (value !== undefined) {
      setContent(value);
      setHasUnsavedChanges(true);
      setAutoSaveStatus('pending');

      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new auto-save timer (use configured delay)
      if (config.autoSaveEnabled) {
        autoSaveTimerRef.current = setTimeout(() => {
          handleAutoSave(value);
        }, config.autoSaveDelay);
      }
    }
  }, [config.autoSaveEnabled, config.autoSaveDelay, readOnly]);

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
    // Skip save in read-only mode
    if (readOnly) return;
    if (isSaving || !hasUnsavedChanges || !loadedLastModified) return;

    // Cancel auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    try {
      setIsSaving(true);
      setAutoSaveStatus('saving');
      setError(null);

      const response = await onSave(content, loadedLastModified);

      // Update loadedLastModified with the actual file modification time from the response
      // This ensures we use the precise filesystem timestamp instead of Date.now()
      if (response && response.lastModified) {
        setLoadedLastModified(new Date(response.lastModified).getTime());
      } else {
        // Fallback: use current time if response doesn't include lastModified
        setLoadedLastModified(Date.now());
      }

      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');
      setExternalChangeDetected(false);

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
  /**
   * Parse skill name from YAML frontmatter
   */
  const parseSkillNameFromFrontmatter = useCallback((content: string): string | null => {
    // Match YAML frontmatter between --- markers
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.error('No YAML frontmatter found in content');
      console.log('Content preview:', content.substring(0, 200));
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    console.log('Found frontmatter:', frontmatter);

    // Try to match name field with various formats
    // Handles: name: Value, name: "Value", name: 'Value'
    const nameMatch = frontmatter.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    if (!nameMatch) {
      console.error('No name field found in frontmatter');
      return null;
    }

    const skillName = nameMatch[1].trim();
    console.log('Parsed skill name:', skillName);
    return skillName;
  }, []);

  /**
   * Handle AI-generated content application
   */
  const handleApplyAIContent = useCallback(async (generatedContent: string, mode: AIGenerationMode) => {
    console.log('handleApplyAIContent called with mode:', mode);
    console.log('Generated content length:', generatedContent.length);
    console.log('Content preview:', generatedContent.substring(0, 300));

    // If creating a new skill, save it to the project directory
    if (mode === 'new') {
      try {
        const skillName = parseSkillNameFromFrontmatter(generatedContent);
        if (!skillName) {
          const errorMsg = 'Failed to parse skill name from generated content. Please ensure the content includes YAML frontmatter with a "name" field.';
          console.error(errorMsg);
          setError(errorMsg);
          alert(errorMsg + '\n\nGenerated content:\n' + generatedContent.substring(0, 500));
          return;
        }

        console.log('Creating skill with name:', skillName);

        // Create the skill in the application directory
        const newSkill = await ipcClient.createSkill(skillName);
        console.log('Skill created:', newSkill);

        // Update the skill with the generated content
        await ipcClient.updateSkill(newSkill.path, generatedContent);
        console.log('Skill content updated');

        // Notify parent to refresh and open the new skill
        setError(null);
        alert(`✅ Skill "${skillName}" created successfully!\n\nLocation: .claude/skills/${skillName}/skill.md`);
        onClose();
      } catch (error) {
        console.error('Failed to create skill:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to create skill';
        setError(errorMsg);
        alert('Failed to create skill: ' + errorMsg);
      }
      return;
    }

    // For other modes, insert/replace content in the editor
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
      // Otherwise, insert at cursor position (insert/modify mode)
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
  }, [parseSkillNameFromFrontmatter, onClose]);

  /**
   * Handle AI Rewrite confirmation
   */
  const handleAIRewriteConfirm = useCallback((prompt: string) => {
    if (!rewriteSelection) return;

    generate(prompt, 'replace', {
      content,
      selectedText: rewriteSelection.text,
      cursorPosition: undefined,
    });
  }, [rewriteSelection, content, generate]);

  /**
   * Handle AI Insert confirmation
   */
  const handleAIInsertConfirm = useCallback((prompt: string) => {
    if (!insertPosition) return;

    generate(prompt, 'insert', {
      content,
      selectedText: undefined,
      cursorPosition: undefined,
    });
  }, [insertPosition, content, generate]);

  /**
   * Watch for AI rewrite completion
   */
  useEffect(() => {
    if (aiStatus === 'COMPLETE' && aiContent && rewriteSelection && editorRef.current) {
      // Replace the selected text with AI-generated content
      editorRef.current.executeEdits('ai-rewrite', [
        {
          range: rewriteSelection.range,
          text: aiContent,
        },
      ]);

      setHasUnsavedChanges(true);
      setIsAIRewritePopoverOpen(false);
      setRewriteSelection(null);
      resetAI();
    } else if (aiStatus === 'ERROR') {
      // Close popover on error
      setIsAIRewritePopoverOpen(false);
      setRewriteSelection(null);
      resetAI();
    }
  }, [aiStatus, aiContent, rewriteSelection, resetAI]);

  /**
   * Watch for AI insert completion
   */
  useEffect(() => {
    if (aiStatus === 'COMPLETE' && aiContent && insertPosition && editorRef.current) {
      // Insert the AI-generated content at cursor position
      editorRef.current.executeEdits('ai-insert', [
        {
          range: new monaco.Range(
            insertPosition.line,
            insertPosition.column,
            insertPosition.line,
            insertPosition.column
          ),
          text: aiContent,
        },
      ]);

      setHasUnsavedChanges(true);
      setIsAIInsertPopoverOpen(false);
      setInsertPosition(null);
      resetAI();
    } else if (aiStatus === 'ERROR') {
      // Close popover on error
      setIsAIInsertPopoverOpen(false);
      setInsertPosition(null);
      resetAI();
    }
  }, [aiStatus, aiContent, insertPosition, resetAI]);

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
   * Skip detection in read-only mode since user cannot edit
   */
  useEffect(() => {
    // Skip external change detection in read-only mode
    if (readOnly) return;
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
  }, [skill.lastModified, loadedLastModified, hasUnsavedChanges, skill.path, isLoading, readOnly]);

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
              {/* Source badge based on sourceMetadata.type */}
              {skill.sourceMetadata?.type === 'local' && (
                <span className="badge badge-local">Local</span>
              )}
              {skill.sourceMetadata?.type === 'registry' && (
                <span className="badge badge-registry" title={`From ${skill.sourceMetadata.source}`}>
                  {skill.sourceMetadata.source}
                </span>
              )}
              {skill.sourceMetadata?.type === 'private-repo' && (
                <span className="badge badge-private" title={`From ${skill.sourceMetadata.repoPath}`}>
                  Private
                </span>
              )}
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
          {/* Read-only indicator */}
          {readOnly && (
            <span className="text-sm text-gray-500 italic">Read Only</span>
          )}

          {/* Upload to Repository button - Available for all skill types */}
          {onUploadSkill && (
            <button
              onClick={() => onUploadSkill(skill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Upload this skill to a private repository"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
          )}

          {/* Commit Changes button */}
          {onCommitChanges && skill.sourceMetadata && skill.sourceMetadata.type !== 'local' && hasUnsavedChanges && (
            <button
              onClick={() => onCommitChanges(skill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Commit your changes to the repository"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Commit Changes
            </button>
          )}
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

      {/* Symlink Control Bar */}
      {!readOnly && (
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">
              Link to Claude Code:
            </span>
            <button
              onClick={async () => {
                try {
                  const newConfig = {
                    enabled: !symlinkEnabled,
                    claudeDirectory: selectedDirectory,
                    createdAt: symlinkConfig?.createdAt || new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                  };

                  // Call API to update symlink
                  const response = await window.electronAPI.updateSymlink({
                    skillName: skill.name,
                    config: newConfig,
                  });

                  if (!response.success) {
                    throw new Error(response.error?.message || 'Failed to update symlink');
                  }

                  // Update local state
                  setSymlinkEnabled(newConfig.enabled);
                  setSymlinkConfig(newConfig);
                } catch (error) {
                  console.error('Failed to toggle symlink:', error);
                  setError(error instanceof Error ? error.message : 'Failed to update symlink configuration');
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                symlinkEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={symlinkEnabled}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full
                bg-white transition-transform shadow ${
                symlinkEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Directory selector */}
            {symlinkEnabled && (
              <select
                value={selectedDirectory}
                onChange={async (e) => {
                  const newDir = e.target.value;
                  setSelectedDirectory(newDir);

                  // Update symlink to new directory
                  try {
                    const newConfig = {
                      enabled: true,
                      claudeDirectory: newDir,
                      createdAt: symlinkConfig?.createdAt || new Date().toISOString(),
                      lastModified: new Date().toISOString(),
                    };

                    const response = await window.electronAPI.updateSymlink({
                      skillName: skill.name,
                      config: newConfig,
                    });

                    if (!response.success) {
                      throw new Error(response.error?.message || 'Failed to update symlink');
                    }

                    setSymlinkConfig(newConfig);
                  } catch (error) {
                    console.error('Failed to change symlink directory:', error);
                    setError(error instanceof Error ? error.message : 'Failed to update symlink');
                  }
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {claudeDirectories.map((dir) => {
                  // Format display name - show ~ for home directory
                  const homeDir = dir.split('.claude')[0].replace(/[\/\\]$/, '');
                  const displayPath = dir.includes('.claude/skills')
                    ? `${homeDir}.claude/skills`
                    : dir;
                  const isGlobal = dir.endsWith('.claude/skills') && !dir.includes('/.claude/skills') && !dir.includes('\\.claude\\skills');

                  return (
                    <option key={dir} value={dir}>
                      {isGlobal ? '~/.claude/skills (Global)' : displayPath}
                    </option>
                  );
                })}
              </select>
            )}

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {symlinkEnabled ? (
                <>
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Linked</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>Not linked</span>
                </>
              )}
            </div>
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
              readOnly: readOnly,
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
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Alt</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">R</kbd>
            <span>AI Rewrite</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Alt</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">I</kbd>
            <span>AI Insert</span>
          </span>
        </div>
        <div>
          Modified: {new Date(skill.lastModified).toLocaleString()}
        </div>
      </div>

      {/* AI Rewrite Popover */}
      {isAIRewritePopoverOpen && rewriteSelection && (
        <AIAssistantPopover
          isOpen={isAIRewritePopoverOpen}
          mode="rewrite"
          selectedText={rewriteSelection.text}
          onClose={() => {
            setIsAIRewritePopoverOpen(false);
            setRewriteSelection(null);
            resetAI();
          }}
          onConfirm={handleAIRewriteConfirm}
          isProcessing={aiStatus === 'STREAMING'}
          position={rewritePopoverPosition}
        />
      )}

      {/* AI Insert Popover */}
      {isAIInsertPopoverOpen && insertPosition && (
        <AIAssistantPopover
          isOpen={isAIInsertPopoverOpen}
          mode="insert"
          onClose={() => {
            setIsAIInsertPopoverOpen(false);
            setInsertPosition(null);
            resetAI();
          }}
          onConfirm={handleAIInsertConfirm}
          isProcessing={aiStatus === 'STREAMING'}
          position={insertPopoverPosition}
        />
      )}
    </div>
  );
}
