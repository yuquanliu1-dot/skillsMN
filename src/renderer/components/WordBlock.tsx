/**
 * WordBlock - Inline Word document (.docx) renderer
 *
 * Converts .docx files to HTML using mammoth and renders
 * in a sandboxed container. The code fence contains a file path or URL.
 * Features: raw HTML/code view toggle, copy.
 */

import React, { useState, useEffect, useMemo } from 'react';
import CopyButton from './CopyButton';

interface WordBlockProps {
  /** URL, file path, or data URI for the .docx file */
  code: string;
  /** Pre-decoded ArrayBuffer (skips base64 round-trip) */
  arrayBuffer?: ArrayBuffer;
}

export default function WordBlock({ code, arrayBuffer: externalBuffer }: WordBlockProps): JSX.Element {
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');

  const src = code.trim();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch the file content
        let arrayBuffer: ArrayBuffer;

        if (externalBuffer) {
          arrayBuffer = externalBuffer;
        } else if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('skillfile://')) {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
          arrayBuffer = await response.arrayBuffer();
        } else {
          // Local file path - try fetch for file:// protocol
          try {
            const response = await fetch(`file://${src}`);
            if (!response.ok) throw new Error(`Failed to read file: ${src}`);
            arrayBuffer = await response.arrayBuffer();
          } catch {
            throw new Error('Cannot read local files. Provide a URL instead.');
          }
        }

        // Parse with mammoth
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (!cancelled) {
          setHtml(result.value);
          if (result.messages.length > 0) {
            console.warn('[WordBlock] Mammoth warnings:', result.messages);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Word document load error
        </div>
        <p className="text-xs text-red-400">{error}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{src}</p>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium uppercase">Word Document</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'preview' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('html')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'html' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              HTML
            </button>
          </div>
          <CopyButton code={html} />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading document...</span>
          </div>
        ) : viewMode === 'preview' ? (
          <div
            className="word-preview p-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="p-4 text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">{html}</pre>
        )}
      </div>

      {/* Word preview styles */}
      <style>{wordPreviewStyles}</style>
    </div>
  );
}

const wordPreviewStyles = `
.word-preview {
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1d1d1f;
}
.word-preview h1 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
.word-preview h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
.word-preview h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.word-preview p { margin-bottom: 0.75rem; }
.word-preview ul, .word-preview ol { margin-left: 1.5rem; margin-bottom: 0.75rem; }
.word-preview li { margin-bottom: 0.25rem; }
.word-preview table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
.word-preview td, .word-preview th { border: 1px solid #E5E7EB; padding: 0.5rem; }
.word-preview th { background: #f9fafb; font-weight: 600; }
.word-preview img { max-width: 100%; height: auto; border-radius: 4px; }
`;
