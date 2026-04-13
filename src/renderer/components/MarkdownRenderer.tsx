/**
 * MarkdownRenderer - Shared Markdown rendering component
 *
 * Dual-engine architecture: rendering engine using react-markdown + remark/rehype pipeline.
 * Supports three modes: terminal, minimal, full.
 *
 * Phase 2: Shiki code highlighting + custom block renderers
 */

import React, { useState, Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Block renderers
import CodeBlockShiki from './CodeBlockShiki';
import DiffBlock from './DiffBlock';
import JsonBlock from './JsonBlock';
import CopyButton from './CopyButton';

// Lazy-loaded heavy renderers
const MermaidBlock = lazy(() => import('./MermaidBlock'));
const DataTableBlock = lazy(() => import('./DataTableBlock'));
const HtmlPreviewBlock = lazy(() => import('./HtmlPreviewBlock'));
const ImageGalleryBlock = lazy(() => import('./ImageGalleryBlock'));
const SpreadsheetBlock = lazy(() => import('./SpreadsheetBlock'));
const PdfBlock = lazy(() => import('./PdfBlock'));
const WordBlock = lazy(() => import('./WordBlock'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarkdownMode = 'terminal' | 'minimal' | 'full';

export interface MarkdownRendererProps {
  /** Raw markdown content to render */
  content: string;
  /** Rendering mode: terminal (raw), minimal (basic), full (rich) */
  mode?: MarkdownMode;
  /** Additional CSS class names for the wrapper */
  className?: string;
  /** Callback when a link is clicked */
  onLinkClick?: (href: string, e: React.MouseEvent) => void;
}

// ---------------------------------------------------------------------------
// Code fence dispatcher - routes to appropriate block renderer
// ---------------------------------------------------------------------------

function BlockDispatcher({
  language,
  code,
}: {
  language: string;
  code: string;
}): JSX.Element {
  const lang = language.toLowerCase();

  // Mermaid diagrams
  if (lang === 'mermaid') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="mermaid" />}>
        <MermaidBlock code={code} />
      </Suspense>
    );
  }

  // JSON tree view
  if (lang === 'json' || lang === 'json5' || lang === 'jsonc') {
    return <JsonBlock code={code} />;
  }

  // Diff/patch
  if (lang === 'diff' || lang === 'patch' || lang === 'udiff') {
    return <DiffBlock code={code} />;
  }

  // Data tables (CSV/TSV)
  if (lang === 'csv') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="csv" />}>
        <DataTableBlock code={code} delimiter="," />
      </Suspense>
    );
  }
  if (lang === 'tsv') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="tsv" />}>
        <DataTableBlock code={code} delimiter={'\t'} />
      </Suspense>
    );
  }

  // HTML preview
  if (lang === 'html' || lang === 'htm') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="html" />}>
        <HtmlPreviewBlock code={code} />
      </Suspense>
    );
  }

  // Image gallery
  if (lang === 'gallery' || lang === 'images') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="gallery" />}>
        <ImageGalleryBlock code={code} />
      </Suspense>
    );
  }

  // Spreadsheet (xlsx / excel)
  if (lang === 'xlsx' || lang === 'excel' || lang === 'spreadsheet') {
    const isBinary = lang === 'xlsx';
    return (
      <Suspense fallback={<CodeFallback code={code} language="spreadsheet" />}>
        <SpreadsheetBlock code={code} isBinary={isBinary} />
      </Suspense>
    );
  }

  // PDF preview (code fence contains a URL or file path)
  if (lang === 'pdf') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="pdf" />}>
        <PdfBlock code={code} />
      </Suspense>
    );
  }

  // Word document (code fence contains a URL or file path)
  if (lang === 'docx' || lang === 'word') {
    return (
      <Suspense fallback={<CodeFallback code={code} language="docx" />}>
        <WordBlock code={code} />
      </Suspense>
    );
  }

  // Default: Shiki syntax highlighting
  return <CodeBlockShiki code={code} language={language} />;
}

