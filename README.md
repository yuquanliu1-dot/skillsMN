# skillsMN

<div align="center">

**Skill Management Center**

*A comprehensive desktop application for managing, discovering, and sharing skills*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://www.electronjs.org/)

[English](#features) | [简体中文](README_CN.md#功能特性) | [Documentation](#documentation) | [Contributing](#contributing)

</div>

---

## 🎯 Features

skillsMN is an Electron-based desktop application that provides a unified interface for users to:

- 📁 **Manage Local Skills** - Create, edit, delete, and organize skills in project and global directories
- 🤖 **AI-Assisted Generation** - Generate or modify skills using natural language with real-time streaming
- 🔍 **Discover Public Skills** - Search GitHub and skills.sh registry for community skills
- 🌐 **Skills Registry Search** - Instant search across thousands of curated skills with one-click installation
- 🔒 **Private Repository Sync** - Connect to private GitHub/GitLab repos for team skill sharing with update detection
- 🏆 **Contribution Statistics** - Track user contributions with badges, levels, and activity analytics
- 🌟 **Gamification System** - Earn badges and level up from commits, skill creation, and community engagement
- ⚡ **Real-time Sync** - Automatic detection and UI updates when files change
- 📝 **Monaco Editor** - Full-featured code editor with syntax highlighting
- 🎨 **Modern UI** - Clean, dark-mode interface with responsive design

## 📸 Screenshots

<div align="center">

### Main Interface
![Main Interface](docs/screenshots/main-interface.png)
*Clean, dark-mode interface with skill management and contribution tracking*

### Skill Editor
![Skill Editor](docs/screenshots/skill-editor.png)
*Monaco editor with syntax highlighting for skill editing*

### Registry Search
![Registry Search](docs/screenshots/registry-search.png)
*Search and install skills from skills.sh registry*

### AI Generation
![AI Generation](docs/screenshots/ai-generation.png)
*Generate skills using natural language with AI assistance*

</div>

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20.x or later - [Download](https://nodejs.org/)
- **npm** v10.x or later (comes with Node.js)
- **Operating System**: Windows 10/11, macOS 12+, or Linux Ubuntu 20.04+

### Platform Support

**Version Control Platforms:**
- ✅ GitHub (github.com)
- ✅ GitHub Enterprise (self-hosted)
- ✅ GitLab (gitlab.com)
- ✅ GitLab Self-hosted (any instance)

**Desktop Platforms:**
- ✅ Windows 10/11 (x64)
- ✅ macOS 12+ (x64, arm64)
- ✅ Linux Ubuntu 20.04+ (x64)

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

Connect to private GitHub or GitLab repositories for team sharing:

<details>
<summary><b>⚙️ Setup Private Repository</b></summary>

**For GitHub:**
1. Open **Settings** → **Repositories** tab
2. Click **"Add Repository"**
3. Enter repository URL (e.g., `https://github.com/your-org/team-skills`)
4. Provide GitHub PAT with `repo` scope
5. Connection tested automatically

**For GitLab:**
1. Open **Settings** → **Repositories** tab
2. Click **"Add Repository"**
3. Enter GitLab repository URL
4. Provide GitLab PAT with `api` scope
5. For self-hosted instances, provide the instance URL
6. Connection tested automatically

**Creating a GitHub PAT:**
- Go to GitHub.com → Settings → Developer settings → Personal access tokens
- Generate new token (classic) with `repo` scope
- Copy and paste into skillsMN

**Creating a GitLab PAT:**
- Go to GitLab.com → Settings → Access Tokens
- Create personal access token with `api` scope
- Copy and paste into skillsMN

**Security:**
- PATs encrypted using Electron safeStorage (platform-specific)
- Windows: DPAPI | macOS: Keychain | Linux: Secret Service API
- Never exposed to renderer process
</details>

**Features:**
- Support for both GitHub and GitLab (including self-hosted instances)
- Browse skills with metadata (last commit, file count)
- Update detection with visual badges
- Conflict resolution (overwrite/rename/skip)
- Automatic 5-minute caching

### 🏆 Contribution Statistics & Gamification

Track your contributions and earn badges through active participation:

**Contribution Tracking:**
- **Commit-based scoring** - Each commit earns points toward your level
- **Skill creation bonuses** - Creating new skills gives extra points
- **Activity tracking** - Recent activity boosts your score
- **Real-time statistics** - View your contribution stats instantly

**Level Progression:**
- **Newcomer** (0-49 points) - Getting started
- **Contributor** (50-199 points) - Active participant
- **Active** (200-499 points) - Regular contributor
- **Core** (500-999 points) - Key team member
- **Maintainer** (1000+ points) - Project leader

**Badge System:**

<details>
<summary><b>🏅 Available Badges</b></summary>

**Commit Badges:**
- 🌱 First Commit - Make your first commit
- 🔥 Active Contributor - 10 commits
- 💪 Dedicated Member - 25 commits
- 💎 Core Member - 50 commits
- 👑 Legend - 100 commits

**Skill Creation Badges:**
- ✨ Skill Creator - Create your first skill
- 🏗️ Skill Architect - Create 5 skills
- 🎯 Skill Master - Create 10 skills

**Community Badges:**
- ⭐ Popular Skill - 10 downloads
- 🚀 Viral Skill - 50 downloads
- 🌟 Superstar - 100 downloads
- 📈 Rising Star - 100 contribution score
- 🏆 Champion - 500 contribution score
</details>

**Features:**
- Automatic badge earning based on your activity
- Progress tracking for next badge/level
- Team leaderboard for private repos
- Skill activity analytics
- Multi-provider support (GitHub & GitLab)

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
- **GitHub & GitLab APIs** - Repository integration
- **Jest & Playwright** - Testing frameworks
- **i18next** - Internationalization support

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
- ✅ Support for self-hosted GitLab instances with certificate handling

## 🆕 What's New

**Latest Updates:**
- 🏆 **Contribution Statistics** - Track your contributions with badges and levels
- 🌟 **Gamification System** - Earn badges through commits, skill creation, and community engagement
- 🌐 **GitLab Support** - Full support for GitLab.com and self-hosted GitLab instances
- 👥 **Team Analytics** - View team contributions and skill activity in private repos
- 🔐 **Enhanced Security** - Improved credential management and certificate handling
- 📊 **Activity Tracking** - Real-time statistics and progress tracking

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
