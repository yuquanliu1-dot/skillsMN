# Quickstart: Local Skill Management Development

**Date**: 2026-03-08
**Feature**: 002-local-skill-management

## Prerequisites

### Required Software

- **Node.js**: v20.x LTS or later
- **npm**: v10.x or later (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended (for TypeScript/React support)

### Platform-Specific Requirements

**Windows**:
- Windows 10 or 11
- PowerShell 5.1 or later (for build scripts)
- Visual Studio Build Tools (for native modules)

**macOS**:
- macOS 12 (Monterey) or later
- Xcode Command Line Tools: `xcode-select --install`

**Linux** (Ubuntu 20.04+):
- Build essentials: `sudo apt install build-essential`
- libsecret dev: `sudo apt install libsecret-1-dev` (for credential storage)

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd skillsMM

# Install dependencies
npm install

# Install Electron (if not in package.json yet)
npm install --save-dev electron@latest
```

### 2. Project Structure

After setup, your project structure should look like:

```
skillsMM/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main process entry
│   │   ├── ipc/           # IPC handlers
│   │   ├── services/      # Business logic
│   │   └── models/        # Data models
│   ├── renderer/          # Electron renderer (UI)
│   │   ├── index.html
│   │   ├── index.tsx      # React entry point
│   │   ├── components/    # React components
│   │   ├── services/      # Renderer services
│   │   └── styles/        # Tailwind CSS
│   └── shared/            # Shared types/utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── specs/
│   └── 002-local-skill-management/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       └── contracts/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .eslintrc.json
```

### 3. Install Dependencies

```bash
# Core dependencies
npm install react react-dom
npm install @monaco-editor/react
npm install chokidar gray-matter trash
npm install uuid

# Development dependencies
npm install --save-dev typescript @types/node @types/react @types/react-dom
npm install --save-dev electron electron-builder
npm install --save-dev tailwindcss postcss autoprefixer
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev playwright @playwright/test
npm install --save-dev electron-reloader
```

### 4. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5. Configure Tailwind CSS

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          600: '#475569',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
```

Create `src/renderer/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
body {
  @apply bg-gray-900 text-gray-100;
}

/* Add more custom styles as needed */
```

### 6. Configure ESLint

Create `.eslintrc.json`:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "env": {
    "node": true,
    "browser": true,
    "es2020": true
  },
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 7. Configure Jest

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main/index.ts',
    '!src/renderer/index.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

## Development Workflow

### Running in Development

```bash
# Start development mode with hot reload
npm run dev

# Or run manually:
# 1. Compile TypeScript
npm run build

# 2. Start Electron
npm start
```

### Building for Production

```bash
# Build for current platform
npm run build

# Package for distribution
npm run package

# Platform-specific builds
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

### Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests (requires app to be built)
npm run test:e2e

# All tests
npm run test:all
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Implementation Order

Follow this order for implementing the feature:

### Phase 1: Foundation (Week 1)

1. **Setup project structure** - Create directories, configure build tools
2. **Implement data models** - Skill, SkillDirectory, Configuration types
3. **Implement PathValidator service** - Security-critical path validation
4. **Write unit tests** - For models and PathValidator (≥70% coverage)

### Phase 2: Core Services (Week 2)

5. **Implement ConfigService** - Load/save configuration
6. **Implement SkillService** - CRUD operations for skills
7. **Implement FileWatchService** - Monitor directory changes
8. **Write unit tests** - For all services

### Phase 3: IPC Layer (Week 3)

9. **Implement IPC handlers** - For all operations (skill:*, config:*, directory:*)
10. **Add error handling** - Structured errors with actionable messages
11. **Write integration tests** - Test IPC contracts

### Phase 4: UI Components (Week 4)

12. **Implement SetupDialog** - First-time setup flow
13. **Implement SkillList** - Display and filter skills
14. **Implement SkillEditor** - Monaco Editor integration
15. **Implement CreateSkillDialog** - New skill creation
16. **Implement SettingsPanel** - Configuration UI

### Phase 5: Integration (Week 5)

17. **Connect UI to IPC** - Wire up all components
18. **Implement file watching** - Real-time updates
19. **Add keyboard shortcuts** - Ctrl+N, Ctrl+S, Delete
20. **Polish UI** - Loading states, error toasts, animations

### Phase 6: Testing & Polish (Week 6)

21. **Write E2E tests** - All user stories
22. **Performance testing** - Verify <3s startup, <100ms operations
23. **Security testing** - Verify path validation
24. **Cross-platform testing** - Windows, macOS, Linux

## Testing Strategy

### Unit Tests (≥70% coverage)

Test individual services and models in isolation:

```typescript
// tests/unit/services/SkillService.test.ts
import { SkillService } from '@/main/services/SkillService';
import { PathValidator } from '@/main/services/PathValidator';

describe('SkillService', () => {
  let skillService: SkillService;
  let mockPathValidator: jest.Mocked<PathValidator>;

  beforeEach(() => {
    mockPathValidator = { validate: jest.fn() } as any;
    skillService = new SkillService(mockPathValidator);
  });

  describe('create', () => {
    it('should create skill with valid name', async () => {
      mockPathValidator.validate.mockReturnValue(true);
      const result = await skillService.create({
        name: 'Test Skill',
        targetDirectory: 'project'
      });
      expect(result.name).toBe('Test Skill');
      expect(result.filePath).toMatch(/test-skill\.skill$/);
    });

    it('should reject invalid skill name', async () => {
      await expect(skillService.create({
        name: '',
        targetDirectory: 'project'
      })).rejects.toThrow('Invalid skill name');
    });
  });
});
```

### Integration Tests

Test IPC handlers and service integration:

```typescript
// tests/integration/skill-crud.test.ts
import { ipcRenderer } from 'electron';

describe('Skill CRUD operations', () => {
  beforeAll(async () => {
    // Setup test directories
  });

  afterAll(async () => {
    // Cleanup test directories
  });

  it('should create, read, update, and delete a skill', async () => {
    // Create
    const createResponse = await ipcRenderer.invoke('skill:create', {
      name: 'Test Skill',
      targetDirectory: 'project'
    });
    expect(createResponse.success).toBe(true);

    // Read
    const readResponse = await ipcRenderer.invoke('skill:read', {
      filePath: createResponse.data.filePath
    });
    expect(readResponse.success).toBe(true);
    expect(readResponse.data.metadata.name).toBe('Test Skill');

    // Update
    const updateResponse = await ipcRenderer.invoke('skill:update', {
      filePath: createResponse.data.filePath,
      content: '---\nname: Updated Skill\n---\n# Content'
    });
    expect(updateResponse.success).toBe(true);

    // Delete
    const deleteResponse = await ipcRenderer.invoke('skill:delete', {
      filePath: createResponse.data.filePath
    });
    expect(deleteResponse.success).toBe(true);
  });
});
```

### E2E Tests

Test complete user journeys with Playwright:

```typescript
// tests/e2e/user-journeys.test.ts
import { test, expect } from '@playwright/test';

test.describe('Local Skill Management', () => {
  test('should complete first-time setup', async ({ page }) => {
    await page.goto('app://-/index.html');

    // Should show setup dialog
    await expect(page.locator('[data-testid="setup-dialog"]')).toBeVisible();

    // Select project directory
    await page.click('[data-testid="select-directory-btn"]');
    // ... handle file picker (platform-specific)

    // Verify skills are loaded
    await expect(page.locator('[data-testid="skill-list"]')).toBeVisible();
  });

  test('should create and edit a skill', async ({ page }) => {
    await page.goto('app://-/index.html');

    // Click new skill button
    await page.click('[data-testid="new-skill-btn"]');

    // Enter skill name
    await page.fill('[data-testid="skill-name-input"]', 'My New Skill');
    await page.click('[data-testid="create-btn"]');

    // Verify skill appears in list
    await expect(page.locator('text=My New Skill')).toBeVisible();

    // Edit skill
    await page.dblclick('text=My New Skill');
    await page.fill('[data-testid="editor"]', '# Updated Content');
    await page.keyboard.press('Control+S');

    // Verify save success
    await expect(page.locator('text=Skill saved')).toBeVisible();
  });
});
```

## Debugging

### Main Process Debugging

```bash
# Start with Chrome DevTools for main process
npm run dev -- --inspect

# Then open chrome://inspect in Chrome
```

### Renderer Process Debugging

The renderer process automatically has Chrome DevTools available via:
- **Windows/Linux**: Ctrl+Shift+I
- **macOS**: Cmd+Option+I

### Logging

Use structured logging:

```typescript
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const logFile = path.join(app.getPath('userData'), 'app.log');

function log(level: string, context: string, message: string, data?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data
  };

  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

  if (level === 'error') {
    console.error(`[${context}] ${message}`, data);
  } else {
    console.log(`[${context}] ${message}`, data);
  }
}

