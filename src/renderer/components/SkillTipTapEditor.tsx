/**
 * SkillTipTapEditor - Rich text Markdown editor built on TipTap (ProseMirror)
 *
 * Used for .md files as an alternative to Monaco. Features:
 * - WYSIWYG Markdown editing via tiptap-markdown
 * - Auto-save with configurable delay
 * - Keyboard shortcuts (Ctrl+S save, Ctrl+B bold, etc.)
 * - Slash command menu
 * - Bubble menu for text formatting
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';

import type { Skill, SkillEditorConfig, Configuration } from '../../shared/types';
import TiptapSlashMenu from './TiptapSlashMenu';
import TiptapBubbleMenu from './TiptapBubbleMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillTipTapEditorProps {
  skill: Skill;
  content: string;
  onSave: (content: string, loadedLastModified: number) => Promise<{ lastModified: number } | void>;
  readOnly?: boolean;
  config?: SkillEditorConfig;
  appConfig?: Configuration | null;
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

// ---------------------------------------------------------------------------
// Lowlight instance for code blocks
// ---------------------------------------------------------------------------

const lowlight = createLowlight(common);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SkillTipTapEditor({
  skill,
  content: initialContent,
  onSave,
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
  appConfig,
  onShowToast,
}: SkillTipTapEditorProps): JSX.Element {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving'>('idle');
  const [loadedLastModified, setLoadedLastModified] = useState<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(initialContent);

  // ---------------------------------------------------------------------------
  // TipTap Editor
  // ---------------------------------------------------------------------------

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: t('editor.placeholder', 'Start writing your skill...'),
      }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 hover:underline' },
      }),
      Image.configure({ inline: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Markdown,
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHasUnsavedChanges(true);
      triggerAutoSave(ed);
    },
  });

  // ---------------------------------------------------------------------------
  // Get markdown from editor storage
  // ---------------------------------------------------------------------------

  const getMarkdown = useCallback((): string => {
    if (!editor) return '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown?.getMarkdown() ?? '';
  }, [editor]);

  // ---------------------------------------------------------------------------
  // Auto-save
  // ---------------------------------------------------------------------------

  const triggerAutoSave = useCallback((ed?: typeof editor) => {
    const theEditor = ed || editor;
    if (!theEditor || !config.autoSaveEnabled) return;

    setAutoSaveStatus('pending');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await handleSave();
    }, config.autoSaveDelay || 2000);
  }, [editor, config.autoSaveEnabled, config.autoSaveDelay]);

  const handleSave = useCallback(async () => {
    if (!editor) return;

    const md = getMarkdown();
    if (md === lastSavedContentRef.current) {
      setAutoSaveStatus('idle');
      return;
    }

    setIsSaving(true);
    setAutoSaveStatus('saving');
    try {
      const result = await onSave(md, loadedLastModified);
      if (result && typeof result === 'object' && 'lastModified' in result) {
        setLoadedLastModified(result.lastModified);
      }
      lastSavedContentRef.current = md;
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save:', err);
      onShowToast?.(t('editor.saveError', 'Failed to save'), 'error');
    } finally {
      setIsSaving(false);
      setAutoSaveStatus('idle');
    }
  }, [editor, getMarkdown, onSave, loadedLastModified, onShowToast, t]);

  // Ctrl+S / Cmd+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0;
  const charCount = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1">
          <TiptapBubbleMenu editor={editor} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {hasUnsavedChanges && (
            <span className="text-amber-500">{t('editor.unsaved', 'Unsaved')}</span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="text-blue-500">{t('editor.saving', 'Saving...')}</span>
          )}
          {autoSaveStatus === 'idle' && !hasUnsavedChanges && (
            <span>{t('editor.saved', 'Saved')}</span>
          )}
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Slash menu */}
      <TiptapSlashMenu editor={editor} />

      {/* TipTap styles */}
      <style>{tiptapStyles}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TipTap editor styles (Apple Design System)
// ---------------------------------------------------------------------------

const tiptapStyles = `
/* TipTap Editor Content Styles */
.tiptap-editor-content {
  min-height: 400px;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.06rem;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

/* Headings */
.tiptap-editor-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #E5E7EB;
  color: #1d1d1f;
}
.tiptap-editor-content h2 {
  font-size: 1.31rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1d1d1f;
}
.tiptap-editor-content h3 {
  font-size: 1.13rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #1d1d1f;
}
.tiptap-editor-content h4 {
  font-size: 1.06rem;
  font-weight: 500;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  color: #374151;
}

/* Paragraphs */
.tiptap-editor-content p {
  margin-bottom: 1rem;
}

/* Lists */
.tiptap-editor-content ul {
  list-style-type: disc;
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}
.tiptap-editor-content ol {
  list-style-type: decimal;
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}
.tiptap-editor-content li {
  margin-bottom: 0.25rem;
}

/* Task lists */
.tiptap-editor-content ul[data-type="taskList"] {
  list-style: none;
  margin-left: 0;
}
.tiptap-editor-content ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.tiptap-editor-content ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

/* Code */
.tiptap-editor-content code {
  background: #f3f4f6;
  color: #db2777;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
}

/* Code blocks */
.tiptap-editor-content pre {
  background: #fafafa;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
}
.tiptap-editor-content pre code {
  background: none;
  color: inherit;
  padding: 0;
  font-size: 0.875rem;
}

/* Blockquotes */
.tiptap-editor-content blockquote {
  border-left: 4px solid #7FC7FF;
  background: #EBF5FF;
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  border-radius: 0 4px 4px 0;
}

/* Links */
.tiptap-editor-content a {
  color: #0071e3;
  text-decoration: underline;
  cursor: pointer;
}

/* Images */
.tiptap-editor-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1rem 0;
}

/* Horizontal rule */
.tiptap-editor-content hr {
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 1.5rem 0;
}

/* Bold / Italic */
.tiptap-editor-content strong {
  font-weight: 600;
}
.tiptap-editor-content em {
  font-style: italic;
}

/* Highlight */
.tiptap-editor-content mark {
  background: #fef08a;
  padding: 0.125rem 0;
  border-radius: 2px;
}

/* Placeholder */
.tiptap-editor-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9CA3AF;
  pointer-events: none;
  height: 0;
}

/* Selection */
.tiptap-editor-content ::selection {
  background: rgba(0, 113, 227, 0.15);
}
`;
