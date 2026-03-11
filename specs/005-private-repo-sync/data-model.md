# Data Model: Private Repository Sync

**Date**: 2026-03-10
**Feature**: 005-private-repo-sync

## Overview

This document defines the data models for private repository synchronization, including repository configuration, skill metadata, and installation tracking.

---

## Entity Relationship Diagram

```
PrivateRepo (1) -----> (many) PrivateSkill
     |
     | (tracks source for)
     v
InstalledSkillMetadata (extends Skill model)
```

---

## Entities

### 1. PrivateRepo

**Purpose**: Configuration and metadata for a private GitHub repository

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID v4) |
| `owner` | string | Yes | Repository owner/organization (e.g., "myorg") |
| `repo` | string | Yes | Repository name (e.g., "team-skills") |
| `url` | string | Yes | Full repository URL (e.g., "https://github.com/myorg/team-skills") |
| `displayName` | string | No | User-friendly name (defaults to "{owner}/{repo}") |
| `patEncrypted` | string | Yes | Encrypted Personal Access Token (base64-encoded) |
| `defaultBranch` | string | No | Default branch name (defaults to "main") |
| `lastSyncTime` | Date \| null | No | Last successful sync timestamp |
| `skillCount` | number | No | Number of skills in repository (cached) |
| `description` | string \| null | No | Repository description from GitHub |
| `addedAt` | Date | Yes | When repository was added |
| `updatedAt` | Date | Yes | When configuration was last updated |

