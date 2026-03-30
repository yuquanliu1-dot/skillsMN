/**
 * AI Assistant Popover Component
 *
 * A small floating input dialog for AI rewrite and insert functionality
 */

import { useState, useEffect, useRef } from 'react';

interface AIAssistantPopoverProps {
  isOpen: boolean;
  mode: 'rewrite' | 'insert';
  selectedText?: string;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
  isProcessing: boolean;
  position?: { x: number; y: number };
}

export function AIAssistantPopover({
  isOpen,
  mode,
  selectedText = '',
  onClose,
  onConfirm,
  isProcessing,
  position,
}: AIAssistantPopoverProps): JSX.Element | null {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset prompt when closed
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (prompt.trim() && !isProcessing) {
          onConfirm(prompt.trim());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, prompt, isProcessing, onClose, onConfirm]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isProcessing) {
      onConfirm(prompt.trim());
    }
  };

  // Default position (center of screen) or custom position
  const popoverStyle = position
    ? {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }
    : {
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };

  const isRewriteMode = mode === 'rewrite';
  const title = isRewriteMode ? 'AI Rewrite' : 'AI Insert';
  const iconBg = isRewriteMode ? 'from-blue-50 to-indigo-50' : 'from-green-50 to-teal-50';
  const placeholder = isRewriteMode
    ? 'e.g., Make it more concise, Fix grammar, Change tone to formal...'
    : 'e.g., Add code examples, Insert troubleshooting section, Add usage tips...';
  const buttonIcon = isRewriteMode ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        style={popoverStyle}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl w-96 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${iconBg} border-b border-gray-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className={`w-5 h-5 ${isRewriteMode ? 'text-blue-600' : 'text-green-600'} animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className={`absolute inset-0 ${isRewriteMode ? 'bg-blue-400' : 'bg-green-400'} rounded-full animate-ping opacity-75`}></div>
                  </div>
                  <span className={`text-sm font-medium ${isRewriteMode ? 'text-blue-700' : 'text-green-700'}`}>AI is thinking...</span>
                </div>
              ) : (
                <>
                  <svg className={`w-5 h-5 ${isRewriteMode ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">{title}</span>
                </>
              )}
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Selected text preview (only for rewrite mode) */}
        {isRewriteMode && selectedText && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="text-xs text-gray-500 mb-1.5 font-medium">Selected text:</div>
            <div className="text-sm text-gray-700 max-h-20 overflow-y-auto bg-white px-3 py-2 rounded-lg border border-gray-200 font-mono">
              {selectedText.length > 150 ? `${selectedText.substring(0, 150)}...` : selectedText}
            </div>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRewriteMode ? 'How would you like to rewrite it?' : 'What would you like to insert?'}
          </label>
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
            rows={3}
            disabled={isProcessing}
          />

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl</kbd>
              +<kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to submit
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() || isProcessing}
                className={`px-4 py-1.5 text-sm ${isRewriteMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.938l3-2.647l3-2.647z" />
                    </svg>
                    Processing
                  </>
                ) : (
                  <>
                    {buttonIcon}
                    {isRewriteMode ? 'Rewrite' : 'Insert'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
