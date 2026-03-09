# Research: Local Skill Management

**Date**: 2026-03-09
**Feature**: 002-local-skill-management

This document consolidates research findings to resolve technical unknowns and establish best practices for implementation.

## 1. Electron IPC Architecture and Security

### Decision
Use Electron's ipcMain/ipcRenderer with contextBridge for secure IPC communication. All file operations must occur in the main process with path validation.

### Rationale
- **Security**: ContextBridge prevents renderer from directly accessing Node.js APIs
- **Type Safety**: TypeScript interfaces ensure contract compliance
- **Architecture**: Aligns with Constitution Principle VI (modularity and testability)
- **Performance**: Async IPC prevents UI blocking

### Alternatives Considered
- **Remote Module**: Deprecated and insecure (rejected for security reasons)
- **Direct Node.js in Renderer**: Violates security best practices (rejected)
- **Web Workers**: Doesn't solve file system access security requirements

### Implementation Pattern
```typescript
// Main process: ipc/skillHandlers.ts
ipcMain.handle('skill:list', async (event, directoryPath: string) => {
  return await SkillService.listSkills(directoryPath);
});

// Preload script: preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  listSkills: (dir: string) => ipcRenderer.invoke('skill:list', dir)
});

// Renderer: services/ipcClient.ts
export const ipcClient = {
  listSkills: async (dir: string): Promise<Skill[]> => {
    return window.electronAPI.listSkills(dir);
  }
};
```

## 2. Monaco Editor Integration in Electron

### Decision
Use `@monaco-editor/react` with custom configuration for YAML + Markdown syntax highlighting.

### Rationale
- **Performance**: Monaco is optimized for desktop applications
- **Features**: Built-in syntax highlighting, IntelliSense, minimap
- **Integration**: Works seamlessly with Electron's web context
- **User Experience**: Familiar editor experience (VS Code-like)

### Alternatives Considered
- **CodeMirror**: Lighter but less feature-rich (rejected due to requirement for advanced features)
- **Ace Editor**: Good but Monaco has better TypeScript support (rejected)
- **Simple TextArea**: Insufficient for developer experience (rejected)

### Best Practices
- Lazy load Monaco to reduce initial bundle size
- Configure editor options for skill file editing (line numbers, word wrap)
- Implement custom themes matching application design
- Handle file change detection with editor's change tracking

```typescript
// Component setup
import Editor from '@monaco-editor/react';

<Editor
  height="100%"
  defaultLanguage="markdown"
  theme="vs-dark"
  options={{
    minimap: { enabled: true },
    lineNumbers: 'on',
    wordWrap: 'on',
    fontSize: 14,
  }}
  value={content}
  onChange={handleChange}
/>
```

## 3. File System Watching in Node.js

### Decision
Use `chokidar` library for cross-platform file system watching with debouncing.

### Rationale
- **Reliability**: Handles cross-platform edge cases (macOS fsevents, Windows changes)
- **Performance**: Efficient event handling with built-in debouncing
- **Features**: Recursive watching, pattern matching, atomic writes support
- **Maturity**: Most widely used file watcher in Node.js ecosystem

### Alternatives Considered
- **Native fs.watch**: Inconsistent across platforms, unreliable for directories (rejected)
- **nsfw**: Native addon, harder to build and distribute (rejected)
- **Polling**: Too slow for 500ms requirement (rejected)

### Implementation Pattern
```typescript
import chokidar from 'chokidar';

class FileWatcher {
  private watcher: chokidar.FSWatcher;

  watch(directory: string, callback: (event: string, path: string) => void) {
    this.watcher = chokidar.watch(directory, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    });

    this.watcher.on('all', (event, path) => {
      callback(event, path);
    });
  }
}
```

### Performance Considerations
- Use `ignoreInitial: true` to skip initial scan (handled separately)
- Use `awaitWriteFinish` to debounce rapid file changes
- Watch skill directories, not individual files
- Throttle UI updates to prevent excessive re-renders

## 4. Virtual Scrolling for Large Lists

### Decision
Use `react-window` library for virtualized skill list rendering.

