/**
 * StreamingMarkdown - Incremental Markdown renderer for AI streaming content
 *
 * Key design:
 * - Splits content into blocks (by blank lines / code fences)
 * - Only re-renders the last "active" block during streaming
 * - Completed blocks are memoized (frozen) to avoid re-parsing
 * - Shows a blinking cursor at the end during streaming
 * - On completion, renders everything through the full MarkdownRenderer pipeline
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreamingMarkdownProps {
  /** The streaming content so far */
  content: string;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Additional CSS class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Block splitting logic
// ---------------------------------------------------------------------------

interface Block {
  /** Block index for stable keys */
  index: number;
  /** Block content (may span multiple lines) */
  content: string;
}

/**
 * Split markdown content into blocks for incremental rendering.
 *
 * A "block" is either:
 * 1. A fenced code block (``` ... ```)  - kept as a single unit
 * 2. A consecutive run of non-blank lines
 *
 * Blank lines separate blocks but are attached to the block that follows them
 * (for paragraph separation in markdown).
 */
function splitBlocks(content: string): Block[] {
  if (!content) return [];

  const lines = content.split('\n');
  const blocks: Block[] = [];
  let current = '';
  let inCodeFence = false;
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code fence state
    if (line.trimStart().startsWith('```')) {
      if (inCodeFence) {
        // Closing fence
        current += (current ? '\n' : '') + line;
        blocks.push({ index: blockIndex++, content: current });
        current = '';
        inCodeFence = false;
        continue;
      } else {
        // Opening fence - start a new code block
        if (current.trim()) {
          blocks.push({ index: blockIndex++, content: current.trimEnd() });
        }
        current = line;
        inCodeFence = true;
        continue;
      }
    }

    if (inCodeFence) {
      current += '\n' + line;
      continue;
    }

    // Outside code fence
    if (line.trim() === '') {
      // Blank line: might be a block separator
      if (current.trim()) {
        current += '\n';
      }
      continue;
    }

    // Non-blank line outside code fence
    if (current && !current.endsWith('\n')) {
      current += '\n' + line;
    } else {
      current += line;
    }
  }

  // Remaining content (the "active" block during streaming)
  if (current.trim()) {
    blocks.push({ index: blockIndex, content: current.trimEnd() });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Frozen block - memoized completed block
// ---------------------------------------------------------------------------

const FrozenBlock = React.memo(function FrozenBlock({
  content,
  index,
}: {
  content: string;
  index: number;
}) {
  return (
    <div key={`block-${index}`} className="streaming-block streaming-block--frozen">
      <MarkdownRenderer content={content} mode="full" />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Active block - re-renders during streaming
// ---------------------------------------------------------------------------

function ActiveBlock({ content }: { content: string }) {
  return (
    <div className="streaming-block streaming-block--active">
      <MarkdownRenderer content={content} mode="full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blinking cursor
// ---------------------------------------------------------------------------

function StreamingCursor() {
  return <span className="streaming-cursor">|</span>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StreamingMarkdown({
  content,
  isStreaming,
  className = '',
}: StreamingMarkdownProps): JSX.Element {
  // When streaming ends, render everything as a single block through MarkdownRenderer
  if (!isStreaming && content) {
    return (
      <div className={`streaming-markdown streaming-markdown--complete ${className}`}>
        <MarkdownRenderer content={content} mode="full" />
      </div>
    );
  }

  const blocks = useMemo(() => splitBlocks(content), [content]);

  if (blocks.length === 0) {
    return isStreaming ? (
      <div className={`streaming-markdown streaming-markdown--empty ${className}`}>
        <StreamingCursor />
        <style>{streamingStyles}</style>
      </div>
    ) : (
      <div className={className} />
    );
  }

  // Split into frozen blocks + active (last) block
  const frozenBlocks = blocks.slice(0, -1);
  const activeBlock = blocks[blocks.length - 1];

  return (
    <div className={`streaming-markdown streaming-markdown--streaming ${className}`}>
      {frozenBlocks.map((block) => (
        <FrozenBlock key={`frozen-${block.index}`} content={block.content} index={block.index} />
      ))}
      <ActiveBlock content={activeBlock.content} />
      {isStreaming && <StreamingCursor />}
      <style>{streamingStyles}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const streamingStyles = `
.streaming-markdown {
  line-height: 1.6;
}

.streaming-block--frozen {
  /* Frozen blocks are stable, no animation */
}

.streaming-block--active {
  /* Active block may shift as content arrives */
  min-height: 1em;
}

.streaming-cursor {
  display: inline-block;
  color: #0071e3;
  font-weight: bold;
  animation: streaming-blink 1s step-end infinite;
  margin-left: 1px;
}

@keyframes streaming-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
`;
