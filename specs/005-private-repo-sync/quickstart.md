# Quickstart: Implementing Private Repository Sync

**Feature**: 005-private-repo-sync
**Date**: 2026-03-10

## Overview

This guide walks you through implementing private repository synchronization in skillsMN. You'll learn how to add private repository configuration, browse skills, install skill directories, and detect updates.

**Prerequisites**:
- Node.js LTS (v20+) installed
- TypeScript 5.x knowledge
- Electron application structure understanding
- GitHub REST API v3 familiarity

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (Frontend)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Settings.tsx │  │ PrivateRepo  │  │ InstallDialog│      │
│  │ (Config UI)  │  │ List.tsx     │  │ (Reuse)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC Channels
                        │ (private-repo:*)
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Backend)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GitHubService│  │ SkillService │  │ Encryption   │      │
│  │ (API Calls)  │  │ (Install)    │  │ Utils        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                External Services & Storage                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GitHub API   │  │ File System  │  │ Electron     │      │
│  │ (REST v3)    │  │ (Skills)     │  │ safeStorage  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Extend Data Models

### 1.1 Create PrivateRepo Model

Create `src/main/models/PrivateRepo.ts`:

```typescript
export interface PrivateRepo {
  id: string;
  owner: string;
  repo: string;
  url: string;
  displayName?: string;
  patEncrypted: string;
  defaultBranch?: string;
  lastSyncTime: Date | null;
  skillCount?: number;
  description?: string;
  addedAt: Date;
  updatedAt: Date;
}

export interface CreatePrivateRepoInput {
  url: string;
  pat: string;
  displayName?: string;
}
```

### 1.2 Extend Skill Model

Update `src/main/models/Skill.ts`:

```typescript
export type SkillSource = 'local' | 'public' | 'private';

export interface Skill {
  // ... existing fields ...
  name: string;
  path: string;
  description?: string;

  // NEW: Private repository metadata
  sourceType: SkillSource;
  sourceRepoId?: string;
  sourceRepoPath?: string;
  installedDirectoryCommitSHA?: string;
  installedAt?: Date;
}
```

### 1.3 Create PrivateSkill Interface

Create `src/shared/types.ts` (or extend existing):

```typescript
export interface PrivateSkill {
  name: string;
  path: string;
  directoryCommitSHA: string;
  lastCommitMessage: string;
  lastCommitAuthor: string;
  lastCommitDate: Date;
  totalFileSize: number;
  fileCount: number;
}
```

---

## Step 2: Implement Encryption Utility

Create `src/main/utils/encryption.ts`:

```typescript
import { safeStorage } from 'electron';

export function encryptPAT(pat: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this platform');
  }

  const encrypted = safeStorage.encryptString(pat);
  return encrypted.toString('base64');
}

export function decryptPAT(encryptedPAT: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this platform');
  }

  const buffer = Buffer.from(encryptedPAT, 'base64');
  return safeStorage.decryptString(buffer);
}
```

---

## Step 3: Extend GitHubService

Update `src/main/services/GitHubService.ts`:

