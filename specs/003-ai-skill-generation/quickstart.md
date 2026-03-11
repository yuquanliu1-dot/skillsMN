# Developer Quickstart: AI-Assisted Skill Generation

**Feature**: 003-ai-skill-generation
**Date**: 2026-03-10
**Audience**: Developers implementing this feature

## Prerequisites

Before starting implementation, ensure you have:

1. **Node.js LTS (v20+)** installed
2. **Electron application** running (from 001-skill-manager and 002-local-skill-management)
3. **Claude API access** (API key from Anthropic)
4. **TypeScript 5.x** with strict mode enabled
5. **Jest** testing framework configured

## Quick Start

### 1. Install Dependencies

```bash
# Install Claude Agent SDK
npm install @anthropic-ai/sdk

# Or if claude_agent_sdk is available
npm install claude_agent_sdk

# Install YAML parser (if not already present)
npm install js-yaml

# Install testing utilities
npm install --save-dev @testing-library/react @testing-library/user-event
```

### 2. Backend Implementation (Main Process)

#### Step 2.1: Define Models

Create `src/main/models/AIGenerationRequest.ts`:

```typescript
import { AIGenerationMode } from '../../shared/types';

export interface AIGenerationRequest {
  id: string;
  prompt: string;
  mode: AIGenerationMode;
  skillContext?: {
    content?: string;
    cursorPosition?: number;
    selectedText?: string;
  };
  timestamp: Date;
}

export interface AIConfiguration {
  provider: 'anthropic';
  apiKey: string;
  model: 'claude-3-sonnet-20240229' | 'claude-3-opus-20240229' | 'claude-3-haiku-20240307';
  streamingEnabled: boolean;
  timeout: number;
  maxRetries: number;
}
```

#### Step 2.2: Create AI Service

Create `src/main/services/AIService.ts`:

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { safeStorage } from 'electron';
import { AIGenerationRequest, AIConfiguration } from '../models/AIGenerationRequest';
import { ContentValidationResult } from '../../shared/types';

export class AIService {
  private anthropic: Anthropic | null = null;
  private abortController: AbortController | null = null;
  private config: AIConfiguration | null = null;

  async initialize(config: AIConfiguration): Promise<void> {
    // Decrypt API key
    const apiKey = safeStorage.decryptString(config.apiKey);
    this.anthropic = new Anthropic({ apiKey });
    this.config = config;
  }

