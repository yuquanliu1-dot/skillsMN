# Quickstart: Local Skill Management

**Feature**: 002-local-skill-management
**Date**: 2026-03-09

This guide provides a rapid onboarding experience for developers implementing the Local Skill Management feature.

## Prerequisites

- Node.js LTS (v20+)
- npm or yarn
- TypeScript 5.x
- Basic familiarity with Electron and React

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

Key dependencies:
- `electron`: Desktop application framework
- `react` + `react-dom`: UI framework
- `@monaco-editor/react`: Code editor
- `tailwindcss`: Styling
- `chokidar`: File system watching
- `trash`: Cross-platform recycle bin

### 2. Build Configuration

```bash
npm run build
```

This compiles TypeScript files to JavaScript.

### 3. Start Application

```bash
npm start
```

Launches Electron application in development mode.

## Project Structure Overview

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
│   │   ├── index.tsx      # React entry point
│   │   ├── App.tsx        # Main component
│   │   ├── components/    # UI components
│   │   └── services/      # Frontend services
│   └── shared/            # Shared types and constants
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
└── specs/
    └── 002-local-skill-management/  # This feature's specs
        ├── spec.md        # Feature specification
        ├── plan.md        # Implementation plan
        ├── research.md    # Technical research
        ├── data-model.md  # Data entities
        ├── contracts/     # Interface contracts
        └── quickstart.md  # This file
```

## Core Concepts

### 1. Electron Architecture

**Main Process** (Backend):
- Handles file system operations
- Manages IPC communication
- Runs Node.js APIs
- Single instance per application

**Renderer Process** (Frontend):
- Renders UI with React
- Communicates via IPC
- No direct file system access (security)
- Multiple windows possible

**IPC Bridge**:
- Main ↔ Renderer communication
- Asynchronous message passing
- Type-safe contracts
- Secured by contextBridge

### 2. Skill Entity

A **skill** is a directory containing:
- `skill.md`: Markdown file with YAML frontmatter
- Optional resources: templates, examples, assets

Example structure:
```
my-awesome-skill/
├── skill.md
├── template.md
├── example.json
└── assets/
    └── diagram.png
```

### 3. Skill Directories

**Project Directory**:
- User-specified Claude project
- Located at: `{project}/.claude/skills/`
- Skills marked as `[Project]`

**Global Directory**:
- Claude Code default location
- Located at: `~/.claude/skills/`
- Skills marked as `[Global]`

## Implementation Flow

### Phase 1: Foundation (User Story 1)

**Goal**: Application initialization and configuration

1. **Setup Dialog** (`SetupDialog.tsx`)
   - Display on first launch
   - Browse for Claude project directory
   - Validate `.claude` folder exists
   - Save configuration

2. **Configuration Service** (`ConfigService.ts`)
   - Load/save configuration to app data
   - Validate project directory
   - Provide default settings

3. **Path Validator** (`PathValidator.ts`)
   - Whitelist allowed directories
   - Validate all file paths
   - Prevent path traversal attacks

**Test**:
```bash
# Launch app
npm start

# Expected: Setup dialog appears
# Select a Claude project directory
# Expected: Configuration saved, skills scanned
```

### Phase 2: View Skills (User Story 2)

**Goal**: Display skills from project and global directories

1. **Skill Service** (`SkillService.ts`)
   - Scan skill directories
   - Parse YAML frontmatter
   - Extract skill metadata
   - Count resource files

2. **Skill List Component** (`SkillList.tsx`)
   - Display skills in virtualized list
   - Show name, description, source badge
   - Display last modified time
   - Show resource count

3. **File Watcher** (`FileWatcher.ts`)
   - Monitor skill directories
   - Debounce rapid changes
   - Send IPC events to renderer

**Test**:
```bash
# Add a skill to global directory
mkdir -p ~/.claude/skills/test-skill
echo "---\nname: Test Skill\n---\n# Test" > ~/.claude/skills/test-skill/skill.md

