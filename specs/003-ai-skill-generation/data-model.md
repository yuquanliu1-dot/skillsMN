# Data Model: AI-Assisted Skill Generation

**Feature**: 003-ai-skill-generation
**Date**: 2026-03-10
**Version**: 1.0

## Overview

This document defines the data entities, their relationships, validation rules, and state transitions for the AI-assisted skill generation feature.

## Entities

### 1. AIGenerationRequest

**Description**: Represents a user request to generate or modify skill content using AI.

**Fields**:
```typescript
interface AIGenerationRequest {
  id: string;                    // Unique identifier (UUID)
  prompt: string;                // User's natural language prompt (max 2000 chars)
  mode: AIGenerationMode;        // Generation mode (new, modify, insert, replace)
  skillContext?: SkillContext;   // Current skill content (for modify mode)
  cursorPosition?: number;       // Cursor position in editor (for insert mode)
  selectedText?: string;         // Selected text range (for replace mode)
  timestamp: Date;               // Request creation timestamp
}
```

**Validation Rules**:
- `prompt`: Required, non-empty, max 2000 characters
- `mode`: Must be one of: 'new', 'modify', 'insert', 'replace'
- `skillContext`: Required when mode is 'modify'
- `cursorPosition`: Required when mode is 'insert'
- `selectedText`: Required when mode is 'replace'
- `timestamp`: Auto-generated on creation

**State Transitions**:
```
Created → Streaming → Complete
                ↓
              Cancelled (user stops generation)
                ↓
               Error (network/API failure)
```

---

### 2. AIGenerationMode (Enum)

**Description**: Defines the type of AI generation operation.

**Values**:
```typescript
enum AIGenerationMode {
  NEW = 'new',           // Generate new skill from scratch
  MODIFY = 'modify',     // Modify existing skill content
  INSERT = 'insert',     // Insert content at cursor position
  REPLACE = 'replace'    // Replace selected text
}
```

**Usage Context**:
- **NEW**: Used when creating a new skill file
- **MODIFY**: Used when skill editor has existing content
- **INSERT**: Used when cursor is at a specific position
- **REPLACE**: Used when user has selected text in editor

---

### 3. SkillContext

**Description**: Represents the current state of a skill being edited.

**Fields**:
```typescript
interface SkillContext {
  content: string;              // Current skill.md content (YAML + Markdown)
  directoryName?: string;       // Skill directory name (if skill exists)
  hasUnsavedChanges: boolean;   // Whether editor has unsaved modifications
}
```

**Validation Rules**:
- `content`: Required, must be valid skill structure (YAML frontmatter + Markdown)
- `directoryName`: Optional, must be filesystem-safe if provided
- `hasUnsavedChanges: boolean` - Used to prompt user before destructive operations

---

### 4. AIGenerationResponse

**Description**: Represents the streamed response from AI generation.

**Fields**:
```typescript
interface AIGenerationResponse {
  requestId: string;            // Matches AIGenerationRequest.id
  status: AIResponseStatus;     // Current generation status
  content: string;              // Accumulated generated content
  chunks: AIContentChunk[];     // Array of received chunks (for debugging)
  validationErrors?: string[];  // Validation errors (if any)
  completedAt?: Date;           // Completion timestamp
  error?: AIError;              // Error details (if failed)
}

enum AIResponseStatus {
  STREAMING = 'streaming',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}
```

**Validation Rules**:
- `requestId`: Required, must match an existing request
- `status`: Must be valid enum value
- `content`: Accumulated content from all chunks
- `chunks`: Array of received chunks (for debugging/replay)
- `validationErrors`: Populated after streaming completes, before "Apply" allowed
- `completedAt`: Set when status is COMPLETE, CANCELLED, or ERROR
- `error`: Set when status is ERROR

**State Transitions**:
```
STREAMING → COMPLETE (successful generation)
    ↓
CANCELLED (user stops)
    ↓
ERROR (network/API failure)
```

---

### 5. AIContentChunk

**Description**: Represents a single chunk of streamed content from AI.

**Fields**:
```typescript
interface AIContentChunk {
  sequenceNumber: number;       // Chunk order (1, 2, 3, ...)
  content: string;              // Text content of chunk
  timestamp: Date;              // When chunk was received
  tokenCount?: number;          // Number of tokens in chunk (optional)
}
```

**Validation Rules**:
- `sequenceNumber`: Required, sequential starting from 1
- `content`: Required, non-empty string
- `timestamp`: Auto-generated when chunk received
- `tokenCount`: Optional, estimated token count

---

### 6. AIConfiguration

**Description**: User's AI service configuration settings.

**Fields**:
```typescript
interface AIConfiguration {
  provider: AIProvider;         // AI service provider
  apiKey: string;               // Encrypted API key (never exposed to frontend)
  model: AIModel;               // Selected AI model
  streamingEnabled: boolean;    // Whether to stream responses (default: true)
  timeout: number;              // Generation timeout in ms (default: 30000)
  maxRetries: number;           // Max retry attempts (default: 2)
}

enum AIProvider {
  ANTHROPIC = 'anthropic'
}

enum AIModel {
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}
```

**Validation Rules**:
- `provider`: Required, currently only ANTHROPIC supported
- `apiKey`: Required, must be valid Anthropic API key format (sk-ant-...)
- `model`: Required, must be valid model identifier
- `streamingEnabled`: Default true
- `timeout`: Default 30000ms, min 5000ms, max 60000ms
- `maxRetries`: Default 2, min 0, max 5

**Security Requirements**:
- API key MUST be encrypted using Electron safeStorage before storage
- API key MUST NEVER be exposed to frontend process
- API key MUST be validated using connection test before saving

