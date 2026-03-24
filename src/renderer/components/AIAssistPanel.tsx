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
  onApply: (content: string, mode: AIGenerationMode) => void;
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
      generationStartTime.current = null;
    },
    onError: (errorMessage) => {
      console.error('AI generation error:', errorMessage);
      generationStartTime.current = null;
    },
  });

  /**
   * Track generation start time for UI feedback
   */
  useEffect(() => {
    if (isStreaming && !generationStartTime.current) {
      generationStartTime.current = Date.now();
    }

    if (!isStreaming && generationStartTime.current) {
      generationStartTime.current = null;
    }
  }, [isStreaming]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    generationStartTime.current = Date.now();

    // Build skill context based on mode
    const skillContext: AIGenerationRequest['skillContext'] = {};

    // Modes that require existing skill content
    const modesRequiringContent = ['modify', 'insert', 'replace', 'evaluate', 'benchmark', 'optimize'];

    if (modesRequiringContent.includes(mode)) {
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
      onApply(content, mode)
      onClose()
    }
  }, [content, mode, onApply, onClose])

  const handleModeChange = useCallback((newMode: AIGenerationMode) => {
    setMode(newMode)
    reset()
    setPrompt('')
    generationStartTime.current = null
  }, [reset])

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

        <AIControls
          status={status}
          isStreaming={isStreaming}
          isComplete={isComplete}
          isIdle={isIdle}
          canGenerate={prompt.trim().length > 0}
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
    case 'evaluate':
      return 'Describe what aspects of the skill to evaluate...';
    case 'benchmark':
      return 'Describe the benchmark scenarios to test...';
    case 'optimize':
      return 'Describe triggering optimization goals...';
    default:
      return 'Enter your prompt...';
  }
}
