# skillsMN

**Desktop application for managing Claude Code skills locally**

skillsMN is an Electron-based desktop application that provides a user-friendly interface for creating, editing, organizing, and managing Claude Code skills stored locally on your file system.

## Features

- 📁 **Local Skill Management**: Create, edit, and delete skills stored in your local file system
- 🔄 **Real-time Sync**: Changes are automatically detected and reflected in the UI
- 📝 **Markdown Editor**: Full-featured Monaco editor with syntax highlighting for skill content
- 🎨 **Modern UI**: Clean, dark-mode interface inspired by VS Code
- ⌨️ **Keyboard Shortcuts**: Efficient workflow with keyboard navigation
- 🗂️ **Dual Directory Support**: Manage skills in both project and global directories
- 🗑️ **Safe Deletion**: Skills are moved to recycle bin, not permanently deleted
- 🔍 **Search & Filter**: Quickly find skills by name, source, or content

## Screenshots

*Screenshots will be added in future releases*

## Installation

### Prerequisites

- **Node.js**: v20.x or later ([Download](https://nodejs.org/))
- **npm**: v10.x or later (comes with Node.js)
- **Operating System**: Windows 10/11, macOS 12+, or Linux Ubuntu 20.04+

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd skillsMN
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

### Production Build

To create a distributable package:

```bash
npm run dist
```

This will create platform-specific installers in the `dist/` directory.

## Usage

### First-Time Setup

When you launch skillsMN for the first time:

1. **Setup Dialog**: You'll be prompted to select your Claude project directory
2. **Select Directory**: Browse and select the directory containing your `.claude/skills` folder
3. **Start Managing**: Your skills will be loaded and displayed in the main window

### Directory Structure

skillsMN manages skills in two locations:

**Project Directory** (`.claude/skills` in your project):
- Skills specific to your current project
- Shared with team via version control
- Marked with "Project" badge

**Global Directory** (`~/.claude/skills` in your user home):
- Skills available across all projects
- Personal skills and configurations
- Marked with "Global" badge

### Managing Skills

#### Creating a Skill

1. Click the **"Create Skill"** button (or press `Ctrl+N`)
2. Enter the skill name
3. Select the directory (Project or Global)
4. Click **Create**

The skill will be created with a basic template.

#### Editing a Skill

1. **Double-click** a skill in the list
2. Edit the skill content in the Monaco editor
3. Press `Ctrl+S` (or click **Save**) to save changes

#### Deleting a Skill

1. Select a skill in the list
2. Click the **Delete** button (or press `Delete` key)
3. Confirm the deletion in the dialog

**Note**: Skills are moved to the recycle bin, not permanently deleted. You can restore them if needed.

#### Opening Skill Folder

1. Hover over a skill card
2. Click the **folder icon** (📁)
3. The skill directory will open in your file explorer

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new skill |
| `Ctrl+S` | Save current skill |
| `Ctrl+W` | Close editor |
| `Delete` | Delete selected skill |
| `Escape` | Close dialog/editor |

### Filtering and Searching

**Filter by Source**:
- Click **All**, **Project**, or **Global** to filter skills

**Sort Skills**:
- Sort by **Name** (alphabetical)
- Sort by **Modified** (most recent first)

**Search**:
- Type in the search box to filter skills by name or description

### Settings

Click the **Settings** button (⚙️) to configure:

- **Default Install Directory**: Choose whether new skills default to Project or Global
- **Editor Default Mode**: Choose between Edit or View mode
- **Auto Refresh**: Enable/disable automatic file system refresh

## File Structure

Each skill is stored as a directory containing:

```
skill-name/
├── skill.md          # Main skill file with YAML frontmatter
├── example.txt       # Optional resource files
├── data.json         # Optional data files
└── ...
```

### Skill Format (`skill.md`)

```markdown
---
name: My Skill Name
description: A brief description of the skill
---

# My Skill Name

Skill content goes here. You can use:

- Markdown formatting
- Code blocks
- Links
- Images
- Any other Markdown features

## Examples

\`\`\`typescript
// Example code
const skill = loadSkill('my-skill-name');
\`\`\`
```

## Architecture

skillsMN is built with:

- **Electron**: Cross-platform desktop framework
- **React**: UI component library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Monaco Editor**: Code editor (same as VS Code)
- **Chokidar**: File system watcher
- **gray-matter**: YAML frontmatter parser

### Project Structure

```
skillsMN/
├── src/
│   ├── main/              # Electron main process
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   ├── ipc/           # IPC handlers
│   │   └── utils/         # Utilities
│   ├── renderer/          # Electron renderer (UI)
│   │   ├── components/    # React components
│   │   ├── services/      # Client services
│   │   └── styles/        # CSS styles
│   └── shared/            # Shared types and constants
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── performance/      # Performance tests
│   ├── security/         # Security tests
│   └── quality/          # Quality audits
└── specs/                # Feature specifications
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the application |
| `npm run build` | Build TypeScript and renderer |
| `npm test` | Run all tests |
| `npm run lint` | Run ESLint |
| `npm run dist` | Create production build |
| `npm run pack` | Pack without distributable |

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run performance tests
node tests/performance/test-performance.js

# Run security tests
node tests/security/test-path-validator.js

# Run quality audit
node tests/quality/ui-ux-audit.js
```

### Debugging

**Main Process**:
```bash
npm start -- --inspect
```

**Renderer Process**:
- Open DevTools: `Ctrl+Shift+I` (or `F12`)

## Performance

skillsMN is optimized for performance:

- **Startup**: <3 seconds with 500 skills
- **List Loading**: ≤2 seconds for 500 skills
- **Real-time Updates**: <500ms to detect and display file changes
- **CRUD Operations**: <100ms per operation
- **Memory Usage**: <300MB with 500 skills loaded
- **CPU Usage**: <5% when idle

See `specs/002-local-skill-management/performance-tests.md` for detailed benchmarks.

## Security

skillsMN implements robust security measures:

- **Path Validation**: All file paths are validated to prevent directory traversal attacks
- **Sandboxed File Access**: Only allowed directories are accessible
- **Safe Deletion**: Files moved to recycle bin, not permanently deleted
- **No Remote Code Execution**: No eval() or dynamic code execution

See `specs/002-local-skill-management/security-tests.md` for security test results.

## Troubleshooting

### Common Issues

**Issue**: Application doesn't start
- **Solution**: Ensure Node.js v20+ is installed and dependencies are installed (`npm install`)

**Issue**: Skills not appearing in list
- **Solution**: Verify the directory contains `.claude/skills` folder and skill.md files

**Issue**: File changes not detected
- **Solution**: Check if file watcher is enabled in Settings > Auto Refresh

**Issue**: Permission denied errors
- **Solution**: Check file/directory permissions and ensure you have read/write access

### Logs

Application logs are stored in:
- **Windows**: `%APPDATA%/skillsMN/logs/`
- **macOS**: `~/Library/Logs/skillsMN/`
- **Linux**: `~/.config/skillsMN/logs/`

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Editor by [Monaco](https://microsoft.github.io/monaco-editor/)
- File watching by [Chokidar](https://github.com/paulmillr/chokidar)

## Support

- **Documentation**: See `specs/` directory for detailed specifications
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join discussions in GitHub Discussions

---

**Made with ❤️ for the Claude Code community**
