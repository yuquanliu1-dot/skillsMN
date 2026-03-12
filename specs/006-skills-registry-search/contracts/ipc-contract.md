# IPC Contract: Skills Registry Search

**Feature**: 006-skills-registry-search
**Date**: 2026-03-12
**Version**: 1.0.0

## Overview

This contract defines the IPC (Inter-Process Communication) interface between the Electron renderer process (frontend) and main process (backend) for skills registry search functionality.

## Channel Definitions

### 1. `registry:search`

**Purpose**: Search for skills in the skills.sh registry

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  query: string;  // Search query (non-empty string)
}
```

**Returns**:
```typescript
Array<{
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}>
```

**Errors**:
- `ValidationError`: Query is empty or invalid type
- `NetworkError`: Unable to reach skills.sh API
- `ApiError`: API returned error response (4xx/5xx)
- `ParseError`: Failed to parse API response

**Example Usage**:
```typescript
// Renderer (frontend)
const results = await window.electron.invoke('registry:search', { query: 'react' });

// Main (backend handler)
ipcMain.handle('registry:search', async (event, { query }) => {
  // Validate input
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new ValidationError('Query must be a non-empty string');
  }

  // Call service
  const results = await registryService.search(query);

  return results;
});
```

**Performance Requirements**:
- Response time: <3 seconds for typical queries
- Timeout: 10 seconds maximum
- Retry: Not automatic (user can retry manually)

---

### 2. `registry:install`

**Purpose**: Install a skill from a discovered search result

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  source: string;      // GitHub repository path (e.g., "org/repo")
  skillId: string;     // Skill identifier from search result
  targetToolId: string; // Tool to install skill to
}
```

**Returns**:
```typescript
{
  name: string;
  path: string;
  description: string;
  // ... other SkillInfo fields
}
```

**Errors**:
- `ValidationError`: Invalid parameters
- `GitNotFoundError`: Git not installed on system
- `RepositoryNotFoundError`: GitHub repository doesn't exist or is private
- `SkillNotFoundError`: Skill directory not found in repository
- `InvalidSkillError`: Skill missing required SKILL.md file
- `DiskSpaceError`: Insufficient disk space
- `PermissionError`: Cannot write to target directory
- `NetworkError`: Git clone failed due to network issues

**Progress Events** (via event channel `registry:install:progress`):
```typescript
{
  stage: 'cloning' | 'discovering' | 'installing' | 'complete';
  message: string;
  progress?: number; // 0-100 percentage
}
```

**Example Usage**:
```typescript
// Renderer (frontend)
try {
  const skill = await window.electron.invoke('registry:install', {
    source: 'skills-org/skills-collection',
    skillId: 'my-awesome-skill',
    targetToolId: 'claude-code'
  });

  console.log(`Installed ${skill.name} to ${skill.path}`);
} catch (error) {
  if (error instanceof GitNotFoundError) {
    showError('Git is required. Please install Git first.');
  }
}

// Listen for progress events
window.electron.on('registry:install:progress', (event, data) => {
  console.log(`${data.stage}: ${data.message}`);
});

// Main (backend handler)
ipcMain.handle('registry:install', async (event, request) => {
  // Validate input
  if (!validateInstallRequest(request)) {
    throw new ValidationError('Invalid installation request');
  }

  // Verify target tool exists
  const tool = configService.getTool(request.targetToolId);
  if (!tool) {
    throw new ValidationError(`Tool ${request.targetToolId} not found`);
  }

  // Send progress events
  event.sender.send('registry:install:progress', {
    stage: 'cloning',
    message: 'Cloning repository...'
  });

  // Perform installation
  const skill = await skillInstaller.installFromRegistry(request, (stage, message) => {
    event.sender.send('registry:install:progress', { stage, message });
  });

  return skill;
});
```

**Performance Requirements**:
- Installation time: <30 seconds (excluding network download)
- Temporary files: Cleaned up within 5 seconds of completion
- Progress updates: At least every 2 seconds during installation

---

### 3. `registry:check-installed`

**Purpose**: Check if a skill from search results is already installed

**Direction**: Renderer → Main

**Parameters**:
```typescript
{
  skillId: string;
  targetToolId: string;
}
```

**Returns**:
```typescript
{
  installed: boolean;
  skillPath?: string;
  installedAt?: string;
}
```

**Errors**:
- `ValidationError`: Invalid parameters

**Example Usage**:
```typescript
// Renderer (frontend)
const status = await window.electron.invoke('registry:check-installed', {
  skillId: 'my-awesome-skill',
  targetToolId: 'claude-code'
});

if (status.installed) {
  showInfo(`Skill already installed at ${status.skillPath}`);
}

// Main (backend handler)
ipcMain.handle('registry:check-installed', async (event, { skillId, targetToolId }) => {
  const tool = configService.getTool(targetToolId);
  const skillPath = path.join(tool.skillsPath, slugify(skillId));

  if (fs.existsSync(skillPath)) {
    const sourcePath = path.join(skillPath, '.source.json');
    let installedAt: string | undefined;

    if (fs.existsSync(sourcePath)) {
      const source = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
      installedAt = source.installedAt;
    }

    return { installed: true, skillPath, installedAt };
  }

  return { installed: false };
});
```

