/**
 * Preload Script
 *
 * Provides secure IPC communication between renderer and main processes
 * using contextBridge to expose a limited API surface
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  Configuration,
  Skill,
  IPCResponse,
  FSEvent,
  SkillSource,
  AIGenerationRequest,
} from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================================================
  // Skill Operations
  // ============================================================================

  listSkills: (config?: Configuration): Promise<IPCResponse<Skill[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST, { config });
  },

  getSkill: (path: string): Promise<IPCResponse<{ metadata: Skill; content: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_GET, { path });
  },

  createSkill: (
    name: string,
    directory: SkillSource
  ): Promise<IPCResponse<Skill>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_CREATE, { name, directory });
  },

  updateSkill: (
    path: string,
    content: string,
    expectedLastModified?: number
  ): Promise<IPCResponse<Skill>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_UPDATE, { path, content, expectedLastModified });
  },

  deleteSkill: (path: string): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_DELETE, { path });
  },

  openFolder: (path: string): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_OPEN_FOLDER, { path });
  },

  // ============================================================================
  // Configuration Operations
  // ============================================================================

  loadConfig: (): Promise<IPCResponse<Configuration>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD);
  },

  saveConfig: (
    config: Partial<Configuration>
  ): Promise<IPCResponse<Configuration>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE, { config });
  },

  // ============================================================================
  // File System Watching
  // ============================================================================

  startWatching: (): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_WATCH_START);
  },

  stopWatching: (): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_WATCH_STOP);
  },

  onFSChange: (callback: (event: FSEvent) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.FS_CHANGE, (_event, change) => {
      callback(change as FSEvent);
    });
  },

  removeFSChangeListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.FS_CHANGE);
  },

  // ============================================================================
  // AI Operations
  // ============================================================================

  generateAI: (params: {
    requestId: string;
    request: AIGenerationRequest;
  }): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE, params);
  },

  cancelAI: (requestId: string): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CANCEL, { requestId });
  },

  onAIChunk: (callback: (event: any, chunk: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.AI_CHUNK, callback);
  },

  removeAIChunkListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.AI_CHUNK);
  },
});

// Log successful preload
console.log('Preload script executed successfully');
