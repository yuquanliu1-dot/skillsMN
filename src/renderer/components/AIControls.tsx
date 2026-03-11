/**
 * AI Controls Component
 *
 * Control buttons for AI generation (Generate, Stop, Retry, Apply)
 */

import React from 'react';
import type { AIGenerationState } from '../hooks/useAIGeneration';

interface AIControlsProps {
  status: AIGenerationState;
  isStreaming: boolean;
  isComplete: boolean;
  isIdle: boolean;
  canApply: boolean;
  onGenerate: () => void;
  onStop: () => void;
  onRetry: () => void;
  onApply: () => void;
}

export const AIControls: React.FC<AIControlsProps> = ({
  status,
  isStreaming,
  isComplete,
  isIdle,
  canApply,
  onGenerate,
  onStop,
  onRetry,
  onApply,
}) => {
  return (
    <div className="ai-controls">
      <div className="control-group primary-controls">
        {isIdle && (
          <button
            className="generate-button"
            onClick={onGenerate}
            disabled={!canApply}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M10 2l4-4 2 4 4-4-4-2 4-4 4 4 4v4-4 4 4 2 4-4 4 4 2 4-4 4 4 4 4 4 4 4 4 4-4 4 0 6 6l8 6L10 6 10 6z" strokeWidth="2" />
            </svg>
            <span>Generate</span>
          </button>
        )}

        {isStreaming && (
          <button
            className="stop-button"
            onClick={onStop}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <rect x="6" y="6" width="8" height="8" rx="2" ry="2" strokeWidth="2" />
              <path d="M6 14l8 8 6 6l8 8-6-8" strokeWidth="2" />
            </svg>
            <span>Stop</span>
          </button>
        )}
      </div>

      <div className="control-group secondary-controls">
        <button
          className="retry-button"
          onClick={onRetry}
          disabled={isIdle}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M1.5 2.5L8.5 8.5l2.5-2.5M5.5l2.5-2.5L2.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Retry</span>
        </button>

        {isComplete && canApply && (
          <button
            className="apply-button"
            onClick={onApply}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M16 4l-5 7-7 7-4-3-4-3v4-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Apply</span>
          </button>
        )}
      </div>

      <style>{controlsStyles}</style>
    </div>
  );
};

const controlsStyles = `
  .ai-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .control-group {
    display: flex;
    gap: 0.75rem;
  }

  .control-group.primary-controls {
    justify-content: flex;
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button svg {
    flex-shrink: 0;
  }

  .generate-button {
    background: var(--color-primary);
    color: white;
    flex: 1;
    justify-content: center;
  }

  .generate-button:hover:notdisabled {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .generate-button:active:notdisabled {
    transform: translateY(0);
  }

  .stop-button {
    background: var(--color-error);
    color: white;
  }

  .stop-button:hover:notdisabled {
    background: var(--color-error-dark);
  }

  .retry-button {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .retry-button:hover:notdisabled {
    background: var(--background-hover);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .apply-button {
    background: var(--color-success);
    color: white;
  }

  .apply-button:hover:notdisabled {
    background: var(--color-success-dark);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .apply-button:active:notdisabled {
    transform: translateY(0);
  }

  .secondary-controls {
    justify-content: center;
  }
`;