# Expected: Skill appears in list within 500ms
```

### Phase 3: Create Skills (User Story 3)

**Goal**: Create new skills with templates

1. **Create Skill Handler** (`skillHandlers.ts`)
   - Generate kebab-case directory name
   - Create skill directory
   - Write template with frontmatter
   - Return new skill metadata

2. **Create Skill UI** (`SkillList.tsx`)
   - "New Skill" button
   - Name input dialog
   - Directory selection (project/global)
   - Open in editor after creation

**Test**:
```bash
# Click "New Skill" button
# Enter name: "My New Skill"
# Select directory: "Global"

# Expected:
# - Directory created: ~/.claude/skills/my-new-skill/
# - File created: skill.md with template
# - Skill appears in list
# - Editor opens with new skill
```

### Phase 4: Edit Skills (User Story 4)

**Goal**: Edit skill content with Monaco Editor

1. **Skill Editor** (`SkillEditor.tsx`)
   - Monaco Editor integration
   - YAML + Markdown syntax highlighting
   - Auto-save on change
   - External change detection

2. **Update Skill Handler** (`skillHandlers.ts`)
   - Validate path
   - Check for external modifications
   - Write content to file
   - Return updated metadata

**Test**:
```bash
# Double-click a skill
# Expected: Editor opens with syntax highlighting
# Modify content
# Press Ctrl+S

# Expected:
# - File saved within 100ms
# - Success notification appears
# - Skill list updates
```

### Phase 5: Delete Skills (User Story 5)

**Goal**: Safely delete skills to recycle bin

1. **Delete Handler** (`skillHandlers.ts`)
   - Validate path
   - Move directory to recycle bin
   - Log deletion

2. **Delete UI** (`SkillList.tsx`)
   - Delete button on skill card
   - Confirmation dialog
   - Success notification
   - Remove from list

**Test**:
```bash
# Click delete button on a skill
# Confirm deletion

# Expected:
# - Skill moved to recycle bin
# - Skill disappears from list
# - Success notification appears
# - Can restore from recycle bin
```

### Phase 6: Settings (User Story 6)

**Goal**: Configure application preferences

1. **Settings Component** (`Settings.tsx`)
   - Default install directory
   - Editor default mode
   - Auto-refresh toggle

2. **Save Settings Handler** (`configHandlers.ts`)
   - Validate configuration
   - Save to app data
   - Apply immediately

**Test**:
```bash
# Open Settings
# Change "Default Install Directory" to "Global"
# Save

# Expected:
# - Configuration saved
# - New skills default to global directory
```

## Key Implementation Details

### Security: Path Validation

**Why**: Prevent path traversal attacks

**How**: Centralized `PathValidator` service

```typescript
// src/main/services/PathValidator.ts
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
        return resolved;
      }
    }

    throw new Error(`Path traversal detected: ${requestedPath}`);
  }
}
```

**Usage**: Call before EVERY file operation

```typescript
// ✅ Correct
const validatedPath = pathValidator.validate(skillPath);
await fs.readFile(validatedPath);

// ❌ Wrong - no validation
await fs.readFile(skillPath);
```

### Performance: Virtual Scrolling

**Why**: Handle 500+ skills without performance issues

**How**: `react-window` library

```typescript
import { FixedSizeList as List } from 'react-window';

<SkillList>
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
</SkillList>
```

**Result**: Only visible items rendered, smooth 60fps scrolling

### Performance: File Watching

**Why**: Real-time updates within 500ms

**How**: `chokidar` with debouncing

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(directory, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100
  }
});

watcher.on('all', (event, path) => {
  // Send IPC event to renderer
  mainWindow.webContents.send('fs:change', { event, path });
});
```

**Result**: UI updates within 500ms of file changes

### Performance: Lazy Loading

**Why**: Fast startup (<3 seconds)

**How**: Load skill content only when needed

```typescript
// ❌ Wrong - load all content on startup
const skills = await scanAllSkillContents();

// ✅ Correct - load metadata only
const skills = await scanSkillMetadata();
// Load content when skill is selected
const content = await loadSkillContent(selectedSkill);
```

**Result**: Startup in <3s even with 500 skills

