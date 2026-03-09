# Data Model: Local Skill Management

**Date**: 2026-03-09
**Feature**: 002-local-skill-management

This document defines the core data entities, their relationships, validation rules, and state transitions for the local skill management feature.

## Core Entities

### 1. Skill

**Definition**: A directory containing a `skill.md` file (Markdown with YAML frontmatter) and optional additional resources (templates, examples, assets).

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| path | string | Yes | Absolute file path, must contain `skill.md` | Canonical path to skill directory |
| name | string | Yes | Non-empty string, max 100 chars | Display name from YAML frontmatter `name` field, fallback to directory name |
| description | string | No | Max 500 chars | Skill description from YAML frontmatter |
| source | enum | Yes | 'project' \| 'global' | Origin directory type |
| lastModified | Date | Yes | Valid ISO 8601 date | Last modification timestamp |
| resourceCount | number | Yes | Non-negative integer | Count of non-skill.md files in directory |

**Derived Fields**:
- `directoryName`: Extracted from `path` (last path segment)
- `isValidYAML`: Boolean indicating if frontmatter is parseable

**Validation Rules**:
- Directory must exist on file system
- Must contain a `skill.md` file
- `name` field from YAML frontmatter takes precedence over directory name
- If YAML frontmatter is invalid, `name` falls back to directory name, `description` is undefined
- `resourceCount` includes all files except `skill.md` (templates, examples, assets, etc.)

**State Transitions**:
```
[Non-existent] → create → [Active]
[Active] → edit → [Active] (content changes)
[Active] → delete → [Deleted] (moved to recycle bin)
[Active] → external_delete → [Non-existent] (file system event)
[Deleted] → restore → [Active] (user restores from recycle bin)
```

**Example Instance**:
```typescript
{
  path: "/Users/user/.claude/skills/my-awesome-skill",
  name: "My Awesome Skill",
  description: "A skill that does awesome things",
  source: "global",
  lastModified: new Date("2026-03-09T10:30:00Z"),
  resourceCount: 3
}
```

### 2. SkillDirectory

**Definition**: A parent folder containing skill directories.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| path | string | Yes | Absolute directory path | Canonical path to directory |
| type | enum | Yes | 'project' \| 'global' | Directory classification |
| exists | boolean | Yes | - | Whether directory exists on file system |

**Validation Rules**:
- Project directory must contain `.claude` folder (Claude project indicator)
- Global directory is always `~/.claude/skills/` (platform-specific path)
- Directory path must be absolute and normalized

**Relationships**:
- A `SkillDirectory` contains zero or more `Skill` entities
- A `Skill` belongs to exactly one `SkillDirectory`

**Example Instances**:
```typescript
// Project directory
{
  path: "/Users/user/projects/my-project/.claude/skills",
  type: "project",
  exists: true
}

// Global directory
{
  path: "/Users/user/.claude/skills",
  type: "global",
  exists: true
}
```

### 3. Configuration

**Definition**: User preferences and application settings.

**Attributes**:

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| projectDirectory | string \| null | Yes | null | Valid absolute path or null | Path to Claude project directory |
| defaultInstallDirectory | enum | Yes | 'project' | 'project' \| 'global' | Default location for new skills |
| editorDefaultMode | enum | Yes | 'edit' | 'edit' \| 'preview' | Default behavior when opening skills |
| autoRefresh | boolean | Yes | true | - | Auto-refresh skill list on file changes |

**Validation Rules**:
- `projectDirectory` must be null (not configured) or contain a `.claude` folder
- Configuration is persisted to local storage (Electron app.getPath('userData'))
- All fields have sensible defaults for first-time users

**State Transitions**:
```
[Unconfigured] → setup → [Configured]
[Configured] → update_settings → [Configured]
[Configured] → clear_config → [Unconfigured]
```

**Example Instance**:
```typescript
{
  projectDirectory: "/Users/user/projects/my-project",
  defaultInstallDirectory: "project",
  editorDefaultMode: "edit",
  autoRefresh: true
}
```

## Entity Relationships

```
┌─────────────────┐
│ Configuration   │
│ ─────────────── │
│ projectDirectory│──────┐
└─────────────────┘      │
                         │
                         ▼
              ┌─────────────────────┐
              │  SkillDirectory     │
              │  ─────────────────  │
              │  path               │
              │  type: project      │
              └─────────────────────┘
                         │
                         │ contains
                         │
                         ▼
                  ┌──────────┐
                  │  Skill   │
                  │  ──────  │
                  │  path    │
                  │  name    │
                  │  source: │
                  │  project │
                  └──────────┘

              ┌─────────────────────┐
              │  SkillDirectory     │
              │  ─────────────────  │
              │  path: ~/.claude/   │
              │  skills             │
              │  type: global       │
              └─────────────────────┘
                         │
                         │ contains
                         │
                         ▼
                  ┌──────────┐
                  │  Skill   │
                  │  ──────  │
                  │  path    │
                  │  name    │
                  │  source: │
                  │  global  │
                  └──────────┘
```

## TypeScript Interfaces