```typescript
import { Octokit } from '@octokit/rest';
import { encryptPAT, decryptPAT } from '../utils/encryption';
import type { PrivateRepo, PrivateSkill } from '../models';

export class GitHubService {
  // ... existing methods ...

  /**
   * Validate repository access with PAT
   */
  async validateRepoAccess(
    owner: string,
    repo: string,
    pat: string
  ): Promise<{ valid: boolean; description?: string }> {
    const octokit = new Octokit({ auth: pat });

    try {
      const response = await octokit.repos.get({ owner, repo });
      return {
        valid: true,
        description: response.data.description || undefined
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Get repository tree (recursive, max 5 levels)
   */
  async getRepoTree(
    owner: string,
    repo: string,
    pat: string
  ): Promise<any[]> {
    const octokit = new Octokit({ auth: pat });

    const response = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true'
    });

    return response.data.tree;
  }

  /**
   * Find all skill directories (containing skill.md, max 5 levels)
   */
  async findSkillDirectories(
    owner: string,
    repo: string,
    pat: string
  ): Promise<PrivateSkill[]> {
    const tree = await this.getRepoTree(owner, repo, pat);

    // Find all skill.md files
    const skillFiles = tree.filter(
      item => item.type === 'blob' &&
              item.path.endsWith('skill.md') &&
              item.path.split('/').length <= 5
    );

    // Get directory paths (parent of skill.md)
    const skillPaths = skillFiles.map(file =>
      file.path.replace(/\/skill\.md$/, '')
    );

    // For each skill directory, fetch commit info
    const skills: PrivateSkill[] = [];
    for (const path of skillPaths) {
      const commits = await this.getDirectoryCommits(owner, repo, path, pat);
      const latestCommit = commits[0];

      skills.push({
        name: path.split('/').pop() || path,
        path,
        directoryCommitSHA: latestCommit.sha,
        lastCommitMessage: latestCommit.commit.message,
        lastCommitAuthor: latestCommit.commit.author?.name || 'Unknown',
        lastCommitDate: new Date(latestCommit.commit.author?.date || Date.now()),
        totalFileSize: 0, // Calculate if needed
        fileCount: 0 // Calculate if needed
      });
    }

    return skills;
  }

  /**
   * Get commits for a directory path
   */
  async getDirectoryCommits(
    owner: string,
    repo: string,
    path: string,
    pat: string
  ): Promise<any[]> {
    const octokit = new Octokit({ auth: pat });

    const response = await octokit.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 1
    });

    return response.data;
  }

  /**
   * Download directory contents recursively
   */
  async downloadDirectory(
    owner: string,
    repo: string,
    path: string,
    pat: string
  ): Promise<Map<string, Buffer>> {
    const octokit = new Octokit({ auth: pat });
    const files = new Map<string, Buffer>();

    // Get directory contents
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path
    });

    const contents = Array.isArray(response.data) ? response.data : [response.data];

    for (const item of contents) {
      if (item.type === 'file') {
        // Download file content
        const fileResponse = await octokit.repos.getContent({
          owner,
          repo,
          path: item.path
        });

        if ('content' in fileResponse.data) {
          const content = Buffer.from(fileResponse.data.content, 'base64');
          files.set(item.path, content);
        }
      } else if (item.type === 'dir') {
        // Recursively download subdirectory
        const subFiles = await this.downloadDirectory(owner, repo, item.path, pat);
        subFiles.forEach((content, filePath) => {
          files.set(filePath, content);
        });
      }
    }

    return files;
  }
}
```

---

## Step 4: Create IPC Handlers