  async generateSkill(
    request: AIGenerationRequest,
    onChunk: (chunk: string) => void,
    onComplete: (result: ContentValidationResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.anthropic) {
      throw new Error('AI service not initialized');
    }

    this.abortController = new AbortController();

    try {
      const stream = await this.anthropic.messages.stream({
        model: this.config.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(request)
          }
        ],
        system: this.getSystemPrompt(request.mode)
      }, {
        signal: this.abortController.signal
      });

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const chunk = event.delta.text;
          fullContent += chunk;
          onChunk(chunk);
        }
      }

      // Validate content
      const validation = this.validateContent(fullContent);
      onComplete(validation);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled by user');
      } else {
        onError(error);
      }
    }
  }

  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private buildPrompt(request: AIGenerationRequest): string {
    switch (request.mode) {
      case 'new':
        return request.prompt;
      case 'modify':
        return `Current skill content:\n\n${request.skillContext.content}\n\nModification request: ${request.prompt}`;
      case 'insert':
        return `Insert at position ${request.skillContext.cursorPosition}:\n\n${request.prompt}`;
      case 'replace':
        return `Replace the following text:\n\n${request.skillContext.selectedText}\n\nWith: ${request.prompt}`;
      default:
        return request.prompt;
    }
  }

  private getSystemPrompt(mode: AIGenerationMode): string {
    const basePrompt = `You are a skill creation assistant using the skill-creator skill.
Generate valid skill.md content with YAML frontmatter (name, description) and Markdown body.
Follow the Agent Skills specification format.`;

    const modeSpecific = {
      new: 'Create a new skill from scratch.',
      modify: 'Modify the existing skill content while preserving structure.',
      insert: 'Generate content to insert at a specific location.',
      replace: 'Generate replacement content for the selected text.'
    };

    return `${basePrompt}\n\n${modeSpecific[mode]}`;
  }

  private validateContent(content: string): ContentValidationResult {
    // Implementation from research.md ContentValidationResult section
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) {
      return {
        valid: false,
        errors: [{ message: 'Missing YAML frontmatter' }],
        warnings: []
      };
    }

    try {
      const yaml = require('js-yaml');
      const frontmatter = yaml.load(yamlMatch[1]);

      if (!frontmatter.name || typeof frontmatter.name !== 'string') {
        return {
          valid: false,
          errors: [{ field: 'name', message: 'YAML frontmatter must include "name" field' }],
          warnings: []
        };
      }

      if (!frontmatter.description || typeof frontmatter.description !== 'string') {
        return {
          valid: false,
          errors: [{ field: 'description', message: 'YAML frontmatter must include "description" field' }],
          warnings: []
        };
      }

      return {
        valid: true,
        frontmatter,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Invalid YAML: ${error.message}` }],
        warnings: []
      };
    }
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      return { success: true };
    } catch (error) {
      if (error.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your credentials.' };
      } else if (error.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please wait and try again.' };
      } else {
        return { success: false, error: 'Connection failed. Please check your network.' };
      }
    }
  }
}
```

#### Step 2.3: Create IPC Handlers

Create `src/main/ipc/aiHandlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { AIService } from '../services/AIService';
import { ConfigService } from '../services/ConfigService';
import { AIGenerationRequest, AIConfiguration } from '../models/AIGenerationRequest';

const aiService = new AIService();
const configService = new ConfigService();

export function registerAIHandlers(): void {
  // Generate skill
  ipcMain.on('ai:generate', async (event, payload) => {
    const request: AIGenerationRequest = {
      id: generateUUID(),
      prompt: payload.prompt,
      mode: payload.mode,
      skillContext: payload.context,
      timestamp: new Date()
    };

    await aiService.generateSkill(
      request,
      (chunk) => {
        event.reply('ai:chunk', {
          requestId: request.id,
          sequenceNumber: 1,
          content: chunk,
          timestamp: Date.now()
        });
      },
      (result) => {
        event.reply('ai:complete', {
          requestId: request.id,
          content: result,
          timestamp: Date.now()
        });
      },
      (error) => {
        event.reply('ai:error', {
          requestId: request.id,
          error: {
            type: 'api_error',
            message: error.message,
            retryable: true,
            timestamp: Date.now()
          }
        });
      }
    );
  });

  // Stop generation
  ipcMain.on('ai:stop', (event) => {
    aiService.stopGeneration();
    event.reply('ai:stopped');
  });

  // Validate content
  ipcMain.handle('ai:validate', async (event, payload) => {
    return aiService.validateContent(payload.content);
  });

  // Configuration management
  ipcMain.handle('ai:config:get', async () => {
    return await configService.getAIConfig();
  });

  ipcMain.handle('ai:config:save', async (event, config: AIConfiguration) => {
    await configService.saveAIConfig(config);
    await aiService.initialize(config);
  });

  ipcMain.handle('ai:config:test', async (event, payload) => {
    return await aiService.testConnection(payload.apiKey);
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### 3. Frontend Implementation (Renderer Process)

#### Step 3.1: Create React Hook

Create `src/renderer/hooks/useAIGeneration.ts`:

```typescript
import { useReducer, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { AIGenerationMode, ContentValidationResult } from '../../shared/types';

interface AIState {
  status: 'idle' | 'streaming' | 'complete' | 'error';
  content: string;
  validation?: ContentValidationResult;
  error?: string;
}

type AIAction =
  | { type: 'CHUNK'; chunk: string }
  | { type: 'COMPLETE'; validation: ContentValidationResult }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'CHUNK':
      return { ...state, status: 'streaming', content: state.content + action.chunk };
    case 'COMPLETE':
      return { ...state, status: 'complete', validation: action.validation };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return { status: 'idle', content: '' };
    default:
      return state;
  }
}

export function useAIGeneration() {
  const [state, dispatch] = useReducer(aiReducer, {
    status: 'idle',
    content: ''
  });

  useEffect(() => {
    ipcRenderer.on('ai:chunk', (event, data) => {
      dispatch({ type: 'CHUNK', chunk: data.content });
    });

    ipcRenderer.on('ai:complete', (event, data) => {
      dispatch({ type: 'COMPLETE', validation: data.content });
    });

    ipcRenderer.on('ai:error', (event, data) => {
      dispatch({ type: 'ERROR', error: data.error.message });
    });

    return () => {
      ipcRenderer.removeAllListeners('ai:chunk');
      ipcRenderer.removeAllListeners('ai:complete');
      ipcRenderer.removeAllListeners('ai:error');
    };
  }, []);

  const generate = (prompt: string, mode: AIGenerationMode, context?: any) => {
    dispatch({ type: 'RESET' });
    ipcRenderer.send('ai:generate', { prompt, mode, context });
  };

  const stop = () => {
    ipcRenderer.send('ai:stop');
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  return { ...state, generate, stop, reset };
}
```

#### Step 3.2: Create UI Components

Create `src/renderer/components/AIAssistPanel.tsx`:

```typescript
import React, { useState } from 'react';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { AIGenerationMode } from '../../shared/types';
import PromptInput from './PromptInput';
import ModeSelector from './ModeSelector';
import AIStreamingPreview from './AIStreamingPreview';
import AIControls from './AIControls';

interface AIAssistPanelProps {
  skillContext?: {
    content: string;
    cursorPosition?: number;
    selectedText?: string;
  };
  onApply: (content: string) => void;
  onClose: () => void;
}

export default function AIAssistPanel({ skillContext, onApply, onClose }: AIAssistPanelProps) {
  const [mode, setMode] = useState<AIGenerationMode>('new');
  const [prompt, setPrompt] = useState('');
  const { status, content, validation, error, generate, stop, reset } = useAIGeneration();

  const handleGenerate = () => {
    generate(prompt, mode, skillContext);
  };

  const handleApply = () => {
    if (validation?.valid) {
      onApply(content);
      onClose();
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">AI Assist</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <ModeSelector mode={mode} onModeChange={setMode} />

      <PromptInput
        prompt={prompt}
        onPromptChange={setPrompt}
        disabled={status === 'streaming'}
      />

      <AIStreamingPreview
        content={content}
        status={status}
        error={error}
        validation={validation}
      />

      <AIControls
        status={status}
        canApply={validation?.valid ?? false}
        onGenerate={handleGenerate}
        onStop={stop}
        onApply={handleApply}
        onRetry={handleGenerate}
      />
    </div>
  );
}
```

### 4. Testing

#### Step 4.1: Unit Tests

Create `tests/unit/AIService.test.ts`:

```typescript
import { AIService } from '../../src/main/services/AIService';
import { AIGenerationMode } from '../../src/shared/types';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  test('should validate valid skill content', () => {
    const validContent = `---
name: Test Skill
description: A test skill
---
# Test Skill

This is a test skill.`;

    const result = aiService.validateContent(validContent);
    expect(result.valid).toBe(true);
    expect(result.frontmatter.name).toBe('Test Skill');
  });

  test('should reject invalid YAML', () => {
    const invalidContent = `---
invalid yaml [[[
---
# Test`;

    const result = aiService.validateContent(invalidContent);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should stop generation when requested', () => {
    // Mock streaming test
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    aiService.stopGeneration();
    expect(abortSpy).toHaveBeenCalled();
  });
});
```

### 5. Run and Test

```bash
# Build TypeScript
npm run build

# Run unit tests
npm test

# Start application
npm start

# Test AI generation manually
# 1. Open skill editor
# 2. Click "AI Assist" button (or Ctrl+G)
# 3. Enter prompt and click "Generate"
# 4. Watch streaming content
# 5. Verify content validation
# 6. Click "Apply" to insert content
```

## Common Patterns

### Error Handling

```typescript
// In component
const { error } = useAIGeneration();

if (error) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
      <p>{error}</p>
      <button onClick={reset} className="mt-2 text-sm underline">
        Try again
      </button>
    </div>
  );
}
```

### Performance Optimization

```typescript
// Memoize preview component to prevent unnecessary re-renders
const MemoizedPreview = React.memo(AIStreamingPreview);

// Debounce expensive operations
import { debounce } from 'lodash';

const debouncedValidation = debounce((content) => {
  ipcRenderer.invoke('ai:validate', { content });
}, 300);
```

## Next Steps

1. Implement remaining UI components (PromptInput, ModeSelector, etc.)
2. Add configuration UI to Settings page
3. Write integration tests
4. Add error boundaries
5. Implement keyboard shortcuts (Ctrl+G for AI Assist)
6. Add loading states and progress indicators

## Troubleshooting

### API Key Not Working
- Check if API key is encrypted correctly
- Verify connection test passes
- Check console for error messages

### Streaming Not Working
- Ensure IPC listeners are registered
- Check backend streaming implementation
- Verify AbortController is not already aborted

### Content Validation Failing
- Check YAML syntax in generated content
- Verify required fields (name, description) are present
- Check frontmatter delimiter format (`---`)

## Resources

- [Claude Agent SDK Documentation](https://docs.anthropic.com/claude/docs)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [React Hooks Reference](https://react.dev/reference/react)
- [js-yaml Documentation](https://github.com/nodeca/js-yaml)