### Rationale
- **Performance**: Renders only visible items (handles 10,000+ items smoothly)
- **Bundle Size**: Lightweight (~6KB gzipped)
- **React Integration**: Designed for React, proper hooks support
- **Accessibility**: Maintains keyboard navigation and screen reader support

### Alternatives Considered
- **react-virtualized**: Larger bundle size, more complex API (rejected)
- **react-virtuoso**: Good but less mature than react-window (rejected)
- **Native scrolling**: Performance degrades with 500+ DOM nodes (rejected)

### Implementation Pattern
```typescript
import { FixedSizeList as List } from 'react-window';

const SkillList = ({ skills }: { skills: Skill[] }) => (
  <List
    height={600}
    itemCount={skills.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <SkillCard skill={skills[index]} />
      </div>
    )}
  </List>
);
```

### Performance Targets
- Render time for 500 items: <50ms
- Scroll frame rate: 60fps
- Memory per item: <1KB

## 5. Path Validation and Security Patterns

### Decision
Implement centralized PathValidator service that validates all paths against whitelisted directories.

### Rationale
- **Security**: Prevents path traversal attacks (Constitution Principle II)
- **Centralization**: Single validation logic, easier to audit
- **Maintainability**: Changes to validation rules in one place
- **Testing**: Clear unit test boundaries

### Implementation Pattern
```typescript
class PathValidator {
  private allowedDirectories: Set<string>;

  constructor(projectDir: string, globalDir: string) {
    this.allowedDirectories = new Set([
      path.resolve(projectDir),
      path.resolve(globalDir)
    ]);
  }

  validate(requestedPath: string): string {
    const resolved = path.resolve(requestedPath);

    for (const allowed of this.allowedDirectories) {
      if (resolved.startsWith(allowed + path.sep) || resolved === allowed) {
        return resolved; // Valid path
      }
    }

    throw new Error(`Path traversal detected: ${requestedPath}`);
  }

  isWithinAllowedDir(filePath: string): boolean {
    try {
      this.validate(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Security Checklist
- ✅ Validate ALL file operation paths (read, write, delete)
- ✅ Use `path.resolve()` to normalize paths
- ✅ Check both prefix matching AND exact matching
- ✅ Reject symlinks that point outside allowed directories
- ✅ Log all validation failures for audit trail

## 6. Cross-Platform Recycle Bin Integration

### Decision
Use `trash` npm package for cross-platform recycle bin support.

### Rationale
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Safety**: Moves to trash instead of permanent deletion
- **User Experience**: Users can recover deleted skills
- **Native Integration**: Uses platform-specific trash APIs

### Alternatives Considered
- **fs.unlink**: Permanent deletion (rejected - violates FR-006)
- **move-file + custom folder**: Not standard user expectation (rejected)
- **Electron shell.trashItem**: Limited to renderer process (rejected for architecture reasons)

### Implementation Pattern
```typescript
import trash from 'trash';

class SkillService {
  async deleteSkill(skillPath: string): Promise<void> {
    // Validate path first
    const validatedPath = this.pathValidator.validate(skillPath);

    // Move to trash
    await trash(validatedPath);

    // Log deletion
    this.logger.info('Skill deleted', { path: validatedPath });
  }
}
```

### Platform-Specific Behavior
- **Windows**: Moves to Recycle Bin
- **macOS**: Moves to Trash
- **Linux**: Moves to trash folder (freedesktop.org spec)

## 7. Tailwind CSS with Electron and React

### Decision
Use Tailwind CSS with PostCSS for styling, configured for Electron's environment.

### Rationale
- **Development Speed**: Utility-first CSS accelerates UI development
- **Consistency**: Design system enforced through configuration
- **Performance**: PurgeCSS removes unused styles in production
- **Maintainability**: No custom CSS files to manage

### Alternatives Considered
- **CSS Modules**: More verbose, requires separate files (rejected)
- **Styled Components**: Runtime overhead, larger bundle (rejected)
- **Plain CSS**: Slower development, harder to maintain consistency (rejected)

### Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/renderer/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors matching application theme
      }
    },
  },
  plugins: [],
}
```

