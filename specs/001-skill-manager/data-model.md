# Data Model: Claude Code Skill Management Center

**Feature**: 001-skill-manager
**Date**: 2026-03-10

## Core Entities

### Skill

**Description**: A directory containing a `skill.md` file with YAML frontmatter (name and description) and markdown body, representing a Claude Code capability or knowledge domain. The directory may contain supporting files and nested subdirectories.

**Fields**:
- `id`: string (unique identifier, derived from directory path hash)
- `directoryPath`: string (absolute path to skill directory)
- `directoryName`: string (kebab-case directory name, e.g., "react-code-review")
- `name`: string (from YAML frontmatter, human-readable name)
- `description`: string (from YAML frontmatter, skill description)
- `content`: string | null (markdown body from skill.md, loaded on demand)
- `source`: enum ('project' | 'global' | 'private-repo' | 'public-repo')
- `sourceRepository`: string | null (GitHub repo URL if installed from remote)
- `lastModified`: Date (file system modification time)
- `totalSize`: number (total directory size in bytes, including all files)
- `fileCount`: number (number of files in skill directory, including nested)
- `validationStatus`: enum ('valid' | 'invalid-frontmatter' | 'missing-file')
- `validationErrors`: string[] (validation error messages if invalid)

**Validation Rules**:
- Directory MUST contain a `skill.md` file
- `skill.md` MUST have valid YAML frontmatter with `name` and `description` fields
- `directoryName` MUST be in kebab-case format
- `directoryPath` MUST be within allowed directories (project or global skill directories)
- `totalSize` SHOULD be <1MB for optimal performance

**State Transitions**:
```
[Scanned] → [Loaded] → [Edited] → [Saved]
    ↓           ↓
[Invalid]   [Invalid]
```

**Relationships**:
- Belongs to one `SkillDirectory`
- May be associated with one `PrivateRepository` (if installed from private repo)

---

### SkillDirectory

**Description**: A folder containing skill directories. Two types: project directory (user-specified, typically `skills/` in project root) and global directory (Claude Code default, `~/.claude/skills/`).

**Fields**:
- `id`: string (unique identifier, derived from path hash)
- `path`: string (absolute path to directory)
- `type`: enum ('project' | 'global')
- `skillCount`: number (number of skills in directory)
- `lastScanned`: Date (timestamp of last scan operation)

**Validation Rules**:
- Path MUST exist and be a directory
- Project directory MUST contain or be within a Claude project (has `.claude` folder)
- Global directory MUST be `~/.claude/skills/` or user-configured global path

**Relationships**:
- Contains zero or more `Skill` entities

---

### PrivateRepository

**Description**: A GitHub repository configured by the user for team skill sharing.

**Fields**:
- `id`: string (unique identifier, derived from repository URL)
- `url`: string (GitHub repository URL, e.g., "https://github.com/team/skills")
- `owner`: string (repository owner/organization)
- `name`: string (repository name)
- `pat`: string (encrypted Personal Access Token, stored separately in safeStorage)
- `patLastFour`: string (last 4 characters of PAT for display)
- `lastSynced`: Date | null (timestamp of last successful sync)
- `skills`: SkillMetadata[] (list of available skills in repository)
- `isAccessible`: boolean (whether PAT has valid access)

**Nested Type: SkillMetadata**:
- `path`: string (path within repository, e.g., "skills/react-review")
- `name`: string (skill name from frontmatter)
- `description`: string (skill description from frontmatter)
- `lastCommitDate`: Date (last commit timestamp)
- `lastCommitHash`: string (commit hash for update detection)

**Validation Rules**:
- URL MUST be a valid GitHub repository URL
- PAT MUST have `repo` scope for private repositories
- PAT MUST be encrypted before storage

**State Transitions**:
```
[Configured] → [Verified] → [Synced] → [Updated]
      ↓            ↓
  [Invalid]    [Invalid]
```

**Relationships**:
- Source for zero or more installed `Skill` entities

---

### SearchResult

**Description**: A GitHub repository or file match from public search.

**Fields**:
- `repositoryName`: string (full repository name, e.g., "owner/repo")
- `repositoryUrl`: string (GitHub repository URL)
- `description`: string (repository description)
- `stars`: number (star count for popularity ranking)
- `skillFiles`: SkillFileMatch[] (list of matched skill.md files)

**Nested Type: SkillFileMatch**:
- `path`: string (path to skill.md file within repository)
- `directoryPath`: string (parent directory of skill.md)
- `downloadUrl`: string (GitHub raw URL for skill.md content)
- `lastModified`: Date (file last modified time)

**Validation Rules**:
- Repository MUST be public
- Skill file path MUST end with `skill.md`

**Relationships**:
- None (transient search result, not persisted)

---

### AIGenerationRequest

**Description**: A user prompt for AI-assisted skill creation or modification.

