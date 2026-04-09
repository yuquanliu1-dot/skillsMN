/**
 * LocalSkillPreviewDrawer Component
 *
 * Right-side drawer for previewing local skill content with:
 * - Enhanced Markdown rendering with syntax highlighting
 * - Symlink management panel
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import type { Skill } from '../../shared/types';
import SymlinkPanel from './SymlinkPanel';

interface LocalSkillPreviewDrawerProps {
  isOpen: boolean;
  skill: Skill | null;
  onClose: () => void;
  onEdit?: (skill: Skill) => void;
}

// Copy button component for code blocks
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// Custom code block component with syntax highlighting
function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const codeString = String(children).replace(/\n$/, '');
  const isCodeBlock = match || codeString.includes('\n');

  if (!isCodeBlock) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-gray-100 text-pink-600 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">{language}</span>
        <CopyButton code={codeString} />
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          backgroundColor: '#fafafa',
        }}
        showLineNumbers={codeString.split('\n').length > 3}
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#9ca3af',
          fontSize: '0.75rem',
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

export default function LocalSkillPreviewDrawer({
  isOpen,
  skill,
  onClose,
  onEdit,
}: LocalSkillPreviewDrawerProps): JSX.Element | null {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && skill) {
      loadSkillContent();
    }
  }, [isOpen, skill]);

  const loadSkillContent = async () => {
    if (!skill) return;
    setIsLoading(true);
    try {
      const response = await window.electronAPI.getSkill(skill.path);
      if (response.success && response.data) {
        setContent(response.data.content);
      }
    } catch (error) {
      console.error('Failed to load skill content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !skill) return null;

  // Custom components for markdown rendering
  const markdownComponents: Components = {
    code: CodeBlock as Components['code'],
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-gray-800 mt-5 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-medium text-gray-700 mt-3 mb-2">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-4">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 hover:underline"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-700">
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 my-4 rounded-r">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-4 py-2 text-gray-700">
        {children}
      </td>
    ),
    hr: () => (
      <hr className="my-6 border-gray-200" />
    ),
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4"
        loading="lazy"
      />
    ),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Right-side Drawer */}
      <div className="fixed right-0 top-0 h-full w-[700px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {skill.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {skill.source === 'global' ? t('skills.global', 'Global') : t('skills.local', 'Local')}
              <span className="text-gray-400 mx-1">•</span>
              <span className="truncate">{skill.path}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content with collapsible Link panel */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Symlink Panel - uses the shared component with collapsible functionality */}
              <SymlinkPanel
                skillName={skill.name}
                skillPath={skill.path}
              />

              {/* Skill Content */}
              <div className="px-8 py-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkFrontmatter]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          {onEdit && (
            <button
              onClick={() => onEdit(skill)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('common.edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </>
  );
}
