# skillsMN

<div align="center">

**Claude Code Skill Management Center**

*A comprehensive desktop application for managing, discovering, and sharing Claude Code skills*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://www.electronjs.org/)

[English](#features) | [简体中文](#功能特性) | [Documentation](#documentation) | [Contributing](#contributing)

</div>

---

## 🎯 Features

skillsMN is an Electron-based desktop application that provides a unified interface for Claude Code users to:

- 📁 **Manage Local Skills** - Create, edit, delete, and organize skills in project and global directories
- 🤖 **AI-Assisted Generation** - Generate or modify skills using natural language with real-time streaming
- 🔍 **Discover Public Skills** - Search GitHub and skills.sh registry for community skills
- 🌐 **Skills Registry Search** - Instant search across thousands of curated skills with one-click installation
- 🔒 **Private Repository Sync** - Connect to private GitHub repos for team skill sharing with update detection
- ⚡ **Real-time Sync** - Automatic detection and UI updates when files change
- 📝 **Monaco Editor** - Full-featured code editor with syntax highlighting
- 🎨 **Modern UI** - Clean, dark-mode interface with responsive design

## 📸 Screenshots

<div align="center">

### Main Interface
*Coming soon*

### Skill Editor
*Coming soon*

### Registry Search
*Coming soon*

### AI Generation
*Coming soon*

</div>

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20.x or later - [Download](https://nodejs.org/)
- **npm** v10.x or later (comes with Node.js)
- **Operating System**: Windows 10/11, macOS 12+, or Linux Ubuntu 20.04+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/skillsMN.git
cd skillsMN

# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

### First-Time Setup

When you launch skillsMN for the first time:

1. **Setup Dialog** - Select your Claude project directory
2. **Choose Directory** - Browse and select the directory containing your `.claude/skills` folder
3. **Start Managing** - Your skills will be loaded and displayed

## 💡 Core Features

### 📁 Skill Management

**Creating a Skill**
1. Click **"Create Skill"** (or `Ctrl+N`)
2. Enter skill name and select directory (Project/Global)
3. Edit in Monaco editor with syntax highlighting
4. Save with `Ctrl+S`

**Editing & Deleting**
- Double-click to edit any skill
- Select and press `Delete` to remove (moves to recycle bin)
- Real-time file watching keeps UI in sync

**Directory Structure**
```
skill-name/
├── skill.md          # Main skill file with YAML frontmatter
├── example.txt       # Optional resources
└── data.json         # Optional data files
```

### 🔍 Registry Search (New!)

Search and install skills from [skills.sh](https://skills.sh) registry:

1. **Search** - Type keywords in Registry tab (400ms debounced)
2. **Browse** - View skill name, description, install count
3. **Install** - One-click installation with progress tracking
4. **Track** - Installed skills include source metadata

<details>
<summary><b>📖 Installation Progress</b></summary>

- 10% - Cloning repository (shallow clone, depth=1)
- 40% - Finding skill directory
- 60% - Copying files
- 80% - Writing metadata
- 90% - Cleanup
- 100% - Complete
</details>

### 🤖 AI-Assisted Generation

Generate or modify skills using natural language:

1. Click **"Generate with AI"**
2. Describe your skill in plain English
3. Watch AI generate content in real-time (200ms streaming)
4. Edit and save the generated skill

### 🔒 Private Repository Management

Connect to private GitHub repositories for team sharing:

<details>
<summary><b>⚙️ Setup Private Repository</b></summary>

1. Open **Settings** → **Repositories** tab
2. Click **"Add Repository"**
3. Enter repository URL (e.g., `https://github.com/your-org/team-skills`)
4. Provide GitHub PAT with `repo` scope
5. Connection tested automatically

**Creating a GitHub PAT:**
- Go to GitHub.com → Settings → Developer settings → Personal access tokens
- Generate new token (classic) with `repo` scope
- Copy and paste into skillsMN

**Security:**
- PATs encrypted using Electron safeStorage (platform-specific)
- Windows: DPAPI | macOS: Keychain | Linux: Secret Service API
- Never exposed to renderer process
</details>

**Features:**
- Browse skills with metadata (last commit, file count)
- Update detection with visual badges
- Conflict resolution (overwrite/rename/skip)
- Automatic 5-minute caching

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new skill |
| `Ctrl+S` | Save current skill |
| `Ctrl+W` | Close editor |
| `Delete` | Delete selected skill |
| `Escape` | Close dialog/editor |

## 🏗️ Architecture

Built with modern technologies:

- **Electron** - Cross-platform desktop framework
- **React 18** - UI components
- **TypeScript 5** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - VS Code's editor component
- **Chokidar** - File system watching
- **Jest & Playwright** - Testing frameworks

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
│   └── shared/            # Shared types
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # E2E tests (Playwright)
└── specs/                # Feature specifications
```

## 🛠️ Development

### Available Scripts

```bash
npm start              # Start application
npm run build          # Build TypeScript and renderer
npm test               # Run all tests
npm run test:unit      # Run unit tests
npm run test:e2e       # Run E2E tests
npm run lint           # Run ESLint
npm run dist           # Create production build
```

### Testing

```bash
# Run all tests
npm test

# Run E2E tests with Playwright
npm run test:e2e

# Run performance tests
node tests/performance/test-performance.js

# Run security tests
node tests/security/test-path-validator.js
```

### Debugging

**Main Process:**
```bash
npm start -- --inspect
```

**Renderer Process:**
- Open DevTools: `Ctrl+Shift+I` or `F12`

## 📊 Performance

Optimized for speed and efficiency:

- **Startup**: <3 seconds with 500 skills
- **List Loading**: ≤2 seconds for 500 skills
- **Real-time Updates**: <500ms file change detection
- **CRUD Operations**: <100ms per operation
- **Memory Usage**: <300MB with 500 skills
- **CPU Usage**: <5% when idle

## 🔐 Security

Robust security implementation:

- ✅ Path validation prevents directory traversal attacks
- ✅ Sandboxed file access to allowed directories only
- ✅ Safe deletion (recycle bin, not permanent)
- ✅ No remote code execution (no eval())
- ✅ Encrypted credential storage (platform-specific)

## 📖 Documentation

- **Feature Specs**: `specs/` directory contains detailed specifications
- **API Documentation**: See inline JSDoc comments
- **Performance Tests**: `specs/002-local-skill-management/performance-tests.md`
- **Security Tests**: `specs/002-local-skill-management/security-tests.md`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Editor by [Monaco](https://microsoft.github.io/monaco-editor/)
- File watching by [Chokidar](https://github.com/paulmillr/chokidar)

## 💬 Support

- **Documentation**: See `specs/` directory
- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/skillsMN/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/yourusername/skillsMN/discussions)

---

<div align="center">

**Made with ❤️ for the Claude Code community**

</div>
