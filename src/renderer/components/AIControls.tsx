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
  canGenerate: boolean;
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
  canGenerate,
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
            disabled={!canGenerate}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: canGenerate ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : '#D1D5DB',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              transition: 'all 150ms ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Generate</span>
          </button>
        )}

        {isStreaming && (
          <button
            className="stop-button"
            onClick={onStop}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
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
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: isIdle ? '#D1D5DB' : '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isIdle ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Retry</span>
        </button>

        {isComplete && canApply && (
          <button
            className="apply-button"
            onClick={onApply}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
    background: linear-gradient(135deg, #8B5CF6, #6366F1);
    color: white;
    flex: 1;
    justify-content: center;
  }

  .generate-button:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }

  .generate-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .stop-button {
    background: #EF4444;
    color: white;
  }

  .stop-button:hover:not(:disabled) {
    background: #DC2626;
  }

  .retry-button {
    background: #F59E0B;
    color: white;
    border: none;
  }

  .retry-button:hover:not(:disabled) {
    background: #D97706;
  }

  .retry-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .apply-button {
    background: #10B981;
    color: white;
  }

  .apply-button:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .apply-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .secondary-controls {
    justify-content: center;
  }
`;
