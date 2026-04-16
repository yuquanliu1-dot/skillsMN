/**
 * CodeBlockShiki - Shiki-based syntax highlighting component
 *
 * Replaces Prism SyntaxHighlighter with:
 * - Dual theme rendering (light/dark via CSS)
 * - Lazy initialization (shows plain code while Shiki loads)
 * - Line numbers for blocks > 3 lines
 * - Copy button integration
 * - Language label header
 */

import React, { useState, useEffect, useMemo } from 'react';
import shikiService from '../services/ShikiService';
import CopyButton from './CopyButton';

interface CodeBlockShikiProps {
  code: string;
  language: string;
}

/** Line numbers component */
function LineNumbers({ count }: { count: number }) {
  return (
    <div
      className="select-none text-right pr-4 text-gray-400 text-xs leading-6 shrink-0"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

function CodeBlockShiki({ code, language }: CodeBlockShikiProps): JSX.Element {
  const [html, setHtml] = useState<{ light: string; dark: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    shikiService.highlight(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [code, language]);

  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const showLineNumbers = lineCount > 3;

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">{language}</span>
        <CopyButton code={code} />
      </div>

      {/* Code area */}
      {html ? (
        <div className="bg-[#fff] relative">
          <div className="flex">
            {showLineNumbers && <LineNumbers count={lineCount} />}
            <div
              className="flex-1 overflow-x-auto text-sm [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:!text-sm [&_code]:!font-mono [&_code]:!text-sm"
              dangerouslySetInnerHTML={{ __html: html.light }}
            />
          </div>
        </div>
      ) : (
        // Fallback: plain code while Shiki initializes
        <div className="bg-[#fafafa] px-4 py-4 overflow-x-auto">
          <pre className="text-sm font-mono text-gray-800">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default React.memo(CodeBlockShiki);