Update `src/main/ipc/gitHubHandlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { GitHubService } from '../services/GitHubService';
import { SkillService } from '../services/SkillService';
import { encryptPAT, decryptPAT } from '../utils/encryption';
import { v4 as uuidv4 } from 'uuid';
import type { PrivateRepo, CreatePrivateRepoInput } from '../models/PrivateRepo';

const githubService = new GitHubService();
const skillService = new SkillService();

// Repository Configuration

ipcMain.handle('private-repo:add', async (event, input: CreatePrivateRepoInput) => {
  try {
    // Validate URL
    const urlMatch = input.url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return { success: false, error: 'INVALID_URL' };
    }

    const [, owner, repo] = urlMatch;

    // Validate access
    const access = await githubService.validateRepoAccess(owner, repo, input.pat);
    if (!access.valid) {
      return { success: false, error: 'AUTH_FAILED' };
    }

    // Encrypt PAT
    const patEncrypted = encryptPAT(input.pat);

    // Create repository object
    const privateRepo: PrivateRepo = {
      id: uuidv4(),
      owner,
      repo,
      url: input.url,
      displayName: input.displayName || `${owner}/${repo}`,
      patEncrypted,
      defaultBranch: 'main',
      lastSyncTime: null,
      description: access.description,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    // Save to configuration (implement save logic)
    await savePrivateRepo(privateRepo);

    return { success: true, repo: privateRepo };
  } catch (error) {
    console.error('Failed to add private repo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('private-repo:list', async () => {
  try {
    const repos = await loadPrivateRepos();
    return { success: true, repos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('private-repo:get-skills', async (event, { repoId, forceRefresh }) => {
  try {
    const repo = await getPrivateRepo(repoId);
    if (!repo) {
      return { success: false, error: 'REPO_NOT_FOUND' };
    }

    // Check cache (5 minutes)
    if (!forceRefresh && repo.lastSyncTime) {
      const cacheAge = Date.now() - new Date(repo.lastSyncTime).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        const cachedSkills = await getCachedSkills(repoId);
        if (cachedSkills) {
          return { success: true, skills: cachedSkills };
        }
      }
    }

    // Decrypt PAT
    const pat = decryptPAT(repo.patEncrypted);

    // Fetch skills
    const skills = await githubService.findSkillDirectories(
      repo.owner,
      repo.repo,
      pat
    );

    // Update cache
    await cacheSkills(repoId, skills);
    await updateRepoLastSync(repoId);

    return { success: true, skills };
  } catch (error) {
    console.error('Failed to get skills:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('private-repo:install-skill', async (event, { repoId, skillPath, targetDirectory, conflictResolution }) => {
  try {
    const repo = await getPrivateRepo(repoId);
    if (!repo) {
      return { success: false, error: 'REPO_NOT_FOUND' };
    }

    // Decrypt PAT
    const pat = decryptPAT(repo.patEncrypted);

    // Download directory
    const files = await githubService.downloadDirectory(
      repo.owner,
      repo.repo,
      skillPath,
      pat
    );

    // Get commit SHA for update tracking
    const commits = await githubService.getDirectoryCommits(
      repo.owner,
      repo.repo,
      skillPath,
      pat
    );
    const commitSHA = commits[0].sha;

    // Install skill using existing service
    const skill = await skillService.installSkill({
      name: skillPath.split('/').pop() || skillPath,
      files,
      targetDirectory,
      conflictResolution,
      sourceType: 'private',
      sourceRepoId: repoId,
      sourceRepoPath: skillPath,
      installedDirectoryCommitSHA: commitSHA
    });

    return { success: true, skill };
  } catch (error) {
    console.error('Failed to install skill:', error);
    return { success: false, error: error.message };
  }
});

// ... implement other handlers similarly ...
```

---

## Step 5: Create Frontend Components

### 5.1 Settings Page (Repository Configuration)

Update `src/renderer/components/Settings.tsx`:

```tsx
import React, { useState } from 'react';

export function Settings() {
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const result = await window.electron.ipcRenderer.invoke('private-repo:add', {
      url: repoUrl,
      pat,
      displayName
    });

    setTesting(false);

    if (result.success) {
      setTestResult('success');
      // Refresh repo list
      loadRepos();
    } else {
      setTestResult('error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Private Repositories</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/myorg/team-skills"
            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Personal Access Token
          </label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Display Name (Optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleTestConnection}
            disabled={testing || !repoUrl || !pat}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Add Repository'}
          </button>

          {testResult === 'success' && (
            <span className="text-emerald-500 flex items-center">
              <CheckIcon className="w-5 h-5 mr-1" />
              Repository added successfully
            </span>
          )}

          {testResult === 'error' && (
            <span className="text-red-500 flex items-center">
              <XIcon className="w-5 h-5 mr-1" />
              Failed to add repository
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5.2 Private Repository List

Create `src/renderer/components/PrivateRepoList.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { PrivateSkill } from '../types';

