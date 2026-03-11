# IPC Interface Contract: AI-Assisted Skill Generation

**Feature**: 003-ai-skill-generation
**Date**: 2026-03-10
**Version**: 1.0

## Overview

This document defines the IPC (Inter-Process Communication) interface contracts between the Electron main process (backend) and renderer process (frontend) for AI-assisted skill generation.

## IPC Channel Registry

### Command Channels (Request/Response)

| Channel | Direction | Purpose | Payload | Response |
|---------|-----------|---------|---------|----------|
| `ai:generate` | Renderer → Main | Initiate AI generation | `AIGeneratePayload` | `void` (streaming via events) |
| `ai:stop` | Renderer → Main | Stop ongoing generation | `void` | `void` |
| `ai:validate` | Renderer → Main | Validate skill content | `AIValidatePayload` | `ContentValidationResult` |
| `ai:config:get` | Renderer → Main | Get AI configuration | `void` | `AIConfigurationResponse` |
| `ai:config:save` | Renderer → Main | Save AI configuration | `AIConfigurationPayload` | `void` |
| `ai:config:test` | Renderer → Main | Test AI connection | `AIConnectionTestPayload` | `AIConnectionTestResult` |
| `ai:retry` | Renderer → Main | Retry last generation | `AIRetryPayload` | `void` (streaming via events) |

### Event Channels (Streaming/Notifications)

| Channel | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `ai:chunk` | Main → Renderer | Stream content chunk | `AIChunkEvent` |
| `ai:complete` | Main → Renderer | Generation completed | `AICompleteEvent` |
| `ai:error` | Main → Renderer | Generation error | `AIErrorEvent` |
| `ai:progress` | Main → Renderer | Generation progress (optional) | `AIProgressEvent` |

---

## Payload Schemas

### AIGeneratePayload

**Purpose**: Initiate AI generation with prompt and mode

```typescript
interface AIGeneratePayload {
  prompt: string;                // User's natural language prompt (max 2000 chars)
  mode: AIGenerationMode;        // 'new' | 'modify' | 'insert' | 'replace'
  context?: {
    content?: string;            // Current skill content (for modify mode)
    cursorPosition?: number;     // Cursor position (for insert mode)
    selectedText?: string;       // Selected text (for replace mode)
  };
}
```

**Validation**:
- `prompt`: Required, 1-2000 characters
- `mode`: Required, must be valid enum value
- `context.content`: Required when mode='modify'
- `context.cursorPosition`: Required when mode='insert'
- `context.selectedText`: Required when mode='replace'

**Response**: None (void) - Content streams via `ai:chunk` events

**Example**:
```typescript
// Renderer: Initiate new skill generation
ipcRenderer.send('ai:generate', {
  prompt: 'Create a React code review skill with best practices for hooks and state management',
  mode: 'new'
});

// Renderer: Initiate content modification
ipcRenderer.send('ai:generate', {
  prompt: 'Add a troubleshooting section with common issues',
  mode: 'modify',
  context: {
    content: currentSkillContent
  }
});
```

---

### AIChunkEvent

**Purpose**: Stream generated content chunks to frontend

```typescript
interface AIChunkEvent {
  requestId: string;             // Unique request identifier
  sequenceNumber: number;        // Chunk order (1, 2, 3, ...)
  content: string;               // Text content of chunk
  timestamp: number;             // Unix timestamp (ms)
}
```

**Guarantees**:
- Chunks arrive in order (sequenceNumber is sequential)
- Chunks arrive at least 200ms apart (UI update constraint)
- Content is cumulative (frontend must append)

**Example**:
```typescript
// Main process sends chunk
event.reply('ai:chunk', {
  requestId: 'req-123',
  sequenceNumber: 5,
  content: '## Best Practices\n\n',
  timestamp: Date.now()
});

// Renderer receives and accumulates
ipcRenderer.on('ai:chunk', (event, chunk: AIChunkEvent) => {
  setContent(prev => prev + chunk.content);
});
```

---

### AICompleteEvent

**Purpose**: Signal successful generation completion

```typescript
interface AICompleteEvent {
  requestId: string;             // Unique request identifier
  fullContent: string;           // Complete generated content
  validation: ContentValidationResult; // Validation result
  duration: number;              // Total generation time (ms)
  tokenCount?: number;           // Total tokens used (optional)
}
```

**Behavior**:
- Sent after all chunks have been streamed
- Includes full accumulated content for verification
- Includes validation result - frontend must check `validation.valid` before allowing "Apply"

