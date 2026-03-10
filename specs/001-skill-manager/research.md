# Research: Claude Code Skill Management Center

**Feature**: 001-skill-manager
**Date**: 2026-03-10
**Purpose**: Document technology decisions, best practices, and implementation patterns

## Technology Stack Decisions

### Electron Framework

**Decision**: Use Electron as the cross-platform desktop framework

**Rationale**:
- Native cross-platform support (Windows, macOS, Linux)
- Large ecosystem and community support
- Built-in security features (safeStorage for credential encryption)
- Excellent integration with Node.js and web technologies
- Mature tooling for development and testing (Spectron, Electron Forge)

**Alternatives Considered**:
- **Tauri**: Lighter weight and better performance, but smaller ecosystem and less mature tooling. Rejected due to team familiarity with Electron and need for rapid development.
- **Qt/QML**: Native performance, but requires C++ or Python, steeper learning curve, and harder to find developers with both Qt and web experience.
- **NW.js**: Similar to Electron but smaller community and fewer security features. Rejected in favor of Electron's better documentation and safeStorage.

**Best Practices**:
- Use contextIsolation and nodeIntegration: false for security
- Implement IPC whitelist for allowed channels
- Minimize main process work to improve performance
- Use preload scripts to expose only necessary APIs to renderer
- Enable sandbox mode for renderer processes

### React 18+ with TypeScript

**Decision**: Use React with TypeScript strict mode for frontend

**Rationale**:
- Component-based architecture fits well with UI requirements (skill list, editor, preview panels)
- Strong typing reduces runtime errors and improves maintainability
- Large ecosystem of libraries (React Testing Library, Monaco React wrapper)
- Excellent TypeScript support and tooling
- Familiar to web developers, making future maintenance easier

**Alternatives Considered**:
- **Vue 3**: Similar component model, but smaller ecosystem for complex desktop apps. Rejected due to React's better integration with Monaco Editor and larger talent pool.
- **Svelte**: Better performance through compilation, but smaller ecosystem and fewer third-party components. Rejected due to need for mature libraries (Monaco, file handling).
- **Plain TypeScript/DOM**: Maximum control but would require building component system from scratch. Rejected due to time constraints and reinventing the wheel.

**Best Practices**:
- Use functional components with hooks (no class components)
- Implement proper error boundaries for crash recovery
- Use React.memo and useMemo for performance optimization
- Follow React 18+ concurrent features guidelines
- Implement proper cleanup in useEffect to prevent memory leaks
- Use React Testing Library for component tests

### Tailwind CSS

**Decision**: Use Tailwind CSS for utility-first styling

**Rationale**:
- Rapid UI development with utility classes
- Built-in dark mode support (constitution requirement for dark theme)
- Excellent performance with purging unused styles
- Responsive design utilities (minimum 1024x768 requirement)
- No need to write custom CSS for most use cases

**Alternatives Considered**:
- **CSS Modules**: Better encapsulation but requires writing more custom CSS. Rejected due to Tailwind's faster development velocity.
- **Styled Components**: CSS-in-JS approach, but adds runtime overhead. Rejected for performance reasons (300MB memory constraint).
- **Material-UI**: Complete component library but larger bundle size and opinionated design. Rejected to maintain design flexibility and reduce bundle size.

**Best Practices**:
- Configure purging to remove unused styles in production
- Use @apply for repeated utility combinations
- Implement dark mode with class strategy (not media)
- Follow mobile-first responsive design
- Use consistent spacing scale (4px base)
- Configure custom colors for brand identity

### Monaco Editor

**Decision**: Use Monaco Editor for skill file editing

