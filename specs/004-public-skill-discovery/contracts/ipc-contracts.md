# IPC Contracts: Public Skill Discovery

**Date**: 2026-03-10
**Feature**: 004-public-skill-discovery

This document defines the IPC (Inter-Process Communication) contracts between the Electron renderer process (frontend) and main process (backend) for public skill discovery features.

## Contract Design Principles

1. **Security**: All GitHub API calls proxied through backend (PAT never exposed to frontend)
2. **Type Safety**: All contracts use TypeScript interfaces with strict typing
3. **Error Handling**: All operations return `Result<T, E>` type with structured errors
4. **Performance**: Async operations with progress callbacks where applicable
5. **Consistency**: Follow existing IPC patterns from features 001-003

---

## Channel Naming Convention

All channels for this feature use prefix: `github:`

Pattern: `github:<action>`

Examples:
- `github:search-skills`
- `github:preview-skill`
- `github:install-skill`

---

## IPC Channels

### 1. `github:search-skills`

Search GitHub for skill directories containing skill.md files.

**Request**:
```typescript
interface SearchSkillsRequest {
  query: string;           // Search terms
  page?: number;           // Page number (default: 1)
  perPage?: number;        // Results per page (default: 20, max: 100)
}
```

**Response**:
```typescript
interface SearchSkillsResponse {
  results: SearchResult[];
  totalCount: number;      // Total matching results
  hasMore: boolean;        // More pages available
}

interface SearchResult {
  id: string;
  skillName: string;
  repositoryFullName: string;
  repositoryUrl: string;
  skillPath: string;
  skillMdPath: string;
  description: string;
  lastUpdate: string;      // ISO 8601 date string
  starCount: number;
  downloadUrl: string;
}
```

**Errors**:
- `RATE_LIMIT_EXCEEDED`: GitHub API rate limit hit
- `NETWORK_ERROR`: Network connection failed
- `INVALID_QUERY`: Empty or malformed query
- `GITHUB_API_ERROR`: GitHub API returned error

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:search-skills', {
  query: 'react hooks',
  page: 1,
  perPage: 20
});

if (response.success) {
  console.log(`Found ${response.data.totalCount} results`);
  displayResults(response.data.results);
} else {
  showError(response.error.message);
}
```

**Backend Implementation**:
```typescript
// Main (backend) - src/main/ipc/gitHubHandlers.ts
ipcMain.handle('github:search-skills', async (event, request: SearchSkillsRequest) => {
  try {
    const result = await gitHubService.searchSkills(
      request.query,
      request.page || 1,
      request.perPage || 20
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapToIPCError(error) };
  }
});
```

---

### 2. `github:preview-skill`

Fetch skill.md content and directory tree for preview.

**Request**:
```typescript
interface PreviewSkillRequest {
  repositoryFullName: string;  // e.g., "owner/repo"
  skillPath: string;           // Path to skill directory
  branch?: string;             // Branch name (default: "main")
}
```

**Response**:
```typescript
interface PreviewSkillResponse {
  skillName: string;
  repositoryFullName: string;
  skillMdContent: string;      // Rendered markdown content
  directoryTree: DirectoryTreeNode[];
}

interface DirectoryTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryTreeNode[];
  size?: number;
  downloadUrl?: string;
}
```

**Errors**:
- `SKILL_NOT_FOUND`: Skill directory or skill.md not found
- `NETWORK_ERROR`: Network connection failed
- `INVALID_CONTENT`: skill.md content is invalid or empty
- `GITHUB_API_ERROR`: GitHub API returned error

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:preview-skill', {
  repositoryFullName: 'owner/repo',
  skillPath: 'skills/react-hooks',
  branch: 'main'
});

if (response.success) {
  displayPreview(response.data.skillMdContent, response.data.directoryTree);
}
```

---

### 3. `github:install-skill`

Download and install a skill directory to local file system.

**Request**:
```typescript
interface InstallSkillRequest {
  skillName: string;
  repositoryFullName: string;
  skillPath: string;
  targetDirectory: string;     // Local path (project or global directory)
  branch?: string;             // Branch name (default: "main")
  conflictResolution?: 'overwrite' | 'rename' | 'skip' | null;
}
```

