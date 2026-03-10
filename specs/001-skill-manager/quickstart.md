# Quickstart: Claude Code Skill Management Center

**Feature**: 001-skill-manager
**Date**: 2026-03-10

## Prerequisites

- **Node.js**: LTS version (v20+)
- **npm**: v9+ or yarn v1.22+
- **Git**: v2.30+
- **Code Editor**: VS Code recommended (with TypeScript and ESLint extensions)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd skillsMN

# Install dependencies
npm install

# Install Electron (if not bundled)
npm install electron --save-dev
```

### 2. Development Environment Setup

```bash
# Start development server with hot reload
npm run dev

# Or start Electron directly
npm start
```

The application should open with the main window displaying the skill management interface.

### 3. Project Structure Overview

```
skillsMN/
├── src/
│   ├── main/              # Electron main process (backend)
│   │   ├── index.ts       # Entry point
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   ├── ipc/           # IPC handlers
│   │   └── utils/         # Utilities
│   ├── renderer/          # Electron renderer process (frontend)
│   │   ├── components/    # React components
│   │   ├── services/      # Frontend services
│   │   └── App.tsx        # Root component
│   └── shared/            # Shared types
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── specs/
    └── 001-skill-manager/ # Feature documentation
        ├── plan.md        # This implementation plan
        ├── research.md    # Technology decisions
        ├── data-model.md  # Entity definitions
        └── contracts/     # IPC contracts
```

## Development Workflow

### Adding a New Feature

1. **Understand the requirements**: Read the spec.md and plan.md
2. **Check data models**: Review data-model.md for entity definitions
3. **Define IPC contract**: Add or update contracts in contracts/ipc-contracts.md
4. **Implement service layer**: Create or modify services in `src/main/services/`
5. **Add IPC handler**: Create thin wrapper in `src/main/ipc/`
6. **Build UI component**: Create React component in `src/renderer/components/`
7. **Connect via IPC**: Use IPC client in component
8. **Write tests**: Add unit, integration, and e2e tests
9. **Update documentation**: Document any deviations or additions

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests (requires Electron)
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Code Quality Checks

```bash
# Run TypeScript type checking
npm run type-check

# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Run all quality checks
npm run check
```

### Building for Production

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# Package as distributable
npm run package
```

## Key Concepts

### Electron Architecture

**Main Process**:
- Single instance, manages application lifecycle
- Handles file system operations, external APIs, credential management
- Exposes IPC handlers for renderer communication
- Runs Node.js APIs

**Renderer Process**:
- UI rendering with React
- User interactions and state management
- Communicates with main process via IPC
- Runs web APIs (no direct Node.js access)

**IPC Communication**:
```typescript
// Renderer (React component)
const loadSkills = async () => {
  const result = await ipcRenderer.invoke('skill:list');
  if (result.success) {
    setSkills(result.data.skills);
  }
};

// Main (IPC handler)
ipcMain.handle('skill:list', async () => {
  const skills = await SkillService.listAll();
  return { success: true, data: { skills } };
});
```

### Service Layer Pattern

All business logic lives in services, not IPC handlers:

```typescript
// ✅ Good: Service handles logic
class SkillService {
  static async create(name: string, description: string): Promise<Skill> {
    const dirName = this.generateDirectoryName(name);
    const path = this.validatePath(dirName);
    await this.createDirectory(path);
    await this.writeTemplate(path, name, description);
    return this.load(path);
  }
}

// IPC handler is thin wrapper
ipcMain.handle('skill:create', async (event, { name, description }) => {
  return SkillService.create(name, description);
});

// ❌ Bad: Logic in IPC handler
ipcMain.handle('skill:create', async (event, { name, description }) => {
  const dirName = name.toLowerCase().replace(/\s+/g, '-');
  const path = path.join(projectDir, dirName);
  // ... business logic mixed with IPC
});
```

### Security Best Practices

1. **Path Validation**: Always validate file paths
```typescript
import { PathValidator } from '../utils/PathValidator';

const safePath = PathValidator.validate(userProvidedPath, allowedDirs);
```

2. **Credential Encryption**: Never store credentials in plain text
```typescript
import { safeStorage } from 'electron';

// Encrypt before storing
const encrypted = safeStorage.encryptString(apiKey);
await store.set('api_key', encrypted);

// Decrypt when needed
const encrypted = await store.get('api_key');
const apiKey = safeStorage.decryptString(encrypted);
```

3. **IPC Whitelist**: Only expose documented channels
```typescript
// preload.ts
const validChannels = [
  'skill:list', 'skill:get', 'skill:create',
  'github:search', 'ai:generate'
];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
});
```