**Validation Rules**:
- `url` must be valid GitHub repository URL (https://github.com/{owner}/{repo})
- `patEncrypted` must be encrypted using Electron safeStorage
- `owner` and `repo` extracted from URL using regex
- `id` must be unique across all configured repositories

**State Transitions**:
```
[New] --(configure)--> [Configured] --(test connection)--> [Validated]
                                                    |
                                                    v
                                              [Error] (if test fails)
[Validated] --(sync)--> [Synced] --(update PAT)--> [Configured]
```

**Storage**: JSON file (e.g., `~/.skillsMN/private-repos.json`)

**TypeScript Interface**:
```typescript
export interface PrivateRepo {
  id: string;
  owner: string;
  repo: string;
  url: string;
  displayName?: string;
  patEncrypted: string;
  defaultBranch?: string;
  lastSyncTime: Date | null;
  skillCount?: number;
  description?: string;
  addedAt: Date;
  updatedAt: Date;
}
```

---

### 2. PrivateSkill

**Purpose**: Metadata for a skill directory within a private repository

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Directory path in repository (e.g., "skills/code-review") |
| `name` | string | Yes | Skill name (directory name, e.g., "code-review") |
| `repoId` | string | Yes | ID of parent PrivateRepo |
| `description` | string \| null | No | Description from skill.md frontmatter |
| `directoryCommitSHA` | string | Yes | Latest commit SHA for the directory (for update detection) |
| `lastCommitMessage` | string | No | Last commit message affecting this directory |
| `lastCommitAuthor` | string | No | Author of last commit |
| `lastCommitDate` | Date | No | Date of last commit |
| `totalFileSize` | number | No | Total size of all files in directory (bytes) |
| `fileCount` | number | No | Number of files in directory |

**Validation Rules**:
- `path` must contain `skill.md` file (validated during scan)
- Directory depth must be ≤5 levels from repository root
- `name` extracted from directory name (last segment of path)
- `directoryCommitSHA` fetched from GitHub API

**Computed Fields**:
- `totalFileSize`: Sum of all file sizes in directory
- `fileCount`: Count of all files in directory (including subdirectories)

**Storage**: Not persisted. Computed on-demand when browsing repository.

**TypeScript Interface**:
```typescript
export interface PrivateSkill {
  path: string;
  name: string;
  repoId: string;
  description?: string;
  directoryCommitSHA: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: Date;
  totalFileSize?: number;
  fileCount?: number;
}
```

---

### 3. InstalledSkillMetadata (Extension of Skill Model)

**Purpose**: Additional metadata for skills installed from private repositories

**Note**: This extends the existing `Skill` model from 002-local-skill-management

**New Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceRepoId` | string \| null | No | ID of PrivateRepo if installed from private repo |
| `sourceRepoPath` | string \| null | No | Original path in repository (e.g., "skills/code-review") |
| `installedDirectoryCommitSHA` | string \| null | No | Commit SHA at time of installation (for update detection) |
| `installedAt` | Date | No | Installation timestamp |
| `sourceType` | enum | Yes | "local" \| "public" \| "private" |

**Validation Rules**:
- If `sourceType === "private"`, then `sourceRepoId`, `sourceRepoPath`, and `installedDirectoryCommitSHA` are required
- `installedDirectoryCommitSHA` used to detect updates (compare with remote directory SHA)

**Updated TypeScript Interface** (extending existing Skill model):
```typescript
export type SkillSource = 'local' | 'public' | 'private';

export interface Skill {
  // ... existing fields from 002-local-skill-management ...
  name: string;
  path: string;
  description?: string;
  // ... other existing fields ...

  // NEW: Private repository metadata
  sourceType: SkillSource;
  sourceRepoId?: string;
  sourceRepoPath?: string;
  installedDirectoryCommitSHA?: string;
  installedAt?: Date;
}
```

---

## Data Flow

### Configuration Flow

```
User Input (URL + PAT)
    ↓
Extract owner/repo from URL
    ↓
Encrypt PAT with safeStorage
    ↓
Create PrivateRepo instance
    ↓
Test connection (GitHub API)
    ↓
Save to private-repos.json
```

### Skill Discovery Flow

```
User selects PrivateRepo
    ↓
Fetch repository tree (GitHub API)
    ↓
Filter directories with skill.md (≤5 levels deep)
    ↓
For each skill directory:
  - Fetch directory commit SHA
  - Fetch commit metadata
  - Calculate total file size
    ↓
Return PrivateSkill[] array
```

### Installation Flow

```
User selects PrivateSkill
    ↓
Download directory contents (GitHub API)
    ↓
Save to local directory (project/global)
    ↓
Create/Update Skill instance with:
  - sourceType: 'private'
  - sourceRepoId: repo.id
  - sourceRepoPath: skill.path
  - installedDirectoryCommitSHA: skill.directoryCommitSHA
  - installedAt: new Date()
    ↓
Update local skill list
```

### Update Detection Flow

```
User views local skill list
    ↓
Filter skills with sourceType === 'private'
    ↓
For each private skill:
  - Fetch latest directory commit SHA from GitHub
  - Compare with installedDirectoryCommitSHA
  - If different, mark as "Update Available"
    ↓
Display update indicators in UI
```

---

## Validation Examples

### PrivateRepo URL Validation

```typescript
function validateRepoUrl(url: string): { owner: string; repo: string } | null {
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/)?$/;
  const match = url.match(regex);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// Valid
validateRepoUrl('https://github.com/myorg/team-skills');
// → { owner: 'myorg', repo: 'team-skills' }

// Invalid
validateRepoUrl('https://gitlab.com/myorg/team-skills');
// → null

// Invalid
validateRepoUrl('github.com/myorg/team-skills');
// → null
```

### Skill Directory Detection

```typescript
function isSkillDirectory(treeItem: TreeItem): boolean {
  return treeItem.type === 'tree' && // It's a directory
         treeItem.path.split('/').length <= 6; // ≤5 levels deep (root + 5 levels)
}

// During tree traversal:
// 1. Fetch tree with recursive=1
// 2. Find all files named 'skill.md'
// 3. Extract parent directory paths
// 4. Validate depth ≤5 levels
// 5. Return unique skill directories
```

---

## Storage Schema

### private-repos.json

```json
{
  "version": 1,
  "repositories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "owner": "myorg",
      "repo": "team-skills",
      "url": "https://github.com/myorg/team-skills",
      "displayName": "My Org Team Skills",
      "patEncrypted": "base64-encoded-encrypted-string...",
      "defaultBranch": "main",
      "lastSyncTime": "2026-03-10T12:00:00Z",
      "skillCount": 15,
      "description": "Official team skill library",
      "addedAt": "2026-03-07T10:00:00Z",
      "updatedAt": "2026-03-10T12:00:00Z"
    }
  ]
}
```

### skills.json (updated)

```json
{
  "skills": [
    {
      "name": "code-review",
      "path": "/Users/user/.skillsMN/skills/code-review",
      "description": "AI-assisted code review",
      "sourceType": "private",
      "sourceRepoId": "550e8400-e29b-41d4-a716-446655440000",
      "sourceRepoPath": "skills/code-review",
      "installedDirectoryCommitSHA": "abc123def456...",
      "installedAt": "2026-03-10T12:30:00Z"
    }
  ]
}
```

---

## Indexes and Performance

### Recommended Indexes

For JSON storage, maintain in-memory indexes:

1. **PrivateRepo by ID**: `Map<string, PrivateRepo>`
   - Fast lookup for repository configuration
   - Used during skill installation and update detection

2. **Skill by sourceRepoId**: `Map<string, Skill[]>`
   - Fast lookup of all skills from a specific repository
   - Used for update detection across all skills from same repo

3. **Skill by installedDirectoryCommitSHA**: `Map<string, Skill>`
   - Fast lookup during update detection
   - Compare with remote SHAs

### Caching Strategy

- **Repository skill list**: Cache for 5 minutes (FR-014)
  - Key: `repo-{repoId}-skills`
  - Value: `PrivateSkill[]`
  - Invalidate on: manual refresh, cache timeout

- **Repository tree**: Cache for 5 minutes
  - Key: `repo-{repoId}-tree`
  - Value: GitHub tree response
  - Invalidate on: cache timeout

---

## Migration Strategy

### Extending Existing Skill Model

Since `Skill` model already exists in 002-local-skill-management, migration strategy:

1. **Add new fields with defaults**:
   ```typescript
   // Existing skills will have these defaults
   sourceType: 'local';
   sourceRepoId: null;
   sourceRepoPath: null;
   installedDirectoryCommitSHA: null;
   installedAt: null;
   ```

2. **Backward compatibility**:
   - Existing code continues to work
   - New fields are optional in validation
   - Default `sourceType` to 'local' for existing skills

3. **No data migration required**:
   - New fields added transparently
   - Old skills remain valid

---

## Security Considerations

### PAT Encryption

- **Never store PATs in plaintext**
- Use Electron's `safeStorage.encryptString()` before saving
- Use `safeStorage.decryptString()` only when needed for API calls
- Clear decrypted PAT from memory immediately after use

### Path Validation

- Validate all paths are within authorized directories (existing security requirement)
- Prevent path traversal attacks when installing skills
- Use `path.resolve()` and check against allowed directories

### API Key Protection

- PAT is NEVER exposed to renderer process
- All GitHub API calls go through main process
- IPC handlers use backend service that manages PAT decryption

---

## Testing Considerations

### Unit Tests

- PrivateRepo validation (URL parsing, required fields)
- PrivateSkill extraction from GitHub tree
- Skill model extension (new fields, defaults)
- Update detection logic (SHA comparison)

### Integration Tests

- Configure repository → save → load cycle
- Browse repository → fetch skills → display
- Install skill → save → verify metadata
- Update detection → compare SHAs → display indicator

### Edge Cases

- Repository with no skills (empty list)
- Repository with deeply nested skills (>5 levels, should be skipped)
- Skill directory with no skill.md (should be skipped)
- PAT expiration (authentication failure handling)
- Network errors (retry logic)
- Large repositories (pagination)
