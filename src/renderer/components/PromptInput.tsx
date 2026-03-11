/**
 * Prompt Input Component
 *
 * Text area for entering AI generation prompts with character counter
 */

import React, { useCallback } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Enter your prompt...',
  maxLength = 2000,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    },
    [onChange, maxLength]
  );

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className="prompt-input-container">
      <div className="prompt-input-wrapper">
        <textarea
          className="prompt-textarea"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          rows={4}
          aria-label="AI generation prompt"
        />
        <div className={`character-counter ${isNearLimit ? 'near-limit' : ''} ${isAtLimit ? 'at-limit' : ''}`}>
          {characterCount} / {maxLength}
        </div>
      </div>
      {disabled && (
        <div className="disabled-overlay">
          <span>Generation in progress...</span>
        </div>
      )}
      <style>{`
        .prompt-input-container {
          position: relative;
        }

        .prompt-input-wrapper {
          position: relative;
        }

        .prompt-textarea {
          width: 100%;
          min-height: 100px;
          padding: 1rem;
          padding-bottom: 2rem;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--text-primary);
          background: var(--background-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          resize: vertical;
          transition: border-color 150ms, box-shadow 150ms;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .prompt-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .prompt-textarea::placeholder {
          color: var(--text-tertiary);
        }

        .character-counter {
          position: absolute;
          bottom: 0.5rem;
          right: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          transition: color 150ms;
        }

        .character-counter.near-limit {
          color: var(--color-warning);
        }

        .character-counter.at-limit {
          color: var(--color-error);
          font-weight: 600;
        }

        .disabled-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 8px;
        }

        .disabled-overlay span {
          padding: 0.5rem 1rem;
          background: var(--background-primary);
          border-radius: 4px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