**Response** (streaming progress updates):
```typescript
interface InstallProgress {
  stage: 'checking' | 'downloading' | 'validating' | 'saving' | 'completed' | 'failed';
  filesCompleted: number;
  filesTotal: number;
  percentage: number;
  error?: string;
}
```

**Events** (sent during installation):
- `github:install-progress` - Progress updates
- `github:install-conflict` - Conflict detected (requires user action)
- `github:install-complete` - Installation completed successfully
- `github:install-error` - Installation failed

**Errors**:
- `CONFLICT_DETECTED`: Skill already exists (requires conflict resolution)
- `INVALID_TARGET`: Target directory is invalid or not authorized
- `DOWNLOAD_FAILED`: Failed to download skill directory
- `VALIDATION_FAILED`: Downloaded skill is invalid (missing skill.md)
- `PERMISSION_DENIED`: No write permission to target directory
- `NETWORK_ERROR`: Network connection failed during download
- `GITHUB_API_ERROR`: GitHub API returned error

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:install-skill', {
  skillName: 'react-hooks',
  repositoryFullName: 'owner/repo',
  skillPath: 'skills/react-hooks',
  targetDirectory: '/Users/user/.claude/skills',
  branch: 'main'
});

if (response.success) {
  // Listen for progress updates
  window.electron.ipc.on('github:install-progress', (progress: InstallProgress) => {
    updateProgressBar(progress.percentage);
    updateStatusText(`${progress.filesCompleted}/${progress.filesTotal} files`);
  });

  // Listen for completion
  window.electron.ipc.once('github:install-complete', () => {
    showSuccessNotification('Skill installed successfully!');
    refreshSkillList();
  });

  // Listen for conflicts
  window.electron.ipc.once('github:install-conflict', (conflict: ConflictInfo) => {
    showConflictDialog(conflict);
  });
}
```

**Backend Implementation**:
```typescript
// Main (backend) - src/main/ipc/gitHubHandlers.ts
ipcMain.handle('github:install-skill', async (event, request: InstallSkillRequest) => {
  try {
    // Validate target directory
    if (!isValidTargetDirectory(request.targetDirectory)) {
      throw new Error('INVALID_TARGET');
    }

    // Check for conflicts
    const targetPath = path.join(request.targetDirectory, request.skillName);
    if (fs.existsSync(targetPath) && !request.conflictResolution) {
      event.sender.send('github:install-conflict', {
        skillName: request.skillName,
        existingPath: targetPath,
        newSource: `https://github.com/${request.repositoryFullName}`
      });
      return { success: false, error: { code: 'CONFLICT_DETECTED' } };
    }

    // Download skill with progress tracking
    await gitHubService.downloadSkillDirectory(
      request.repositoryFullName,
      request.skillPath,
      request.branch || 'main',
      targetPath,
      (completed, total) => {
        event.sender.send('github:install-progress', {
          stage: 'downloading',
          filesCompleted: completed,
          filesTotal: total,
          percentage: Math.round((completed / total) * 100)
        });
      }
    );

    event.sender.send('github:install-complete');
    return { success: true };
  } catch (error) {
    event.sender.send('github:install-error', mapToIPCError(error));
    return { success: false, error: mapToIPCError(error) };
  }
});
```

---

### 4. `github:get-curated-sources`

Get list of curated skill sources.

**Request**: None (no parameters)

**Response**:
```typescript
interface GetCuratedSourcesResponse {
  sources: CuratedSource[];
}

interface CuratedSource {
  id: string;
  displayName: string;
  repositoryUrl: string;
  description: string;
  tags: string[];
}
```

**Errors**: None (hardcoded list, always succeeds)

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:get-curated-sources');

if (response.success) {
  displayCuratedSources(response.data.sources);
}
```

---

### 5. `github:get-skills-from-source`

Get all skills from a specific curated source repository.