**Example**:
```typescript
// Main process sends completion
event.reply('ai:complete', {
  requestId: 'req-123',
  fullContent: '---\nname: React Code Review\n...\n---\n## Best Practices\n...',
  validation: {
    valid: true,
    frontmatter: { name: 'React Code Review', description: '...' },
    errors: [],
    warnings: []
  },
  duration: 4500,
  tokenCount: 850
});

// Renderer handles completion
ipcRenderer.on('ai:complete', (event, complete: AICompleteEvent) => {
  setIsStreaming(false);
  if (complete.validation.valid) {
    enableApplyButton();
  } else {
    showValidationErrors(complete.validation.errors);
  }
});
```

---

### AIErrorEvent

**Purpose**: Signal generation error

```typescript
interface AIErrorEvent {
  requestId: string;             // Unique request identifier
  error: AIError;                // Error details
  partialContent?: string;       // Partial content (if any)
}

interface AIError {
  type: AIErrorType;             // Error category
  message: string;               // User-friendly message
  technicalDetails?: string;     // Technical details (logging only)
  retryable: boolean;            // Whether retry is possible
}
```

**Error Types**:
```typescript
enum AIErrorType {
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_CREDENTIALS = 'invalid_credentials',
  TIMEOUT = 'timeout',
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  UNKNOWN = 'unknown'
}
```

**Example**:
```typescript
// Main process sends error
event.reply('ai:error', {
  requestId: 'req-123',
  error: {
    type: 'rate_limit',
    message: 'AI API rate limit exceeded. Please wait or check your usage quota.',
    technicalDetails: 'HTTP 429: Rate limit exceeded',
    retryable: true
  },
  partialContent: '---\nname: React Code Review\n...' // Preserve partial work
});

// Renderer handles error
ipcRenderer.on('ai:error', (event, error: AIErrorEvent) => {
  setIsStreaming(false);
  showErrorMessage(error.error.message);
  if (error.error.retryable) {
    enableRetryButton();
  }
  if (error.partialContent) {
    preservePartialContent(error.partialContent);
  }
});
```

---

### AIValidatePayload

**Purpose**: Validate skill content (YAML frontmatter + Markdown)

```typescript
interface AIValidatePayload {
  content: string;               // Skill content to validate
}
```

**Response**: `ContentValidationResult`

```typescript
interface ContentValidationResult {
  valid: boolean;                // Whether content is valid
  frontmatter?: {
    name: string;
    description: string;
    version?: string;
    author?: string;
    tags?: string[];
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  line?: number;
  field?: string;
  message: string;
}

interface ValidationWarning {
  line?: number;
  field?: string;
  message: string;
}
```

**Example**:
```typescript
// Renderer requests validation
const result = await ipcRenderer.invoke('ai:validate', {
  content: '---\nname: Test\n---\n## Content'
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

### AIConfigurationPayload

**Purpose**: Save AI configuration settings

```typescript
interface AIConfigurationPayload {
  provider: 'anthropic';         // Currently only Anthropic supported
  apiKey: string;                // API key (will be encrypted)
  model: string;                 // Model identifier
  streamingEnabled: boolean;     // Enable streaming (default: true)
  timeout?: number;              // Timeout in ms (default: 30000)
}
```

**Security**:
- API key MUST be encrypted using Electron safeStorage
- API key MUST NEVER be returned in responses

**Example**:
```typescript
// Renderer saves configuration
await ipcRenderer.invoke('ai:config:save', {
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-sonnet-20240229',
  streamingEnabled: true,
  timeout: 30000
});
```

---

### AIConfigurationResponse

**Purpose**: Get current AI configuration (without API key)

```typescript
interface AIConfigurationResponse {
  configured: boolean;           // Whether AI is configured
  provider?: 'anthropic';
  model?: string;
  streamingEnabled?: boolean;
  timeout?: number;
  hasApiKey: boolean;            // Whether API key is set (never return actual key)
}
```

**Security**:
- API key is NEVER included in response
- Only `hasApiKey` boolean indicates presence

**Example**:
```typescript
// Renderer gets configuration
const config = await ipcRenderer.invoke('ai:config:get');

if (!config.configured || !config.hasApiKey) {
  showSettingsPrompt('Please configure AI settings');
}
```

---

### AIConnectionTestPayload

**Purpose**: Test AI configuration credentials

```typescript
interface AIConnectionTestPayload {
  apiKey: string;                // API key to test
  model?: string;                // Model to test (optional)
}
```

**Response**: `AIConnectionTestResult`

```typescript
interface AIConnectionTestResult {
  success: boolean;
  error?: AIError;
  latency?: number;              // Response latency in ms
}
```

**Example**:
```typescript
// Renderer tests connection
const result = await ipcRenderer.invoke('ai:config:test', {
  apiKey: 'sk-ant-...',
  model: 'claude-3-sonnet-20240229'
});

