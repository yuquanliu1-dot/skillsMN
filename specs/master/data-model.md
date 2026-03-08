# Data Model: Local Skill Management

**Date**: 2026-03-08
**Feature**: 002-local-skill-management

## Core Entities

### 1. Skill

**Description**: Represents a Claude Code skill file with metadata

**Attributes**:
- `id: string` - Unique identifier (file path hash or canonical path)
- `name: string` - Skill name from frontmatter or filename
- `description: string` - Skill description from frontmatter (optional)
- `filePath: string` - Absolute canonical path to skill file
- `source: 'project' | 'global'` - Which directory the skill belongs to
- `modifiedAt: Date` - Last modification timestamp
- `fileSize: number` - File size in bytes
- `isValid: boolean` - Whether frontmatter is valid YAML
- `validationErrors: string[]` - Frontmatter validation errors (if any)

**Validation Rules**:
- `name` MUST be non-empty after extraction from frontmatter or filename
- `filePath` MUST be within authorized directories (project or global)
- `filePath` MUST end with `.skill` extension
- `fileSize` SHOULD be <1MB (warning if larger)
- `modifiedAt` MUST be a valid date

**State Transitions**:
```
[Not Loaded] → [Loaded] → [Modified] → [Saved] → [Loaded]
                ↓                         ↑
            [Deleted]                    |
                ↓                        |
            [Removed from list]----------+
```

**Example**:
```typescript
{
  id: "abc123",
  name: "React Best Practices",
  description: "Guidelines for writing clean React code",
  filePath: "/Users/dev/project/.claude/skills/react-best-practices.skill",
  source: "project",
  modifiedAt: new Date("2026-03-08T10:30:00Z"),
  fileSize: 2048,
  isValid: true,
  validationErrors: []
}
```

### 2. SkillDirectory

**Description**: Represents a directory containing skill files

**Attributes**:
- `id: string` - Unique identifier (canonical path)
- `path: string` - Absolute canonical directory path
- `type: 'project' | 'global'` - Directory type
- `exists: boolean` - Whether directory currently exists on disk
- `skillCount: number` - Number of skills in directory (cached)
- `lastScanned: Date | null` - Last scan timestamp

**Validation Rules**:
- `path` MUST be an absolute path
- `path` MUST exist and be a directory (if `exists` is true)
- `type` MUST be 'project' or 'global'
- Project directory MUST contain `.claude` subfolder (validated on setup)

**Relationships**:
- One SkillDirectory contains zero or more Skills
- A Skill belongs to exactly one SkillDirectory (via source attribute)

**Example**:
```typescript
{
  id: "/Users/dev/project/.claude/skills",
  path: "/Users/dev/project/.claude/skills",
  type: "project",
  exists: true,
  skillCount: 42,
  lastScanned: new Date("2026-03-08T11:00:00Z")
}
```

### 3. Configuration

**Description**: User preferences and application settings

**Attributes**:
- `projectSkillDir: string` - Absolute path to project skills directory
- `globalSkillDir: string` - Absolute path to global skills directory
- `defaultInstallTarget: 'project' | 'global'` - Where new skills install by default
- `editorDefaultMode: 'edit' | 'preview'` - Default behavior when opening skills
- `autoRefresh: boolean` - Whether to watch for file system changes

**Validation Rules**:
- `projectSkillDir` MUST be an absolute path
- `globalSkillDir` MUST be an absolute path
- `defaultInstallTarget` MUST be 'project' or 'global'
- `editorDefaultMode` MUST be 'edit' or 'preview'
- Directories will be created if they don't exist (except project root)

**Persistence**:
- Stored as JSON in `{userData}/config.json`
- Loaded on application start
- Saved on every change (atomic write)
- Backed up before major changes

**Example**:
```typescript
{
  projectSkillDir: "/Users/dev/project/.claude/skills",
  globalSkillDir: "/Users/dev/.claude/skills",
  defaultInstallTarget: "project",
  editorDefaultMode: "edit",
  autoRefresh: true
}
```

