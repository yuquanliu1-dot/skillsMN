# Research: Local Skill Management

**Date**: 2026-03-08
**Feature**: 002-local-skill-management

## Research Questions

### 1. File System Monitoring Approach

**Decision**: Use `chokidar` for cross-platform file watching

**Rationale**:
- Chokidar is the de-facto standard for file watching in Node.js/Electron apps
- Cross-platform compatibility (Windows, macOS, Linux)
- Handles edge cases like file permission errors, network drives
- Efficient event-based API with debouncing support
- Used by VS Code and other major Electron applications

**Alternatives Considered**:
- **fs.watch (native)**: Inconsistent behavior across platforms, unreliable for directory trees
- **node-watch**: Less mature, smaller community
- **Polling**: Too resource-intensive for real-time requirements (<500ms response)

**Implementation Notes**:
- Use `awaitWriteFinish` option to prevent partial file events
- Debounce rapid successive events (100ms)
- Filter to only watch `.skill` files to reduce overhead

### 2. Monaco Editor Integration in Electron

**Decision**: Use `@monaco-editor/react` with Electron-specific configuration

**Rationale**:
- React wrapper simplifies integration with component-based UI
- Supports YAML and Markdown syntax highlighting out-of-box
- Used by VS Code (proven in Electron environment)
- Customizable themes, completions, and keybindings

**Alternatives Considered**:
- **CodeMirror**: Lighter weight but less feature-rich, harder to configure
- **Ace Editor**: Older, less active development, fewer language features
- **Native textarea**: Too basic, no syntax highlighting

**Implementation Notes**:
- Configure YAML language service for frontmatter validation
- Add custom theme matching Tailwind dark mode colors
- Implement Ctrl+S/Ctrl+W keybindings via Monaco's keybinding API
- Set `wordWrap: 'on'` and `minimap: { enabled: false }` for better UX

### 3. Path Validation Strategy

**Decision**: Canonical path comparison with whitelist approach

**Rationale**:
- Security requirement: Prevent path traversal attacks
- Canonical paths resolve symlinks, `..`, and relative segments
- Whitelist ensures operations only within project/global directories
- Clear error messages when validation fails

**Implementation**:
```typescript
// Pseudocode
function validatePath(requestedPath: string, allowedDirs: string[]): boolean {
  const canonicalRequested = path.resolve(requestedPath);
  const canonicalAllowed = allowedDirs.map(d => path.resolve(d));
  return canonicalAllowed.some(allowed => canonicalRequested.startsWith(allowed));
}
```

**Edge Cases**:
- Symlinks: Resolve to canonical path before validation
- Case sensitivity: Normalize based on platform (case-insensitive on Windows/macOS)
- Network paths: Validate before adding to whitelist
- Race conditions: Validate again just before operation

### 4. Real-time List Update Strategy

**Decision**: Incremental updates with debounce and virtualization

**Rationale**:
- Performance requirement: <500ms response to file system changes
- Large lists (500+ skills) need efficient rendering
- Virtual scrolling prevents DOM thrashing
- Incremental updates avoid full re-scans

**Implementation**:
- **File Watcher**: Debounce 100ms to batch rapid changes
- **State Management**: Maintain in-memory skill map for O(1) lookups
- **UI**: Use `react-window` or similar for virtual scrolling
- **Diff Algorithm**: Only update changed items in React state

**Performance Targets**:
- File change → UI update: <500ms
- List render (500 items): <100ms
- Search/filter: <50ms

### 5. Skill File Parsing

**Decision**: Use `gray-matter` for YAML frontmatter parsing

**Rationale**:
- Mature library specifically designed for frontmatter parsing
- Handles YAML parsing errors gracefully
- Supports custom delimiters if needed
- Lightweight and well-maintained

**Alternatives Considered**:
- **Custom regex parser**: Error-prone, hard to maintain
- **yaml-front-matter**: Less popular, fewer features
- **js-yaml + custom extraction**: More code to maintain

**Error Handling**:
- Invalid YAML: Display skill with warning icon, show error in editor
- Missing frontmatter: Treat as plain markdown, generate default metadata
- Encoding issues: Assume UTF-8, provide clear error for other encodings

### 6. Configuration Storage

**Decision**: JSON file in Electron app data directory

**Rationale**:
- Electron's `app.getPath('userData')` provides platform-appropriate location
- JSON is human-readable and easy to debug
- No additional database dependencies
- Atomic writes prevent corruption

**Alternatives Considered**:
- **LocalStorage**: Renderer-only, not accessible from main process
- **SQLite**: Overkill for simple configuration
- **Electron store**: Good but adds dependency for simple use case

