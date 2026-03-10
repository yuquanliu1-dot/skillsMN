# Data Model: Public Skill Discovery

**Date**: 2026-03-10
**Feature**: 004-public-skill-discovery

## Core Entities

### 1. SearchResult

Represents an individual skill directory found via GitHub search.

**Attributes**:
- `id`: string (unique identifier, e.g., `${repoFullName}:${skillPath}`)
- `skillName`: string (directory name containing skill.md)
- `repositoryFullName`: string (e.g., "owner/repo")
- `repositoryUrl`: string (GitHub repository URL)
- `skillPath`: string (path to skill directory in repository)
- `skillMdPath`: string (path to skill.md file)
- `description`: string (extracted from skill.md frontmatter or repo description)
- `lastUpdate`: Date (last commit date to skill directory)
- `starCount`: number (repository star count)
- `downloadUrl`: string (base URL for downloading skill directory)

**Validation Rules**:
- `skillName` must be non-empty string
- `repositoryFullName` must match pattern `owner/repo`
- `skillMdPath` must end with `/skill.md`
- `downloadUrl` must be valid HTTPS URL

**State Transitions**: None (read-only entity)

**TypeScript Definition**:
```typescript
interface SearchResult {
  id: string;
  skillName: string;
  repositoryFullName: string;
  repositoryUrl: string;
  skillPath: string;
  skillMdPath: string;
  description: string;
  lastUpdate: Date;
  starCount: number;
  downloadUrl: string;
}
```

---

### 2. CuratedSource

Represents a pre-selected high-quality skill repository.

**Attributes**:
- `id`: string (unique identifier)
- `displayName`: string (e.g., "Claude Code Plugins")
- `repositoryUrl`: string (GitHub repository URL)
- `description`: string (source description)
- `tags`: string[] (categories, e.g., ["ai", "productivity"])

**Validation Rules**:
- `id` must be non-empty string
- `repositoryUrl` must be valid GitHub repository URL
- `tags` must be array of non-empty strings

**State Transitions**: None (read-only entity)

**TypeScript Definition**:
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

### 3. InstallRequest

Represents a user's intent to install a skill from GitHub.

