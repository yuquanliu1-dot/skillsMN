# IPC Contracts: Local Skill Management

**Date**: 2026-03-09
**Feature**: 002-local-skill-management

This document defines the Inter-Process Communication (IPC) contracts between the Electron main process (backend) and renderer process (frontend). All IPC communication must adhere to these contracts to ensure type safety and security.

## Contract Principles

1. **Security**: All file operations occur in the main process
2. **Type Safety**: All channels have strict TypeScript interfaces
3. **Error Handling**: All responses include error states
4. **Performance**: All operations are asynchronous to prevent UI blocking
5. **Validation**: All inputs are validated before processing

## Common Types

```typescript
// src/shared/types.ts

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Skill {
  path: string;
  name: string;
  description?: string;
  source: 'project' | 'global';
  lastModified: Date;
  resourceCount: number;
}

export interface Configuration {
  projectDirectory: string | null;
  defaultInstallDirectory: 'project' | 'global';
  editorDefaultMode: 'edit' | 'preview';
  autoRefresh: boolean;
}
```

## Skill Operations

### `skill:list`

List all skills from project and global directories.

**Channel**: `skill:list`

**Request Payload**:
```typescript
// No payload - uses configuration to determine directories
void
```

**Response**:
```typescript
IPCResponse<Skill[]>
```

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "path": "/Users/user/.claude/skills/my-skill",
      "name": "My Skill",
      "description": "A useful skill",
      "source": "global",
      "lastModified": "2026-03-09T10:30:00Z",
      "resourceCount": 3
    }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Project directory not configured. Run setup first."
}
```

**Errors**:
- Project directory not configured
- Project directory does not exist
- Permission denied reading skill directories

**Main Handler**:
```typescript
// src/main/ipc/skillHandlers.ts
ipcMain.handle('skill:list', async (): Promise<IPCResponse<Skill[]>> => {
  try {
    const config = await ConfigService.load();
    const skills = await SkillService.listAllSkills(config);
    return { success: true, data: skills };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `skill:get`

Get a single skill's content.

**Channel**: `skill:get`

**Request Payload**:
```typescript
{
  path: string;  // Absolute path to skill directory
}
```

**Response**:
```typescript
IPCResponse<{
  metadata: Skill;
  content: string;  // Full content of skill.md file
}>
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "metadata": {
      "path": "/Users/user/.claude/skills/my-skill",
      "name": "My Skill",
      "description": "A useful skill",
      "source": "global",
      "lastModified": "2026-03-09T10:30:00Z",
      "resourceCount": 3
    },
    "content": "---\nname: My Skill\ndescription: A useful skill\n---\n\n# My Skill\n\nContent here..."
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Skill not found: /path/to/skill. The directory may have been deleted."
}
```

**Errors**:
- Skill not found (directory does not exist)
- Path validation failed (path traversal attempt)
- Permission denied reading skill file
- Invalid YAML frontmatter (returns content with warning)

**Main Handler**:
```typescript
ipcMain.handle('skill:get', async (event, { path }: { path: string }) => {
  try {
    const validatedPath = pathValidator.validate(path);
    const skill = await SkillService.getSkill(validatedPath);
    return { success: true, data: skill };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `skill:create`

Create a new skill directory with template.

**Channel**: `skill:create`

**Request Payload**:
```typescript
{
  name: string;           // Display name for the skill
  directory: 'project' | 'global';  // Where to create the skill
}
```

**Response**:
```typescript
IPCResponse<Skill>  // Returns created skill metadata
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "path": "/Users/user/.claude/skills/my-new-skill",
    "name": "My New Skill",
    "description": "",
    "source": "global",
    "lastModified": "2026-03-09T10:35:00Z",
    "resourceCount": 0
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Skill already exists: my-new-skill. Choose a different name."
}
```

**Errors**:
- Skill with same name already exists
- Project directory not configured (for project skills)
- Permission denied creating directory
- Invalid skill name (contains invalid characters)

**Implementation Notes**:
- Directory name is kebab-case of display name
- Template includes YAML frontmatter with name and description placeholders
- Creates directory atomically (fails if exists)

**Main Handler**:
```typescript
ipcMain.handle('skill:create', async (event, { name, directory }) => {
  try {
    const skill = await SkillService.createSkill(name, directory);
    return { success: true, data: skill };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `skill:update`

Update a skill's content.

**Channel**: `skill:update`

**Request Payload**:
```typescript
{
  path: string;     // Absolute path to skill directory
  content: string;  // New content for skill.md file
}
```

**Response**:
```typescript
IPCResponse<Skill>  // Returns updated skill metadata
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "path": "/Users/user/.claude/skills/my-skill",
    "name": "Updated Skill Name",
    "description": "Updated description",
    "source": "global",
    "lastModified": "2026-03-09T10:40:00Z",
    "resourceCount": 3
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "File modified externally. Reload the skill or overwrite changes."
}
```

**Errors**:
- Skill not found
- Path validation failed
- File modified externally (optional: can be bypassed with force flag)
- Permission denied writing file
- Invalid YAML frontmatter in new content

**Implementation Notes**:
- Checks file modification timestamp before saving
- Updates lastModified timestamp after save
- Re-parses YAML frontmatter to update metadata
- Returns updated skill metadata

**Main Handler**:
```typescript
ipcMain.handle('skill:update', async (event, { path, content }) => {
  try {
    const validatedPath = pathValidator.validate(path);
    const skill = await SkillService.updateSkill(validatedPath, content);
    return { success: true, data: skill };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `skill:delete`

Delete a skill (move to recycle bin).

**Channel**: `skill:delete`

**Request Payload**:
```typescript
{
  path: string;  // Absolute path to skill directory
}
```

**Response**:
```typescript
IPCResponse<void>
```

**Success Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Permission denied: Cannot delete skill. Check directory permissions."
}
```

**Errors**:
- Skill not found
- Path validation failed
- Permission denied
- Recycle bin operation failed

**Implementation Notes**:
- Moves entire directory to system recycle bin
- Not permanent deletion (recoverable)
- Logs deletion for audit trail

**Main Handler**:
```typescript
ipcMain.handle('skill:delete', async (event, { path }) => {
  try {
    const validatedPath = pathValidator.validate(path);
    await SkillService.deleteSkill(validatedPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `skill:open-folder`

Open skill directory in file explorer.

**Channel**: `skill:open-folder`

**Request Payload**:
```typescript
{
  path: string;  // Absolute path to skill directory
}
```

**Response**:
```typescript
IPCResponse<void>
```

**Success Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Cannot open folder: Directory does not exist."
}
```

**Errors**:
- Directory not found
- Path validation failed
- Failed to open file explorer

**Implementation Notes**:
- Uses Electron's `shell.openPath()` API
- Opens native file explorer (Finder, Explorer, Nautilus)
- Validates path before opening

**Main Handler**:
```typescript
ipcMain.handle('skill:open-folder', async (event, { path }) => {
  try {
    const validatedPath = pathValidator.validate(path);
    await shell.openPath(validatedPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

## Configuration Operations

### `config:load`

Load user configuration.

**Channel**: `config:load`

**Request Payload**:
```typescript
void
```

**Response**:
```typescript
IPCResponse<Configuration>
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "projectDirectory": "/Users/user/projects/my-project",
    "defaultInstallDirectory": "project",
    "editorDefaultMode": "edit",
    "autoRefresh": true
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to read configuration file. Check app data directory permissions."
}
```

**Errors**:
- Configuration file corrupted (returns defaults with warning)
- Permission denied reading configuration

**Implementation Notes**:
- Returns defaults if configuration file does not exist
- Validates configuration on load
- Stores in Electron's app.getPath('userData')

**Main Handler**:
```typescript
ipcMain.handle('config:load', async (): Promise<IPCResponse<Configuration>> => {
  try {
    const config = await ConfigService.load();
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `config:save`

Save user configuration.

**Channel**: `config:save`

**Request Payload**:
```typescript
{
  config: Partial<Configuration>;  // Partial update
}
```

**Response**:
```typescript
IPCResponse<Configuration>  // Returns updated configuration
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "projectDirectory": "/Users/user/projects/new-project",
    "defaultInstallDirectory": "global",
    "editorDefaultMode": "edit",
    "autoRefresh": true
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid project directory: /path/to/dir. Directory must contain a .claude folder."
}
```

**Errors**:
- Invalid project directory (no .claude folder)
- Invalid configuration values
- Permission denied writing configuration

**Implementation Notes**:
- Merges with existing configuration
- Validates all fields before saving
- Atomically writes to configuration file

**Main Handler**:
```typescript
ipcMain.handle('config:save', async (event, { config }) => {
  try {
    const updated = await ConfigService.save(config);
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

## File System Events

### `fs:watch-start`

Start watching skill directories for changes.

**Channel**: `fs:watch-start`

**Request Payload**:
```typescript
void  // Uses configuration to determine directories
```

**Response**:
```typescript
IPCResponse<void>
```

**Success Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Project directory not configured. Cannot start watching."
}
```

**Errors**:
- Project directory not configured
- Permission denied accessing directories

**Events Sent to Renderer**:
When file system changes are detected, the main process sends events to the renderer:

```typescript
// Main → Renderer event
event.sender.send('fs:change', {
  type: 'add' | 'change' | 'unlink',
  path: string,
  directory: 'project' | 'global'
});
```

**Implementation Notes**:
- Uses chokidar for cross-platform file watching
- Debounces rapid changes (200ms threshold)
- Watches both project and global directories
- Ignores dotfiles and temporary files

**Main Handler**:
```typescript
ipcMain.handle('fs:watch-start', async (event) => {
  try {
    const config = await ConfigService.load();
    await FileWatcher.start(config, (change) => {
      event.sender.send('fs:change', change);
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

### `fs:watch-stop`

Stop watching skill directories.

**Channel**: `fs:watch-stop`

**Request Payload**:
```typescript
void
```

**Response**:
```typescript
IPCResponse<void>
```

**Success Response**:
```json
{
  "success": true
}
```

**Errors**:
- No watchers running (returns success anyway)

**Main Handler**:
```typescript
ipcMain.handle('fs:watch-stop', async () => {
  try {
    await FileWatcher.stop();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: ErrorHandler.format(error)
    };
  }
});
```

---

## Preload Script

The preload script exposes a type-safe API to the renderer process:

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { Configuration, Skill, IPCResponse } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Skill operations
  listSkills: (): Promise<IPCResponse<Skill[]>> =>
    ipcRenderer.invoke('skill:list'),

  getSkill: (path: string): Promise<IPCResponse<{ metadata: Skill; content: string }>> =>
    ipcRenderer.invoke('skill:get', { path }),

  createSkill: (name: string, directory: 'project' | 'global'): Promise<IPCResponse<Skill>> =>
    ipcRenderer.invoke('skill:create', { name, directory }),

  updateSkill: (path: string, content: string): Promise<IPCResponse<Skill>> =>
    ipcRenderer.invoke('skill:update', { path, content }),

  deleteSkill: (path: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('skill:delete', { path }),

  openFolder: (path: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('skill:open-folder', { path }),

  // Configuration operations
  loadConfig: (): Promise<IPCResponse<Configuration>> =>
    ipcRenderer.invoke('config:load'),

  saveConfig: (config: Partial<Configuration>): Promise<IPCResponse<Configuration>> =>
    ipcRenderer.invoke('config:save', { config }),

  // File system watching
  startWatching: (): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('fs:watch-start'),

  stopWatching: (): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('fs:watch-stop'),

  // Event listeners
  onFSChange: (callback: (change: any) => void) => {
    ipcRenderer.on('fs:change', (event, change) => callback(change));
  },

  removeFSChangeListener: () => {
    ipcRenderer.removeAllListeners('fs:change');
  },
});
```

## Frontend IPC Client

The frontend uses a typed client for IPC communication:

```typescript
// src/renderer/services/ipcClient.ts
import type { Configuration, Skill, IPCResponse } from '../../shared/types';

export const ipcClient = {
  // Skill operations
  async listSkills(): Promise<Skill[]> {
    const response = await window.electronAPI.listSkills();
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async getSkill(path: string): Promise<{ metadata: Skill; content: string }> {
    const response = await window.electronAPI.getSkill(path);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async createSkill(name: string, directory: 'project' | 'global'): Promise<Skill> {
    const response = await window.electronAPI.createSkill(name, directory);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async updateSkill(path: string, content: string): Promise<Skill> {
    const response = await window.electronAPI.updateSkill(path, content);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async deleteSkill(path: string): Promise<void> {
    const response = await window.electronAPI.deleteSkill(path);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  async openFolder(path: string): Promise<void> {
    const response = await window.electronAPI.openFolder(path);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  // Configuration operations
  async loadConfig(): Promise<Configuration> {
    const response = await window.electronAPI.loadConfig();
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async saveConfig(config: Partial<Configuration>): Promise<Configuration> {
    const response = await window.electronAPI.saveConfig(config);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // File system watching
  async startWatching(): Promise<void> {
    const response = await window.electronAPI.startWatching();
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  async stopWatching(): Promise<void> {
    const response = await window.electronAPI.stopWatching();
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  onFSChange(callback: (change: any) => void): void {
    window.electronAPI.onFSChange(callback);
  },

  removeFSChangeListener(): void {
    window.electronAPI.removeFSChangeListener();
  },
};
```

## Type Definitions for Renderer

```typescript
// src/renderer/types/electron.d.ts
import type { Configuration, Skill, IPCResponse } from '../../shared/types';

export interface ElectronAPI {
  listSkills(): Promise<IPCResponse<Skill[]>>;
  getSkill(path: string): Promise<IPCResponse<{ metadata: Skill; content: string }>>;
  createSkill(name: string, directory: 'project' | 'global'): Promise<IPCResponse<Skill>>;
  updateSkill(path: string, content: string): Promise<IPCResponse<Skill>>;
  deleteSkill(path: string): Promise<IPCResponse<void>>;
  openFolder(path: string): Promise<IPCResponse<void>>;
  loadConfig(): Promise<IPCResponse<Configuration>>;
  saveConfig(config: Partial<Configuration>): Promise<IPCResponse<Configuration>>;
  startWatching(): Promise<IPCResponse<void>>;
  stopWatching(): Promise<IPCResponse<void>>;
  onFSChange(callback: (change: any) => void): void;
  removeFSChangeListener(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

## Security Considerations

1. **Path Validation**: All paths are validated in the main process before file operations
2. **No Direct Access**: Renderer cannot access Node.js APIs or file system directly
3. **Type Safety**: TypeScript ensures contract compliance
4. **Error Sanitization**: Sensitive information is not exposed in error messages
5. **Audit Logging**: All file operations are logged for security auditing

## Performance Requirements

All IPC operations must meet these latency targets:
- `skill:list`: <2 seconds (for 500 skills)
- `skill:get`: <100ms
- `skill:create`: <100ms
- `skill:update`: <100ms
- `skill:delete`: <200ms
- `config:load`: <50ms
- `config:save`: <50ms
- File system events: <500ms from change to UI update
