# Research: AI-Assisted Skill Generation

**Feature**: 003-ai-skill-generation
**Date**: 2026-03-10
**Status**: Phase 0 Complete

## Research Questions

### 1. Claude Agent SDK Integration Pattern

**Decision**: Use Claude Agent SDK as a backend service wrapper with streaming support

**Rationale**:
- Claude Agent SDK provides official TypeScript support and streaming APIs
- Backend integration ensures API keys are never exposed to frontend (security requirement)
- SDK handles authentication, request formatting, and error handling
- Streaming support built-in via async iterators or event emitters

**Alternatives Considered**:
- Direct Claude API calls: Rejected - more boilerplate, harder to maintain, less type-safe
- LangChain integration: Rejected - adds unnecessary abstraction layer, Claude Agent SDK is purpose-built
- OpenAI SDK: Rejected - not compatible with Claude models

**Implementation Notes**:
- Install `@anthropic-ai/sdk` package (or `claude_agent_sdk` if available)
- Create `AIService.ts` in backend to wrap SDK calls
- Use streaming API: `anthropic.messages.stream()` or equivalent
- Pass `skill-creator` skill reference in system prompt or metadata

### 2. Streaming Response Architecture in Electron

**Decision**: Use IPC with Event Emitter pattern for real-time streaming

**Rationale**:
- Electron IPC supports event-based communication
- Main process can emit chunks as they arrive from Claude API
- Renderer process subscribes to chunk events and updates UI
- Clean separation between streaming logic and UI rendering

**Alternatives Considered**:
- WebSocket connection: Rejected - overkill for local IPC, adds complexity
- Polling: Rejected - inefficient, high latency, doesn't meet 200ms chunk requirement
- Shared memory/Buffer: Rejected - complex, not idiomatic for Electron

**Implementation Pattern**:
```typescript
// Main process (AIService.ts)
ipcMain.on('ai:generate', async (event, prompt) => {
  const stream = await anthropic.messages.stream(...);
  stream.on('textChunk', (chunk) => {
    event.reply('ai:chunk', chunk);
  });
  stream.on('end', () => {
    event.reply('ai:complete');
  });
});

// Renderer process (aiClient.ts)
ipcRenderer.on('ai:chunk', (chunk) => {
  updatePreview(chunk);
});
```

**Performance Considerations**:
- Ensure chunks are small enough to avoid IPC bottlenecks (<10KB per chunk)
- Debounce UI updates if needed (but maintain 200ms minimum display interval)
- Clean up event listeners on component unmount

### 3. AI Configuration Management

**Decision**: Use existing ConfigService pattern with Electron safeStorage for API keys

**Rationale**:
- Consistency with existing configuration management (002-local-skill-management)
- safeStorage provides OS-level encryption (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux)
- JSON configuration file for non-sensitive settings (model selection, streaming toggle)
- Encrypted storage for API keys

**Alternatives Considered**:
- Environment variables: Rejected - not suitable for desktop apps, requires restart
- LocalStorage: Rejected - not secure for API keys, renderer-process only
- Electron-store: Rejected - doesn't encrypt by default, need safeStorage anyway

**Implementation Pattern**:
```typescript
// ConfigService.ts
export class ConfigService {
  private safeStorage: Electron.SafeStorage;

  async saveAIConfig(config: AIConfiguration): Promise<void> {
    // Save non-sensitive settings to JSON
    await fs.writeJSON('ai-config.json', {
      provider: config.provider,
      model: config.model,
      streamingEnabled: config.streamingEnabled
    });

    // Encrypt and save API key
    const encrypted = this.safeStorage.encryptString(config.apiKey);
    await fs.writeJSON('ai-credentials.enc', { apiKey: encrypted });
  }

  async loadAIConfig(): Promise<AIConfiguration> {
    const config = await fs.readJSON('ai-config.json');
    const credentials = await fs.readJSON('ai-credentials.enc');
    const apiKey = this.safeStorage.decryptString(credentials.apiKey);
    return { ...config, apiKey };
  }
}
```

