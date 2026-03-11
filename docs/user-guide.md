# skillsMN User Guide

**Complete guide to managing Claude Code skills with skillsMN**

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Local Skills](#managing-local-skills)
3. [AI-Assisted Skill Generation](#ai-assisted-skill-generation)
4. [Discovering Public Skills](#discovering-public-skills)
5. [Private Repository Management](#private-repository-management)
6. [Settings and Configuration](#settings-and-configuration)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First-Time Setup

When you launch skillsMN for the first time, you'll be guided through a simple setup process:

1. **Setup Dialog**: The application will prompt you to select your Claude project directory
2. **Directory Selection**: Browse and select the directory containing your `.claude` folder
3. **Validation**: The system verifies the directory contains a valid Claude project structure
4. **Ready to Use**: Your skills are loaded and displayed in the main window

### Understanding Directories

skillsMN manages skills in two locations:

**Project Directory** (`your-project/.claude/skills/`):
- Skills specific to your current project
- Typically shared with team via version control
- Marked with "Project" badge in the UI
- Ideal for project-specific workflows and conventions

**Global Directory** (`~/.claude/skills/`):
- Skills available across all your Claude projects
- Personal skills and configurations
- Marked with "Global" badge in the UI
- Perfect for personal productivity enhancements

---

## Managing Local Skills

### Creating a Skill

1. Click the **"Create Skill"** button in the sidebar (or press `Ctrl+N`)
2. Enter a descriptive **name** for your skill
3. Enter a brief **description** of what the skill does
4. Select the **directory** (Project or Global)
5. Click **Create**

The skill will be created with a template including proper YAML frontmatter.

**Example Structure**:
```
my-skill/
├── skill.md          # Main skill file
├── examples/         # Optional example files
│   └── example.ts
└── templates/        # Optional template files
    └── template.md
```

### Editing a Skill

1. **Select** a skill from the list by clicking on it
2. The skill opens in the Monaco Editor on the right
3. Edit the content using the full-featured editor with:
   - YAML syntax highlighting for frontmatter
   - Markdown syntax highlighting for body content
   - Auto-completion and formatting
4. Press `Ctrl+S` (or click **Save**) to save changes
5. Changes are reflected immediately in the skill list

**Best Practices**:
- Always include a clear `name` and `description` in the frontmatter
- Use markdown formatting for better readability
- Include examples and usage instructions
- Keep skills focused on a single, specific purpose

### Deleting a Skill

1. Select a skill from the list
2. Click the **Delete** button (trash icon) or press `Delete` key
3. Confirm the deletion in the dialog
4. The skill is moved to your system recycle bin

**Note**: Skills are **not** permanently deleted. You can restore them from the recycle bin if needed.

### Opening Skill Folder

To open a skill's directory in your file explorer:
1. Hover over a skill card
2. Click the **folder icon** (📁)
3. The skill directory opens in your system file browser

---

## AI-Assisted Skill Generation

### Setting Up AI

Before using AI features, configure your AI settings:

1. Open **Settings** (click the ⚙️ icon)
2. Navigate to the **AI Configuration** tab
3. Enter your **Anthropic API key** (stored encrypted)
4. Select your preferred **model**:
   - **Claude 3 Opus**: Most capable, best for complex skills
   - **Claude 3 Sonnet**: Balanced performance (recommended)
   - **Claude 3 Haiku**: Fastest, good for simple skills
5. Configure additional settings:
   - **Enable Streaming**: Watch content generate in real-time
   - **Timeout**: Maximum wait time (5-60 seconds)
   - **Max Retries**: Number of retry attempts on failure
6. Click **Test Connection** to verify your configuration
7. Click **Save Configuration**

### Generating a New Skill

1. Click **"AI Assist"** button or press `Ctrl+Shift+N`
2. Select **"New Skill"** mode
3. Enter a natural language prompt describing the skill you want
   - Example: "Create a React code review skill with best practices"
   - Example: "Generate a Python testing skill for pytest fixtures"
4. Watch the AI generate content in real-time (streaming)
5. Review the generated content
6. Click **Apply** to insert the content into a new skill file

### Modifying an Existing Skill

1. Open the skill you want to modify
2. Click **"AI Assist"** or press `Ctrl+Shift+N`
3. Select **"Modify Existing"** mode
4. Enter instructions for what to change
   - Example: "Add a section about error handling"
   - Example: "Improve the examples section with more code samples"
5. Watch the AI modify your skill content
6. Review changes and click **Apply**

### Inserting at Cursor

1. Place your cursor where you want to insert content
2. Open AI Assist
3. Select **"Insert at Cursor"** mode
4. Describe what to insert
   - Example: "Add a troubleshooting section here"
5. Content is inserted at your cursor position

### Replacing Selection

1. Select a portion of text in the editor
2. Open AI Assist
3. Select **"Replace Selection"** mode
4. Describe what to replace it with
   - Example: "Rewrite this section to be more concise"
5. The selected text is replaced with AI-generated content

### Stopping Generation

If AI generation is taking too long or producing unwanted content:
- Click the **Stop** button to cancel generation
- Partial content is preserved in the preview
- You can edit the partial content manually before applying

---

## Discovering Public Skills

### Searching GitHub

1. Click the **"Discover"** tab in the sidebar
2. Enter your search query in the search box
   - Example: "React hooks", "Python testing", "API design"
3. Wait 500ms for debounced search (reduces API calls)
4. Results display repositories containing `skill.md` files

### Understanding Search Results

Each result shows:
- **Repository name** and URL (click to visit on GitHub)
- **Description** of the repository
- **Star count** (popularity indicator)
- **Language** badge (primary programming language)
- **Skill files** found in the repository

### Previewing a Skill

1. Click the **Preview** button on any skill file
2. A modal displays the full skill.md content
3. Review the skill's structure, frontmatter, and content
4. No files are downloaded during preview (uses GitHub raw URLs)

### Installing a Skill

1. Click the **Install** button on a skill file
2. Select the **target directory** (Project or Global)
3. Click **Install**
4. The entire skill directory (including all files) is downloaded
5. The skill appears in your local skill list

### Handling Conflicts

If a skill with the same name already exists:

1. **Rename** (Recommended): Keep existing and install with a new name
2. **Overwrite**: Replace existing skill (existing content is lost)
3. **Skip**: Keep existing and don't install

### Rate Limits

- **Unauthenticated**: 60 requests/hour
- **With GitHub PAT**: 5,000 requests/hour

To increase your rate limit:
1. Open Settings
2. Navigate to Private Repositories tab
3. Add any GitHub PAT (even for public repos)

---

## Private Repository Management

### Adding a Private Repository

1. Open **Settings** (⚙️)
2. Navigate to the **Private Repositories** tab
3. Click **Add Repository**
4. Enter repository details:
   - **Repository URL**: `https://github.com/owner/repo`
   - **Personal Access Token (PAT)**: GitHub token with `repo` scope
   - **Display Name** (optional): Friendly name for the repo
5. Click **Add Repository**
6. The system tests the connection and validates access

### Creating a GitHub PAT

To create a Personal Access Token:

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
2. Click **Generate new token (classic)**
3. Give it a descriptive name (e.g., "skillsMN")
4. Select scopes:
   - For **private repos**: Check `repo` (full control)
   - For **public repos only**: No special scopes needed
5. Click **Generate token**
6. **Copy the token** (you won't see it again!)

**Security**: Your PAT is encrypted using Electron safeStorage before being saved to disk.

### Browsing Private Skills

1. Click the **"Private Repos"** tab in the sidebar
2. Select a repository from the dropdown
3. Browse all skills available in that repository
4. Use the search box to filter skills by name or commit message

### Installing from Private Repo

1. Find the skill you want
2. Click **Install**
3. Choose target directory (Project or Global)
4. The skill is downloaded and added to your local collection

### Testing Repository Connection

To verify a repository is still accessible:
1. Open Settings → Private Repositories
2. Click **Test** next to the repository
3. The system validates:
   - PAT is valid
   - Repository exists
   - You have read access
4. A success/error message displays the result

### Removing a Repository

1. Open Settings → Private Repositories
2. Click **Remove** next to the repository
3. Confirm the removal
4. **Note**: Locally installed skills from this repository are **not** deleted

### Detecting Updates

The system tracks the commit hash when you install a skill. To check for updates:
1. Go to Private Repos tab
2. Skills with updates available show an **"Update Available"** badge
3. Click **Update** to download the latest version

---

## Settings and Configuration

### General Settings

Access general settings by clicking **Settings** (⚙️) → **General** tab:

**Default Install Directory**:
- **Project**: New skills created in project directory by default
- **Global**: New skills created in global directory by default

**Editor Default Mode**:
- **Edit Mode**: Open skills in edit mode by default
- **Preview Mode**: Open skills in preview mode by default

**Auto Refresh**:
- Enable/disable automatic skill list refresh when files change
- Disable if you experience performance issues with many skills

### AI Configuration

Navigate to **Settings** → **AI Configuration** tab:

**API Base URL** (Optional):
- Custom API endpoint (leave empty for default Anthropic endpoint)
- Useful for proxies or enterprise gateways

**API Key**:
- Your Anthropic API key (required for AI features)
- Stored encrypted using Electron safeStorage
- Never transmitted except to Anthropic's API

**Model Selection**:
- **Claude 3 Opus**: Most capable, highest cost
- **Claude 3 Sonnet**: Balanced performance and cost (recommended)
- **Claude 3 Haiku**: Fastest, lowest cost

**Streaming**:
- Enable for real-time content generation (recommended)
- Disable if you prefer to wait for complete response

**Timeout**:
- Maximum wait time for AI response (5-60 seconds)
- Increase for complex skills or slower connections

**Max Retries**:
- Number of retry attempts on failure (0-5)
- Useful for handling temporary network issues

**Test Connection**:
- Validates your API key and connection
- Shows response latency
- Recommended after configuration changes

### Private Repositories

Manage private repositories in **Settings** → **Private Repositories** tab:

- **Add Repository**: Configure new private repo with PAT
- **Test**: Verify repository access and PAT validity
- **Remove**: Delete repository configuration (keeps installed skills)

### Keyboard Shortcuts Reference

View all keyboard shortcuts in **Settings** → **General** → **Keyboard Shortcuts** section.

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+N` | Create new skill | Main window |
| `Ctrl+S` | Save current skill | Editor open |
| `Ctrl+R` | Refresh skill list | Main window |
| `Ctrl+Shift+N` | Open AI assistant | Editor open |
| `Delete` | Delete selected skill | Skill selected |
| `Escape` | Close dialog/editor | Any modal |
| `Ctrl+W` | Close editor tab | Editor open |

### Editor Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find and replace |
| `Ctrl+/` | Toggle comment |
| `Ctrl+Space` | Trigger suggestion |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Up/Down` | Navigate skill list |
| `Enter` | Open selected skill |
| `Tab` | Move between UI elements |

---

## Troubleshooting

### Application Won't Start

**Symptoms**: Application crashes or doesn't open

**Solutions**:
1. Verify Node.js v20+ is installed: `node --version`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Clear application cache:
   - Windows: Delete `%APPDATA%/skillsMN`
   - macOS: Delete `~/Library/Application Support/skillsMN`
   - Linux: Delete `~/.config/skillsMN`
4. Check logs for errors (see Logs section below)

### Skills Not Appearing

**Symptoms**: Skills exist on disk but don't show in the list

**Solutions**:
1. Verify directory structure: Each skill must have a `skill.md` file
2. Check YAML frontmatter: Must have `name` and `description` fields
3. Verify directory name: Should be kebab-case (e.g., `my-skill-name`)
4. Press `Ctrl+R` to manually refresh
5. Check if Auto Refresh is enabled in Settings

### File Changes Not Detected

**Symptoms**: Changes made externally don't appear in UI

**Solutions**:
1. Verify Auto Refresh is enabled in Settings
2. Check file watcher logs for errors
3. Restart the application
4. Press `Ctrl+R` to manually refresh

### Permission Denied Errors

**Symptoms**: Can't create, edit, or delete skills

**Solutions**:
1. Check directory permissions: Ensure read/write access
2. On macOS/Linux: Run `chmod -R u+rw ~/.claude/skills`
3. Verify the directory is not locked by another application
4. Check if antivirus is blocking file operations

### AI Generation Fails

**Symptoms**: AI generation returns errors or times out

**Solutions**:
1. Verify API key is valid in Settings → AI Configuration
2. Test connection using the Test Connection button
3. Check internet connectivity
4. Increase timeout in Settings (try 45-60 seconds)
5. Try a different model (Haiku is fastest)
6. Check API usage limits on your Anthropic dashboard

### GitHub Search Rate Limited

**Symptoms**: "Rate limit exceeded" error when searching

**Solutions**:
1. Wait 1 hour for rate limit reset (unauthenticated: 60 req/hour)
2. Add a GitHub PAT in Settings → Private Repositories (5,000 req/hour)
3. Use search more sparingly with specific terms

### Private Repository Connection Failed

**Symptoms**: Can't access private repository skills

**Solutions**:
1. Verify PAT has `repo` scope for private repositories
2. Test connection using the Test button
3. Check if repository URL is correct
4. Verify your GitHub account still has access to the repository
5. Regenerate PAT if it was revoked or expired

### Skill Installation Conflicts

**Symptoms**: "Skill already exists" error when installing

**Solutions**:
1. Choose **Rename** to keep both versions
2. Choose **Overwrite** to replace existing skill
3. Choose **Skip** to keep existing skill
4. Manually rename existing skill directory before installing

### Slow Performance

**Symptoms**: Application is sluggish with many skills

**Solutions**:
1. Disable Auto Refresh if you have 200+ skills
2. Close the editor when not in use
3. Restart the application periodically
4. Check memory usage in Task Manager/Activity Monitor
5. Ensure you have <500 skills (application is optimized for up to 500)

### Logs

Application logs are stored in platform-specific locations:

**Windows**: `%APPDATA%/skillsMN/logs/main.log`

**macOS**: `~/Library/Logs/skillsMN/main.log`

**Linux**: `~/.config/skillsMN/logs/main.log`

**What to look for**:
- `[ERROR]` entries for failures
- `[WARN]` entries for potential issues
- Stack traces for debugging

**Sharing logs**: When reporting issues, include relevant log excerpts.

---

## Tips and Best Practices

### Skill Organization

1. **Use descriptive names**: `react-typescript-best-practices` over `react-ts`
2. **Keep skills focused**: One skill = one specific purpose
3. **Include examples**: Make skills more actionable
4. **Write clear descriptions**: Help future you understand the skill's purpose

### AI Generation

1. **Be specific**: "Add a section about error handling with try-catch examples"
2. **Provide context**: "Given this skill is about React testing, add examples for Jest"
3. **Iterate**: Start simple, then use Modify mode to enhance
4. **Review generated content**: Always review AI output before applying

### Team Collaboration

1. **Use private repositories**: Share team-specific skills securely
2. **Document conventions**: Create a skill documenting your team's skill conventions
3. **Test before sharing**: Verify skills work correctly before sharing with team
4. **Version control**: Track skill changes via Git in your private repo

### Performance

1. **Global vs Project**: Use global for personal skills, project for team skills
2. **Clean up regularly**: Delete unused skills to keep list manageable
3. **Limit skill size**: Keep skill files <1MB for optimal performance
4. **Disable auto-refresh**: For large skill collections, refresh manually

---

## Getting Help

### Documentation
- Feature specifications: `specs/` directory
- API documentation: Inline code comments
- This user guide: `docs/user-guide.md`

### Community
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share tips

### Professional Support
For enterprise deployments or custom integrations, contact the development team.

---

**Happy skill managing! 🎉**

*Made with ❤️ for the Claude Code community*
