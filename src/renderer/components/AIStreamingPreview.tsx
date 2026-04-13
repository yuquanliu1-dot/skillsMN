/**
 * AI Streaming Preview Component
 *
 * Displays AI-generated content in real-time with rich Markdown rendering
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AIGenerationState } from '../hooks/useAIGeneration';
import StreamingMarkdown from './StreamingMarkdown';

interface AIStreamingPreviewProps {
  content: string;
  status: AIGenerationState;
  error: string | null;
}

export const AIStreamingPreview: React.FC<AIStreamingPreviewProps> = ({
  content,
  status,
  error,
}) => {
  const { t } = useTranslation();
  const isStreaming = status === 'STREAMING';

  if (status === 'IDLE') {
    return (
      <div className="streaming-preview streaming-preview--idle">
        <div className="preview-placeholder">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
            <path d="M24 4v40M4 24h40" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>{t('aiDialog.contentWillAppear')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="streaming-preview streaming-preview--error">
        <div className="error-message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="error-title">{t('common.error')}</p>
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="streaming-preview">
      <div className="preview-header">
        <span className="preview-label">{t('aiDialog.generatedSkill')}</span>
        {isStreaming && (
          <div className="streaming-indicator">
            <div className="spinner"></div>
            <span>{t('aiDialog.streaming')}</span>
          </div>
        )}
        {status === 'COMPLETE' && (
          <div className="complete-indicator">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <path d="M13.5 4.5L6 12l-2.5-2.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t('aiDialog.complete')}</span>
          </div>
        )}
      </div>
      <div className="preview-content">
        {content ? (
          <StreamingMarkdown content={content} isStreaming={isStreaming} />
        ) : (
          <span className="text-sm text-gray-400">{t('aiDialog.contentWillAppear')}</span>
        )}
      </div>
      <style>{previewStyles}</style>
    </div>
  );
};

const previewStyles = `
  .streaming-preview {
    background: #ffffff;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    min-height: 200px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .streaming-preview--idle {
    align-items: center;
    justify-content: center;
  }

  .streaming-preview--error {
    border-color: #EF4444;
  }

  .preview-placeholder {
    text-align: center;
    color: rgba(0, 0, 0, 0.48);
  }

  .preview-placeholder svg {
    opacity: 0.3;
    margin-bottom: 1rem;
  }

  .preview-placeholder p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-message {
    text-align: center;
    color: #EF4444;
    padding: 2rem;
  }

  .error-message svg {
    margin-bottom: 1rem;
    opacity: 0.7;
  }

  .error-title {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .error-text {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E5E7EB;
    background: #ffffff;
  }

  .preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(0, 0, 0, 0.48);
  }

  .streaming-indicator,
  .complete-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.48);
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #E5E7EB;
    border-top-color: #0071e3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .complete-indicator {
    color: #10B981;
  }

  .complete-indicator svg {
    stroke: #10B981;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
`;
