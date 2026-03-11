# IPC Contracts: Public Skill Discovery

**Feature**: 004-public-skill-discovery
**Version**: 1.0
**Last Updated**: 2026-03-11

---

## Overview

This document defines the IPC (Inter-Process Communication) contracts for the Public Skill Discovery feature. All communication between the renderer (frontend) and main (backend) processes follows these contracts.

---

## Table of Contents

1. [Search Operations](#search-operations)
2. [Preview Operations](#preview-operations)
3. [Installation Operations](#installation-operations)
4. [Curated Sources Operations](#curated-sources-operations)
5. [Error Handling](#error-handling)
6. [Type Definitions](#type-definitions)

---

## Search Operations

### `github:search-skills`

Search GitHub for repositories containing `skill.md` files.

#### Request

```typescript
{
  query: string;      // Search query (e.g., "react typescript")
  page?: number;      // Page number (default: 1)
}
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    results: SearchResult[];
    totalCount: number;
    incomplete: boolean;
    rateLimit: RateLimitInfo;
  };
}
```

#### Response (Error)

```typescript
{
  success: false;
  error: IPCError;
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.searchGitHub('react hooks', 1);
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "repositoryName": "facebook/react",
        "repositoryUrl": "https://github.com/facebook/react",
        "description": "A declarative, efficient, and flexible JavaScript library...",
        "stars": 218000,
        "forks": 46000,
        "language": "JavaScript",
        "archived": false,
        "skillFiles": [
          {
            "path": "skills/react-hooks/skill.md",
            "downloadUrl": "https://raw.githubusercontent.com/...",
            "lastModified": "2026-03-10T10:00:00Z"
          }
        ],
        "lastUpdate": "2 days ago"
      }
    ],
    "totalCount": 150,
    "incomplete": false,
    "rateLimit": {
      "limit": 5000,
      "remaining": 4998,
      "reset": "2026-03-11T11:00:00Z"
    }
  }
}
```

#### Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `INVALID_QUERY` | Query is empty or invalid | Enter a valid search term |
| `RATE_LIMIT_EXCEEDED` | GitHub API rate limit exceeded | Wait or add GitHub PAT |
| `NETWORK_ERROR` | Network connection failed | Check internet connection |
| `GITHUB_API_ERROR` | GitHub API returned error | Retry later |

---

### `github:search-skills` Implementation Notes

**Debouncing**:
- Frontend implements 500ms debounce
- Prevents excessive API calls while typing
- Cancellation: Previous searches are cancelled when query changes

**Caching**:
- Backend caches results for 5 minutes
- Cache key: `${query}:${page}`
- Cache improves performance for repeated searches

**Pagination**:
- 30 results per page (GitHub default)
- Use `incomplete` flag to detect if more results available
- Implement infinite scroll on frontend

---

## Preview Operations

### `github:preview-skill`

Preview skill content and directory structure before installation.

#### Request

```typescript
{
  downloadUrl: string;  // Raw GitHub URL to skill.md file
}
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    content: string;  // Markdown content of skill.md
  };
}
```

#### Response (Error)

```typescript
{
  success: false;
  error: IPCError;
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.previewGitHubSkill(
  'https://raw.githubusercontent.com/facebook/react/main/skills/react-hooks/skill.md'
);
```

**Response**:
```json
{
  "success": true,
  "data": {
    "content": "# React Hooks Best Practices\n\n## Overview\nThis skill provides best practices for using React hooks...\n\n## Usage\n..."
  }
}
```

#### Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `SKILL_NOT_FOUND` | Skill file not found (404) | Skill may be deleted or moved |
| `NETWORK_ERROR` | Network connection failed | Check internet connection |
| `VALIDATION_FAILED` | Skill content is invalid | Try a different skill |
| `GITHUB_API_ERROR` | GitHub API error | Retry later |

---

### `github:preview-skill` Implementation Notes

**Content Validation**:
- Backend validates skill.md exists and is non-empty
- Returns raw markdown content
- Frontend renders as markdown

**Caching**:
- 5-minute TTL cache
- Cache key: `downloadUrl`
- Improves performance for repeated previews

**File Size Limits**:
- Maximum 500KB for preview content
- Larger files return error with suggestion to install

---

## Installation Operations

### `github:install-skill`

Install a skill from GitHub to local directory.

#### Request

```typescript
{
  repositoryName: string;      // e.g., "facebook/react"
  skillFilePath: string;        // e.g., "skills/react-hooks/skill.md"
  downloadUrl: string;          // Raw GitHub URL
  targetDirectory: 'project' | 'global';
  conflictResolution?: 'overwrite' | 'rename' | 'skip';
}
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    success: true;
    newPath: string;  // Absolute path to installed skill
  };
}
```

#### Response (Conflict)

```typescript
{
  success: false;
  error: {
    code: 'CONFLICT_DETECTED';
    message: 'Skill already exists';
    details: {
      existingPath: string;
      newSource: string;
    };
  };
}
```

#### Response (Error)

```typescript
{
  success: false;
  error: IPCError;
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.installGitHubSkill({
  repositoryName: 'facebook/react',
  skillFilePath: 'skills/react-hooks/skill.md',
  downloadUrl: 'https://raw.githubusercontent.com/...',
  targetDirectory: 'project',
  conflictResolution: 'rename'
});
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "newPath": "/path/to/project/.claude/skills/react-hooks"
  }
}
```

#### Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `CONFLICT_DETECTED` | Skill with same name exists | Choose resolution strategy |
| `INVALID_TARGET` | Target directory is invalid | Check directory path and permissions |
| `DOWNLOAD_FAILED` | Failed to download skill files | Check internet connection |
| `VALIDATION_FAILED` | Skill structure is invalid | Try a different skill |
| `PERMISSION_DENIED` | Permission denied writing to directory | Check file permissions |
| `NETWORK_ERROR` | Network connection failed | Check internet connection |

---

### `github:install-skill` Implementation Notes

**Installation Process**:
1. **Path Validation**: Verify target directory is within allowed paths
2. **Conflict Detection**: Check if skill directory already exists
3. **Download**: Fetch all files using Git Trees API
4. **Validation**: Verify skill.md exists and is non-empty
5. **Save**: Write files to target directory
6. **Progress Events**: Emit progress updates during download

**Progress Events**:
- Event: `github:install-progress`
- Emitted every 100ms (throttled)
- See [Progress Events](#progress-events) section

**Completion Events**:
- Event: `github:install-complete`
- Emitted when installation finishes successfully
- See [Completion Events](#completion-events) section

**Cancellation**:
- Use `github:cancel-install` to abort installation
- Partial downloads are cleaned up automatically

**File Size Limits**:
- Warning if skill directory >1MB
- Error if skill directory >10MB

---

### `github:cancel-install`

Cancel an in-progress skill installation.

#### Request

```typescript
{
  skillName: string;          // Name of skill being installed
  repositoryFullName: string; // e.g., "facebook/react"
}
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    cancelled: boolean;
    cleanedUp: boolean;  // True if partial files were removed
  };
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.cancelGitHubInstall({
  skillName: 'react-hooks',
  repositoryFullName: 'facebook/react'
});
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cancelled": true,
    "cleanedUp": true
  }
}
```

---

## Progress Events

### `github:install-progress`

Emitted during skill installation to report download progress.

#### Event Payload

```typescript
{
  stage: 'checking' | 'downloading' | 'validating' | 'saving' | 'completed' | 'failed';
  filesCompleted: number;
  filesTotal: number;
  percentage: number;  // 0-100
  error?: string;      // Only present if stage === 'failed'
}
```

#### Example

**Listening for Progress**:
```typescript
window.electronAPI.onGitHubInstallProgress((event, progress) => {
  console.log(`Progress: ${progress.percentage}%`);
  console.log(`Files: ${progress.filesCompleted}/${progress.filesTotal}`);
  console.log(`Stage: ${progress.stage}`);
});
```

**Event Payload Example**:
```json
{
  "stage": "downloading",
  "filesCompleted": 5,
  "filesTotal": 10,
  "percentage": 50
}
```

#### Stages

| Stage | Description |
|-------|-------------|
| `checking` | Checking for conflicts |
| `downloading` | Downloading files from GitHub |
| `validating` | Validating skill structure |
| `saving` | Writing files to disk |
| `completed` | Installation finished successfully |
| `failed` | Installation failed (check `error` field) |

#### Throttling

- Events throttled to maximum 1 per 100ms
- Prevents UI thrashing
- Smooth progress bar updates

---

## Completion Events

### `github:install-complete`

Emitted when skill installation completes successfully.

#### Event Payload

```typescript
{
  skillName: string;
  skillPath: string;     // Absolute path to installed skill
  repositoryName: string;
  fileCount: number;     // Number of files installed
}
```

#### Example

**Listening for Completion**:
```typescript
window.electronAPI.onGitHubInstallComplete((event, result) => {
  console.log(`Installed ${result.skillName} to ${result.skillPath}`);
  refreshSkillList();  // Refresh local skill list
});
```

**Event Payload Example**:
```json
{
  "skillName": "react-hooks",
  "skillPath": "/path/to/project/.claude/skills/react-hooks",
  "repositoryName": "facebook/react",
  "fileCount": 5
}
```

---

## Curated Sources Operations

### `github:get-curated-sources`

Get list of curated, high-quality skill repositories.

#### Request

```typescript
{}  // No parameters
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    sources: CuratedSource[];
  };
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.getCuratedSources();
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": "anthropic-skills",
        "displayName": "Anthropic Official Skills",
        "repositoryUrl": "https://github.com/anthropics/anthropic-cookbook",
        "description": "Official skill examples from Anthropic",
        "tags": ["official", "examples", "best-practices"]
      }
    ]
  }
}
```

---

### `github:get-skills-from-source`

Get all skills from a specific curated source repository.

#### Request

```typescript
{
  repositoryUrl: string;  // Repository URL
  page?: number;          // Page number (default: 1)
}
```

#### Response (Success)

```typescript
{
  success: true;
  data: {
    results: SearchResult[];
    totalCount: number;
    hasMore: boolean;
  };
}
```

#### Example

**Request**:
```typescript
const response = await window.electronAPI.getSkillsFromSource({
  repositoryUrl: 'https://github.com/anthropics/anthropic-cookbook',
  page: 1
});
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      // SearchResult[]...
    ],
    "totalCount": 25,
    "hasMore": true
  }
}
```

---

## Error Handling

### IPCError Structure

All error responses follow this structure:

```typescript
interface IPCError {
  code: GitHubErrorCode;
  message: string;
  details?: any;
}

type GitHubErrorCode =
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
  | 'INSTALL_NOT_FOUND'
  | 'GITHUB_API_ERROR';
```

### Error Examples

#### Rate Limit Exceeded

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "GitHub API rate limit exceeded. Wait 10 minutes or add a PAT for higher limits.",
    "details": {
      "resetTime": "2026-03-11T11:00:00Z",
      "remaining": 0,
      "limit": 60
    }
  }
}
```

#### Network Error

```json
{
  "success": false,
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Network error. Please check your connection and try again.",
    "details": {
      "originalError": "ETIMEDOUT"
    }
  }
}
```

#### Skill Not Found

```json
{
  "success": false,
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill directory not found. It may have been moved or deleted.",
    "details": {
      "url": "https://api.github.com/..."
    }
  }
}
```

### Error Handling Best Practices

1. **Always check `success` field**:
   ```typescript
   const response = await window.electronAPI.searchGitHub(query);
   if (!response.success) {
     console.error(response.error.message);
     // Handle error
     return;
   }
   // Use response.data
   ```

2. **Provide user-friendly messages**:
   - Use `error.message` for display
   - Use `error.code` for programmatic handling
   - Use `error.details` for debugging

3. **Implement retry logic**:
   ```typescript
   if (error.code === 'NETWORK_ERROR') {
     // Show retry button
   }
   ```

4. **Handle rate limits gracefully**:
   ```typescript
   if (error.code === 'RATE_LIMIT_EXCEEDED') {
     // Show message: "Add a GitHub PAT for higher limits"
     // Link to Settings
   }
   ```

---

## Type Definitions

### SearchResult

```typescript
interface SearchResult {
  repositoryName: string;
  repositoryUrl: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  archived: boolean;
  skillFiles: SkillFileMatch[];
  lastUpdate: string;
}

interface SkillFileMatch {
  path: string;
  downloadUrl: string;
  lastModified: Date;
}
```

### RateLimitInfo

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;  // ISO 8601 timestamp
}
```

### InstallProgress

```typescript
interface InstallProgress {
  stage: 'checking' | 'downloading' | 'validating' | 'saving' | 'completed' | 'failed';
  filesCompleted: number;
  filesTotal: number;
  percentage: number;
  error?: string;
}
```

### ConflictInfo

```typescript
interface ConflictInfo {
  skillName: string;
  existingPath: string;
  newSource: string;
  resolution?: 'overwrite' | 'rename' | 'skip';
  applyToAll: boolean;
}
```

### CuratedSource

```typescript
interface CuratedSource {
  id: string;
  displayName: string;
  repositoryUrl: string;
  description: string;
  tags: string[];
}
```

---

## Security Considerations

### Path Validation

All installation operations validate target directories:
- ✅ Must be within project or global skill directories
- ✅ No path traversal (`../` sequences rejected)
- ✅ No absolute paths outside allowed directories
- ❌ Rejected paths return `INVALID_TARGET` error

### PAT Protection

GitHub PATs (Personal Access Tokens):
- ✅ Encrypted using Electron `safeStorage`
- ✅ Never exposed to frontend
- ✅ Only used in backend for API calls
- ✅ Stored securely in configuration file

### HTTPS Enforcement

All GitHub API calls:
- ✅ Use HTTPS only
- ✅ Certificate validation enabled
- ❌ HTTP URLs rejected with error

### Content Validation

Downloaded skills are validated:
- ✅ Must contain `skill.md` file
- ✅ Must have non-empty content
- ✅ File size limits enforced (10MB max)
- ❌ Invalid content returns `VALIDATION_FAILED` error

---

## Performance Considerations

### Caching

| Operation | Cache Duration | Cache Key |
|-----------|---------------|-----------|
| Search results | 5 minutes | `${query}:${page}` |
| Preview content | 5 minutes | `downloadUrl` |

### Rate Limiting

| Operation | Rate Limit (Unauthenticated) | Rate Limit (With PAT) |
|-----------|------------------------------|------------------------|
| Search | 60 req/hour | 5,000 req/hour |
| Preview | 60 req/hour | 5,000 req/hour |
| Install | 60 req/hour | 5,000 req/hour |

### Throttling

- **Progress events**: Max 1 per 100ms
- **Search debouncing**: 500ms on frontend
- **File downloads**: Max 5 concurrent downloads

---

## Testing

### Unit Test Examples

```typescript
describe('github:search-skills', () => {
  it('should return search results', async () => {
    const response = await window.electronAPI.searchGitHub('react', 1);
    expect(response.success).toBe(true);
    expect(response.data.results).toBeInstanceOf(Array);
    expect(response.data.results.length).toBeGreaterThan(0);
  });

  it('should handle rate limit errors', async () => {
    // Mock rate limit exceeded
    const response = await window.electronAPI.searchGitHub('test', 1);
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-11 | Initial release with search, preview, install, curated sources |

---

## See Also

- [User Guide: Public Skill Discovery](../user-guide.md#discovering-public-skills)
- [Feature Specification](../../specs/004-public-skill-discovery/spec.md)
- [Implementation Plan](../../specs/004-public-skill-discovery/plan.md)
- [Quick Start Guide](../../specs/004-public-skill-discovery/quickstart.md)

---

**Last Updated**: 2026-03-11
**Maintainer**: SkillsMN Development Team