**Rationale**:
- Industry-standard code editor (VS Code's editor)
- Built-in YAML and Markdown syntax highlighting (FR-004)
- Excellent TypeScript integration
- Performance optimized for large files
- Familiar editing experience for developers

**Alternatives Considered**:
- **CodeMirror**: Lighter weight but fewer features and worse TypeScript support. Rejected due to need for robust YAML/Markdown support.
- **Ace Editor**: Mature and feature-rich but heavier and less modern API. Rejected in favor of Monaco's better React integration.
- **Simple textarea**: Minimal overhead but no syntax highlighting or advanced editing features. Rejected due to FR-004 requirement.

**Best Practices**:
- Lazy load Monaco to reduce initial bundle size
- Configure YAML schema validation for frontmatter
- Implement custom completions for skill metadata
- Use web workers for heavy operations (validation, formatting)
- Configure appropriate font size and line height for readability

### Claude Agent SDK Integration

**Decision**: Use Claude Agent SDK with skill-creator skill for AI generation

**Rationale**:
- Official SDK ensures compatibility and support
- Built-in streaming support for real-time responses (FR-008)
- Integrates with skill-creator skill for standards-compliant output
- Secure API key management through backend proxy
- Timeout and error handling built-in

**Implementation Pattern**:
```
Renderer → IPC → Main Process → Claude Agent SDK → skill-creator skill
                ↑                    ↓
                └──── Stream chunks ←┘
```

**Security Requirements**:
- API key stored in safeStorage, never exposed to renderer
- All AI requests proxied through main process
- Request timeout: 30s default with user control
- Streaming chunks delivered via IPC events

**Best Practices**:
- Implement request cancellation for user-initiated stops
- Use streaming for real-time feedback (200ms chunks minimum)
- Validate generated content against Agent Skills spec
- Handle rate limiting gracefully with user feedback
- Cache common prompts to reduce API usage

### GitHub REST API v3

**Decision**: Use GitHub REST API v3 for public and private repository access

**Rationale**:
- Official API with comprehensive documentation
- Supports both public search and private repository access
- Built-in rate limiting (60/hour unauthenticated, 5000/hour with PAT)
- Raw content URLs for skill preview without full repository download

**Authentication Strategy**:
- Public search: Unauthenticated (60 req/hour) with clear error message on rate limit
- Private repos: PAT stored in safeStorage, per-repository configuration
- PAT validation on configuration save

**Best Practices**:
- Implement exponential backoff for rate limiting
- Cache search results (5-minute TTL for private repos)
- Use conditional requests (ETag/If-None-Match) to save rate limit
- Fetch only necessary data (file listings, not full repo content)
- Display clear rate limit status to users

**Search Implementation**:
```typescript
// Search for repositories containing skill.md files
GET https://api.github.com/search/code?q=filename:skill.md+${query}
// Result: List of repositories with skill.md files

// For each repository, fetch skill directory structure
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}
// Result: List of files in skill directory

// Preview skill.md content
GET https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}/skill.md
// Result: Raw skill content for preview
```

## Performance Optimization Strategies

### Skill List Loading (≤2s for 500+ skills)

**Strategy**:
1. **Lazy loading**: Load skills in batches of 50, display immediately
2. **Metadata caching**: Cache parsed frontmatter in JSON, invalidate on file change
3. **Parallel scanning**: Use Promise.all for directory scanning
4. **Virtual scrolling**: Render only visible skills in viewport (react-window library)

**Implementation**:
```typescript
// Batch loading with parallel processing
async function loadSkills(): Promise<Skill[]> {
  const skillDirs = await scanDirectories(projectDir, globalDir);
  const batches = chunk(skillDirs, 50);

  const skills = await Promise.all(
    batches.map(batch => processBatch(batch))
  );

  return skills.flat();
}
```

### File Operations (<100ms)

**Strategy**:
1. **Async I/O**: All file operations use async/await, never synchronous
2. **Write buffering**: Debounce rapid saves (300ms)
3. **Optimistic updates**: Update UI immediately, revert on error
4. **File watching**: Use chokidar for real-time change detection

**Implementation**:
```typescript
// Debounced save with optimistic update
const saveSkill = debounce(async (skill: Skill) => {
  updateUI(skill); // Immediate feedback
  try {
    await writeFile(skill.path, skill.content);
  } catch (error) {
    revertUI();
    showError(error);
  }
}, 300);
```

### Memory Management (<300MB)

**Strategy**:
1. **Lazy loading**: Load skill content only when editing
2. **Cleanup on unmount**: Dispose Monaco editor instances properly
3. **Limit AI history**: Clear streaming buffers after completion
4. **Monitor memory**: Use process.memoryUsage() for debugging

**Implementation**:
```typescript
// Cleanup on component unmount
useEffect(() => {
  const editor = monaco.editor.create(...);

  return () => {
    editor.dispose(); // Prevent memory leak
  };
}, []);
```

## Security Implementation Details

### Credential Encryption (safeStorage)

**Implementation**:
```typescript
// Store PAT securely
async function storePAT(repoUrl: string, pat: string): Promise<void> {
  const encrypted = safeStorage.encryptString(pat);
  await store.set(`pat_${hashRepoUrl(repoUrl)}`, encrypted);
}

// Retrieve PAT
async function getPAT(repoUrl: string): Promise<string | null> {
  const encrypted = await store.get(`pat_${hashRepoUrl(repoUrl)}`);
  if (!encrypted) return null;
  return safeStorage.decryptString(encrypted);
}
```

### Path Validation (FR-014)

**Implementation**:
```typescript
function validatePath(requestedPath: string, allowedDirs: string[]): boolean {
  const resolved = path.resolve(requestedPath);

  return allowedDirs.some(allowedDir => {
    const normalized = path.resolve(allowedDir);
    return resolved.startsWith(normalized + path.sep);
  });
}

// Usage
const allowedDirs = [projectDir, globalDir];
if (!validatePath(skillPath, allowedDirs)) {
  throw new Error('Path traversal attempt detected');
}
```

### Secure Deletion (FR-006)

**Implementation**:
```typescript
// Use trash package for cross-platform recycle bin
import trash from 'trash';

async function deleteSkill(skillPath: string): Promise<void> {
  await trash(skillPath);
}
```

## Integration Patterns

### IPC Communication Pattern

**Pattern**: Request-response with event streaming

```typescript
// Main process handler
ipcMain.handle('skill:load', async (event, skillId) => {
  const skill = await SkillService.load(skillId);
  return skill;
});

// Renderer client
const skill = await ipcRenderer.invoke('skill:load', skillId);
```

**Streaming Pattern** (AI generation):
```typescript
// Main process streaming
ipcMain.on('ai:generate', async (event, request) => {
  const stream = await AIService.generate(request);

  stream.on('data', (chunk) => {
    event.reply('ai:chunk', chunk);
  });

  stream.on('end', () => {
    event.reply('ai:complete');
  });
});

// Renderer listener
ipcRenderer.on('ai:chunk', (event, chunk) => {
  updateEditorContent(chunk);
});
```

### File Watching Pattern

**Pattern**: Watch directories, debounce rapid changes

```typescript
import chokidar from 'chokidar';
import debounce from 'lodash/debounce';

const watcher = chokidar.watch([projectDir, globalDir]);

watcher.on('all', debounce((event, path) => {
  if (event === 'add' || event === 'change' || event === 'unlink') {
    mainWindow.webContents.send('skills:refresh');
  }
}, 500));
```

## Testing Strategy

### Unit Tests (≥70% coverage)

**Focus Areas**:
- Service layer (SkillService, GitHubService, AIService)
- Path validation logic
- Metadata parsing (YAML frontmatter)
- Configuration management

**Example**:
```typescript
describe('PathValidator', () => {
  it('should reject path traversal attempts', () => {
    const maliciousPath = '../../etc/passwd';
    const allowedDirs = ['/home/user/skills'];

    expect(() => validatePath(maliciousPath, allowedDirs))
      .toThrow('Path traversal attempt detected');
  });
});
```

### Integration Tests

**Focus Areas**:
- IPC communication end-to-end
- File operations with real file system
- GitHub API integration (mocked)
- AI generation flow (mocked)

### E2E Tests (Electron)

**Focus Areas**:
- User journeys (create skill, edit, AI generate, install from GitHub)
- Cross-platform behavior
- Performance benchmarks (startup time, list loading)

## Open Questions for Research

1. ~~What constitutes a "skill" - a single file or a directory structure?~~ ✅ **Resolved**: A directory containing a `skill.md` file (see spec clarifications)

2. ~~When installing a skill from GitHub, what should be downloaded?~~ ✅ **Resolved**: The entire skill directory (including supporting files)

3. ~~How are installation conflicts detected?~~ ✅ **Resolved**: Directory name collision (overwrite/rename/skip options)

4. **Monaco Editor bundle size**: How to lazy load Monaco without impacting initial startup time?
   - **Research needed**: Code splitting strategies for Monaco in Electron

5. **GitHub API rate limit handling**: Should we implement client-side caching with configurable TTL?
   - **Research needed**: Best practices for GitHub API caching in desktop apps

6. **AI generation timeout UX**: What should the user experience be when AI generation exceeds 30 seconds?
   - **Research needed**: User research on acceptable wait times and cancellation UX

## Next Steps

With technology decisions documented and best practices identified, proceed to Phase 1:
1. Generate data-model.md based on entities from spec
2. Define IPC contracts in /contracts/
3. Create quickstart.md for developer onboarding
4. Update agent context files (CLAUDE.md)
