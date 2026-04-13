/**
 * AI Controls Component
 *
 * Control buttons for AI generation (Generate, Stop, Retry, Apply)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 justify-between">
        {isIdle && (
          <button
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{t('common.generate')}</span>
          </button>
        )}

        {isStreaming && (
          <button
            className="btn btn-danger flex-1 flex items-center justify-center gap-2"
            onClick={onStop}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
            </svg>
            <span>{t('common.stop')}</span>
          </button>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          className="btn btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRetry}
          disabled={isIdle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{t('common.retry')}</span>
        </button>

        {isComplete && canApply && (
          <button
            className="btn flex-1 flex items-center justify-center gap-2 !bg-green-600 hover:!bg-green-700 text-white"
            onClick={onApply}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('common.apply')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