## Supporting Types

### CreateSkillRequest

```typescript
{
  name: string;              // User-provided skill name
  targetDirectory: 'project' | 'global';
  initialContent?: string;   // Optional starting content
}
```

### UpdateSkillRequest

```typescript
{
  filePath: string;
  content: string;           // Full file content including frontmatter
}
```

### SkillFilter

```typescript
{
  source?: 'project' | 'global';  // Filter by directory
  searchTerm?: string;             // Filter by name/description
}
```

### SkillSortOption

```typescript
{
  field: 'name' | 'modifiedAt';
  direction: 'asc' | 'desc';
}
```

### AppError

```typescript
{
  code: string;              // Machine-readable error code
  message: string;           // Technical error message
  userMessage: string;       // User-friendly error description
  action: string;            // Suggested action to resolve
}
```

## Entity Relationships

```
Configuration (1) ────────> SkillDirectory (2)
                              │
                              │ contains
                              │
                              ↓
                           Skill (0..*)
```

- One Configuration references two SkillDirectories (project and global)
- Each SkillDirectory contains zero or more Skills
- Skills reference their parent directory via the `source` attribute

## Data Flow

### Initialization Flow
1. Load Configuration from disk
2. Validate Configuration paths
3. Create SkillDirectory objects for project and global
4. Scan directories to populate Skill entities
5. Present Skills to user

### Create Skill Flow
1. User provides name and target directory
2. Generate filename (kebab-case) and path
3. Validate path is within allowed directories
4. Create file with template content
5. File watcher detects new file
6. Parse file to create Skill entity
7. Add Skill to in-memory list
8. Update UI

### Update Skill Flow
1. User edits content in Monaco Editor
2. User clicks Save (or Ctrl+S)
3. Validate path and content
4. Write to file (atomic write)
5. File watcher detects change
6. Update Skill entity in memory
7. Update UI

### Delete Skill Flow
1. User clicks Delete and confirms
2. Validate path is within allowed directories
3. Move file to system recycle bin
4. File watcher detects deletion
5. Remove Skill from in-memory list
6. Update UI

## Storage Schema

### File System Structure
```
project/
└── .claude/
    └── skills/
        ├── react-best-practices.skill
        ├── api-design.skill
        └── database-optimization.skill

~/.claude/
└── skills/
    ├── git-workflow.skill
    └── testing-strategies.skill
```

### Configuration File (config.json)
```json
{
  "version": "1.0",
  "projectSkillDir": "/Users/dev/project/.claude/skills",
  "globalSkillDir": "/Users/dev/.claude/skills",
  "defaultInstallTarget": "project",
  "editorDefaultMode": "edit",
  "autoRefresh": true,
  "lastModified": "2026-03-08T11:00:00Z"
}
```

### Skill File Format (*.skill)
```markdown
---
name: React Best Practices
description: Guidelines for writing clean React code
---

# React Best Practices

[Skill content in Markdown...]
```

## Performance Considerations

### In-Memory Caching
- All skill metadata cached in memory (Map<id, Skill>)
- Skill content loaded on-demand (not cached by default)
- Directory scan results cached with invalidation on file changes

### Scalability
- Designed for 500+ skills
- Virtual scrolling for list rendering
- Lazy loading of skill content
- Incremental updates on file changes (not full re-scan)

### Memory Budget
- Target: <300MB total application memory
- Skill metadata: ~1KB per skill × 500 = 0.5MB
- UI components: ~50MB
- Monaco Editor: ~20MB per instance
- File watcher: ~10MB
- Remaining: Application overhead, caching, React

## Security Model

### Path Validation
- All file operations validate paths are within whitelisted directories
- Canonical path comparison prevents `..`, symlinks, and case tricks
- Validation happens in main process (untrusted renderer cannot bypass)

### Data Access
- Renderer process has no direct file system access
- All operations via IPC with main process
- Main process validates every request

### Error Handling
- Path validation errors return clear messages
- No sensitive paths exposed in error messages
- Logging includes operation context for debugging