### 4. Real-Time Preview UI Pattern in React

**Decision**: Use controlled component with streaming state and memoized rendering

**Rationale**:
- React's controlled components provide predictable state management
- Memoization prevents unnecessary re-renders during streaming
- useReducer hook manages complex streaming state (idle, streaming, complete, error)
- useRef stores partial content to avoid state thrashing

**Alternatives Considered**:
- Uncontrolled component with direct DOM updates: Rejected - loses React benefits, harder to test
- Third-party streaming library: Rejected - adds dependency, streaming logic is straightforward
- Web Workers: Rejected - unnecessary complexity for text rendering

**Implementation Pattern**:
```typescript
// useAIGeneration.ts hook
interface AIState {
  status: 'idle' | 'streaming' | 'complete' | 'error';
  content: string;
  error?: string;
}

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'CHUNK':
      return { ...state, content: state.content + action.chunk };
    case 'COMPLETE':
      return { ...state, status: 'complete' };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return { status: 'idle', content: '' };
    default:
      return state;
  }
}

export function useAIGeneration() {
  const [state, dispatch] = useReducer(aiReducer, { status: 'idle', content: '' });

  useEffect(() => {
    ipcRenderer.on('ai:chunk', (chunk) => {
      dispatch({ type: 'CHUNK', chunk });
    });
    return () => ipcRenderer.removeAllListeners('ai:chunk');
  }, []);

  return state;
}
```

**Performance Optimizations**:
- Use `React.memo` for preview component to prevent parent re-renders
- Debounce syntax highlighting updates (Monaco Editor)
- Virtual scrolling not needed for single preview panel

### 5. API Key Validation and Testing

**Decision**: Implement connection test endpoint that makes minimal API call

**Rationale**:
- Validates credentials before user attempts generation
- Provides immediate feedback on configuration errors
- Minimal API call (small prompt, 1 token) to reduce costs
- Clear error messages for common issues (invalid key, rate limit, network error)

**Implementation Pattern**:
```typescript
// AIService.ts
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
```

### 6. Content Validation Strategy

**Decision**: Validate YAML frontmatter before allowing "Apply" action

**Rationale**:
- Prevents users from applying malformed content to skill files
- Catches errors early (AI can occasionally generate invalid YAML)
- Provides actionable error messages with line numbers
- Uses existing YAML parser (js-yaml library)

**Implementation Pattern**:
```typescript
// ContentValidator.ts
export function validateSkillContent(content: string): ValidationResult {
  // Extract YAML frontmatter
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!yamlMatch) {
    return { valid: false, error: 'Missing YAML frontmatter' };
  }

  try {
    const frontmatter = yaml.load(yamlMatch[1]);

    // Validate required fields
    if (!frontmatter.name || typeof frontmatter.name !== 'string') {
      return { valid: false, error: 'YAML frontmatter must include "name" field' };
    }
    if (!frontmatter.description || typeof frontmatter.description !== 'string') {
      return { valid: false, error: 'YAML frontmatter must include "description" field' };
    }

    return { valid: true, frontmatter };
  } catch (error) {
    return { valid: false, error: `Invalid YAML: ${error.message}` };
  }
}
```

### 7. Error Handling and Recovery

**Decision**: Graceful degradation with partial content preservation and retry mechanism

**Rationale**:
- Network interruptions and API errors are inevitable
- Preserving partial content allows users to salvage work
- Retry mechanism reduces frustration from transient errors
- Clear error categorization guides user action

**Error Categories**:
1. **Network errors**: "Connection lost. Partial content preserved. Click Retry to regenerate."
2. **Rate limits**: "AI API rate limit exceeded. Please wait or check your usage quota."
3. **Invalid credentials**: "Invalid API key. Please check your credentials in Settings."
4. **Timeout**: "Generation is taking longer than expected. Continue waiting or cancel?"
5. **Content validation**: "Generated content has invalid YAML. Please review and edit manually."

