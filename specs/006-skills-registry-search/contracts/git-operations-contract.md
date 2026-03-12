# Git Operations Contract: Skill Installation

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12
**Version**: 1.0.0

## Overview

This contract defines the git operations required for installing skills from GitHub repositories during the registry installation process.

## Requirements

### System Requirements

- **Git Version**: 2.0 or higher
- **Location**: Git must be available in system PATH
- **Authentication**: None required (public repositories only)
- **Network**: HTTPS access to GitHub (https://github.com)

### Supported Platforms

- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+)

---

## Operations

### 1. Shallow Clone

**Purpose**: Clone a GitHub repository with minimal history to reduce download time and disk usage

**Command**:
```bash
git clone --depth 1 --single-branch https://github.com/{org}/{repo}.git {targetDir}
```

**Parameters**:
- `{org}/{repo}`: GitHub repository path from search result (e.g., "skills-org/skills-collection")
- `{targetDir}`: Local temporary directory for clone

**Options Explained**:
- `--depth 1`: Only fetch the latest commit (shallow clone)
- `--single-branch`: Only clone the default branch
- `.git` extension: Explicitly specify git repository

**Success Criteria**:
- Exit code 0
- Repository files present in `{targetDir}`
- `.git` directory exists

**Error Scenarios**:

| Exit Code | Error Type | User Message | Recovery |
|-----------|------------|--------------|----------|
| 127 | Git not found | "Git is not installed or not in PATH" | Install Git |
| 128 | Repository not found | "Repository not found or is private" | Search for alternative |
| 128 | Authentication failed | "Repository requires authentication" | Search for public alternative |
| 1 | Network error | "Unable to connect to GitHub" | Check internet, retry |
| 1 | Disk space | "Not enough disk space" | Free up disk space |

**Implementation**:

```typescript
// src/main/utils/gitOperations.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface CloneResult {
  success: boolean;
  directory: string;
  commitHash?: string;
  error?: string;
}

export class GitOperations {
  /**
   * Perform a shallow clone of a GitHub repository
   */
  async shallowClone(
    source: string,
    targetDir: string,
    onProgress?: (message: string) => void
  ): Promise<CloneResult> {
    // Validate source format
    if (!this.validateSource(source)) {
      return {
        success: false,
        directory: targetDir,
        error: `Invalid source format: ${source}. Expected "org/repo" format.`
      };
    }

    const repoUrl = `https://github.com/${source}.git`;

    onProgress?.(`Cloning repository from ${repoUrl}...`);

    try {
      // Check git availability
      await this.checkGitAvailable();

      // Execute shallow clone
      const { stdout, stderr } = await execAsync(
        `git clone --depth 1 --single-branch "${repoUrl}" "${targetDir}"`,
        {
          timeout: 300000, // 5 minutes timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }
      );

      // Get commit hash
      const commitHash = await this.getCommitHash(targetDir);

      onProgress?.('Repository cloned successfully');

      return {
        success: true,
        directory: targetDir,
        commitHash
      };

    } catch (error) {
      const errorMessage = this.parseGitError(error);

      onProgress?.(`Clone failed: ${errorMessage}`);

      return {
        success: false,
        directory: targetDir,
        error: errorMessage
      };
    }
  }

  /**
   * Check if git is available in PATH
   */
  async checkGitAvailable(): Promise<void> {
    try {
      await execAsync('git --version', { timeout: 5000 });
    } catch (error) {
      throw new Error('Git is not installed or not available in PATH. Please install Git and restart the application.');
    }
  }

  /**
   * Get the current commit hash from a repository
   */
  private async getCommitHash(repoDir: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: repoDir,
        timeout: 5000
      });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Validate source format (org/repo or user/repo)
   */
  private validateSource(source: string): boolean {
    return /^[^/]+\/[^/]+$/.test(source);
  }

  /**
   * Parse git error messages into user-friendly format
   */
  private parseGitError(error: any): string {
    const message = error.message || error.stderr || String(error);

    if (message.includes('git: not found') || message.includes('\'git\' is not recognized')) {
      return 'Git is not installed or not available in PATH';
    }

    if (message.includes('Repository not found') || message.includes('could not create work tree')) {
      return 'Repository not found or is private';
    }

    if (message.includes('Authentication failed') || message.includes('could not read Username')) {
      return 'Authentication failed. This repository may be private.';
    }

    if (message.includes('Connection timed out') || message.includes('Could not resolve host')) {
      return 'Unable to connect to GitHub. Please check your internet connection.';
    }

    if (message.includes('No space left on device')) {
      return 'Not enough disk space to clone repository';
    }

    return `Git operation failed: ${message}`;
  }
}

