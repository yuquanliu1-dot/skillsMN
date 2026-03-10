# IPC Contracts: Claude Code Skill Management Center

**Feature**: 001-skill-manager
**Date**: 2026-03-10

This document defines the IPC (Inter-Process Communication) contracts between the Electron main process (backend) and renderer process (frontend). All communication uses Electron's IPC API with strict typing.

## Overview

- **Pattern**: Request-response for operations, event streaming for long-running tasks
- **Security**: All file operations validated against allowed directories
- **Error Handling**: All handlers return Result types with error information
- **Type Safety**: TypeScript interfaces shared between main and renderer processes

## Contract Definitions

### Skill Management

#### `skill:list`

**Description**: Retrieve all skills from project and global directories

**Request**: None

**Response**:
```typescript
interface SkillListResponse {
  skills: Skill[];
  errors: SkillScanError[];
}

interface SkillScanError {
  path: string;
  error: string;
}
```

**Errors**:
- `PERMISSION_DENIED`: Cannot access skill directory
- `DIRECTORY_NOT_FOUND`: Configured directory does not exist

---

#### `skill:get`

**Description**: Load full skill content (markdown body) for editing

**Request**:
```typescript
interface SkillGetRequest {
  skillId: string;
}
```

**Response**:
```typescript
interface SkillGetResponse {
  skill: Skill;
}
```

**Errors**:
- `SKILL_NOT_FOUND`: Skill does not exist
- `FILE_READ_ERROR`: Cannot read skill.md file
- `INVALID_PATH`: Path outside allowed directories

---

#### `skill:create`

**Description**: Create new skill directory with template skill.md

**Request**:
```typescript
interface SkillCreateRequest {
  name: string;
  description: string;
  directory: 'project' | 'global';
}
```

**Response**:
```typescript
interface SkillCreateResponse {
  skill: Skill;
}
```

**Errors**:
- `INVALID_NAME`: Name does not meet validation rules
- `DIRECTORY_EXISTS`: Directory already exists
- `PERMISSION_DENIED`: Cannot create directory
- `INVALID_PATH`: Path outside allowed directories

---

#### `skill:save`

**Description**: Save skill content to file

**Request**:
```typescript
interface SkillSaveRequest {
  skillId: string;
  content: string;
}
```

**Response**:
```typescript
interface SkillSaveResponse {
  skill: Skill;
}
```

**Errors**:
- `SKILL_NOT_FOUND`: Skill does not exist
- `FILE_WRITE_ERROR`: Cannot write to file
- `VALIDATION_ERROR`: Content has invalid frontmatter
- `INVALID_PATH`: Path outside allowed directories
- `CONCURRENT_MODIFICATION`: File changed externally (conflict)

---

#### `skill:delete`

**Description**: Move skill to system recycle bin

**Request**:
```typescript
interface SkillDeleteRequest {
  skillId: string;
}
```

**Response**:
```typescript
interface SkillDeleteResponse {
  success: boolean;
}
```

**Errors**:
- `SKILL_NOT_FOUND`: Skill does not exist
- `DELETE_ERROR`: Cannot move to recycle bin
- `INVALID_PATH`: Path outside allowed directories

---

### GitHub Integration

#### `github:search`

**Description**: Search GitHub for public repositories with skill files

**Request**:
```typescript
interface GitHubSearchRequest {
  query: string;
}
```

**Response**:
```typescript
interface GitHubSearchResponse {
  results: SearchResult[];
  rateLimit: RateLimitInfo;
}

interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
}
```

**Errors**:
- `RATE_LIMIT_EXCEEDED`: GitHub API rate limit exceeded
- `NETWORK_ERROR`: Cannot connect to GitHub API
- `INVALID_QUERY`: Search query is invalid

---

#### `github:preview`

**Description**: Preview skill.md content from GitHub without downloading full repository

**Request**:
```typescript
interface GitHubPreviewRequest {
  repositoryName: string;
  filePath: string;
}
```

**Response**:
```typescript
interface GitHubPreviewResponse {
  content: string;
}
```

**Errors**:
- `FILE_NOT_FOUND`: Skill file does not exist
- `NETWORK_ERROR`: Cannot fetch content
- `RATE_LIMIT_EXCEEDED`: GitHub API rate limit exceeded

---

#### `github:install`

**Description**: Install skill directory from GitHub repository

