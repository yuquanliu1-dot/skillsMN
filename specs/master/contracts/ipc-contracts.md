# IPC Contracts: Local Skill Management

**Date**: 2026-03-08
**Feature**: 002-local-skill-management

## Overview

This document defines the IPC (Inter-Process Communication) contracts between the Electron main process (backend) and renderer process (frontend). All communication follows a request/response pattern with standardized error handling.

## Contract Pattern

### Request/Response Format

All IPC handlers follow this pattern:

```typescript
// Request
interface Request {
  [key: string]: any;
}

// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string;
    action: string;
  };
}

// Combined
type Response<T> = SuccessResponse<T> | ErrorResponse;
```

### Error Codes

Standard error codes for consistent error handling:

- `ENOENT` - File or directory not found
- `EACCES` - Permission denied
- `EINVAL` - Invalid input or validation error
- `EEXIST` - File already exists
- `ENOTDIR` - Not a directory
- `EPATH` - Path validation failed (security violation)
- `EPARSE` - File parsing error (invalid YAML/markdown)

## Skill Operations

### skill:list

List all skills from project and global directories.

**Channel**: `skill:list`

**Request**:
```typescript
{
  filter?: {
    source?: 'project' | 'global';
    searchTerm?: string;
  };
  sort?: {
    field: 'name' | 'modifiedAt';
    direction: 'asc' | 'desc';
  };
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    skills: Array<{
      id: string;
      name: string;
      description: string;
      filePath: string;
      source: 'project' | 'global';
      modifiedAt: string;  // ISO 8601
      fileSize: number;
      isValid: boolean;
      validationErrors: string[];
    }>;
    totalCount: number;
    projectCount: number;
    globalCount: number;
  };
}
```

**Errors**:
- `ENOENT` - Skill directory does not exist
- `EACCES` - Cannot read skill directory

---

### skill:create

Create a new skill file.

**Channel**: `skill:create`

**Request**:
```typescript
{
  name: string;              // Skill name (will be converted to kebab-case filename)
  targetDirectory: 'project' | 'global';
  initialContent?: string;   // Optional initial content
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    id: string;
    filePath: string;
    name: string;
  };
}
```

**Errors**:
- `EINVAL` - Invalid skill name (empty or contains invalid characters)
- `EEXIST` - Skill file already exists
- `EPATH` - Target path is outside allowed directories
- `EACCES` - Cannot write to target directory

---

### skill:read

Read skill file content.

**Channel**: `skill:read`

**Request**:
```typescript
{
  filePath: string;  // Absolute path to skill file
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    filePath: string;
    content: string;  // Full file content (frontmatter + markdown)
    metadata: {
      name: string;
      description: string;
    };
  };
}
```

**Errors**:
- `ENOENT` - Skill file does not exist
- `EACCES` - Cannot read skill file
- `EPATH` - Path is outside allowed directories
- `EPARSE` - Invalid YAML frontmatter

---

### skill:update

Update skill file content.

**Channel**: `skill:update`

**Request**:
```typescript
{
  filePath: string;
  content: string;  // Full file content (frontmatter + markdown)
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    filePath: string;
    modifiedAt: string;  // ISO 8601
    fileSize: number;
  };
}
```

**Errors**:
- `ENOENT` - Skill file does not exist
- `EACCES` - Cannot write to skill file
- `EPATH` - Path is outside allowed directories
- `EINVAL` - Content is empty or invalid

---

### skill:delete

Delete a skill file (move to recycle bin).

**Channel**: `skill:delete`

**Request**:
```typescript
{
  filePath: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    filePath: string;
    recycled: true;
  };
}
```

**Errors**:
- `ENOENT` - Skill file does not exist
- `EACCES` - Cannot delete skill file
- `EPATH` - Path is outside allowed directories

---

## Configuration Operations

### config:get

Get current application configuration.

**Channel**: `config:get`

**Request**: `{}` (no parameters)

**Response**:
```typescript
{
  success: true;
  data: {
    projectSkillDir: string;
    globalSkillDir: string;
    defaultInstallTarget: 'project' | 'global';
    editorDefaultMode: 'edit' | 'preview';
    autoRefresh: boolean;
  };
}
```

**Errors**: None (returns default config if not found)

---

### config:set

Update application configuration.

**Channel**: `config:set`

**Request**:
```typescript
{
  projectSkillDir?: string;
  globalSkillDir?: string;
  defaultInstallTarget?: 'project' | 'global';
  editorDefaultMode?: 'edit' | 'preview';
  autoRefresh?: boolean;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    // Updated configuration object
    projectSkillDir: string;
    globalSkillDir: string;
    defaultInstallTarget: 'project' | 'global';
    editorDefaultMode: 'edit' | 'preview';
    autoRefresh: boolean;
  };
}
```

