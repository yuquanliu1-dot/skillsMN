/**
 * DiffBlock - Unified diff renderer with syntax coloring
 *
 * Renders diff/patch content with line-by-line coloring:
 * - Green background for additions (+)
 * - Red background for deletions (-)
 * - Gray background for hunk headers (@@)
 */

import React, { useMemo } from 'react';
import CopyButton from './CopyButton';

interface DiffBlockProps {
  code: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'hunk' | 'context' | 'header';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

function parseDiff(code: string): DiffLine[] {
  const lines = code.split('\n');
  let oldLine = 0;
  let newLine = 0;

  return lines.map((line) => {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      return { type: 'hunk' as const, content: line };
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      return { type: 'header' as const, content: line };
    }
    if (line.startsWith('+')) {
      const ln = newLine++;
      return { type: 'add', content: line, lineNumber: { new: ln } };
    }
    if (line.startsWith('-')) {
      const ln = oldLine++;
      return { type: 'remove', content: line, lineNumber: { old: ln } };
    }
    oldLine++;
    newLine++;
    return { type: 'context', content: line };
  });
}

function DiffBlock({ code }: DiffBlockProps): JSX.Element {
  const lines = useMemo(() => parseDiff(code), [code]);

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">Diff</span>
        <CopyButton code={code} />
      </div>
      <div className="bg-white overflow-x-auto text-sm font-mono">
        {lines.map((line, i) => {
          let bgClass = '';
          let textClass = 'text-gray-700';
          if (line.type === 'add') { bgClass = 'bg-green-50'; textClass = 'text-green-800'; }
          else if (line.type === 'remove') { bgClass = 'bg-red-50'; textClass = 'text-red-800'; }
          else if (line.type === 'hunk') { bgClass = 'bg-blue-50'; textClass = 'text-blue-700'; }
          else if (line.type === 'header') { bgClass = 'bg-gray-50'; textClass = 'text-gray-600 font-semibold'; }

          return (
            <div key={i} className={`flex ${bgClass}`}>
              <span className="select-none text-gray-300 w-8 shrink-0 text-right pr-2">{i + 1}</span>
              <pre className={`${textClass} whitespace-pre`}>{line.content}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(DiffBlock);