**Implementation**:
```typescript
// Config location examples:
// Windows: %APPDATA%/skillsMM/config.json
// macOS: ~/Library/Application Support/skillsMM/config.json
// Linux: ~/.config/skillsMM/config.json
```

**Schema**:
- projectSkillDir: string (required)
- globalSkillDir: string (auto-detected, user can override)
- defaultInstallTarget: 'project' | 'global'
- editorDefaultMode: 'edit' | 'preview'
- autoRefresh: boolean

### 7. System Recycle Bin Integration

**Decision**: Use `trash` npm package for cross-platform recycle bin

**Rationale**:
- Cross-platform (Windows, macOS, Linux)
- Uses platform-specific APIs (Windows: SHFileOperation, macOS: NSFileManager, Linux: gio trash)
- Well-maintained with active community
- Security requirement: Prevent permanent data loss

**Alternatives Considered**:
- **shell.moveItemToTrash (Electron)**: Electron's built-in, but `trash` has better Linux support
- **Direct file system delete**: Violates security requirement
- **Custom implementation**: Too platform-specific

**Implementation Notes**:
- Async/await API
- Handle permission errors gracefully
- Provide fallback error message if trash operation fails

### 8. IPC Communication Pattern

**Decision**: Typed IPC channels with request/response pattern

**Rationale**:
- Type safety across main/renderer boundary
- Clear separation between command and query operations
- Error handling via standardized response format
- Easy to test and mock

**Pattern**:
```typescript
// Main process handler
ipcMain.handle('skill:create', async (event, payload: CreateSkillRequest): Promise<CreateSkillResponse> => {
  try {
    const result = await skillService.create(payload);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Renderer process caller
const response = await ipcRenderer.invoke('skill:create', request);
if (!response.success) {
  showError(response.error);
}
```

**Channels**:
- `skill:list`, `skill:create`, `skill:read`, `skill:update`, `skill:delete`
- `config:get`, `config:set`
- `directory:scan`, `directory:watch`

### 9. Error Message Strategy

**Decision**: Structured error types with actionable guidance

**Rationale**:
- FR-010: Error messages must be actionable
- SC-004: 90% of errors must contain specific problem and solution
- User experience requirement: No generic "An error occurred"

**Error Types**:
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public action: string
  ) {}
}

// Example:
throw new AppError(
  'ENOENT: no such file or directory',
  'Cannot find skill file',
  'The file may have been moved or deleted. Try refreshing the skill list.'
);
```

**Implementation**:
- Main process: Throw `AppError` from services
- IPC layer: Catch and serialize to `{ success: false, error: { message, action } }`
- Renderer: Display both message and action in toast/notification

### 10. Performance Optimization Techniques

**Decision**: Lazy loading, caching, and virtual scrolling

**Rationale**:
- Performance targets: <3s startup, <100ms operations, <300MB memory
- Large skill lists (500+) require efficient rendering
- File I/O is the primary bottleneck

**Techniques**:
1. **Startup**: Scan directories asynchronously, show placeholder UI
2. **Caching**: In-memory skill metadata, invalidate on file change
3. **Rendering**: Virtual scrolling (react-window), lazy load skill content
4. **File I/O**: Use async operations, never block main thread
5. **Debouncing**: Batch rapid file system events (100ms)
6. **Search**: In-memory index for fast filtering

**Monitoring**:
- Log operation durations for performance tracking
- Alert if operations exceed SLA thresholds
- Memory profiling in development

## Resolved Clarifications

All technical context items have been resolved:

- ✅ **Language/Version**: TypeScript 5.x with Node.js LTS (v20+)
- ✅ **Primary Dependencies**: Electron, React, Monaco Editor, Tailwind CSS, chokidar, gray-matter
- ✅ **Storage**: Local file system (skills), JSON (config), Electron userData (app data)
- ✅ **Testing**: Jest for unit/integration, Playwright for E2E
- ✅ **Target Platform**: Desktop (Windows 10/11, macOS 12+, Linux Ubuntu 20.04+)
- ✅ **Project Type**: Desktop application (Electron)
- ✅ **Performance Goals**: <3s startup, <100ms saves, <500ms list updates, <300MB memory
- ✅ **Constraints**: <2s scan (500 skills), <5% CPU idle, path validation required
- ✅ **Scale/Scope**: 500+ skills, single project directory, 6 user stories

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md with Skill, SkillDirectory, Configuration entities
- Define IPC contracts in contracts/ipc-contracts.md
- Create quickstart.md with development setup guide
