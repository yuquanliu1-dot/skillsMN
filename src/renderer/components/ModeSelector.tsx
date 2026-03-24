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

const MODES: Array<{ id: AIGenerationMode; label: string; description: string; group: 'create' | 'analyze' }> = [
  {
    id: 'new',
    label: 'New Skill',
    description: 'Create from scratch',
    group: 'create',
  },
  {
    id: 'modify',
    label: 'Modify',
    description: 'Enhance existing',
    group: 'create',
  },
  {
    id: 'insert',
    label: 'Insert',
    description: 'Add at cursor',
    group: 'create',
  },
  {
    id: 'replace',
    label: 'Replace',
    description: 'Rewrite selection',
    group: 'create',
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    description: 'Assess performance',
    group: 'analyze',
  },
  {
    id: 'benchmark',
    label: 'Benchmark',
    description: 'Compare & analyze',
    group: 'analyze',
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Improve triggering',
    group: 'analyze',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  const createModes = MODES.filter(m => m.group === 'create');
  const analyzeModes = MODES.filter(m => m.group === 'analyze');

  return (
    <div className="mode-selector">
      <div className="mode-group">
        <div className="mode-group-label">Create & Edit</div>
        <div className="mode-tabs">
          {createModes.map((mode) => (
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
        </div>
      </div>
      <div className="mode-group">
        <div className="mode-group-label">Analyze & Optimize</div>
        <div className="mode-tabs">
          {analyzeModes.map((mode) => (
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
        </div>
      </div>
      <style>{modeSelectorStyles}</style>
    </div>
  );
};

const modeSelectorStyles = `
  .mode-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--background-secondary);
    border-radius: 6px;
  }

  .mode-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .mode-group-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    padding-left: 0.25rem;
  }

  .mode-tabs {
    display: flex;
    gap: 0.375rem;
  }

  .mode-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    padding: 0.5rem 0.75rem;
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
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0;
  }

  .mode-description {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .mode-tab.active .mode-description {
    color: rgba(255, 255, 255, 0.8);
  }
`;
