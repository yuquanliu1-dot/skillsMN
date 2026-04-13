/**
 * JsonBlock - Interactive JSON tree viewer
 *
 * Renders JSON with collapsible nodes, syntax coloring, and copy support.
 */

import React, { useState, useMemo } from 'react';
import CopyButton from './CopyButton';

interface JsonBlockProps {
  code: string;
}

interface JsonNodeProps {
  data: unknown;
  name?: string;
  depth: number;
  isLast: boolean;
}

function JsonNode({ data, name, depth, isLast }: JsonNodeProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(depth > 2);

  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isContainer = isObject || isArray;

  const comma = isLast ? '' : ',';

  if (!isContainer) {
    let valueClass = 'text-gray-700';
    let valueDisplay = JSON.stringify(data);

    if (typeof data === 'string') {
      valueClass = 'text-green-700';
      valueDisplay = `"${data}"`;
    } else if (typeof data === 'number') {
      valueClass = 'text-blue-700';
    } else if (typeof data === 'boolean') {
      valueClass = 'text-purple-700';
    } else if (data === null) {
      valueClass = 'text-gray-400';
    }

    return (
      <div className="flex" style={{ paddingLeft: `${depth * 16}px` }}>
        {name !== undefined && (
          <span className="text-gray-500">"{name}": </span>
        )}
        <span className={valueClass}>{valueDisplay}</span>
        <span className="text-gray-400">{comma}</span>
      </div>
    );
  }

  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);

  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (collapsed) {
    return (
      <div
        className="flex cursor-pointer hover:bg-gray-50 rounded"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => setCollapsed(false)}
      >
        {name !== undefined && <span className="text-gray-500">"{name}": </span>}
        <span className="text-gray-400">
          {openBracket} {entries.length} {entries.length === 1 ? 'item' : 'items'} {closeBracket}{comma}
        </span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
      <div
        className="flex cursor-pointer hover:bg-gray-50 rounded"
        onClick={() => setCollapsed(true)}
      >
        {name !== undefined && <span className="text-gray-500">"{name}": </span>}
        <span className="text-gray-600 font-medium">{openBracket}</span>
      </div>
      {entries.map(([key, value], index) => (
        <JsonNode
          key={key}
          data={value}
          name={isArray ? undefined : key}
          depth={depth + 1}
          isLast={index === entries.length - 1}
        />
      ))}
      <div style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="text-gray-600 font-medium">{closeBracket}</span>
        <span className="text-gray-400">{comma}</span>
      </div>
    </div>
  );
}

function JsonBlock({ code }: JsonBlockProps): JSX.Element {
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  const parsed = useMemo(() => {
    try {
      return JSON.parse(code);
    } catch {
      return null;
    }
  }, [code]);

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">JSON</span>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'tree' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'raw' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Raw
            </button>
          </div>
          <CopyButton code={code} />
        </div>
      </div>
      <div className="bg-white p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
        {parsed !== null && viewMode === 'tree' ? (
          <div className="text-sm font-mono">
            <JsonNode data={parsed} depth={0} isLast />
          </div>
        ) : (
          <pre className="text-sm font-mono text-gray-800">{code}</pre>
        )}
      </div>
    </div>
  );
}

export default React.memo(JsonBlock);
