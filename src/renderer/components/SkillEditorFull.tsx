/**
 * SkillEditorFull Component
 *
 * Full-screen three-column layout for skill editing:
 * - First column: File Tree Panel (directory structure)
 * - Second column: Monaco Editor with tabs (support multiple files)
 * - Third column: AI Assistant panel (collapsible)
 *
 * For new skills: Only shows template in editor, doesn't save or create directory
 * until AI assistant creates the skill.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import type { Skill, SkillEditorConfig, Configuration, SkillFileTreeNode, VersionComparison } from '../../shared/types';
import { AISkillSidebar } from './AISkillSidebar';
import { AIAssistantPopover } from './AIAssistantPopover';
import { ipcClient } from '../services/ipcClient';
import { FileTreePanel } from './FileTreePanel';
import { useAIGeneration } from '../hooks/useAIGeneration';

// Configure Monaco to use local installation instead of CDN
loader.config({ monaco });

/**
 * Editor Tab interface for multi-file editing
 */
interface EditorTab {
  id: string;
  path: string | null;      // File path (null for main SKILL.md)
  name: string;              // Display name
  content: string;           // File content
  language: string;          // Monaco language
  isModified: boolean;       // Has unsaved changes
  isMainFile: boolean;       // Is SKILL.md
  loadedLastModified: number;
  fileNode?: SkillFileTreeNode;
}

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get file icon based on extension
 */
