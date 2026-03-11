# IPC Interface Contract: Private Repository Sync

**Date**: 2026-03-10
**Feature**: 005-private-repo-sync

## Overview

This document defines the IPC (Inter-Process Communication) interface between the Electron renderer process (frontend) and main process (backend) for private repository synchronization features.

---

## IPC Channel Naming Convention

All IPC channels for this feature follow the pattern: `private-repo:{action}`

Examples:
- `private-repo:add`
- `private-repo:list`
- `private-repo:get-skills`
- `private-repo:install-skill`

---

## IPC Channels

### 1. Repository Configuration

#### `private-repo:add`

**Purpose**: Add a new private repository configuration

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  url: string;       // Repository URL (e.g., "https://github.com/myorg/team-skills")
  pat: string;       // Personal Access Token (will be encrypted)
  displayName?: string; // Optional friendly name
}
```

**Returns**:
```typescript
{
  success: boolean;
  repo?: PrivateRepo;  // Created repository object
  error?: string;      // Error message if failed
}
```

**Errors**:
- `INVALID_URL`: URL is not a valid GitHub repository URL
- `AUTH_FAILED`: PAT lacks read permissions or is invalid
- `ALREADY_EXISTS`: Repository already configured
- `ENCRYPTION_FAILED`: Failed to encrypt PAT

**Example**:
```typescript
const result = await window.electron.ipcRenderer.invoke('private-repo:add', {
  url: 'https://github.com/myorg/team-skills',
  pat: 'ghp_xxxxxxxxxxxx',
  displayName: 'Team Skills'
});

if (result.success) {
  console.log('Repository added:', result.repo);
} else {
  console.error('Failed to add repository:', result.error);
}
```

---

#### `private-repo:list`

**Purpose**: List all configured private repositories

**Direction**: Renderer → Main

**Parameters**: None

**Returns**:
```typescript
{
  success: boolean;
  repos?: PrivateRepo[];  // Array of repository objects
  error?: string;
}
```

**Example**:
```typescript
const result = await window.electron.ipcRenderer.invoke('private-repo:list');

if (result.success) {
  setRepos(result.repos);
}
```

---

#### `private-repo:get`

**Purpose**: Get a specific repository by ID

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;  // Repository UUID
}
```

**Returns**:
```typescript
{
  success: boolean;
  repo?: PrivateRepo;
  error?: string;
}
```

---

#### `private-repo:test-connection`

**Purpose**: Test repository access with stored PAT

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;  // Repository UUID
}
```

**Returns**:
```typescript
{
  success: boolean;
  repository?: {
    name: string;
    description: string;
    defaultBranch: string;
  };
  error?: string;
}
```

**Errors**:
- `REPO_NOT_FOUND`: Repository ID not found
- `AUTH_FAILED`: PAT invalid or expired
- `NETWORK_ERROR`: GitHub API unreachable

---

#### `private-repo:update`

**Purpose**: Update repository configuration (e.g., new PAT)

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
  updates: {
    displayName?: string;
    pat?: string;  // New PAT to encrypt
  };
}
```

**Returns**:
```typescript
{
  success: boolean;
  repo?: PrivateRepo;  // Updated repository object
  error?: string;
}
```

---

#### `private-repo:remove`

**Purpose**: Remove repository configuration (keeps installed skills)

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
}
```

**Returns**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Note**: Locally installed skills from this repository remain unchanged.

---

### 2. Skill Discovery

#### `private-repo:get-skills`

**Purpose**: Get all skills from a private repository

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
  forceRefresh?: boolean;  // Force refresh (bypass cache)
}
```

**Returns**:
```typescript
{
  success: boolean;
  skills?: PrivateSkill[];
  error?: string;
}
```

**Caching**: Response cached for 5 minutes unless `forceRefresh: true`

**Errors**:
- `REPO_NOT_FOUND`: Repository ID not found
- `AUTH_FAILED`: PAT invalid or expired
- `NETWORK_ERROR`: GitHub API unreachable
- `RATE_LIMIT`: GitHub API rate limit exceeded

**Example**:
```typescript
const result = await window.electron.ipcRenderer.invoke('private-repo:get-skills', {
  repoId: selectedRepoId,
  forceRefresh: false
});

if (result.success) {
  setSkills(result.skills);
}
```

---

#### `private-repo:search-skills`

**Purpose**: Search skills in a private repository by name or path

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
  query: string;  // Search query
}
```

**Returns**:
```typescript
{
  success: boolean;
  skills?: PrivateSkill[];  // Filtered skills
  error?: string;
}
```

---

### 3. Skill Installation

#### `private-repo:install-skill`

**Purpose**: Install a skill directory from private repository

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
  skillPath: string;  // Path in repository (e.g., "skills/code-review")
  targetDirectory: 'project' | 'global';  // Installation location
  conflictResolution?: 'overwrite' | 'rename' | 'skip';  // If skill exists
}
```

**Returns**:
```typescript
{
  success: boolean;
  skill?: Skill;  // Installed skill with metadata
  error?: string;
}
```

**Errors**:
- `REPO_NOT_FOUND`: Repository ID not found
- `SKILL_NOT_FOUND`: Skill path not found in repository
- `AUTH_FAILED`: PAT invalid or expired
- `DISK_FULL`: Insufficient disk space
- `WRITE_FAILED`: Failed to write files
- `CONFLICT`: Skill already exists (if no resolution specified)