---

### 7. AIError

**Description**: Represents an error during AI generation.

**Fields**:
```typescript
interface AIError {
  type: AIErrorType;            // Error category
  message: string;              // User-friendly error message
  technicalDetails?: string;    // Technical details (for logging)
  retryable: boolean;           // Whether operation can be retried
  timestamp: Date;              // When error occurred
}

enum AIErrorType {
  NETWORK_ERROR = 'network_error',           // Network connection lost
  RATE_LIMIT = 'rate_limit',                 // API rate limit exceeded
  INVALID_CREDENTIALS = 'invalid_credentials', // Invalid API key
  TIMEOUT = 'timeout',                       // Generation timeout
  VALIDATION_ERROR = 'validation_error',     // Content validation failed
  API_ERROR = 'api_error',                   // Generic API error
  UNKNOWN = 'unknown'                        // Unknown error
}
```

**Validation Rules**:
- `type`: Required, must be valid enum value
- `message`: Required, user-friendly message
- `technicalDetails`: Optional, for logging purposes
- `retryable`: Required, determines if retry button should be shown
- `timestamp`: Auto-generated

**Error Messages** (User-Facing):
- `NETWORK_ERROR`: "Connection lost. Please check your network and try again."
- `RATE_LIMIT`: "AI API rate limit exceeded. Please wait or check your usage quota."
- `INVALID_CREDENTIALS`: "Invalid API key. Please check your credentials in Settings."
- `TIMEOUT`: "Generation is taking longer than expected. Continue waiting or cancel?"
- `VALIDATION_ERROR`: "Generated content has invalid YAML. Please review and edit manually."
- `API_ERROR`: "AI service error. Please try again later."
- `UNKNOWN`: "An unexpected error occurred. Please try again."

---

### 8. ContentValidationResult

**Description**: Result of validating AI-generated skill content.

**Fields**:
```typescript
interface ContentValidationResult {
  valid: boolean;               // Whether content is valid
  frontmatter?: SkillFrontmatter; // Parsed YAML frontmatter (if valid)
  errors: ValidationError[];    // Array of validation errors
  warnings: ValidationWarning[]; // Array of warnings (non-blocking)
}

interface SkillFrontmatter {
  name: string;                 // Skill name (required)
  description: string;          // Skill description (required)
  version?: string;              // Skill version (optional)
  author?: string;               // Author name (optional)
  tags?: string[];               // Skill tags (optional)
}

interface ValidationError {
  line?: number;                // Line number where error occurred
  field?: string;               // Field name (for YAML errors)
  message: string;              // Error description
}

interface ValidationWarning {
  line?: number;
  field?: string;
  message: string;
}
```

**Validation Rules**:
- Content must have valid YAML frontmatter enclosed in `---` delimiters
- Frontmatter must include `name` (string, non-empty)
- Frontmatter must include `description` (string, non-empty)
- Body must be valid Markdown (warnings only, not errors)

---

### 9. AIConnectionTestResult

**Description**: Result of testing AI configuration credentials.

**Fields**:
```typescript
interface AIConnectionTestResult {
  success: boolean;             // Whether connection test succeeded
  error?: AIError;              // Error details (if failed)
  latency?: number;             // Response latency in ms (if successful)
}
```

**Validation Rules**:
- `success`: Required
- `error`: Set when success is false
- `latency`: Set when success is true, response time in milliseconds

---

## Entity Relationships

```
AIGenerationRequest (1) ──→ (1) AIGenerationResponse
         │                          │
         │                          ├─→ (many) AIContentChunk
         │                          │
         │                          └─→ (0..1) AIError
         │
         └─→ (0..1) SkillContext

AIConfiguration (1) ──→ (many) AIGenerationRequest

AIGenerationResponse (1) ──→ (0..1) ContentValidationResult
```

## Data Flow

1. **User initiates generation**:
   - Frontend creates `AIGenerationRequest` with mode, prompt, and context
   - Request sent to backend via IPC (`ai:generate`)

2. **Backend processes request**:
   - Backend creates `AIGenerationResponse` with status=STREAMING
   - Calls Claude Agent SDK with skill-creator integration
   - Streams chunks back to frontend via IPC (`ai:chunk`)

3. **Frontend receives chunks**:
   - Accumulates content in `AIGenerationResponse.content`
   - Stores chunks in `AIGenerationResponse.chunks`
   - Updates UI in real-time

4. **Generation completes**:
   - Backend validates content, populates `validationErrors` if any
   - Sets `status=COMPLETE` or `ERROR`
   - Sends final response via IPC (`ai:complete` or `ai:error`)

5. **User applies content**:
   - Frontend checks `validationErrors`
   - If errors, displays them and prevents apply
   - If valid, inserts/replaces content in editor

6. **User saves skill**:
   - Editor saves to skill.md file
   - Backend auto-generates directory name from YAML frontmatter name
   - If directory exists, appends numeric suffix

## Validation Summary

| Entity | Critical Validations | Optional Validations |
|--------|---------------------|----------------------|
| AIGenerationRequest | prompt length ≤2000, mode valid, required context by mode | - |
| AIGenerationResponse | status valid, content accumulated correctly | validation errors |
| AIConfiguration | API key format, provider/model valid | timeout/retry ranges |
| ContentValidationResult | YAML syntax, required frontmatter fields | Markdown warnings |
| AIError | type valid, message present | technical details |

## Next Steps

This data model defines all entities and their relationships. The next artifact is the `contracts/` directory, which defines the IPC interface contracts between frontend and backend.