**Recovery Strategies**:
- All errors preserve partial content in preview
- Retry button re-sends same prompt
- Regenerate button allows prompt editing before retry
- Manual edit option for validation errors

### 8. Stop Generation Implementation

**Decision**: Use AbortController pattern with SDK cancellation support

**Rationale**:
- AbortController is standard pattern for cancelling async operations
- Claude Agent SDK supports abort signals
- Clean cancellation without leaving hanging requests
- Preserves partial content for user review

**Implementation Pattern**:
```typescript
// AIService.ts
private abortController: AbortController | null = null;

async generateSkill(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
  this.abortController = new AbortController();

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }, {
      signal: this.abortController.signal
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        onChunk(event.delta.text);
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Generation cancelled by user');
    } else {
      throw error;
    }
  }
}

stopGeneration(): void {
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }
}
```

## Technology Stack Confirmation

Based on research findings, the following technology choices are confirmed:

**Backend (Main Process)**:
- Node.js LTS (v20+) with TypeScript 5.x
- `@anthropic-ai/sdk` or `claude_agent_sdk` for Claude integration
- Electron safeStorage for credential encryption
- js-yaml for content validation

**Frontend (Renderer Process)**:
- React 18+ with hooks (useReducer, useEffect, useRef)
- Monaco Editor for skill file editing
- Tailwind CSS for styling
- IPC renderer for communication with backend

**IPC Layer**:
- Event-based streaming pattern (ipcMain/ipcRenderer)
- Well-defined channels: `ai:generate`, `ai:chunk`, `ai:complete`, `ai:error`, `ai:stop`
- Typed interfaces for all IPC messages

**Testing**:
- Jest for unit tests (backend services, React hooks)
- React Testing Library for component tests
- Spectron or Playwright for integration tests (optional)

## Open Questions Resolved

1. **Q: How to handle directory name conflicts when creating new skills?**
   - **A**: Auto-append numeric suffix (e.g., `react-code-review-2`, `react-code-review-3`)
   - **Implementation**: Inherited from 002-local-skill-management, apply during save operation

2. **Q: What sanitization rules for skill names to directory names?**
   - **A**: Lowercase alphanumeric, hyphens, underscores only; spaces → hyphens; truncate to 255 chars
   - **Implementation**: Utility function in backend, applied before directory creation

3. **Q: How to handle AI generation timeout?**
   - **A**: 30s timeout with modal prompt: "Continue waiting or cancel?"
   - **Implementation**: Timer in frontend, pause/continue options, preserve partial content

4. **Q: How to validate AI-generated content before applying?**
   - **A**: Validate YAML frontmatter, check required fields, display errors, allow manual edit
   - **Implementation**: ContentValidator service, called before "Apply" action

5. **Q: How to support different AI generation modes (new/modify/insert/replace)?**
   - **A**: Mode selector in UI, pass mode + context to backend, AI constructs appropriate prompt
   - **Implementation**: AIGenerationMode enum, context-aware prompt construction in AIService

## Dependencies

**New Dependencies**:
- `@anthropic-ai/sdk` or `claude_agent_sdk`: Claude Agent SDK integration
- `js-yaml`: YAML parsing and validation (if not already installed)
- `abort-controller`: Polyfill for AbortController (if needed for Node.js < 15)

**Existing Dependencies** (from 001 and 002):
- `electron`: Desktop application framework
- `react`: UI framework
- `typescript`: Type-safe development
- `tailwindcss`: Styling
- `monaco-editor`: Code editor component
- `jest`: Testing framework

## Next Steps

Phase 0 research is complete. All technical decisions are documented and justified. Proceed to Phase 1 to create:
1. `data-model.md`: Define entities (AIGenerationRequest, AIConfiguration, etc.)
2. `contracts/`: Define IPC interface contracts
3. `quickstart.md`: Developer quickstart guide
4. Update agent context with new technologies