**Example**:
```typescript
const result = await window.electron.ipcRenderer.invoke('private-repo:install-skill', {
  repoId: '550e8400-e29b-41d4-a716-446655440000',
  skillPath: 'skills/code-review',
  targetDirectory: 'project',
  conflictResolution: 'rename'
});

if (result.success) {
  console.log('Skill installed:', result.skill);
}
```

---

### 4. Update Management

#### `private-repo:check-updates`

**Purpose**: Check for updates for all skills from a specific repository

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
}
```

**Returns**:
```typescript
{
  success: boolean;
  updates?: Array<{
    skillName: string;
    skillPath: string;
    localSHA: string;
    remoteSHA: string;
    updateAvailable: boolean;
  }>;
  error?: string;
}
```

**Example**:
```typescript
const result = await window.electron.ipcRenderer.invoke('private-repo:check-updates', {
  repoId: selectedRepoId
});

if (result.success) {
  const availableUpdates = result.updates.filter(u => u.updateAvailable);
  console.log(`${availableUpdates.length} updates available`);
}
```

---

#### `private-repo:update-skill`

**Purpose**: Update a locally installed skill from its repository

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  skillName: string;  // Local skill name
  createBackup?: boolean;  // Create backup before update (default: false)
}
```

**Returns**:
```typescript
{
  success: boolean;
  skill?: Skill;  // Updated skill with new metadata
  backupPath?: string;  // Backup directory path (if created)
  error?: string;
}
```

**Errors**:
- `SKILL_NOT_INSTALLED`: Skill not found locally
- `SKILL_NOT_FROM_PRIVATE_REPO`: Skill was not installed from private repo
- `NETWORK_ERROR`: Failed to fetch from GitHub
- `WRITE_FAILED`: Failed to update files

---

### 5. Metadata

#### `private-repo:get-skill-metadata`

**Purpose**: Get detailed metadata for a specific skill

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  repoId: string;
  skillPath: string;
}
```

**Returns**:
```typescript
{
  success: boolean;
  metadata?: {
    name: string;
    path: string;
    description?: string;
    totalFileSize: number;
    fileCount: number;
    directoryCommitSHA: string;
    lastCommit: {
      message: string;
      author: string;
      date: Date;
      sha: string;
    };
  };
  error?: string;
}
```

---

## Error Handling

### Error Response Format

All IPC channels return errors in a consistent format:

```typescript
{
  success: false;
  error: string;  // Error code (e.g., "AUTH_FAILED")
  message?: string;  // Human-readable error message
}
```

### Error Codes

| Error Code | Description | User Action |
|------------|-------------|-------------|
| `INVALID_URL` | Repository URL is not valid | Check URL format |
| `AUTH_FAILED` | PAT invalid or lacks permissions | Update PAT in Settings |
| `ALREADY_EXISTS` | Repository already configured | Remove existing repo first |
| `REPO_NOT_FOUND` | Repository ID not found | Refresh repository list |
| `SKILL_NOT_FOUND` | Skill path not found | Refresh skill list |
| `SKILL_NOT_INSTALLED` | Skill not found locally | Install skill first |
| `SKILL_NOT_FROM_PRIVATE_REPO` | Skill was not installed from private repo | Cannot update from private repo |
| `NETWORK_ERROR` | GitHub API unreachable | Check internet connection |
| `RATE_LIMIT` | GitHub API rate limit exceeded | Wait or upgrade PAT |
| `DISK_FULL` | Insufficient disk space | Free up disk space |
| `WRITE_FAILED` | Failed to write files | Check permissions |
| `ENCRYPTION_FAILED` | Failed to encrypt PAT | Check system credential store |
| `CONFLICT` | Skill already exists | Choose conflict resolution |

---

## Security Requirements

### PAT Handling

- PAT is NEVER sent to renderer process
- PAT is encrypted before storage using Electron safeStorage
- PAT is decrypted only in main process for GitHub API calls
- Decrypted PAT is cleared from memory immediately after use

### Path Validation

- All file paths are validated in main process before operations
- Paths must be within authorized directories (project/global skill directories)
- Path traversal attempts are logged and rejected

### IPC Security

- All IPC channels are one-way (renderer → main) with responses
- No renderer-to-renderer communication
- All sensitive operations handled in main process
- Input validation on all parameters

---

## Performance Requirements

### Response Time Targets

| Operation | Target | Timeout |
|-----------|--------|---------|
| `private-repo:add` | <5s | 10s |
| `private-repo:list` | <100ms | 5s |
| `private-repo:get-skills` | <5s | 30s |
| `private-repo:install-skill` | <10s (<1MB) | 60s |
| `private-repo:check-updates` | <5s | 30s |
| `private-repo:update-skill` | <10s (<1MB) | 60s |

### Caching Strategy

- Repository skill list: 5-minute cache
- Repository tree: 5-minute cache
- Cache invalidation on manual refresh

---

## Testing Requirements

### Unit Tests

- IPC handler parameter validation
- Error code generation
- Response format compliance

### Integration Tests

- End-to-end: add repo → get skills → install skill
- Error scenarios: invalid PAT, network failure, disk full
- Update flow: install → check updates → update skill

### Contract Tests

- Verify request/response types match interfaces
- Test all error codes and messages
- Validate caching behavior
