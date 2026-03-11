/**
 * Mode Selector Component
 *
 * Tab selector for AI generation modes
 */

import React from 'react';
import type { AIGenerationMode } from '../../shared/types';

interface ModeSelectorProps {
  currentMode: AIGenerationMode;
  onModeChange: (mode: AIGenerationMode) => void;
  disabled?: boolean;
}

const MODES: Array<{ id: AIGenerationMode; label: string; description: string }> = [
  {
    id: 'new',
    label: 'New Skill',
    description: 'Create from scratch',
  },
  {
    id: 'modify',
    label: 'Modify',
    description: 'Enhance existing',
  },
  {
    id: 'insert',
    label: 'Insert',
    description: 'Add at cursor',
  },
  {
    id: 'replace',
    label: 'Replace',
    description: 'Rewrite selection',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="mode-selector">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          className={`mode-tab ${currentMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          disabled={disabled}
          aria-pressed={currentMode === mode.id}
        >
          <div className="mode-label">{mode.label}</div>
          <div className="mode-description">{mode.description}</div>
        </button>
      ))}
      <style>{modeSelectorStyles}</style>
    </div>
  );
};

const modeSelectorStyles = `
  .mode-selector {
    display: flex;
    gap: 0.5rem;
    padding: 0 1rem;
    background: var(--background-secondary);
    border-radius: 6px;
  }

  .mode-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .mode-tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mode-tab:not(:disabled):hover {
    background: var(--background-hover);
    border-color: var(--border-color);
  }

  .mode-tab.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .mode-tab.active:hover {
    background: var(--color-primary-dark);
  }

  .mode-label {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }

  .mode-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .mode-tab.active .mode-description {
    color: rgba(255, 255, 255, 0.8);
  }
`;