**Attributes**:
- `skillName`: string (directory name)
- `repositoryFullName`: string (e.g., "owner/repo")
- `skillPath`: string (path to skill directory in repository)
- `targetDirectory`: string (local path: project or global directory)
- `branch`: string (repository branch, default: "main")
- `conflictResolution`: 'overwrite' | 'rename' | 'skip' | null (user's conflict preference)

**Validation Rules**:
- `skillName` must be non-empty string
- `repositoryFullName` must match pattern `owner/repo`
- `targetDirectory` must be valid local path (validated via path validation)
- `branch` must be non-empty string
- `conflictResolution` must be one of: 'overwrite', 'rename', 'skip', null

**State Transitions**:
1. **Created** → User initiates install
2. **Checking for conflicts** → System checks if skill exists in target directory
3. **Awaiting conflict resolution** → If conflict detected, wait for user decision
4. **Downloading** → Download skill directory from GitHub
5. **Validating** → Validate downloaded skill (check for skill.md, non-empty content)
6. **Saving** → Save to local directory
7. **Completed** → Skill installed successfully
8. **Failed** → Installation failed (network error, validation failure, etc.)

**TypeScript Definition**:
```typescript
interface InstallRequest {
  skillName: string;
  repositoryFullName: string;
  skillPath: string;
  targetDirectory: string;
  branch: string;
  conflictResolution: 'overwrite' | 'rename' | 'skip' | null;
}

interface InstallProgress {
  stage: 'checking' | 'downloading' | 'validating' | 'saving' | 'completed' | 'failed';
  filesCompleted: number;
  filesTotal: number;
  percentage: number;
  error?: string;
}
```

---

### 4. ConflictInfo

Represents information about a skill installation conflict.

**Attributes**:
- `skillName`: string (name of skill being installed)
- `existingPath`: string (local path of existing skill)
- `newSource`: string (GitHub source of new skill)
- `resolution`: 'overwrite' | 'rename' | 'skip' | null (user's decision)
- `applyToAll`: boolean (apply this decision to all subsequent conflicts)

**Validation Rules**:
- `skillName` must be non-empty string
- `existingPath` must be valid local path
- `newSource` must be valid GitHub URL
- `resolution` must be one of: 'overwrite', 'rename', 'skip', null

**State Transitions**:
1. **Detected** → Conflict found during installation
2. **Resolved** → User selected resolution action
3. **Applied** → Resolution applied (overwrite/rename/skip)

**TypeScript Definition**:
```typescript
interface ConflictInfo {
  skillName: string;
  existingPath: string;
  newSource: string;
  resolution: 'overwrite' | 'rename' | 'skip' | null;
  applyToAll: boolean;
}
```

---

### 5. PreviewContent

Represents the content to display in the skill preview modal.

**Attributes**:
- `skillName`: string (directory name)
- `repositoryFullName`: string (e.g., "owner/repo")
- `skillMdContent`: string (rendered markdown content of skill.md)
- `directoryTree`: DirectoryTreeNode[] (hierarchical tree of skill directory files)

**Validation Rules**:
- `skillName` must be non-empty string
- `skillMdContent` must be non-empty string
- `directoryTree` must be non-empty array

**State Transitions**: None (read-only entity)

**TypeScript Definition**:
```typescript
interface PreviewContent {
  skillName: string;
  repositoryFullName: string;
  skillMdContent: string;
  directoryTree: DirectoryTreeNode[];
}

interface DirectoryTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryTreeNode[];
  size?: number; // file size in bytes
  downloadUrl?: string; // for files only
}
```

---

## Entity Relationships

```
SearchResult (1) ←→ (N) InstallRequest
  - A search result can lead to multiple install requests (different target directories)

CuratedSource (1) ←→ (N) SearchResult
  - A curated source contains multiple skill directories

InstallRequest (1) ←→ (0..1) ConflictInfo
  - An install request may encounter a conflict

InstallRequest (1) ←→ (1) InstallProgress
  - An install request has one progress tracker

SearchResult (1) ←→ (0..1) PreviewContent
  - A search result can be previewed
```

---

## Data Flow

### Search Flow
1. User enters query → `SearchQuery` (string)
2. GitHubService.searchSkills() → `SearchResult[]`
3. User clicks result → Preview displayed → `PreviewContent`

### Install Flow
1. User clicks "Install" → `InstallRequest` created
2. System checks for conflicts → `ConflictInfo` (if exists)
3. User resolves conflict → `ConflictInfo.resolution` updated
4. System downloads skill → `InstallProgress` emitted
5. System validates and saves → `InstallProgress` updated to completed

### Curated Source Flow
1. User selects curated source → `CuratedSource` loaded
2. GitHubService.getSkillsFromRepo() → `SearchResult[]`
3. User clicks "Install" → Same as Install Flow

---

## Storage

### Local Storage (Frontend)
- **Search history**: Last 10 search queries (localStorage)
- **Curated sources**: Hardcoded list in CuratedSources.ts (future: fetched from config file)

### Backend Storage
- **GitHub PAT**: Encrypted in Electron safeStorage
- **Skill directories**: Saved to file system (project or global directory)

### No Database Required
- All entities are transient (not persisted between sessions)
- Skill directories are saved directly to file system
- No need for SQLite, IndexedDB, or other databases

---

## Performance Considerations

### SearchResult Pagination
- Load 20 results per page
- Cache results in memory for current session
- Clear cache when query changes

### Preview Caching
- Cache preview content for 5 minutes (TTL)
- Cache key: `${repositoryFullName}:${skillPath}`
- Invalidate cache on manual refresh

### Install Progress
- Emit progress updates every 100ms (max frequency)
- Use debounce on progress updates to avoid UI thrashing

### Directory Tree Building
- Build tree on-demand (when user opens preview)
- Use lazy loading for large directories (>50 files)
- Collapse all nodes by default

---

## Security Considerations

### Path Validation
- Validate `targetDirectory` is within authorized directories (project/global skill dirs)
- Reject paths with `..` (path traversal attack)
- Use path.resolve() to normalize paths before validation

### GitHub PAT Protection
- Store PAT in Electron safeStorage (encrypted)
- Never expose PAT to frontend (backend proxy only)
- Validate PAT format before storage

### HTTPS Enforcement
- All GitHub API calls use HTTPS
- All download URLs use HTTPS (raw.githubusercontent.com)
- Reject HTTP URLs with error

### Content Validation
- Validate downloaded skill.md is valid markdown
- Reject binary files in skill directories (except allowed assets)
- Limit skill directory size (warn if >1MB, reject if >10MB)