---

## Type Definitions

### Shared Types (src/shared/types.ts)

```typescript
// Registry search types
export interface SearchSkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

export interface InstallFromRegistryRequest {
  source: string;
  skillId: string;
  targetToolId: string;
}

export interface SkillInstallationStatus {
  installed: boolean;
  skillPath?: string;
  installedAt?: string;
}

// Error types
export class RegistryError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
  }
}

export class ValidationError extends RegistryError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 'Invalid input provided');
  }
}

export class GitNotFoundError extends RegistryError {
  constructor() {
    super(
      'Git not found in PATH',
      'GIT_NOT_FOUND',
      'Git is required but not installed. Please install Git and restart.'
    );
  }
}

export class RepositoryNotFoundError extends RegistryError {
  constructor(source: string) {
    super(
      `Repository not found: ${source}`,
      'REPO_NOT_FOUND',
      'This skill repository could not be found. It may have been moved or deleted.'
    );
  }
}

export class SkillNotFoundError extends RegistryError {
  constructor(skillId: string) {
    super(
      `Skill not found: ${skillId}`,
      'SKILL_NOT_FOUND',
      'The specified skill was not found in this repository.'
    );
  }
}

export class InvalidSkillError extends RegistryError {
  constructor(reason: string) {
    super(
      `Invalid skill: ${reason}`,
      'INVALID_SKILL',
      'This skill is missing required files and cannot be installed.'
    );
  }
}
```

---

## Preload Script Updates

Add to `src/main/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Existing APIs...

// Registry APIs
const registryAPI = {
  search: (query: string) => ipcRenderer.invoke('registry:search', { query }),

  install: (request: InstallFromRegistryRequest) =>
    ipcRenderer.invoke('registry:install', request),

  checkInstalled: (skillId: string, targetToolId: string) =>
    ipcRenderer.invoke('registry:check-installed', { skillId, targetToolId }),

  onInstallProgress: (callback: (data: any) => void) => {
    const listener = (event: any, data: any) => callback(data);
    ipcRenderer.on('registry:install:progress', listener);
    return () => ipcRenderer.removeListener('registry:install:progress', listener);
  }
};

contextBridge.exposeInMainWorld('electron', {
  // Existing APIs...

  // Registry APIs
  registrySearch: registryAPI.search,
  registryInstall: registryAPI.install,
  registryCheckInstalled: registryAPI.checkInstalled,
  onRegistryInstallProgress: registryAPI.onInstallProgress
});
```

---

## Frontend Client

Create `src/renderer/services/registryClient.ts`:

```typescript
import { InstallFromRegistryRequest, SearchSkillResult, SkillInstallationStatus } from '../../shared/types';

export class RegistryClient {
  async search(query: string): Promise<SearchSkillResult[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    return window.electron.registrySearch(query.trim());
  }

  async install(request: InstallFromRegistryRequest): Promise<any> {
    return window.electron.registryInstall(request);
  }

  async checkInstalled(skillId: string, targetToolId: string): Promise<SkillInstallationStatus> {
    return window.electron.registryCheckInstalled(skillId, targetToolId);
  }

  onInstallProgress(callback: (data: any) => void): () => void {
    return window.electron.onRegistryInstallProgress(callback);
  }
}

export const registryClient = new RegistryClient();
```

---

## Testing Requirements

### Unit Tests
- Test each IPC handler with mocked services
- Verify parameter validation
- Test error handling and error types
- Verify progress event emission

### Integration Tests
- Test full search → install → verify flow
- Test error scenarios (network failure, invalid repo, etc.)
- Verify temporary file cleanup
- Test concurrent installations

### Contract Tests
- Verify frontend client matches backend handlers
- Test type safety across IPC boundary
- Verify error serialization/deserialization

---

## Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **Path Validation**: All file paths validated through PathValidator
3. **No Credential Exposure**: Git operations use public repos only
4. **Timeout Protection**: All operations have timeouts to prevent hanging
5. **Cleanup Guarantee**: Temporary files cleaned up even on failure

---

## Performance Monitoring

Add logging to track:
- Search query duration
- API response times
- Installation duration by stage
- Error rates by error type
- Temporary file cleanup success rate

---

## Versioning

- **Current Version**: 1.0.0
- **Breaking Changes**: Require major version bump
- **New Channels**: Minor version bump
- **Bug Fixes**: Patch version bump

All changes to this contract must be versioned and documented.
