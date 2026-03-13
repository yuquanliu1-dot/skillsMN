# Skills Registry Search - User Guide

Welcome to the **Skills Registry Search** feature! This guide will help you discover and install skills from the skills.sh registry.

## Table of Contents

1. [What is the Skills Registry?](#what-is-the-skills-registry)
2. [Getting Started](#getting-started)
3. [Searching for Skills](#searching-for-skills)
4. [Installing Skills](#installing-skills)
5. [Managing Installed Skills](#managing-installed-skills)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## What is the Skills Registry?

The **skills.sh Registry** is a curated collection of public Claude Code skills shared by the community. It's like an app store for Claude skills, where you can:

- **Discover** skills created by other users
- **Search** by keywords, functionality, or use case
- **Install** skills with one click
- **Track** installed skills and their sources

### Key Benefits

- ✅ **No Git Knowledge Required**: Install skills without manual cloning
- ✅ **Curated Content**: Skills are reviewed and indexed
- ✅ **Installation Tracking**: See what's installed and from where
- ✅ **Instant Preview**: View skill details before installing
- ✅ **One-Click Install**: Simple installation process

---

## Getting Started

### Prerequisites

Before using the registry search, ensure you have:

1. **Git Installed**: Git must be available in your system PATH
   - Check: Run `git --version` in terminal
   - Install: Download from [git-scm.com](https://git-scm.com)

2. **Internet Connection**: Required to search and download skills

3. **Disk Space**: Sufficient space for skill files (typically <10MB per skill)

### Accessing the Registry Search

1. Launch **skillsMN** application
2. Click the **"Registry"** tab in the left sidebar
3. The search interface will load automatically

---

## Searching for Skills

### Basic Search

1. **Click the search box** at the top of the Registry tab
2. **Type your query** (e.g., "data analysis", "code review", "testing")
3. **Wait for results** (search is debounced by 400ms for performance)
4. **Browse results** in the list below

### Search Tips

| Tip | Example |
|-----|---------|
| **Use specific keywords** | "unit testing" instead of "testing" |
| **Include context** | "python data analysis" instead of "analysis" |
| **Try variations** | "code review", "code quality", "linting" |
| **Check installation count** | Higher counts = more trusted skills |

### Understanding Search Results

Each result shows:

- **Skill Name**: Click to view details on skills.sh
- **Source Repository**: GitHub repository path
- **Installation Count**: Number of times installed
- **Install Button**: Install the skill
- **Installed Badge**: Shows if already installed

---

## Installing Skills

### Step-by-Step Installation

1. **Find a Skill**: Search and browse results
2. **View Details** (Optional): Click the skill name to view full documentation
3. **Click Install**: Click the "Install" button on the skill card
4. **Select Target Tool**: Choose where to install:
   - **Claude Code**: Install for CLI usage
   - **Claude Desktop**: Install for desktop application
5. **Monitor Progress**: Watch the installation progress:
   ```
   Cloning repository...           (10%)
   Finding skill directory...      (40%)
   Copying files...                (60%)
   Writing metadata...             (80%)
   Cleaning up...                  (90%)
   Installation complete!          (100%)
   ```
6. **Use the Skill**: The skill is now available in your tool

### Installation Progress Stages

| Stage | Progress | Description |
|-------|----------|-------------|
| **Cloning** | 10% | Downloading repository from GitHub |
| **Discovering** | 40% | Finding skill directory in repository |
| **Copying** | 60% | Copying skill files to target directory |
| **Writing Metadata** | 80% | Saving installation tracking info |
| **Cleanup** | 90% | Removing temporary files |
| **Completed** | 100% | Skill ready to use |

### What Gets Installed

When you install a skill, the following happens:

1. **Repository Cloned**: Git repository is downloaded to temporary directory
2. **Skill Located**: Skill directory is found (supports multi-skill repos)
3. **Files Copied**: Skill files are copied to your skills directory
4. **Metadata Created**: `.source.json` file is added for tracking
5. **Cleanup Performed**: Temporary files are removed

---

## Managing Installed Skills

### Checking Installation Status

- **Installed Badge**: Green badge with checkmark indicates installed skills
- **Installation Count**: Shows when skill was installed

### Viewing Installation Metadata

Installed skills include a `.source.json` file with:

```json
{
  "type": "registry",
  "registryUrl": "https://skills.sh",
  "source": "username/repo-name",
  "skillId": "skill-name",
  "installedAt": "2026-03-12T10:30:45.123Z",
  "commitHash": "abc123def456..."
}
```

### Updating Skills

To update a skill installed from the registry:

1. **Uninstall** the current version (delete from skills directory)
2. **Re-install** from the registry to get the latest version

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Git Not Found Error

**Error Message**: "Git is required but not installed"

**Solution**:
1. Download Git from [git-scm.com](https://git-scm.com)
2. Install Git for your operating system
3. Restart skillsMN application
4. Verify: Run `git --version` in terminal

---

#### 2. Network Error

**Error Message**: "Unable to connect to GitHub"

**Solutions**:
- Check internet connection
- Try again (network may be temporarily down)
- Check if GitHub is accessible in your region
- Verify firewall/proxy settings

**Retry**: Click "Try Again" button for transient network errors

---

#### 3. Repository Not Found

**Error Message**: "This skill repository could not be found"

**Solutions**:
- Repository may have been deleted or moved
- Search for an alternative skill with similar functionality
- Contact the skill author if you have their information

---

#### 4. Private Repository Error

**Error Message**: "This skill is in a private repository"

**Solutions**:
- Private repositories cannot be installed from the registry
- Contact the skill author for access
- Search for public alternatives with similar functionality

---

#### 5. Disk Space Error

**Error Message**: "Not enough disk space to install this skill"

**Solutions**:
1. Free up disk space (typically need <100MB)
2. Delete temporary files
3. Clear cache: `npm cache clean --force`
4. Try installing again

---

#### 6. Invalid Skill Structure

**Error Message**: "Invalid skill structure: SKILL.md not found"

**Solutions**:
- Repository may not be a valid skill
- Contact skill author to fix the structure
- Search for alternative skills

---

#### 7. Installation Timeout

**Error Message**: "Installation timed out"

**Solutions**:
- Check internet speed
- Try again (may be temporary network issue)
- Check if GitHub is experiencing issues
- Click "Try Again" button

---

### Getting Help

If issues persist:

1. **Check the Console**: Open Developer Tools (F12) for detailed error logs
2. **Search Alternatives**: Try different keywords or similar skills
3. **Contact Author**: Use the source link to find author contact info
4. **Report Issues**: Submit issues on the skillsMN GitHub repository

---

## FAQ

### General Questions

**Q: Is the registry search free to use?**
A: Yes! The registry search and all skills are completely free.

**Q: How often is the registry updated?**
A: The registry is continuously updated as new skills are published.

**Q: Can I install skills from private repositories?**
A: No, the registry only supports public repositories. For private repos, use the "Private Repositories" feature.

**Q: Do I need a GitHub account?**
A: No, you can search and install skills without a GitHub account.

---

### Installation Questions

**Q: Where are skills installed?**
A: Skills are installed to your configured skills directory (either project or global).

**Q: Can I install to both Claude Code and Claude Desktop?**
A: Yes, but you need to install separately for each tool.

**Q: How much disk space do skills use?**
A: Most skills are <10MB, but it varies by skill.

**Q: Can I update installed skills?**
A: Currently, you need to uninstall and re-install to update. Automatic updates are planned for a future release.

---

### Troubleshooting Questions

**Q: Why does search take a long time?**
A: Search should complete in <3 seconds. If slower, check your internet connection.

**Q: Can I cancel an installation in progress?**
A: Currently, installations cannot be cancelled once started. Wait for it to complete or fail.

**Q: Are installed skills scanned for malware?**
A: No, use caution and review skill code before installing. Only install from trusted sources.

**Q: Can I use skills offline?**
A: Yes, once installed, skills work offline. Only search and installation require internet.

---

### Advanced Questions

**Q: Can I see the skill code before installing?**
A: Yes! Click the skill name to view full details on skills.sh, including code.

**Q: How do I report a malicious skill?**
A: Use the "Report" button on skills.sh or contact the skillsMN team.

**Q: Can I install multiple skills at once?**
A: Currently, you must install skills one at a time. Batch installation is planned for a future release.

**Q: How do I uninstall a skill?**
A: Delete the skill directory from your skills folder using the file manager or skillsMN interface.

---

## Best Practices

### Skill Selection

✅ **Check installation count** - Higher counts indicate trusted skills
✅ **Read descriptions carefully** - Ensure the skill matches your needs
✅ **View source repository** - Check author reputation and code quality
✅ **Preview on skills.sh** - Review full documentation before installing

### Installation Management

✅ **Install to appropriate directory** - Use project skills for project-specific needs
✅ **Review installed skills** - Periodically audit your installed skills
✅ **Update regularly** - Re-install periodically to get latest features
✅ **Backup important skills** - Keep copies of critical skills

### Security

✅ **Only install from trusted sources** - Check author reputation
✅ **Review skill code** - Understand what the skill does
✅ **Be cautious with permissions** - Some skills may require specific permissions
✅ **Report issues** - Help keep the registry safe for everyone

---

## Getting Started Checklist

- [ ] Git installed and available in PATH
- [ ] Internet connection verified
- [ ] skillsMN application launched
- [ ] Registry tab accessed
- [ ] First search performed
- [ ] First skill installed
- [ ] Skill verified in Claude Code/Desktop

---

## Need More Help?

- **Documentation**: [skills.sh/docs](https://skills.sh/docs)
- **Community**: [GitHub Discussions](https://github.com/anthropics/skillsMN/discussions)
- **Issues**: [Report Bugs](https://github.com/anthropics/skillsMN/issues)

---

**Happy skill hunting! 🎉**