**Fields**:
- `id`: string (unique identifier, UUID v4)
- `prompt`: string (user's natural language description)
- `mode`: enum ('new' | 'modify' | 'insert' | 'replace')
- `currentContent`: string | null (existing skill content if modifying)
- `selectionStart`: number | null (cursor position or selection start)
- `selectionEnd`: number | null (selection end, null if no selection)
- `timestamp`: Date (request creation time)
- `status`: enum ('pending' | 'streaming' | 'complete' | 'cancelled' | 'error')
- `generatedContent`: string | null (AI-generated content)
- `error`: string | null (error message if failed)

**Validation Rules**:
- Prompt MUST not be empty
- If mode is 'modify', 'insert', or 'replace', currentContent MUST be provided
- If mode is 'replace', both selectionStart and selectionEnd MUST be provided

**State Transitions**:
```
[Pending] → [Streaming] → [Complete]
     ↓           ↓            ↓
[Cancelled] [Error]      [Applied]
```

**Relationships**:
- May be associated with one `Skill` (if modifying existing)

---

### Configuration

**Description**: User preferences and credentials.

**Fields**:
- `projectDirectory`: string | null (currently selected project directory path)
- `globalDirectory`: string (Claude Code global skill directory, defaults to `~/.claude/skills/`)
- `defaultInstallDirectory`: enum ('project' | 'global')
- `aiProvider`: enum ('anthropic')
- `aiApiKey`: string (encrypted API key, stored in safeStorage)
- `aiModel`: string (model identifier, e.g., 'claude-3-sonnet')
- `aiTimeout`: number (timeout in milliseconds, default 30000)
- `githubPat`: string | null (encrypted GitHub PAT for public search rate limit increase)
- `privateRepositories`: PrivateRepository[] (list of configured private repos)
- `theme`: enum ('dark' | 'light' | 'system')
- `editorFontSize`: number (Monaco editor font size, default 14)
- `editorTabSize`: number (Monaco editor tab size, default 2)

**Validation Rules**:
- Project directory MUST be a valid Claude project (contains `.claude` folder)
- Global directory MUST exist or be creatable
- AI API key MUST be encrypted before storage
- All PATs MUST be encrypted before storage
- Editor font size MUST be between 8 and 32
- Editor tab size MUST be between 2 and 8

**Persistence**:
- Stored in JSON file at `~/.skillsmn/config.json`
- Credentials stored separately in OS credential manager via safeStorage

---

## Data Flow Diagrams

### Skill Creation Flow

```
User Input (name, description)
         ↓
[Renderer] Create Skill Button Click
         ↓
[IPC] skill:create
         ↓
[Main] SkillService.create()
         ↓
    Generate directory name (kebab-case)
         ↓
    Validate path (security check)
         ↓
    Create directory structure
         ↓
    Write skill.md with template
         ↓
    Return Skill object
         ↓
[IPC Response] Skill
         ↓
[Renderer] Update skill list
         ↓
    Open in editor
```

### AI Generation Flow

```
User Input (prompt, mode)
         ↓
[Renderer] AI Generate Button Click
         ↓
[IPC] ai:generate
         ↓
[Main] AIService.generate()
         ↓
    Retrieve encrypted API key
         ↓
    Initialize Claude Agent SDK
         ↓
    Load skill-creator skill
         ↓
    Start streaming generation
         ↓
[IPC Events] ai:chunk (every 200ms)
         ↓
[Renderer] Update editor content in real-time
         ↓
[IPC Event] ai:complete
         ↓
[Renderer] Enable "Apply" button
         ↓
User clicks "Apply"
         ↓
[Renderer] Insert/replace content in editor
```

### GitHub Search Flow

```
User Input (search query)
         ↓
[Renderer] Search Input (debounced 500ms)
         ↓
[IPC] github:search
         ↓
[Main] GitHubService.search()
         ↓
    Execute GitHub API search
         ↓
    Parse results (repositories with skill.md)
         ↓
    Return SearchResult[]
         ↓
[IPC Response] SearchResult[]
         ↓
[Renderer] Display search results
         ↓
User clicks skill file
         ↓
[IPC] github:preview
         ↓
[Main] GitHubService.preview()
         ↓
    Fetch raw content from GitHub
         ↓
    Return content
         ↓
[IPC Response] content
         ↓
[Renderer] Display preview
         ↓
User clicks "Install"
         ↓
[IPC] github:install
         ↓
[Main] GitHubService.install()
         ↓
    Download skill directory
         ↓
    Check for conflicts
         ↓
    Handle conflict resolution (overwrite/rename/skip)
         ↓
    Save to target directory
         ↓
    Return Skill
         ↓
[IPC Response] Skill
         ↓
[Renderer] Update skill list
```

## Validation Schemas

### Skill Frontmatter Schema (YAML)

```yaml
name: string (required, 1-100 characters)
description: string (required, 1-500 characters)
# Additional frontmatter fields allowed but not validated
```

### IPC Request/Response Schemas

See `/contracts/ipc-contracts.ts` for TypeScript interface definitions.

## Entity Relationships

```
┌─────────────────┐
│  Configuration  │
└────────┬────────┘
         │
         │ manages
         ↓
┌─────────────────┐      contains     ┌──────────────┐
│ SkillDirectory  │←──────────────────│     Skill    │
└─────────────────┘                   └──────┬───────┘
                                             │
                                             │ installed from
                                             ↓
┌─────────────────┐                   ┌──────────────────┐
│ PrivateRepository│──────────────────│  SearchResult   │
└─────────────────┘   searched via    └──────────────────┘
                                             ↑
                                             │ generates
                                    ┌────────┴────────┐
                                    │AIGenerationReq  │
                                    └─────────────────┘
```

## Performance Considerations

- **Skill Loading**: Load only metadata (name, description) initially. Load full content on demand when editing.
- **Directory Scanning**: Scan in parallel batches of 50 directories. Cache results in memory and invalidate on file system changes.
- **Search Results**: Limit to 100 results per search. Implement pagination if needed.
- **AI Generation**: Stream content in 200ms chunks to provide real-time feedback without overwhelming the UI.
- **Configuration**: Load once on startup. Watch for external changes. Persist on modification.

## Next Steps

1. Generate IPC contracts based on data models (see `/contracts/`)
2. Implement service layer for business logic
3. Create IPC handlers as thin wrappers around services
4. Build React components for UI
5. Implement end-to-end tests for critical user journeys