```typescript
// src/shared/types.ts

export type SkillSource = 'project' | 'global';

export interface Skill {
  path: string;
  name: string;
  description?: string;
  source: SkillSource;
  lastModified: Date;
  resourceCount: number;
}

export interface SkillDirectory {
  path: string;
  type: SkillSource;
  exists: boolean;
}

export type InstallDirectory = 'project' | 'global';
export type EditorMode = 'edit' | 'preview';

export interface Configuration {
  projectDirectory: string | null;
  defaultInstallDirectory: InstallDirectory;
  editorDefaultMode: EditorMode;
  autoRefresh: boolean;
}

// Frontmatter structure (for YAML parsing)
export interface SkillFrontmatter {
  name: string;
  description?: string;
}
```

## Validation Schemas

### Skill Validation
```typescript
// src/main/services/SkillService.ts

function validateSkill(skill: Partial<Skill>): Skill {
  if (!skill.path || typeof skill.path !== 'string') {
    throw new Error('Skill path is required and must be a string');
  }

  if (!skill.name || skill.name.trim().length === 0) {
    throw new Error('Skill name is required');
  }

  if (skill.name.length > 100) {
    throw new Error('Skill name must be 100 characters or less');
  }

  if (skill.description && skill.description.length > 500) {
    throw new Error('Skill description must be 500 characters or less');
  }

  if (!['project', 'global'].includes(skill.source)) {
    throw new Error('Skill source must be "project" or "global"');
  }

  if (typeof skill.resourceCount !== 'number' || skill.resourceCount < 0) {
    throw new Error('Resource count must be a non-negative number');
  }

  return skill as Skill;
}
```

### Configuration Validation
```typescript
// src/main/services/ConfigService.ts

function validateConfiguration(config: Partial<Configuration>): Configuration {
  if (config.projectDirectory !== null) {
    if (typeof config.projectDirectory !== 'string') {
      throw new Error('Project directory must be a string or null');
    }
    // Verify .claude folder exists
    const claudeDir = path.join(config.projectDirectory, '.claude');
    if (!fs.existsSync(claudeDir)) {
      throw new Error(
        `Invalid Claude project directory: ${config.projectDirectory}. ` +
        `Directory must contain a .claude folder.`
      );
    }
  }

  if (!['project', 'global'].includes(config.defaultInstallDirectory)) {
    throw new Error('Default install directory must be "project" or "global"');
  }

  if (!['edit', 'preview'].includes(config.editorDefaultMode)) {
    throw new Error('Editor default mode must be "edit" or "preview"');
  }

  if (typeof config.autoRefresh !== 'boolean') {
    throw new Error('Auto-refresh must be a boolean');
  }

  return {
    projectDirectory: config.projectDirectory ?? null,
    defaultInstallDirectory: config.defaultInstallDirectory ?? 'project',
    editorDefaultMode: config.editorDefaultMode ?? 'edit',
    autoRefresh: config.autoRefresh ?? true,
  };
}
```

## Data Access Patterns

### Skill Operations
1. **List Skills**: Scan both project and global directories, merge results
2. **Get Skill**: Read skill directory, parse `skill.md` frontmatter
3. **Create Skill**: Create directory with kebab-case name, add `skill.md` template
4. **Update Skill**: Write to `skill.md` file
5. **Delete Skill**: Move entire directory to system recycle bin

### Configuration Operations
1. **Load Configuration**: Read from app data directory, return defaults if not exists
2. **Save Configuration**: Validate and write to app data directory
3. **Reset Configuration**: Delete configuration file, return to defaults

### File Watching
1. **Start Watching**: Monitor project and global directories for changes
2. **Handle Events**: Debounce rapid changes, trigger skill list refresh
3. **Stop Watching**: Clean up file watchers on app shutdown

## Performance Considerations

### Skill Scanning
- Read directory entries only (don't read file contents until needed)
- Parse YAML frontmatter lazily (only when skill is selected)
- Cache parsed frontmatter in memory (refresh on file change)
- Use `fs.stat` for lastModified timestamps (faster than reading file)

### Large Lists (500+ Skills)
- Virtual scrolling with `react-window` (render only visible items)
- Debounce file watcher events (200ms threshold)
- Batch skill list updates (single re-render for multiple file changes)
- Background parsing of frontmatter (don't block UI)

### Memory Management
- Store minimal skill metadata in memory (path, name, source, timestamps)
- Load skill content only when editing
- Clear editor content when skill is closed
- Limit file watcher to skill directories (not entire file system)

## Security Boundaries

### Path Validation
All file operations MUST validate paths through `PathValidator`:

```typescript
// Valid operations
SkillService.getSkill("/Users/user/.claude/skills/my-skill") // ✅
SkillService.getSkill("/Users/user/project/.claude/skills/other-skill") // ✅

// Invalid operations (throw error)
SkillService.getSkill("/etc/passwd") // ❌ Path traversal attempt
SkillService.getSkill("../../../etc/passwd") // ❌ Relative path escape
SkillService.getSkill("/Users/user/.claude/skills/../../secrets") // ❌ Escapes boundary
```

### Allowed Directories
- `{projectDirectory}/.claude/skills/` (if configured)
- `{globalDirectory}/.claude/skills/` (always allowed)

All other paths MUST be rejected with clear error messages.