### Performance Optimization

1. **Lazy Loading**: Load skill content only when editing
```typescript
// Load metadata only
const skills = await SkillService.listAll(); // Fast

// Load full content on demand
const fullSkill = await SkillService.get(skill.id); // When editing
```

2. **Virtual Scrolling**: Use react-window for large lists
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={skills.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <SkillCard skill={skills[index]} />
    </div>
  )}
</FixedSizeList>
```

3. **Debouncing**: Debounce rapid operations
```typescript
import { debounce } from 'lodash';

const handleSearch = debounce(async (query: string) => {
  const results = await searchGitHub(query);
  setResults(results);
}, 500);
```

## Common Tasks

### Adding a New IPC Channel

1. **Define contract** in `contracts/ipc-contracts.md`
2. **Create service method** in appropriate service
3. **Add IPC handler** in `src/main/ipc/`
4. **Add to whitelist** in `preload.ts`
5. **Create frontend hook** in `src/renderer/hooks/`
6. **Write tests** for service, handler, and integration

### Creating a New React Component

1. **Create component file** in `src/renderer/components/`
2. **Use TypeScript strict mode** with proper types
3. **Implement with Tailwind CSS** (no custom CSS unless necessary)
4. **Add error boundary** for crash recovery
5. **Write tests** with React Testing Library
6. **Document props** with JSDoc comments

### Integrating with GitHub API

1. **Use GitHubService** for all GitHub operations
2. **Handle rate limits** with exponential backoff
3. **Cache responses** to reduce API calls
4. **Display rate limit status** to users
5. **Mock GitHub API** in tests

### Working with Monaco Editor

1. **Lazy load Monaco** to reduce bundle size
```typescript
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));
```

2. **Configure YAML validation** for skill frontmatter
```typescript
monaco.languages.yaml.yamlDefaults.setDiagnosticsOptions({
  validate: true,
  schemas: [{
    uri: 'skill-frontmatter.json',
    fileMatch: ['skill.md'],
    schema: frontmatterSchema
  }]
});
```

3. **Dispose editor on unmount** to prevent memory leaks
```typescript
useEffect(() => {
  const editor = monaco.editor.create(...);
  return () => editor.dispose();
}, []);
```

## Debugging

### Main Process Debugging

```bash
# Enable Chrome DevTools for main process
ELECTRON_ENABLE_LOGGING=1 npm start

# Or use VS Code debugger
# .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Electron Main",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "program": "${workspaceFolder}/src/main/index.ts",
      "protocol": "inspector"
    }
  ]
}
```

### Renderer Process Debugging

Open Chrome DevTools in the Electron window:
- **Windows/Linux**: `Ctrl+Shift+I`
- **macOS**: `Cmd+Option+I`

### IPC Communication Debugging

Add logging to all IPC handlers:
```typescript
ipcMain.handle('skill:list', async (event, ...args) => {
  console.log('[IPC] skill:list called', args);
  const result = await SkillService.listAll();
  console.log('[IPC] skill:list result', result);
  return result;
});
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'electron'"**
   - Solution: `npm install electron --save-dev`

2. **"Context isolation disabled" warning**
   - Solution: Enable in BrowserWindow config
   ```typescript
   new BrowserWindow({
     webPreferences: {
       contextIsolation: true,
       nodeIntegration: false
     }
   });
   ```

3. **Skill list not updating**
   - Check file watcher is running
   - Verify IPC events are being sent
   - Check React state updates

4. **GitHub API rate limit errors**
   - Add GitHub PAT in settings
   - Implement caching
   - Use conditional requests (ETag)

5. **AI generation timeout**
   - Increase timeout in configuration
   - Implement retry logic
   - Check network connectivity

## Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs/latest/)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Claude Agent SDK](https://docs.anthropic.com/)

### Project-Specific
- [Implementation Plan](./plan.md)
- [Research Notes](./research.md)
- [Data Model](./data-model.md)
- [IPC Contracts](./contracts/ipc-contracts.md)

## Getting Help

1. **Check documentation**: Review specs and contracts first
2. **Search issues**: Check existing GitHub issues
3. **Ask in team chat**: Tag relevant team members
4. **Create issue**: Provide detailed reproduction steps

## Next Steps

1. Read the [Implementation Plan](./plan.md) for architecture overview
2. Review [Data Model](./data-model.md) to understand entities
3. Study [IPC Contracts](./contracts/ipc-contracts.md) for communication patterns
4. Set up development environment following this guide
5. Pick a task from tasks.md (generated by `/speckit.tasks`)
6. Start implementing with tests first

Happy coding! 🚀
