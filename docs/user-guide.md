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

The Discover feature allows you to search, preview, and install skills from public GitHub repositories. Find community-created skills and add them to your project with just a few clicks.

### Accessing the Discover Tab

1. Click the **Discover** (compass) icon in the left sidebar
2. The search interface will appear in the main panel

### Searching for Skills

1. **Enter a search query** in the search box
   - Try keywords like: "react", "typescript", "testing", "api"
   - The search finds repositories containing `skill.md` files
2. **Wait for results** (search is debounced by 500ms)
   - Search triggers automatically after you stop typing
   - A loading spinner appears while searching GitHub
3. **Browse results** using infinite scroll
   - Results load automatically as you scroll down
   - No need to click "Load More" - just keep scrolling!

**Search Tips**:
- **Be specific**: "react hooks typescript" finds better results than just "react"
- **Check descriptions**: Read repository descriptions before installing
- **Preview first**: Always preview a skill to see what you're getting
- **Check stars**: Higher star counts usually indicate better quality

### Understanding Search Results

Each result card displays:
- **Repository name**: Click to visit on GitHub
- **Description**: What the repository is about
- **Star count**: Popularity indicator (⭐)
- **Fork count**: Community engagement
- **Language badge**: Primary programming language
- **Skill count**: Number of skills found in the repository
- **Action buttons**:
  - **Preview**: View skill content before installing
  - **Install**: Add the skill to your local directory
  - **Open in GitHub** (↗): Open repository in your browser

### Previewing a Skill

Before installing, preview the skill to see exactly what you're getting:

1. Click the **Preview** button on any search result
2. A modal displays:
   - **File tree** (left panel): Browse the skill's directory structure
   - **Content viewer** (right panel): View skill.md content rendered as markdown
3. Browse files by clicking on them in the tree
4. Check for:
   - ✅ Clear documentation with usage instructions
   - ✅ Examples and templates
   - ✅ Recent updates (check modification dates)
   - ❌ Empty or incomplete skill.md files
5. Click **Install** from the preview modal if you like what you see

### Installing a Skill

1. Click the **Install** button on a search result or from the preview modal
2. Select **installation location**:
   - **Project directory**: `.claude/skills/` (project-specific, shared via Git)
   - **Global directory**: `~/.claude/skills/` (available in all projects)
3. Click **Install**
4. Watch the progress bar as files are downloaded
5. Once complete, the skill appears in your **Local Skills** list

**Installation Progress**:
- **Progress bar**: Shows percentage complete
- **File count**: "5 of 10 files downloaded"
- **Stage indicator**: Downloading → Validating → Saving
- **Cancel button**: Abort installation if needed

### Handling Installation Conflicts

If a skill with the same name already exists in your target directory:

A conflict resolution dialog will appear with three options:

#### Option 1: Overwrite ⚠️
- **What happens**: Replaces the existing skill completely
- **Warning**: All changes to the existing skill will be **lost**
- **When to use**: You want to update to a newer version

#### Option 2: Rename (Recommended) ✅
- **What happens**: Installs with a timestamp suffix
  - Example: `react-hooks` → `react-hooks-20260311-143022`
- **Benefit**: Keeps both versions
- **When to use**: You want to try the new version while keeping the old one

#### Option 3: Skip ❌
- **What happens**: Cancels the installation
- **When to use**: You don't want to install this skill after all

### Error Handling

#### Search Errors

If search fails, you'll see an error message with a **Retry** button:
- **Network error**: Check your internet connection, then retry
- **Rate limit exceeded**: Add a GitHub PAT (see below)
- **No results**: Try different keywords

#### Installation Errors

If installation fails:
1. Check the error message for details
2. Verify your internet connection
3. Try again with the **Retry** button
4. Check if the skill directory was partially created (delete if needed)

### Managing Search State

**Tab switching preserves your search**:
- Search query is preserved when switching tabs
- Results remain loaded
- Scroll position is maintained
- No need to re-search when coming back

### GitHub Rate Limits

**Unauthenticated access** (default):
- **Limit**: 60 requests/hour
- **Cost**: Free, no setup required

**With GitHub PAT** (recommended):
- **Limit**: 5,000 requests/hour
- **Setup**: Add any GitHub PAT in Settings → Private Repositories
- **Benefit**: 83x more requests per hour!

**To add a PAT**:
1. Go to Settings (⚙️)
2. Navigate to Private Repositories tab
3. Add any GitHub PAT (even for public repos)
4. Your rate limit increases immediately

### Browsing Curated Sources

Discover high-quality, vetted skill repositories:

1. Scroll down in the **Discover** tab
2. Find the **Curated Sources** section
3. Click on any source to browse all its skills
4. All skills from that repository are displayed

**Benefits of curated sources**:
- ✅ Quality assured by the community
- ✅ Easy discovery without searching
- ✅ Trusted, maintained repositories
- ✅ Regularly updated with new skills

### Best Practices

**Before Installing**:
- ✅ Preview the skill first
- ✅ Read the documentation
- ✅ Check the file structure
- ✅ Verify repository stars and last update

**During Installation**:
- ✅ Choose the right directory (project vs global)
- ✅ Use "Rename" for conflicts (safest option)
- ✅ Let installation complete fully (don't cancel midway)

**After Installation**:
- ✅ Test the skill
- ✅ Review the documentation in the editor
- ✅ Check for dependencies or setup requirements
- ✅ Report issues to the repository maintainer

### Troubleshooting Public Discovery

#### Search Returns No Results

**Possible causes**:
- No skills match your query
- GitHub API rate limit exceeded
- Network connection issues

**Solutions**:
- Try different keywords
- Add a GitHub PAT for higher rate limits
- Check internet connection
- Use the **Retry** button

#### Installation Fails

**Possible causes**:
- Network connection lost
- Skill directory too large (>10MB)
- Invalid skill structure (missing skill.md)
- Permission denied

**Solutions**:
- Check internet connection
- Try installing a smaller skill
- Report invalid skills to maintainers
- Check file permissions in target directory

#### Preview Shows Error

**Possible causes**:
- Repository deleted or made private
- Network timeout
- Skill file removed

**Solutions**:
- Search again to find updated results
- Check if repository still exists on GitHub
- Try a different skill

#### Infinite Scroll Not Loading More

**Possible causes**:
- Reached end of results
- Network timeout
- Rate limit exceeded

**Solutions**:
- Check if "Loading more..." indicator appears
- Wait a few seconds and try scrolling again
- Add a GitHub PAT if rate limited

---

### Keyboard Shortcuts for Discovery

| Shortcut | Action |
|----------|--------|
| Click compass icon | Open Discover tab |
| Type in search box | Search automatically (debounced) |
| Scroll down | Load more results automatically |
| `Escape` | Close preview modal |
| `Tab` | Navigate between results |

---

**Pro tip**: Install a variety of skills to build your personal toolkit. Start with foundational skills (testing, linting, documentation) and add specialized skills as needed!

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
