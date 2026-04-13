/**
 * TiptapBubbleMenu - Text formatting toolbar for TipTap editor
 *
 * Always-visible toolbar with formatting buttons:
 * Bold, Italic, Strikethrough, Code, Link, Highlight, Heading
 */

import React from 'react';
import type { Editor } from '@tiptap/react';

interface TiptapBubbleMenuProps {
  editor: Editor | null;
}

export default function TiptapBubbleMenu({ editor }: TiptapBubbleMenuProps): JSX.Element {
  if (!editor) return <></>;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded hover:bg-gray-200 transition-colors ${
      active ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
    }`;

  return (
    <div className="flex items-center gap-0.5">
      {/* Bold */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 5H6v10h5a3.5 3.5 0 001.85-6.5A3.5 3.5 0 0011 5zm-.5 8H8V11h2.5a1 1 0 110 2zm0-4H8V7h2.5a1 1 0 110 2z"/>
        </svg>
      </button>

      {/* Italic */}
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 4h4v2h-1.6l-2.8 8H12v2H8v-2h1.6l2.8-8H11V4z"/>
        </svg>
      </button>

      {/* Strikethrough */}
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 9h12v2H4V9zm4-3a2 2 0 114 0 2 2 0 01-4 0zm0 8a2 2 0 114 0 2 2 0 01-4 0z"/>
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Code */}
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnClass(editor.isActive('code'))}
        title="Inline code"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.707 4.293a1 1 0 00-1.414 1.414L9.586 10l-4.293 4.293a1 1 0 101.414 1.414l5-5a1 1 0 000-1.414l-5-5zm7 0a1 1 0 00-1.414 1.414L16.586 10l-4.293 4.293a1 1 0 101.414 1.414l5-5a1 1 0 000-1.414l-5-5z"/>
        </svg>
      </button>

      {/* Highlight */}
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={btnClass(editor.isActive('highlight'))}
        title="Highlight"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.707 3.293a1 1 0 010 1.414L9.414 9l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"/>
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Heading toggles */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`text-xs font-bold px-2 py-1 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
        }`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`text-xs font-bold px-2 py-1 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`text-xs font-bold px-2 py-1 rounded hover:bg-gray-200 ${
          editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
        }`}
        title="Heading 3"
      >
        H3
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Bullet list */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Bullet list"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="5" r="1.5"/>
          <circle cx="4" cy="10" r="1.5"/>
          <circle cx="4" cy="15" r="1.5"/>
          <rect x="8" y="4" width="10" height="2" rx="1"/>
          <rect x="8" y="9" width="10" height="2" rx="1"/>
          <rect x="8" y="14" width="10" height="2" rx="1"/>
        </svg>
      </button>

      {/* Ordered list */}
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        title="Numbered list"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <text x="2" y="7" fontSize="5">1.</text>
          <text x="2" y="12" fontSize="5">2.</text>
          <text x="2" y="17" fontSize="5">3.</text>
          <rect x="8" y="4" width="10" height="2" rx="1"/>
          <rect x="8" y="9" width="10" height="2" rx="1"/>
          <rect x="8" y="14" width="10" height="2" rx="1"/>
        </svg>
      </button>

      {/* Task list */}
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={btnClass(editor.isActive('taskList'))}
        title="Task list"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
          <rect x="2" y="3" width="5" height="5" rx="1" strokeWidth="1.5"/>
          <path d="M3.5 5.5l1 1 2-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="2" y="11" width="5" height="5" rx="1" strokeWidth="1.5"/>
          <rect x="9" y="4" width="9" height="3" rx="0.5" fill="currentColor" stroke="none"/>
          <rect x="9" y="12" width="9" height="3" rx="0.5" fill="currentColor" stroke="none"/>
        </svg>
      </button>

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        title="Blockquote"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4v6h4c0 2-1 4-3 5l1 1c3-1.5 4-4 4-7V4H4zm8 0v6h4c0 2-1 4-3 5l1 1c3-1.5 4-4 4-7V4h-6z"/>
        </svg>
      </button>

      {/* Code block */}
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
        title="Code block"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3.293 2.293a1 1 0 011.414 0L11 9.586l-3.293 3.293a1 1 0 01-1.414-1.414L8.172 9.586 6.293 7.707a1 1 0 010-1.414zm5.414 5.414a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414-1.414l2-2z"/>
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Link */}
      <button
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={btnClass(editor.isActive('link'))}
        title="Insert link"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
        </svg>
      </button>

      {/* Image */}
      <button
        onClick={() => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        className={btnClass(false)}
        title="Insert image"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
        </svg>
      </button>
    </div>
  );
}