export function PrivateRepoList() {
  const [repos, setRepos] = useState<PrivateRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [skills, setSkills] = useState<PrivateSkill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRepos();
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      loadSkills(selectedRepo);
    }
  }, [selectedRepo]);

  const loadRepos = async () => {
    const result = await window.electron.ipcRenderer.invoke('private-repo:list');
    if (result.success) {
      setRepos(result.repos);
      if (result.repos.length > 0 && !selectedRepo) {
        setSelectedRepo(result.repos[0].id);
      }
    }
  };

  const loadSkills = async (repoId: string) => {
    setLoading(true);
    const result = await window.electron.ipcRenderer.invoke('private-repo:get-skills', {
      repoId,
      forceRefresh: false
    });
    setLoading(false);

    if (result.success) {
      setSkills(result.skills);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <select
          value={selectedRepo || ''}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-blue-600 focus:border-blue-600"
        >
          {repos.map(repo => (
            <option key={repo.id} value={repo.id}>
              {repo.displayName}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map(skill => (
          <PrivateSkillCard
            key={skill.path}
            skill={skill}
            onInstall={() => handleInstall(skill)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Step 6: Test the Implementation

### 6.1 Unit Tests

Create `tests/unit/services/GitHubService.test.ts`:

```typescript
import { GitHubService } from '../../../src/main/services/GitHubService';

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService();
  });

  describe('validateRepoAccess', () => {
    it('should return valid for accessible repository', async () => {
      const result = await service.validateRepoAccess(
        'owner',
        'repo',
        'valid-pat'
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid for inaccessible repository', async () => {
      const result = await service.validateRepoAccess(
        'owner',
        'repo',
        'invalid-pat'
      );

      expect(result.valid).toBe(false);
    });
  });

  // ... more tests ...
});
```

### 6.2 Integration Tests

Create `tests/integration/private-repo-config.test.ts`:

```typescript
describe('Private Repository Configuration', () => {
  it('should add repository and retrieve skills', async () => {
    // Add repository
    const addResult = await window.electron.ipcRenderer.invoke('private-repo:add', {
      url: 'https://github.com/test-org/test-skills',
      pat: 'test-pat'
    });

    expect(addResult.success).toBe(true);

    // Get skills
    const skillsResult = await window.electron.ipcRenderer.invoke('private-repo:get-skills', {
      repoId: addResult.repo.id
    });

    expect(skillsResult.success).toBe(true);
    expect(skillsResult.skills.length).toBeGreaterThan(0);
  });
});
```

---

## Step 7: Run and Verify

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Test manually**:
   - Open Settings
   - Add a private repository with valid PAT
   - Verify repository appears in list
   - Browse skills in private repo
   - Install a skill
   - Verify skill appears in local list with correct metadata

---

## Common Issues and Solutions

### Issue: PAT Encryption Fails

**Cause**: Platform credential store unavailable

**Solution**:
```typescript
if (!safeStorage.isEncryptionAvailable()) {
  throw new Error('Credential encryption not available. Please check system settings.');
}
```

### Issue: GitHub API Rate Limiting

**Cause**: Too many API requests

**Solution**: Implement caching and conditional requests:
```typescript
const response = await octokit.repos.get({
  owner,
  repo,
  headers: {
    'If-None-Match': cachedETag
  }
});

if (response.status === 304) {
  // Use cached data
}
```

### Issue: Cross-Platform Path Issues

**Cause**: Hardcoded path separators

**Solution**: Use Node.js `path` module:
```typescript
import * as path from 'path';

const skillPath = path.join(baseDir, 'skills', skillName);
```

---

## Next Steps

1. **Implement update detection**: Add logic to check for skill updates
2. **Add conflict resolution**: Handle skill name conflicts during installation
3. **Improve error handling**: Add user-friendly error messages
4. **Add tests**: Achieve ≥70% code coverage
5. **Performance optimization**: Add virtual scrolling for large skill lists

---

## Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Octokit Documentation](https://github.com/octokit/octokit.js)
- [Data Model Documentation](./data-model.md)
- [IPC Interface Contract](./contracts/ipc-interface.md)