**Errors**:
- `EINVAL` - Invalid configuration value
- `ENOENT` - Directory does not exist (for projectSkillDir)
- `ENOTDIR` - Path is not a directory

---

### config:validate-project-dir

Validate if a directory is a valid Claude project directory.

**Channel**: `config:validate-project-dir`

**Request**:
```typescript
{
  path: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    isValid: boolean;
    hasClaudeFolder: boolean;
    skillsDir: string | null;  // Path to skills directory if valid
    errors: string[];
  };
}
```

**Errors**:
- `ENOENT` - Directory does not exist
- `ENOTDIR` - Path is not a directory
- `EACCES` - Cannot access directory

---

## Directory Operations

### directory:scan

Scan a directory for skill files.

**Channel**: `directory:scan`

**Request**:
```typescript
{
  directoryPath: string;
  recursive?: boolean;  // Default: false
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    directory: string;
    skills: Array<{
      id: string;
      name: string;
      filePath: string;
      modifiedAt: string;
      fileSize: number;
    }>;
    totalCount: number;
    scanDuration: number;  // milliseconds
  };
}
```

**Errors**:
- `ENOENT` - Directory does not exist
- `ENOTDIR` - Path is not a directory
- `EACCES` - Cannot read directory
- `EPATH` - Path is outside allowed directories

---

### directory:start-watch

Start watching a directory for file system changes.

**Channel**: `directory:start-watch`

**Request**:
```typescript
{
  directoryPath: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    watcherId: string;
    directory: string;
  };
}
```

**Events** (sent from main to renderer):
- `directory:change` - File added/modified/deleted

**Errors**:
- `ENOENT` - Directory does not exist
- `EPATH` - Path is outside allowed directories

---

### directory:stop-watch

Stop watching a directory.

**Channel**: `directory:stop-watch`

**Request**:
```typescript
{
  watcherId: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    watcherId: string;
    stopped: true;
  };
}
```

**Errors**:
- `EINVAL` - Invalid watcher ID

---

## Events (Main → Renderer)

### directory:change

Sent when a file system change is detected in a watched directory.

**Event**: `directory:change`

**Payload**:
```typescript
{
  watcherId: string;
  directory: string;
  changes: Array<{
    type: 'add' | 'modify' | 'delete';
    filePath: string;
    timestamp: string;  // ISO 8601
  }>;
}
```

---

## Implementation Notes

### Type Safety

All contracts should be defined in TypeScript:

```typescript
// shared/types.ts
export interface SkillListRequest { /* ... */ }
export interface SkillListResponse { /* ... */ }
// ... etc

// Use in main process
ipcMain.handle('skill:list', async (event, request: SkillListRequest): Promise<SkillListResponse> => {
  // ...
});
```

### Error Handling

```typescript
// Main process
try {
  const result = await skillService.list(request);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof PathValidationError) {
    return {
      success: false,
      error: {
        code: 'EPATH',
        message: error.message,
        userMessage: 'Cannot access file outside skill directories',
        action: 'Select a file within your project or global skill directory.'
      }
    };
  }
  // ... handle other errors
}
```

### Renderer Usage

```typescript
// Renderer process
const response = await ipcRenderer.invoke('skill:list', request);
if (!response.success) {
  showErrorToast(response.error.userMessage, response.error.action);
  return;
}
updateSkillList(response.data.skills);
```

## Performance Requirements

All IPC operations must meet these performance targets:

- `skill:list` - <2000ms for 500 skills
- `skill:create` - <100ms
- `skill:read` - <50ms (file <1MB)
- `skill:update` - <100ms
- `skill:delete` - <100ms
- `config:get` - <10ms
- `config:set` - <50ms
- `directory:scan` - <2000ms for 500 skills
- `directory:start-watch` - <100ms

## Security Requirements

1. **Path Validation**: Every file operation MUST validate the path is within whitelisted directories
2. **No Direct Access**: Renderer process MUST NOT have direct file system access
3. **Input Sanitization**: All inputs MUST be validated before use
4. **Error Messages**: Error messages MUST NOT expose sensitive system paths
5. **Rate Limiting**: Consider rate limiting for frequent operations (e.g., rapid creates)

## Testing Strategy

### Contract Tests

Each IPC channel should have contract tests verifying:
1. Request schema validation
2. Response schema validation
3. Error response format
4. Performance targets
5. Security validations

Example test:
```typescript
describe('skill:list IPC contract', () => {
  it('should return skills array with correct schema', async () => {
    const response = await ipcRenderer.invoke('skill:list', {});
    expect(response.success).toBe(true);
    expect(response.data.skills).toBeInstanceOf(Array);
    expect(response.data.skills[0]).toHaveProperty('id');
    expect(response.data.skills[0]).toHaveProperty('name');
    // ... etc
  });
});
```