### Best Practices
- Use dark mode by default (per spec assumption)
- Configure proper content paths for tree-shaking
- Use Tailwind's responsive utilities for window resizing
- Avoid arbitrary values - use theme configuration

## 8. TypeScript Strict Mode Patterns for Electron

### Decision
Enable TypeScript strict mode with additional linting rules for type safety.

### Rationale
- **Type Safety**: Catches errors at compile time
- **Code Quality**: Forces explicit handling of edge cases
- **Maintainability**: Types serve as documentation
- **Constitution Compliance**: Meets Code Quality requirements

### Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Best Practices
- Define strict types for all IPC messages
- Use discriminated unions for state management
- Avoid type assertions - use type guards
- Type all service interfaces explicitly
- Use `unknown` instead of `any` for truly unknown types

### IPC Type Safety Pattern
```typescript
// shared/types.ts
export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Skill {
  path: string;
  name: string;
  description: string;
  source: 'project' | 'global';
  lastModified: Date;
  resourceCount: number;
}

// Type-safe IPC wrapper
export async function invokeIPC<T>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}
```

## 9. React State Management for Desktop App

### Decision
Use React Context + useReducer for global state, local state for component-specific data.

### Rationale
- **Simplicity**: No additional dependencies needed
- **Performance**: Sufficient for application scale (500 skills)
- **Type Safety**: Full TypeScript support
- **Bundle Size**: Zero overhead

### Alternatives Considered
- **Redux**: Overkill for this application size (rejected)
- **Zustand**: Good but unnecessary dependency (rejected)
- **Recoil**: Still experimental, larger bundle (rejected)

### Implementation Pattern
```typescript
// State shape
interface AppState {
  skills: Skill[];
  config: Configuration;
  ui: {
    selectedSkill: string | null;
    filterSource: 'all' | 'project' | 'global';
    sortBy: 'name' | 'modified';
  };
}

// Context + Reducer
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>(null!);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SKILLS':
      return { ...state, skills: action.payload };
    // ... other actions
  }
}
```

## 10. Error Handling and User Feedback

### Decision
Implement structured error handling with actionable error messages and toast notifications.

### Rationale
- **User Experience**: Clear guidance helps users solve problems
- **Constitution Compliance**: SC-004 requires 90% actionable errors
- **Debugging**: Structured errors aid troubleshooting
- **Consistency**: Standardized error format across application

### Error Message Guidelines
```typescript
// ✅ Good: Actionable error
throw new Error(
  `Cannot save skill: File is read-only. ` +
  `Right-click the file → Properties → Uncheck "Read-only".`
);

// ❌ Bad: Generic error
throw new Error('Failed to save file.');
```

### Implementation Pattern
```typescript
class ErrorHandler {
  static formatError(error: unknown): string {
    if (error instanceof FileNotFoundError) {
      return `Skill not found: ${error.path}. It may have been moved or deleted.`;
    }
    if (error instanceof PermissionError) {
      return `Permission denied: ${error.path}. Check file permissions.`;
    }
    if (error instanceof YAMLParseError) {
      return `Invalid YAML in ${error.file}: ${error.message}. Check syntax at line ${error.line}.`;
    }
    // Log unexpected errors for debugging
    logger.error('Unexpected error', error);
    return 'An unexpected error occurred. Check logs for details.';
  }
}
```

## Summary

All technical unknowns have been resolved. Key decisions:
1. **Electron IPC**: Secure communication with contextBridge
2. **Editor**: Monaco for syntax highlighting and developer experience
3. **File Watching**: Chokidar for cross-platform reliability
4. **Performance**: React-window for virtual scrolling
5. **Security**: Centralized PathValidator for all file operations
6. **Deletion**: Trash package for recycle bin integration
7. **Styling**: Tailwind CSS for rapid UI development
8. **Type Safety**: TypeScript strict mode throughout
9. **State Management**: React Context + useReducer
10. **Error Handling**: Actionable messages with user guidance

All decisions align with Constitution principles and performance requirements. Ready for Phase 1: Design & Contracts.