**Request**:
```typescript
interface GitHubInstallRequest {
  repositoryName: string;
  directoryPath: string;
  targetDirectory: 'project' | 'global';
  conflictResolution?: 'overwrite' | 'rename' | 'skip';
}
```

**Response**:
```typescript
interface GitHubInstallResponse {
  skill: Skill;
  conflictDetected: boolean;
  resolution?: 'renamed' | 'overwritten';
}
```

**Errors**:
- `DOWNLOAD_ERROR`: Cannot download skill directory
- `CONFLICT_UNRESOLVED`: Directory exists and no resolution specified
- `PERMISSION_DENIED`: Cannot write to target directory
- `INVALID_PATH`: Path outside allowed directories
- `NETWORK_ERROR`: Cannot connect to GitHub

---

#### `github:configure-private`

**Description**: Configure private repository with PAT

**Request**:
```typescript
interface ConfigurePrivateRepoRequest {
  url: string;
  pat: string;
}
```

**Response**:
```typescript
interface ConfigurePrivateRepoResponse {
  repository: PrivateRepository;
}
```

**Errors**:
- `INVALID_URL`: URL is not a valid GitHub repository
- `AUTH_FAILED`: PAT does not have access to repository
- `ENCRYPTION_ERROR`: Cannot encrypt PAT

---

#### `github:list-private`

**Description**: List skills in configured private repository

**Request**:
```typescript
interface ListPrivateRepoRequest {
  repositoryId: string;
}
```

**Response**:
```typescript
interface ListPrivateRepoResponse {
  skills: SkillMetadata[];
}
```

**Errors**:
- `REPO_NOT_FOUND`: Repository not configured
- `AUTH_FAILED`: PAT invalid or expired
- `NETWORK_ERROR`: Cannot connect to GitHub

---

#### `github:update-private`

**Description**: Update skill from private repository (detect changes via commit hash)

**Request**:
```typescript
interface UpdatePrivateSkillRequest {
  skillId: string;
}
```

**Response**:
```typescript
interface UpdatePrivateSkillResponse {
  skill: Skill;
  updateAvailable: boolean;
}
```

**Errors**:
- `SKILL_NOT_FOUND`: Skill does not exist
- `NO_UPDATES`: No updates available
- `DOWNLOAD_ERROR`: Cannot download updated skill
- `AUTH_FAILED`: PAT invalid or expired

---

### AI Generation

#### `ai:generate`

**Description**: Start AI generation with streaming response

**Request**:
```typescript
interface AIGenerateRequest {
  prompt: string;
  mode: 'new' | 'modify' | 'insert' | 'replace';
  currentContent?: string;
  selectionStart?: number;
  selectionEnd?: number;
}
```

**Response**: None (streaming via events)

**Streaming Events**:
```typescript
// Main process sends chunks
interface AIChunkEvent {
  type: 'ai:chunk';
  chunk: string;
}

// Generation complete
interface AICompleteEvent {
  type: 'ai:complete';
  fullContent: string;
}

// Generation error
interface AIErrorEvent {
  type: 'ai:error';
  error: string;
}

// Generation cancelled by user
interface AICancelEvent {
  type: 'ai:cancel';
}
```

**Errors**:
- `API_KEY_INVALID`: AI API key is invalid
- `TIMEOUT`: Generation exceeded timeout
- `RATE_LIMIT_EXCEEDED`: AI API rate limit exceeded
- `NETWORK_ERROR`: Cannot connect to AI API
- `GENERATION_FAILED`: AI generation failed

---

#### `ai:cancel`

**Description**: Cancel ongoing AI generation

**Request**: None (uses session context)

**Response**:
```typescript
interface AICancelResponse {
  success: boolean;
  partialContent?: string;
}
```

---

### Configuration Management

#### `config:get`

**Description**: Get current configuration

**Request**: None

**Response**:
```typescript
interface ConfigGetResponse {
  config: Configuration;
}
```

---

#### `config:update`

**Description**: Update configuration

**Request**:
```typescript
interface ConfigUpdateRequest {
  updates: Partial<Configuration>;
}
```

**Response**:
```typescript
interface ConfigUpdateResponse {
  config: Configuration;
}
```

**Errors**:
- `VALIDATION_ERROR`: Configuration validation failed
- `PERMISSION_DENIED`: Cannot write config file

---

#### `config:select-project`

**Description**: Select project directory with Claude validation

**Request**:
```typescript
interface SelectProjectRequest {
  // No parameters, opens native file dialog
}
```

