/**
 * AI Assist Panel Component
 *
 * Main panel for AI-assisted skill generation with streaming preview
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { AIStreamingPreview } from './AIStreamingPreview';
import { PromptInput } from './PromptInput';
import { AIControls } from './AIControls';
import { ModeSelector } from './ModeSelector';
import type { AIGenerationRequest, AIGenerationMode } from '../../shared/types';

interface AIAssistPanelProps {
  onApply: (content: string) => void;
  onClose: () => void;
  editorContent?: string;
  cursorPosition?: number;
  selectedText?: string;
}

export const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  onApply,
  onClose,
  editorContent,
  cursorPosition,
  selectedText,
}) => {
  const [mode, setMode] = useState<AIGenerationMode>('new');
  const [prompt, setPrompt] = useState('');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const generationStartTime = useRef<number | null>(null);

  const {
    status,
    content,
    error,
    isStreaming,
    isComplete,
    isIdle,
    generate,
    stop,
    retry,
    reset,
  } = useAIGeneration({
    onComplete: (generatedContent) => {
      console.log('AI generation complete:', generatedContent.length);
      setShowTimeoutWarning(false);
      generationStartTime.current = null;
    },
    onError: (errorMessage) => {
      console.error('AI generation error:', errorMessage);
      setShowTimeoutWarning(false);
      generationStartTime.current = null;
    },
  });

  /**
   * Timeout detection - warn if generation takes longer than 30s
   */
  useEffect(() => {
    if (isStreaming && !generationStartTime.current) {
      generationStartTime.current = Date.now();
    }

    if (!isStreaming && generationStartTime.current) {
      generationStartTime.current = null;
      setShowTimeoutWarning(false);
    }

    const timeoutCheck = setInterval(() => {
      if (isStreaming && generationStartTime.current) {
        const elapsed = Date.now() - generationStartTime.current;
        if (elapsed > 30000 && !showTimeoutWarning) {
          setShowTimeoutWarning(true);
        }
      }
    }, 1000);

    return () => clearInterval(timeoutCheck);
  }, [isStreaming, showTimeoutWarning]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    setShowTimeoutWarning(false);
    generationStartTime.current = Date.now();

    // Build skill context based on mode
    const skillContext: AIGenerationRequest['skillContext'] = {};

    if (mode === 'modify' || mode === 'insert' || mode === 'replace') {
      skillContext.content = editorContent;
    }

    if (mode === 'insert') {
      skillContext.cursorPosition = cursorPosition
    }

    if (mode === 'replace') {
      skillContext.selectedText = selectedText
    }

    await generate(prompt, mode, skillContext)
  }, [prompt, mode, editorContent, cursorPosition, selectedText, generate]);

  const handleApply = useCallback(() => {
    if (content) {
      onApply(content)
      onClose()
    }
  }, [content, onApply, onClose])

  const handleModeChange = useCallback((newMode: AIGenerationMode) => {
    setMode(newMode)
    reset()
    setPrompt('')
    setShowTimeoutWarning(false)
    generationStartTime.current = null
  }, [reset])

  const handleContinueAnyway = useCallback(() => {
    setShowTimeoutWarning(false)
  }, [])

  const handleCancelGeneration = useCallback(async () => {
    await stop()
    setShowTimeoutWarning(false)
    generationStartTime.current = null
  }, [stop])

  return (
    <div className="ai-assist-panel">
      <div className="panel-header">
        <div className="header-title">
          <div className="icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>
          <h2>AI Skill Assistant</h2>
        </div>
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close AI panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ModeSelector
        currentMode={mode}
        onModeChange={handleModeChange}
        disabled={isStreaming}
      />

      <div className="panel-content">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          disabled={isStreaming}
          placeholder={getPlaceholderForMode(mode)}
          maxLength={2000}
        />

        <AIStreamingPreview
          content={content}
          status={status}
          error={error}
        />

        {showTimeoutWarning && (
          <div className="timeout-warning">
            <div className="warning-content">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p>Generation is taking longer than expected</p>
              <div className="warning-actions">
                <button className="btn-continue" onClick={handleContinueAnyway}>
                  Continue
                </button>
                <button className="btn-cancel" onClick={handleCancelGeneration}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <AIControls
          status={status}
          isStreaming={isStreaming}
          isComplete={isComplete}
          isIdle={isIdle}
          canApply={isComplete && content.length > 0}
          onGenerate={handleGenerate}
          onStop={stop}
          onRetry={retry}
          onApply={handleApply}
        />
      </div>

      <style>{`
        .ai-assist-panel {
          position: fixed;
          right: 0;
          top: 0;
          height: 100vh;
          width: 420px;
          background: #ffffff;
          border-left: 1px solid #e5e7eb;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          animation: slideIn 300ms ease-out;
          z-index: 1000;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .icon-wrapper {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.625rem;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .icon-wrapper svg {
          color: #ffffff;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #ffffff;
        }

        .close-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          color: #ffffff;
          transition: all 150ms;
          backdrop-filter: blur(10px);
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .panel-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
          overflow-y: auto;
          background: #fafafa;
        }

        .timeout-warning {
          background: #fffbeb;
          border: 1px solid #f59e0b;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 0.5rem 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .warning-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .warning-content svg {
          color: #f59e0b;
        }

        .warning-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #92400e;
          font-weight: 500;
        }

        .warning-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-continue,
        .btn-cancel {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms;
        }

        .btn-continue {
          background: #10b981;
          color: white;
        }

        .btn-continue:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .btn-cancel {
          background: #ef4444;
          color: white;
        }

        .btn-cancel:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

/**
 * Get placeholder text based on generation mode
 */
function getPlaceholderForMode(mode: AIGenerationMode): string {
  switch (mode) {
    case 'new':
      return 'Describe the skill you want to create...';
    case 'modify':
      return 'Describe how you want to modify the skill...';
    case 'insert':
      return 'Describe what content to insert at the cursor...';
    case 'replace':
      return 'Describe how to rewrite the selected text...';
    default:
      return 'Enter your prompt...';
  }
}