// Usage
log('info', 'SkillService', 'Creating skill', { name: 'Test Skill' });
```

## Performance Profiling

### Startup Performance

```typescript
// In main/index.ts
const startTime = Date.now();

app.whenReady().then(() => {
  const readyTime = Date.now() - startTime;
  log('info', 'App', `Application ready in ${readyTime}ms`);

  // Target: <3000ms
  if (readyTime > 3000) {
    log('warn', 'App', 'Startup exceeded performance target');
  }
});
```

### Operation Performance

```typescript
// In services, track operation duration
async create(request: CreateSkillRequest): Promise<Skill> {
  const startTime = Date.now();

  try {
    // ... operation

    const duration = Date.now() - startTime;
    log('info', 'SkillService', `Create completed in ${duration}ms`);

    if (duration > 100) {
      log('warn', 'SkillService', 'Create exceeded 100ms target');
    }

    return skill;
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'SkillService', `Create failed after ${duration}ms`, error);
    throw error;
  }
}
```

## Common Issues

### Issue: Native modules fail to build

**Solution**: Ensure you have the correct build tools:
- Windows: `npm install --global windows-build-tools`
- macOS: `xcode-select --install`
- Linux: `sudo apt install build-essential`

### Issue: Electron fails to start

**Solution**: Check that TypeScript compiled successfully:
```bash
npm run build
ls dist/  # Should contain compiled JS files
```

### Issue: File watching not working

**Solution**: Increase inotify watch limit (Linux only):
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Next Steps

1. Review the [Implementation Plan](./plan.md) for detailed architecture
2. Read the [Data Model](./data-model.md) for entity definitions
3. Study the [IPC Contracts](./contracts/ipc-contracts.md) for API design
4. Start implementing Phase 1 (Foundation)

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [Chokidar Documentation](https://github.com/paulmillr/chokidar)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev)