const getFileIcon = (extension?: string, isMainFile?: boolean): JSX.Element => {
  if (isMainFile) {
    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }

  switch (extension?.toLowerCase()) {
    case '.md':
    case '.mdx':
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case '.json':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      return (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case '.css':
    case '.scss':
      return (
        <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case '.py':
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
};

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
  /** Version comparison status for conflict detection */
  versionStatus?: VersionComparison;
  /** Trigger to reset uncommitted changes state - increment to reset */
  uncommittedResetTrigger?: number;
  /** Whether this skill has uncommitted changes (managed by parent) */
  hasUncommittedChanges?: boolean;
  /** Callback to set uncommitted changes state */
  onSetHasUncommittedChanges?: (value: boolean) => void;
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
  versionStatus,
  uncommittedResetTrigger,
  hasUncommittedChanges: externalHasUncommittedChanges,
  onSetHasUncommittedChanges,
}: SkillEditorFullProps): JSX.Element {
  const { t } = useTranslation();

  // Tab state for multi-file editing
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Legacy state - will be derived from active tab
  const [isLoading, setIsLoading] = useState(!isNewSkill);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);
  const [showExternalModificationDialog, setShowExternalModificationDialog] = useState(false);
  const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(null);

  // Track uncommitted changes for private repo skills (persists after auto-save)
  // Use external state if provided (from parent), otherwise use internal state
  const [internalHasUncommittedChanges, setInternalHasUncommittedChanges] = useState(false);
  const hasUncommittedChanges = externalHasUncommittedChanges ?? internalHasUncommittedChanges;
  const setHasUncommittedChanges = (value: boolean) => {
    setInternalHasUncommittedChanges(value);
    onSetHasUncommittedChanges?.(value);
  };

  // Reset uncommitted changes when parent signals successful commit
  useEffect(() => {
    if (uncommittedResetTrigger && uncommittedResetTrigger > 0) {
      setInternalHasUncommittedChanges(false);
      onSetHasUncommittedChanges?.(false);
    }
  }, [uncommittedResetTrigger, onSetHasUncommittedChanges]);

  // File tree state
  const [isFileTreeVisible, setIsFileTreeVisible] = useState<boolean>(true); // Default visible
  const [fileTreeRefreshKey, setFileTreeRefreshKey] = useState<number>(0);
  const [selectedFileNode, setSelectedFileNode] = useState<SkillFileTreeNode | null>(null);
  const [binaryFileError, setBinaryFileError] = useState<string | null>(null);

  // AI Assistant visibility state
  const [isAIPanelVisible, setIsAIPanelVisible] = useState<boolean>(true);

  // AI Rewrite/Insert popover state
  const [isAIRewritePopoverOpen, setIsAIRewritePopoverOpen] = useState<boolean>(false);
  const [rewriteSelection, setRewriteSelection] = useState<{ text: string; range: monaco.Range } | null>(null);
  const [rewritePopoverPosition, setRewritePopoverPosition] = useState<{ x: number; y: number } | undefined>();
  const [isAIInsertPopoverOpen, setIsAIInsertPopoverOpen] = useState<boolean>(false);
  const [insertPosition, setInsertPosition] = useState<{ line: number; column: number } | null>(null);
  const [insertPopoverPosition, setInsertPopoverPosition] = useState<{ x: number; y: number } | undefined>();

  // AI generation hook for rewrite/insert
  const { status: aiStatus, content: aiContent, generate, reset: resetAI } = useAIGeneration();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId);
  const hasUnsavedChanges = activeTab?.isModified || false;

  // Load skill content on mount and create initial tab (only for existing skills)
  useEffect(() => {
    if (isNewSkill || !skill) {
      // For new skills, create a tab with the default template
      if (isNewSkill) {
        const newTab: EditorTab = {
          id: generateTabId(),
          path: null,
          name: 'SKILL.md',
          content: DEFAULT_SKILL_TEMPLATE,
          language: 'markdown',
          isModified: false,
          isMainFile: true,
          loadedLastModified: Date.now(),
        };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      }
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

        // Create initial tab for main SKILL.md
        const mainTab: EditorTab = {
          id: generateTabId(),
          path: null, // null indicates main file
          name: 'SKILL.md',
          content: response.data.content,
          language: 'markdown',
          isModified: false,
          isMainFile: true,
          loadedLastModified: new Date(response.data.metadata.lastModified).getTime(),
        };
        setTabs([mainTab]);
        setActiveTabId(mainTab.id);
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
   * Reload skill content from disk (refresh active tab)
   */
  const reloadSkillContent = useCallback(async () => {
    if (!skill || isNewSkill || !activeTab) return;

    try {
      if (activeTab.isMainFile) {
        const response = await window.electronAPI.getSkill(skill.path);
        if (response.success && response.data) {
          setTabs(prev => prev.map(tab =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  content: response.data.content,
                  isModified: false,
                  loadedLastModified: new Date(response.data.metadata.lastModified).getTime(),
                }
              : tab
          ));
          setExternalChangeDetected(false);
        }
      } else if (activeTab.path) {
        const response = await ipcClient.readSkillFile(activeTab.path);
        if (!response.isBinary) {
          setTabs(prev => prev.map(tab =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  content: response.content,
                  language: response.language || 'plaintext',
                  isModified: false,
                  loadedLastModified: Date.now(),
                }
              : tab
          ));
        }
      }
    } catch (err) {
      console.error('[SkillEditorFull] Failed to reload skill:', err);
    }
  }, [skill, isNewSkill, activeTab, activeTabId]);

  /**
   * Open or switch to a tab for a file
   */
  const openFileInTab = useCallback(async (fileNode: SkillFileTreeNode) => {
    if (!skill || fileNode.type === 'directory') return;

    // Check if tab already exists for this file
    const existingTab = tabs.find(t =>
      t.isMainFile ? (fileNode.isMainFile || fileNode.name === 'SKILL.md')
        : t.path === fileNode.absolutePath
    );

    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(existingTab.id);
      setSelectedFileNode(fileNode);
      return;
    }

    // Need to save current tab if modified
    if (activeTab?.isModified) {
      const shouldSwitch = window.confirm(t('editor.unsavedChangesWarning'));
      if (!shouldSwitch) return;
      // Save current tab
      await handleSave();
    }

    setIsLoading(true);
    setBinaryFileError(null);
    setSelectedFileNode(fileNode);

    try {
      if (fileNode.isMainFile || fileNode.name === 'SKILL.md') {
        const response = await window.electronAPI.getSkill(skill.path);
        if (response.success && response.data) {
          const newTab: EditorTab = {
            id: generateTabId(),
            path: null,
            name: 'SKILL.md',
            content: response.data.content,
            language: 'markdown',
            isModified: false,
            isMainFile: true,
            loadedLastModified: new Date(skill.lastModified).getTime(),
            fileNode,
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTabId(newTab.id);
        }
      } else {
        const response = await ipcClient.readSkillFile(fileNode.absolutePath);
        if (response.isBinary) {
          setBinaryFileError(t('editor.binaryFileError', { fileName: fileNode.name }));
          setIsLoading(false);
          return;
        }
        const newTab: EditorTab = {
          id: generateTabId(),
          path: fileNode.absolutePath,
          name: fileNode.name,
          content: response.content,
          language: response.language || 'plaintext',
          isModified: false,
          isMainFile: false,
          loadedLastModified: Date.now(),
          fileNode,
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, [skill, tabs, activeTab, activeTabId, t]);

  /**
   * Handle file selection from file tree
   */
  const handleFileSelect = useCallback((fileNode: SkillFileTreeNode) => {
    openFileInTab(fileNode);
  }, [openFileInTab]);

  /**
   * Close a tab
   */
  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    // Check if tab has unsaved changes
    if (tabToClose.isModified) {
      const shouldClose = window.confirm(t('editor.unsavedChangesWarning'));
      if (!shouldClose) return;
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);

      // If closing active tab, switch to another
      if (tabId === activeTabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }

      return newTabs;
    });
  }, [tabs, activeTabId, t]);

  /**
   * Switch to a tab
   */
  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.fileNode) {
      setSelectedFileNode(tab.fileNode);
    }
  }, [tabs]);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // AI Rewrite and AI Insert features are temporarily disabled
    // TODO: Re-enable when design is finalized

    editor.focus();
  };

  /**
   * Handle content changes - update active tab
   */
  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeTabId) {
      setTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, content: value, isModified: true }
          : tab
      ));
      setAutoSaveStatus('pending');

      // Track uncommitted changes for private repo skills
      if (skill?.sourceMetadata?.type === 'private-repo') {
        setHasUncommittedChanges(true);
      }

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Auto-save for existing skills only
      if (config.autoSaveEnabled && !isNewSkill && activeTab?.isMainFile) {
        autoSaveTimerRef.current = setTimeout(() => {
          handleAutoSave(value);
        }, config.autoSaveDelay);
      }
    }
  }, [config.autoSaveEnabled, config.autoSaveDelay, isNewSkill, activeTabId, activeTab, skill?.sourceMetadata?.type]);

  /**
   * Auto-save handler (only for existing skills, main file only)
   */
  const handleAutoSave = useCallback(async (contentToSave: string) => {
    if (isNewSkill || !activeTab || !activeTab.isMainFile) return;

    try {
      setAutoSaveStatus('saving');
      setIsSaving(true);
      setError(null);

      await onSave(contentToSave, activeTab.loadedLastModified);

      setTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, isModified: false, loadedLastModified: Date.now() }
          : tab
      ));
      setAutoSaveStatus('idle');
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
  }, [onSave, isNewSkill, activeTab, activeTabId]);

  /**
   * Manual save handler - saves active tab
   */
  const handleSave = useCallback(async (forceOverwrite: boolean = false) => {
    if (isNewSkill) {
      // For new skills, just mark as having unsaved changes
      // The AI assistant will handle the actual creation
      return;
    }
    if (isSaving || !activeTab?.isModified) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    try {
      setIsSaving(true);
      setAutoSaveStatus('saving');
      setError(null);

      if (activeTab.isMainFile) {
        // Save main SKILL.md
        // If forceOverwrite is true, pass 0 as lastModified to skip external modification check
        const response = await onSave(
          activeTab.content,
          forceOverwrite ? 0 : activeTab.loadedLastModified
        );

        const newLastModified = response && response.lastModified
          ? new Date(response.lastModified).getTime()
          : Date.now();

        setTabs(prev => prev.map(tab =>
          tab.id === activeTabId
            ? { ...tab, isModified: false, loadedLastModified: newLastModified }
            : tab
        ));
        setExternalChangeDetected(false);
      } else if (activeTab.path) {
        // Save other files via IPC
        await ipcClient.writeSkillFile(activeTab.path, activeTab.content);
        setTabs(prev => prev.map(tab =>
          tab.id === activeTabId
            ? { ...tab, isModified: false, loadedLastModified: Date.now() }
            : tab
        ));
      }

      setAutoSaveStatus('idle');
      setShowExternalModificationDialog(false);
      setPendingSaveContent(null);
    } catch (err: any) {
      if (err?.code === 'EXTERNAL_MODIFICATION') {
        // Show dialog instead of just error message
        setPendingSaveContent(activeTab.content);
        setShowExternalModificationDialog(true);
        setAutoSaveStatus('idle');
      } else {
        setError(t('editor.failedToSave'));
        setAutoSaveStatus('idle');
      }
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, activeTabId, isSaving, isNewSkill, onSave, t]);

  /**
   * Handle reload from disk (user chose to reload)
   */
  const handleReloadFromDisk = useCallback(async () => {
    setShowExternalModificationDialog(false);
    setPendingSaveContent(null);
    await reloadSkillContent();
  }, [reloadSkillContent]);

  /**
   * Handle force overwrite (user chose to overwrite)
   */
  const handleForceOverwrite = useCallback(() => {
    handleSave(true);
  }, [handleSave]);

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
        if (activeTabId && tabs.length > 1) {
          closeTab(activeTabId);
        } else if (!hasUnsavedChanges || confirm('You have unsaved changes. Close anyway?')) {
          onClose();
        }
      }
      // Tab navigation: Ctrl+Tab to switch to next tab
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave, onClose, activeTabId, tabs, closeTab]);

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
   * Detect external changes (only for existing skills, main file)
   */
  useEffect(() => {
    if (isNewSkill || !skill || isLoading || !activeTab?.isMainFile) return;

    const currentLastModified = new Date(skill.lastModified).getTime();

    if (currentLastModified > activeTab.loadedLastModified) {
      if (!activeTab.isModified) {
        reloadSkillContent();
      } else {
        setExternalChangeDetected(true);
      }
    }
  }, [skill?.lastModified, activeTab, isLoading, isNewSkill, reloadSkillContent, skill]);

  /**
   * Handle AI skill creation callback
   * The parent component will handle switching to edit mode
   */
  const handleSkillCreated = useCallback((skillInfo?: { name: string; path: string }) => {
    if (skillInfo) {
      // Refresh file tree to show new files
      setFileTreeRefreshKey(prev => prev + 1);
      onSkillCreated?.(skillInfo);
      // Don't close - parent will switch to edit mode which shows file tree
    }
  }, [onSkillCreated]);

  /**
   * Handle AI skill modification callback
   */
  const handleSkillModified = useCallback((filePath?: string) => {
    if (filePath && skill && filePath.includes(skill.path)) {
      // Reload the affected tab if it's currently open
      const affectedTab = tabs.find(t =>
        t.isMainFile ? filePath.endsWith('SKILL.md') : t.path === filePath
      );
      if (affectedTab) {
        reloadSkillContent();
      }
    }
    // Refresh the file tree to show any new/modified files
    setFileTreeRefreshKey(prev => prev + 1);
    onSkillModified?.(filePath);
  }, [skill, tabs, reloadSkillContent, onSkillModified]);

  /**
   * Handle AI Rewrite confirmation
   */
  const handleAIRewriteConfirm = useCallback((prompt: string) => {
    if (!rewriteSelection || !activeTab) return;

    generate(prompt, 'replace', {
      content: activeTab.content,
      selectedText: rewriteSelection.text,
      cursorPosition: undefined,
    });
  }, [rewriteSelection, activeTab, generate]);

  /**
   * Handle AI Insert confirmation
   */
  const handleAIInsertConfirm = useCallback((prompt: string) => {
    if (!insertPosition || !activeTab) return;

    generate(prompt, 'insert', {
      content: activeTab.content,
      selectedText: undefined,
      cursorPosition: undefined,
    });
  }, [insertPosition, activeTab, generate]);

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

      // Mark tab as modified
      setTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, isModified: true }
          : tab
      ));
      setIsAIRewritePopoverOpen(false);
      setRewriteSelection(null);
      resetAI();
    } else if (aiStatus === 'ERROR') {
      // Close popover on error
      setIsAIRewritePopoverOpen(false);
      setRewriteSelection(null);
      resetAI();
    }
  }, [aiStatus, aiContent, rewriteSelection, activeTabId, resetAI]);

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

      // Mark tab as modified
      setTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, isModified: true }
          : tab
      ));
      setIsAIInsertPopoverOpen(false);
      setInsertPosition(null);
      resetAI();
    } else if (aiStatus === 'ERROR') {
      // Close popover on error
      setIsAIInsertPopoverOpen(false);
      setInsertPosition(null);
      resetAI();
    }
  }, [aiStatus, aiContent, insertPosition, activeTabId, resetAI]);

  // Get display name
  const displayName = isNewSkill ? t('editor.newSkill', 'New Skill') : skill?.name || 'Unknown';
  const isEditing = !isNewSkill && skill;

  return (
    <div data-testid="skill-editor" className="fixed inset-0 bg-gray-100 flex flex-col z-50">
      {/* Header - Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left: Icon and Title */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">{displayName}</h2>
              {isNewSkill ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                  {t('editor.newSkillBadge', 'New')}
                </span>
              ) : (
                <>
                  {skill?.sourceMetadata?.type === 'local' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{t('skillCard.local')}</span>
                  )}
                  {skill?.sourceMetadata?.type === 'registry' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600">{skill.sourceMetadata.source}</span>
                  )}
                  {skill?.sourceMetadata?.type === 'private-repo' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-600">{t('skillCard.private')}</span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {hasUnsavedChanges && (
                <span className="text-yellow-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  {autoSaveStatus === 'saving' ? t('editor.autoSaving') : t('editor.unsaved')}
                </span>
              )}
              {!isNewSkill && skill && activeTab?.isMainFile && (
                <span>{t('editor.modified')}: {new Date(skill.lastModified).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Toggle AI Assistant button */}
          <button
            onClick={() => setIsAIPanelVisible(!isAIPanelVisible)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isAIPanelVisible
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isAIPanelVisible ? t('editor.hideAI', 'Hide AI Assistant') : t('editor.showAI', 'Show AI Assistant')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isAIPanelVisible ? t('editor.hideAI', 'AI') : t('editor.showAI', 'AI')}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Open Claude Code in Terminal button - use app root directory */}
          {isEditing && (
            <button
              onClick={async () => {
                try {
                  // Use the app root directory (go up 2 levels from applicationSkillsDirectory)
                  // applicationSkillsDirectory: D:\skillsMN\.claude\skills
                  // appRootDir: D:\skillsMN
                  const skillsDir = appConfig?.applicationSkillsDirectory || '';
                  // Go up 2 levels to get the app root
                  const appRootDir = skillsDir
                    .replace(/[\\\/][^\\\/]+[\\\/]?$/, '')  // First level up
                    .replace(/[\\\/][^\\\/]+[\\\/]?$/, ''); // Second level up
                  const result = await window.electronAPI.openClaudeInTerminal(appRootDir);
                  if (!result.success) {
                    setError(t('editor.failedToOpenTerminal', 'Failed to open terminal'));
                  }
                } catch (err) {
                  setError(t('editor.failedToOpenTerminal', 'Failed to open terminal'));
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              title={t('editor.openClaudeInTerminal', 'Open Claude Code in terminal to test this skill')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('editor.testInClaude', 'Test')}
            </button>
          )}

          {/* Upload to Repository button - for local skills and registry skills (cannot commit to public registry) */}
          {isEditing && onUploadSkill && skill && (!skill.sourceMetadata || skill.sourceMetadata.type === 'local' || skill.sourceMetadata.type === 'registry') && (
            <button
              onClick={() => onUploadSkill(skill)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('editor.upload')}
            </button>
          )}

          {/* Commit Changes button - only for private repo skills */}
          {isEditing && onCommitChanges && skill?.sourceMetadata && skill.sourceMetadata.type === 'private-repo' && hasUncommittedChanges && (
            <button
              onClick={() => {
                onCommitChanges(skill);
                // Note: hasUncommittedChanges will be reset by parent after successful commit
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                versionStatus?.hasUpdate
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={versionStatus?.hasUpdate ? t('editor.commitConflictWarning') : undefined}
            >
              {versionStatus?.hasUpdate ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {versionStatus?.hasUpdate ? t('editor.commitChangesConflict') : t('editor.commitChanges')}
            </button>
          )}

          {/* Save button */}
          {isEditing && (
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || !hasUnsavedChanges}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  {t('editor.saving')}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {t('editor.save')}
                </>
              )}
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Close button - moved to right */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-600">{error}</p>
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

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* First Column - File Tree Panel */}
        {isEditing && (
          <FileTreePanel
            skillPath={skill.path}
            selectedFile={activeTab?.path || ''}
            onFileSelect={handleFileSelect}
            isVisible={isFileTreeVisible}
            onToggle={() => setIsFileTreeVisible(!isFileTreeVisible)}
            refreshKey={fileTreeRefreshKey}
          />
        )}

        {/* Second Column - Editor with Tabs */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-w-0">
          {/* Tab Bar */}
          {tabs.length > 0 && (
            <div className="flex items-center bg-gray-50 border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-gray-200 min-w-0 max-w-[180px] group ${
                    tab.id === activeTabId
                      ? 'bg-white border-b-2 border-b-blue-500 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {/* File icon */}
                  {getFileIcon(tab.name.includes('.') ? `.${tab.name.split('.').pop()}` : undefined, tab.isMainFile)}

                  {/* Tab name */}
                  <span className="text-sm truncate flex-1">{tab.name}</span>

                  {/* Modified indicator */}
                  {tab.isModified && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title={t('editor.unsaved')} />
                  )}

                  {/* Close button - only show if more than one tab */}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="p-0.5 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title={t('common.close')}
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
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
          {!isLoading && activeTab && (
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                language={activeTab.language}
                value={activeTab.content}
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

          {/* Empty state when no tabs */}
          {!isLoading && tabs.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>{t('editor.noFileOpen', 'No file open')}</p>
                <p className="text-sm mt-1">{t('editor.selectFileFromTree', 'Select a file from the tree')}</p>
              </div>
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
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Tab</kbd>
                <span>{t('editor.switchTab', 'Switch tab')}</span>
              </span>
              {!isNewSkill && skill && activeTab?.isMainFile && (
                <span>{t('editor.modified')}: {new Date(skill.lastModified).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Third Column - AI Assistant (collapsible) */}
        {isAIPanelVisible && (
          <div className="w-[420px] flex-shrink-0 border-l border-gray-200">
            <AISkillSidebar
              isOpen={true}
              onClose={() => setIsAIPanelVisible(false)}
              onSkillCreated={handleSkillCreated}
              onSkillModified={handleSkillModified}
              config={appConfig}
              currentSkillContent={activeTab?.content || ''}
              currentSkillName={isNewSkill ? undefined : skill?.name}
              currentSkillPath={isNewSkill ? undefined : skill?.path}
            />
          </div>
        )}
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

      {/* External Modification Dialog */}
      {showExternalModificationDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('editor.externalModificationTitle')}
              </h3>
            </div>

            {/* Message */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('editor.externalModificationMessage')}
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExternalModificationDialog(false);
                  setPendingSaveContent(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReloadFromDisk}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {t('editor.reload')}
              </button>
              <button
                onClick={handleForceOverwrite}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {t('editor.overwrite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