## Testing Strategy

### Unit Tests

**Focus**: Business logic in services

```typescript
// tests/unit/services/PathValidator.test.ts
describe('PathValidator', () => {
  it('should allow paths within allowed directories', () => {
    const validator = new PathValidator('/project', '/global');
    expect(() => validator.validate('/project/skills/my-skill')).not.toThrow();
  });

  it('should reject path traversal attempts', () => {
    const validator = new PathValidator('/project', '/global');
    expect(() => validator.validate('/etc/passwd')).toThrow('Path traversal detected');
  });
});
```

Run tests:
```bash
npm test
```

### Integration Tests

**Focus**: End-to-end user workflows

```typescript
// tests/integration/skill-workflow.test.ts
describe('Skill CRUD workflow', () => {
  it('should create, edit, and delete a skill', async () => {
    // Create skill
    const skill = await ipcClient.createSkill('Test Skill', 'global');
    expect(skill.name).toBe('Test Skill');

    // Edit skill
    const updated = await ipcClient.updateSkill(skill.path, '---\nname: Updated\n---\n');
    expect(updated.name).toBe('Updated');

    // Delete skill
    await ipcClient.deleteSkill(skill.path);
    await expect(ipcClient.getSkill(skill.path)).rejects.toThrow();
  });
});
```

### Manual Testing Checklist

- [ ] First-time setup dialog works
- [ ] Skills load from project directory
- [ ] Skills load from global directory
- [ ] Duplicate skill names display with badges
- [ ] File changes reflect in UI within 500ms
- [ ] Create skill generates correct template
- [ ] Editor has syntax highlighting
- [ ] Save works with Ctrl+S
- [ ] Delete moves to recycle bin
- [ ] Settings persist across restarts
- [ ] Keyboard shortcuts work
- [ ] Error messages are actionable
- [ ] Performance meets targets (500 skills)

## Debugging Tips

### Enable Logging

```typescript
// src/main/utils/Logger.ts
const logger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] ${message}`, context);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

### View Logs

```bash
# Start app with console
npm start

# Logs appear in terminal
```

### Common Issues

**Issue**: Skills not loading
**Solution**: Check project directory is configured and `.claude` folder exists

**Issue**: File changes not detected
**Solution**: Verify file watcher started, check permissions

**Issue**: Path validation fails
**Solution**: Ensure path is within project or global directory

**Issue**: Monaco Editor not loading
**Solution**: Check network connection (Monaco loads from CDN initially)

## Performance Monitoring

### Check Startup Time

```typescript
// src/main/index.ts
const startTime = Date.now();
app.whenReady().then(() => {
  console.log(`Startup time: ${Date.now() - startTime}ms`);
});
```

### Check List Load Time

```typescript
// src/renderer/App.tsx
const loadStart = Date.now();
const skills = await ipcClient.listSkills();
console.log(`List load time: ${Date.now() - loadStart}ms`);
```

### Check Memory Usage

```bash
# In Node.js console
process.memoryUsage()

# Look for:
# - heapTotal < 300MB
# - external < 50MB
```

## Next Steps

1. **Read Full Specs**:
   - [spec.md](./spec.md) - User requirements
   - [data-model.md](./data-model.md) - Entity definitions
   - [contracts/ipc-contracts.md](./contracts/ipc-contracts.md) - IPC interfaces

2. **Review Research**:
   - [research.md](./research.md) - Technical decisions

3. **Start Implementation**:
   - Follow user stories in priority order (P1 → P2)
   - Write tests first (when explicitly requested)
   - Validate against constitution principles

4. **Ask Questions**:
   - Check edge cases in spec
   - Clarify unclear requirements
   - Validate performance targets

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Tailwind CSS](https://tailwindcss.com)
- [Chokidar File Watcher](https://github.com/paulmillr/chokidar)

## Support

For questions about this feature:
1. Check the spec documents in `specs/002-local-skill-management/`
2. Review the constitution in `.specify/memory/constitution.md`
3. Consult the research findings in `research.md`

Good luck with the implementation! 🚀