export const gitOperations = new GitOperations();
```

---

## Directory Structure

### Expected Repository Patterns

**Pattern 1: Single Skill at Root**
```
repo/
├── SKILL.md
├── skill-file.ts
└── another-file.js
```

**Pattern 2: Single Skill in Subdirectory**
```
repo/
├── README.md
├── src/
│   └── code.ts
└── skills/
    └── my-skill/
        ├── SKILL.md
        └── skill-code.ts
```

**Pattern 3: Multiple Skills (Collection)**
```
repo/
├── README.md
└── skills/
    ├── skill-one/
    │   ├── SKILL.md
    │   └── code.ts
    └── skill-two/
        ├── SKILL.md
        └── code.ts
```

### Skill Directory Discovery

```typescript
// src/main/utils/skillDiscovery.ts
import fs from 'fs/promises';
import path from 'path';

export interface SkillDirectory {
  path: string;
  relativePath: string;
  skillId: string;
}

export class SkillDiscovery {
  /**
   * Find skill directory in cloned repository
   */
  async findSkillDirectory(
    repoRoot: string,
    skillId?: string
  ): Promise<SkillDirectory | null> {
    // Strategy 1: Check root directory
    if (await this.hasSkillFile(repoRoot)) {
      return {
        path: repoRoot,
        relativePath: '.',
        skillId: await this.extractSkillId(repoRoot) || 'unknown'
      };
    }

    // Strategy 2: Search immediate subdirectories
    const subdirs = await this.getSubdirectories(repoRoot);

    for (const subdir of subdirs) {
      if (await this.hasSkillFile(subdir)) {
        const foundSkillId = await this.extractSkillId(subdir);

        // If skillId specified, match it
        if (skillId && foundSkillId !== skillId) {
          continue;
        }

        return {
          path: subdir,
          relativePath: path.relative(repoRoot, subdir),
          skillId: foundSkillId || 'unknown'
        };
      }
    }

    // Strategy 3: Search nested skill collections
    const collectionDirs = ['skills', 'skill-collections', 'packages'];

    for (const collectionName of collectionDirs) {
      const collectionPath = path.join(repoRoot, collectionName);
      if (await this.directoryExists(collectionPath)) {
        const result = await this.findSkillDirectory(collectionPath, skillId);
        if (result) {
          return {
            ...result,
            relativePath: path.relative(repoRoot, result.path)
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if directory contains SKILL.md
   */
  private async hasSkillFile(dir: string): Promise<boolean> {
    try {
      const skillPath = path.join(dir, 'SKILL.md');
      await fs.access(skillPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract skill ID from SKILL.md metadata
   */
  private async extractSkillId(skillDir: string): Promise<string | null> {
    try {
      const skillPath = path.join(skillDir, 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const nameMatch = frontmatterMatch[1].match(/^name:\s*(.+)$/m);
        if (nameMatch) {
          return this.slugify(nameMatch[1].trim());
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get immediate subdirectories
   */
  private async getSubdirectories(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(dir, entry.name));
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Convert skill name to URL-safe slug
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const skillDiscovery = new SkillDiscovery();
```

---

## Performance Considerations

### Clone Size Optimization

- **Shallow Clone**: Only latest commit, no history
- **Single Branch**: Only default branch
- **Expected Size**: <10MB for typical skill repositories
- **Large Repositories**: May timeout if >100MB

### Timeout Configuration

```typescript
const CLONE_TIMEOUTS = {
  MINIMUM: 60000,    // 1 minute
  DEFAULT: 300000,   // 5 minutes
  MAXIMUM: 600000    // 10 minutes
};
```

### Progress Feedback

Provide user feedback during clone:
1. "Checking Git availability..."
2. "Connecting to GitHub..."
3. "Cloning repository (this may take a moment)..."
4. "Clone complete"

---

## Security Considerations

### Repository Validation

1. **HTTPS Only**: Only clone via HTTPS, never SSH or git://
2. **Public Only**: No authentication tokens in git operations
3. **Source Validation**: Verify source format before constructing URL
4. **Path Validation**: Ensure target directory is in approved location

### Safe Operations

```typescript
// Whitelist allowed git commands
const ALLOWED_GIT_COMMANDS = [
  'git clone',
  'git rev-parse',
  'git --version'
];

// Validate command before execution
function validateGitCommand(command: string): boolean {
  return ALLOWED_GIT_COMMANDS.some(allowed => command.startsWith(allowed));
}
```

### Cleanup Guarantee

```typescript
// Always clean up temporary directories
try {
  await gitOperations.shallowClone(source, tempDir);
  // ... installation logic
} finally {
  // Cleanup even on error
  await fs.rm(tempDir, { recursive: true, force: true });
}
```

---

## Error Recovery

### Retry Strategy

```typescript
async function cloneWithRetry(
  source: string,
  targetDir: string,
  maxRetries: number = 2
): Promise<CloneResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }

    const result = await gitOperations.shallowClone(source, targetDir);

    if (result.success) {
      return result;
    }

    lastError = new Error(result.error);

    // Don't retry for certain errors
    if (result.error.includes('not found') || result.error.includes('Authentication')) {
      break;
    }
  }

  throw lastError;
}
```

### User-Facing Errors

All git errors must be translated to user-friendly messages:
- Technical details logged to file
- User sees actionable message
- Suggested recovery steps provided

---

## Testing Requirements

### Unit Tests

1. **Command Generation**:
   - Test shallow clone command construction
   - Test URL building from source
   - Test path validation

2. **Error Parsing**:
   - Test all error scenarios
   - Verify user-friendly messages
   - Test unknown error handling

3. **Skill Discovery**:
   - Test all repository patterns
   - Test skillId matching
   - Test edge cases (empty repos, missing SKILL.md)

### Integration Tests

1. **Live Git Operations** (with test repositories):
   - Clone public repository
   - Verify file structure
   - Test cleanup

2. **Error Scenarios**:
   - Invalid repository
   - Network failure
   - Disk space issues

### Performance Tests

- Clone time for various repository sizes
- Memory usage during clone
- Cleanup verification

---

## Monitoring

### Metrics to Track

- Clone success rate
- Average clone duration
- Error rate by error type
- Repository size distribution
- Cleanup success rate

### Logging

```typescript
// Log all git operations
logger.info('Git operation started', {
  operation: 'clone',
  source: 'org/repo',
  targetDir: '/tmp/skillsMN-123',
  timestamp: new Date().toISOString()
});

logger.info('Git operation completed', {
  operation: 'clone',
  duration: 2345, // ms
  success: true,
  commitHash: 'abc123...'
});
```

---

## Versioning

- **Current Version**: 1.0.0
- **Git Compatibility**: Git 2.0+
- **Breaking Changes**: Require major version bump
- **Deprecation**: 6-month notice for breaking changes

---

## Future Considerations

### Git LFS Support
- May need to support repositories with LFS files
- Would require `git lfs install` and additional handling

### Private Repository Support
- Could add authentication for private repos
- Would require secure credential storage
- Different error handling for auth failures

### Branch Selection
- Currently only clones default branch
- Could add branch selection if needed
- Would require additional UI and API changes