**Request**:
```typescript
interface GetSkillsFromSourceRequest {
  repositoryUrl: string;    // GitHub repository URL
  page?: number;            // Page number (default: 1)
  perPage?: number;         // Results per page (default: 20)
}
```

**Response**:
```typescript
interface GetSkillsFromSourceResponse {
  results: SearchResult[];  // Same structure as search results
  totalCount: number;
  hasMore: boolean;
}
```

**Errors**:
- `INVALID_REPOSITORY_URL`: Repository URL is not a valid GitHub URL
- `REPOSITORY_NOT_FOUND`: Repository does not exist or is private
- `NETWORK_ERROR`: Network connection failed
- `GITHUB_API_ERROR`: GitHub API returned error

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:get-skills-from-source', {
  repositoryUrl: 'https://github.com/owner/claude-code-plugins',
  page: 1,
  perPage: 20
});

if (response.success) {
  displaySourceSkills(response.data.results);
}
```

---

### 6. `github:cancel-install`

Cancel an in-progress skill installation.

**Request**:
```typescript
interface CancelInstallRequest {
  skillName: string;
  repositoryFullName: string;
}
```

**Response**:
```typescript
interface CancelInstallResponse {
  cancelled: boolean;
  cleanedUp: boolean;  // Partial downloads cleaned up
}
```

**Errors**:
- `INSTALL_NOT_FOUND`: No matching installation in progress

**Example Usage**:
```typescript
// Renderer (frontend)
const response = await window.electron.ipc.invoke('github:cancel-install', {
  skillName: 'react-hooks',
  repositoryFullName: 'owner/repo'
});

if (response.success && response.data.cancelled) {
  showInfoNotification('Installation cancelled');
}
```

---

## Error Types

All IPC errors follow a structured format:

```typescript
interface IPCError {
  code: string;           // Error code from list below
  message: string;        // User-friendly error message
  details?: any;          // Additional error context (optional)
}

// Error codes for this feature:
type GitHubIPCErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'INVALID_QUERY'
  | 'SKILL_NOT_FOUND'
  | 'INVALID_CONTENT'
  | 'CONFLICT_DETECTED'
  | 'INVALID_TARGET'
  | 'DOWNLOAD_FAILED'
  | 'VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'INVALID_REPOSITORY_URL'
  | 'REPOSITORY_NOT_FOUND'
  | 'INSTALL_NOT_FOUND'
  | 'GITHUB_API_ERROR';
```

---

## Security Considerations

### Path Validation
All `targetDirectory` parameters must be validated before use:

```typescript
function isValidTargetDirectory(targetDir: string): boolean {
  const authorizedDirs = [
    getProjectSkillDirectory(),
    getGlobalSkillDirectory()
  ];

  const resolvedPath = path.resolve(targetDir);
  return authorizedDirs.some(authDir =>
    resolvedPath.startsWith(path.resolve(authDir))
  );
}
```

### GitHub PAT Protection
- PAT stored in Electron safeStorage (encrypted)
- PAT never sent to frontend via IPC
- All GitHub API calls made from backend only

### HTTPS Enforcement
- All GitHub API URLs use HTTPS
- All download URLs use HTTPS
- Backend rejects HTTP URLs with error

---

## Performance Considerations

### Request Timeouts
- Search requests: 5 second timeout
- Preview requests: 3 second timeout
- Install requests: No timeout (progress-based)

### Rate Limiting
- Frontend enforces 500ms debounce on search
- Backend caches search results for 5 minutes (TTL)
- Backend caches preview content for 5 minutes (TTL)

### Progress Updates
- Progress updates throttled to 100ms intervals
- Frontend uses debounce to avoid UI thrashing

---

## Testing Strategy

### Unit Tests
- Test each IPC handler independently
- Mock GitHubService methods
- Verify error handling for all error codes

### Integration Tests
- Test full search → preview → install flow
- Test conflict resolution flow
- Test error scenarios (network failure, rate limits)

### Contract Tests
- Verify request/response types match TypeScript interfaces
- Test with invalid request payloads
- Test with malformed responses