**Response**:
```typescript
interface SelectProjectResponse {
  path: string;
  isValid: boolean;
  error?: string;
}
```

**Errors**:
- `DIALOG_CANCELLED`: User cancelled file dialog
- `NOT_CLAUDE_PROJECT`: Selected directory is not a Claude project

---

#### `config:test-ai`

**Description**: Test AI API connection

**Request**: None (uses configured credentials)

**Response**:
```typescript
interface TestAIResponse {
  success: boolean;
  model: string;
  error?: string;
}
```

**Errors**:
- `API_KEY_INVALID`: API key is invalid
- `NETWORK_ERROR`: Cannot connect to AI API

---

### File System Events

#### `fs:skill-changed` (Event from main to renderer)

**Description**: Notify renderer when skill files change externally

**Event**:
```typescript
interface SkillChangedEvent {
  type: 'add' | 'change' | 'unlink';
  skillId?: string;
  path: string;
}
```

---

## Shared Type Definitions

```typescript
// Common types used across IPC contracts

interface Skill {
  id: string;
  directoryPath: string;
  directoryName: string;
  name: string;
  description: string;
  content: string | null;
  source: 'project' | 'global' | 'private-repo' | 'public-repo';
  sourceRepository: string | null;
  lastModified: Date;
  totalSize: number;
  fileCount: number;
  validationStatus: 'valid' | 'invalid-frontmatter' | 'missing-file';
  validationErrors: string[];
}

interface SearchResult {
  repositoryName: string;
  repositoryUrl: string;
  description: string;
  stars: number;
  skillFiles: SkillFileMatch[];
}

interface SkillFileMatch {
  path: string;
  directoryPath: string;
  downloadUrl: string;
  lastModified: Date;
}

interface PrivateRepository {
  id: string;
  url: string;
  owner: string;
  name: string;
  patLastFour: string;
  lastSynced: Date | null;
  skills: SkillMetadata[];
  isAccessible: boolean;
}

interface SkillMetadata {
  path: string;
  name: string;
  description: string;
  lastCommitDate: Date;
  lastCommitHash: string;
}

interface Configuration {
  projectDirectory: string | null;
  globalDirectory: string;
  defaultInstallDirectory: 'project' | 'global';
  aiProvider: 'anthropic';
  aiApiKey: string; // Placeholder, actual key encrypted
  aiModel: string;
  aiTimeout: number;
  githubPat: string | null; // Placeholder, actual key encrypted
  privateRepositories: PrivateRepository[];
  theme: 'dark' | 'light' | 'system';
  editorFontSize: number;
  editorTabSize: number;
}
```

## Error Handling Convention

All IPC handlers follow this error handling pattern:

```typescript
type IPCResult<T> =
  | { success: true; data: T }
  | { success: false; error: IPCError };

interface IPCError {
  code: string;
  message: string;
  details?: any;
}
```

## Security Requirements

1. **Path Validation**: All file operations MUST validate paths are within allowed directories
2. **Credential Encryption**: All credentials (PATs, API keys) MUST be encrypted using safeStorage
3. **IPC Whitelist**: Only documented IPC channels are allowed
4. **Context Isolation**: Renderer process MUST use preload script for IPC access
5. **Input Validation**: All requests MUST be validated before processing

## Performance Requirements

1. **Response Time**: Most operations should complete within 100ms
2. **Streaming**: Long operations (AI generation) MUST use streaming
3. **Batching**: List operations MUST support batching for large datasets
4. **Caching**: GitHub API responses MUST be cached (5-minute TTL)

## Testing Requirements

All IPC handlers MUST have:
1. Unit tests for service layer logic
2. Integration tests for IPC communication
3. Error case coverage
4. Performance benchmarks

## Versioning

IPC contracts follow semantic versioning:
- **Major**: Breaking changes to existing contracts
- **Minor**: New contracts or optional fields added
- **Patch**: Bug fixes, no contract changes

Current version: **1.0.0**

## Implementation Notes

- Use TypeScript strict mode for all implementations
- Implement retry logic for network operations
- Add logging for all operations (debug level)
- Add metrics for performance monitoring
- Document any deviations from these contracts

## Next Steps

1. Implement service layer for each domain (SkillService, GitHubService, AIService, ConfigService)
2. Create IPC handlers as thin wrappers around services
3. Build preload script with type-safe IPC client
4. Implement React hooks for IPC communication
5. Add comprehensive test coverage