if (result.success) {
  showSuccessMessage(`Connection successful (${result.latency}ms)`);
} else {
  showErrorMessage(result.error.message);
}
```

---

### AIRetryPayload

**Purpose**: Retry last generation with same or modified prompt

```typescript
interface AIRetryPayload {
  modifiedPrompt?: string;       // Modified prompt (optional)
  useOriginalPrompt: boolean;    // Use original prompt (default: true)
}
```

**Behavior**:
- If `useOriginalPrompt=true`: Re-sends last prompt
- If `modifiedPrompt` provided: Sends new prompt
- Backend maintains last request context

**Example**:
```typescript
// Renderer retries with original prompt
await ipcRenderer.invoke('ai:retry', {
  useOriginalPrompt: true
});

// Renderer retries with modified prompt
await ipcRenderer.invoke('ai:retry', {
  useOriginalPrompt: false,
  modifiedPrompt: 'Create a React code review skill with more focus on performance'
});
```

---

### AIStopCommand

**Purpose**: Stop ongoing AI generation

**Payload**: None (void)

**Behavior**:
- Cancels current streaming request
- Triggers `ai:error` event with type='CANCELLED'
- Preserves partial content

**Example**:
```typescript
// Renderer stops generation
ipcRenderer.send('ai:stop');

// Main process handles stop
ipcMain.on('ai:stop', (event) => {
  abortController.abort();
  event.reply('ai:error', {
    requestId: currentRequestId,
    error: {
      type: 'CANCELLED',
      message: 'Generation cancelled by user',
      retryable: true
    },
    partialContent: accumulatedContent
  });
});
```

---

## Error Handling Contract

### Error Categories and User Actions

| Error Type | User Action | Retryable | Auto-Retry |
|------------|-------------|-----------|------------|
| `NETWORK_ERROR` | Check connection, retry | ✅ | No |
| `RATE_LIMIT` | Wait, check quota | ✅ | No |
| `INVALID_CREDENTIALS` | Fix API key in settings | ❌ | No |
| `TIMEOUT` | Continue waiting or cancel | ✅ | Prompt user |
| `VALIDATION_ERROR` | Edit content manually | ❌ | No |
| `API_ERROR` | Retry or contact support | ✅ | Yes (1x) |
| `UNKNOWN` | Retry or report bug | ✅ | No |

### Frontend Error Handling Requirements

1. **Display actionable error message** (not technical jargon)
2. **Preserve partial content** when available
3. **Show retry button** when `error.retryable=true`
4. **Log technical details** to console for debugging
5. **Offer manual edit option** for validation errors

### Backend Error Handling Requirements

1. **Catch all errors** and send `ai:error` event
2. **Include partial content** if generation was interrupted
3. **Set retryable flag** based on error type
4. **Log errors with full context** (request ID, timestamp, technical details)
5. **Validate content** before sending `ai:complete`

---

## Performance Requirements

| Operation | Target | Max Allowed |
|-----------|--------|-------------|
| First chunk arrival | ≤2s | ≤5s |
| Chunk interval | 200ms | 500ms |
| Stop generation | ≤500ms | ≤1s |
| Content validation | ≤100ms | ≤500ms |
| Connection test | ≤2s | ≤5s |

---

## Security Requirements

1. **API Key Protection**:
   - API keys MUST be encrypted using Electron safeStorage
   - API keys MUST NEVER be sent to renderer process
   - API keys MUST be validated before saving

2. **Input Validation**:
   - All payloads MUST be validated before processing
   - Prompt length MUST be limited to 2000 characters
   - Content MUST be validated before applying to skill file

3. **Error Messages**:
   - Error messages MUST NOT expose internal system details
   - Technical details MUST be logged separately, not shown to users

---

## Testing Contract

### Unit Tests Required

- [ ] `AIGeneratePayload` validation
- [ ] `AIChunkEvent` accumulation logic
- [ ] `AIError` handling for each error type
- [ ] `ContentValidationResult` parsing
- [ ] `AIConfigurationPayload` encryption/decryption

### Integration Tests Required

- [ ] End-to-end generation flow (prompt → chunks → complete)
- [ ] Stop generation mid-stream
- [ ] Retry generation with same/modified prompt
- [ ] Connection test with valid/invalid credentials
- [ ] Configuration save/load cycle

---

## Version Compatibility

This contract is versioned. Breaking changes require version increment:

- **Major**: Breaking changes to payload structure or channel names
- **Minor**: New optional fields or channels
- **Patch**: Bug fixes, documentation updates

**Current Version**: 1.0.0

---

## Next Steps

This IPC contract defines the communication interface between frontend and backend. The next artifact is `quickstart.md`, which provides a developer quickstart guide for implementing this feature.
