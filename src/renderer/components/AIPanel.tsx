/**
 * AIPanel Component
 *
 * AI assistant panel for generating skill content with streaming display
 */

import { useState, useEffect, useRef } from 'react';
import type { AIGenerationMode } from '../../shared/types';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (content: string, mode: AIGenerationMode) => void;
  currentContent?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

export default function AIPanel({
  isOpen,
  onClose,
  onApply,
  currentContent = '',
  selectionStart = 0,
  selectionEnd = 0,
}: AIPanelProps): JSX.Element | null {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<AIGenerationMode>('new');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setGeneratedContent('');
      setError(null);
      setIsGenerating(false);

      // Auto-detect mode based on selection
      if (selectionStart !== selectionEnd) {
        setMode('replace');
      } else if (currentContent && selectionStart > 0) {
        setMode('insert');
      } else if (currentContent) {
        setMode('modify');
      } else {
        setMode('new');
      }

      // Focus prompt input
      setTimeout(() => promptRef.current?.focus(), 100);
    }
  }, [isOpen, currentContent, selectionStart, selectionEnd]);

  // Listen for AI stream chunks
  useEffect(() => {
    if (!isOpen) return;

    const handleChunk = (_event: any, chunk: any) => {
      if (chunk.error) {
        setError(chunk.error);
        setIsGenerating(false);
        setRequestId(null);
      } else if (chunk.isComplete) {
        setIsGenerating(false);
        setRequestId(null);
      } else {
        setGeneratedContent((prev) => prev + chunk.chunk);
      }
    };

    window.electronAPI.onAIChunk(handleChunk);

    return () => {
      window.electronAPI.removeAIChunkListener();
    };
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setRequestId(id);

    try {
      const response = await window.electronAPI.generateAI({
        requestId: id,
        request: {
          prompt: prompt.trim(),
          mode,
          currentContent: mode !== 'new' ? currentContent : undefined,
          selectionStart:
            mode === 'insert' || mode === 'replace' ? selectionStart : undefined,
          selectionEnd:
            mode === 'insert' || mode === 'replace' ? selectionEnd : undefined,
        },
      });

      if (!response.success) {
        setError(response.error?.message || 'Generation failed');
        setIsGenerating(false);
        setRequestId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setIsGenerating(false);
      setRequestId(null);
    }
  };

  const handleCancel = async () => {
    if (!requestId) return;

    try {
      await window.electronAPI.cancelAI(requestId);
      setIsGenerating(false);
      setRequestId(null);
      setError('Generation cancelled');
    } catch (err) {
      console.error('Failed to cancel generation:', err);
    }
  };

  const handleApply = () => {
    if (generatedContent) {
      onApply(generatedContent, mode);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Generation Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('new')}
                className={`px-3 py-2 rounded text-sm ${
                  mode === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                New Skill
              </button>
              <button
                onClick={() => setMode('modify')}
                className={`px-3 py-2 rounded text-sm ${
                  mode === 'modify'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                disabled={!currentContent}
              >
                Modify
              </button>
              <button
                onClick={() => setMode('insert')}
                className={`px-3 py-2 rounded text-sm ${
                  mode === 'insert'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                disabled={!currentContent}
              >
                Insert
              </button>
              <button
                onClick={() => setMode('replace')}
                className={`px-3 py-2 rounded text-sm ${
                  mode === 'replace'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                disabled={!currentContent || selectionStart === selectionEnd}
              >
                Replace Selection
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="w-full h-32 bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            />
          </div>

          {/* Generate/Cancel Buttons */}
          <div className="flex gap-2">
            {!isGenerating ? (
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
              >
                Generate
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
              >
                Stop Generation
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Generated Content Display */}
          {generatedContent && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Generated Content
              </label>
              <div className="bg-slate-900 border border-slate-700 rounded p-4 max-h-96 overflow-y-auto">
                <pre className="text-slate-100 whitespace-pre-wrap font-mono text-sm">
                  {generatedContent}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generatedContent && !isGenerating && (
          <div className="border-t border-slate-700 p-4 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Apply to Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