/** Fallback shown while lazy components load */
function CodeFallback({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">{language}</span>
        <CopyButton code={code} />
      </div>
      <div className="bg-[#fafafa] px-4 py-4 overflow-x-auto">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
        </div>
        <pre className="text-sm font-mono text-gray-800">{code}</pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline code renderer (shared across modes)
// ---------------------------------------------------------------------------

function InlineCode({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded bg-gray-100 text-pink-600 text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Component sets per mode
// ---------------------------------------------------------------------------

/** Terminal mode: stripped-down, monospace-heavy */
const terminalComponents: Components = {
  code: ({ children }) => (
    <code className="text-sm font-mono text-gray-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="text-sm font-mono bg-gray-100 p-3 rounded my-2 overflow-x-auto">{children}</pre>
  ),
  p: ({ children }) => <p className="font-mono text-sm mb-2">{children}</p>,
  h1: ({ children }) => <h1 className="font-mono text-base font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="font-mono text-sm font-bold mt-3 mb-1">{children}</h2>,
  a: ({ href, children }) => <span className="text-blue-600">{children} ({href})</span>,
  img: ({ alt }) => <span className="text-gray-400 text-xs">[{alt || 'image'}]</span>,
};

/** Minimal mode: basic formatting, no syntax highlighting */
const minimalComponents: Components = {
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = match || codeString.includes('\n');
    if (isBlock) {
      return (
        <pre className="text-sm font-mono bg-gray-100 p-3 rounded my-2 overflow-x-auto">{codeString}</pre>
      );
    }
    return (
      <code className="px-1 py-0.5 rounded bg-gray-100 text-pink-600 text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-card-title font-semibold text-gray-800 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
  img: ({ alt }) => <span className="text-gray-400 text-xs italic">[{alt || 'image'}]</span>,
};

/** Full mode: rich rendering with Shiki + custom block renderers */
const fullComponents: Components = {
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');

    const isCodeBlock = match || codeString.includes('\n');

    if (!isCodeBlock) {
      return <InlineCode {...props}>{children}</InlineCode>;
    }

    return <BlockDispatcher language={language} code={codeString} />;
  },
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-card-title font-semibold text-gray-800 mt-5 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-medium text-gray-700 mt-3 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
  ),
  a: ({ href, children, onClick }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-700 hover:underline"
      onClick={onClick}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-700">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 my-4 rounded-r">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-100">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 px-4 py-2 text-gray-700">{children}</td>
  ),
  hr: () => <hr className="my-6 border-gray-200" />,
  img: ({ src, alt }) => (
    <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-4" loading="lazy" />
  ),
};

// ---------------------------------------------------------------------------
// Plugin configuration per mode
// ---------------------------------------------------------------------------

const pluginConfigs = {
  terminal: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [] as never[],
  },
  minimal: {
    remarkPlugins: [remarkGfm, remarkFrontmatter],
    rehypePlugins: [] as never[],
  },
  full: {
    remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMath],
    rehypePlugins: [rehypeRaw, rehypeKatex],
  },
};

const componentSets: Record<MarkdownMode, Components> = {
  terminal: terminalComponents,
  minimal: minimalComponents,
  full: fullComponents,
};

// ---------------------------------------------------------------------------
// MarkdownRenderer component
// ---------------------------------------------------------------------------

function MarkdownRendererInner({
  content,
  mode = 'full',
  className = '',
  onLinkClick,
}: MarkdownRendererProps): JSX.Element {
  const config = pluginConfigs[mode];
  const components = componentSets[mode];

  // If onLinkClick is provided, wrap link components
  const finalComponents = onLinkClick
    ? {
        ...components,
        a: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline"
            onClick={(e) => {
              if (href) onLinkClick(href, e);
            }}
            {...rest}
          >
            {children}
          </a>
        ),
      }
    : components;

  return (
    <div className={`markdown-renderer markdown-${mode} ${className}`}>
      <ReactMarkdown
        remarkPlugins={config.remarkPlugins}
        rehypePlugins={config.rehypePlugins}
        components={finalComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoized export - only re-renders when content, mode, or className changes
const MarkdownRenderer = React.memo(
  MarkdownRendererInner,
  (prev, next) =>
    prev.content === next.content &&
    prev.mode === next.mode &&
    prev.className === next.className &&
    prev.onLinkClick === next.onLinkClick
);

export default MarkdownRenderer;
