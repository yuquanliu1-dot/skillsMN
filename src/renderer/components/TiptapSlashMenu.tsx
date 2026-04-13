/**
 * TiptapSlashMenu - Slash command menu for the TipTap editor
 *
 * Shows a floating menu when the user types "/" with commands:
 * headings, bold, italic, code, quote, list, task list, image, link, hr
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface SlashCommand {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

const COMMANDS: SlashCommand[] = [
  {
    title: 'Heading 1',
    description: 'Large heading',
    icon: 'H1',
    command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    icon: 'H2',
    command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    icon: 'H3',
    command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bold',
    description: 'Bold text',
    icon: 'B',
    command: (ed) => ed.chain().focus().toggleBold().run(),
  },
  {
    title: 'Italic',
    description: 'Italic text',
    icon: 'I',
    command: (ed) => ed.chain().focus().toggleItalic().run(),
  },
  {
    title: 'Code',
    description: 'Inline code',
    icon: '<>',
    command: (ed) => ed.chain().focus().toggleCode().run(),
  },
  {
    title: 'Code Block',
    description: 'Code block with syntax highlighting',
    icon: '{ }',
    command: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Blockquote',
    description: 'Quote block',
    icon: '❝',
    command: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    command: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    command: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Task list with checkboxes',
    icon: '☑',
    command: (ed) => ed.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: '—',
    command: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
];

interface TiptapSlashMenuProps {
  editor: Editor | null;
}

export default function TiptapSlashMenu({ editor }: TiptapSlashMenuProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands based on typed text after "/"
  const filtered = COMMANDS.filter((cmd) =>
    cmd.title.toLowerCase().includes(filter.toLowerCase())
  );

  // Track text after "/" for filtering via editor updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 20),
        from,
        '\n'
      );
      const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/);
      if (slashMatch) {
        if (!isOpen) {
          // Get cursor position for menu placement
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editor.view.dom.getBoundingClientRect();
          setPosition({
            top: coords.bottom - editorRect.top + 8,
            left: coords.left - editorRect.left,
          });
          setIsOpen(true);
          setSelectedIndex(0);
        }
        setFilter(slashMatch[1]);
      } else if (isOpen) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (view: unknown, event: KeyboardEvent) => {
      if (!isOpen) return false;

      if (event.key === 'Escape') {
        setIsOpen(false);
        return true;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (filtered[selectedIndex] && editor) {
          const { from } = editor.state.selection;
          const slashPos = from - filter.length - 1;
          editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();
          filtered[selectedIndex].command(editor);
        }
        setIsOpen(false);
        return true;
      }
      if (event.key === 'Backspace' && filter === '') {
        setIsOpen(false);
        return false;
      }
      return false;
    };

    // Use addKeyboardShortcut style - listen on the editor view
    const editorEl = editor.view.dom;

    const onKeydown = (e: KeyboardEvent) => {
      handleKeyDown(null, e);
    };

    editorEl.addEventListener('keydown', onKeydown as EventListener);
    editor.on('update', handleUpdate);

    return () => {
      editorEl.removeEventListener('keydown', onKeydown as EventListener);
      editor.off('update', handleUpdate);
    };
  }, [editor, isOpen, filter, filtered, selectedIndex]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  if (!isOpen || !editor) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-64 max-h-80 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-xs text-gray-400 font-medium border-b border-gray-100">
        Commands
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.title}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 ${
            i === selectedIndex ? 'bg-blue-50' : ''
          }`}
          onClick={() => {
            const { from } = editor.state.selection;
            const slashPos = from - filter.length - 1;
            editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();
            cmd.command(editor);
            setIsOpen(false);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="w-8 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-mono text-gray-600">
            {cmd.icon}
          </span>
          <div>
            <div className="text-gray-800 font-medium">{cmd.title}</div>
            <div className="text-xs text-gray-400">{cmd.description}</div>
          </div>
        </button>
      ))}
      {filtered.length === 0 && (
        <div className="px-3 py-4 text-sm text-gray-400 text-center">No matches</div>
      )}
    </div>
  );
}
