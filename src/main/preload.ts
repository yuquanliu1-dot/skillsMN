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
  PrivateRepo,
  PrivateSkill,
  SearchResult,
  RateLimitInfo,
  CuratedSource,
  InstallProgress,
  AIConfiguration,
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

  getAIConfiguration: (): Promise<IPCResponse<AIConfiguration>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_GET);
  },

  saveAIConfiguration: (config: AIConfiguration): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_SAVE, { config });
  },

  testAIConnection: (): Promise<IPCResponse<{ success: boolean; latency?: number }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_TEST_AI);
  },

  // ============================================================================
  // Private Repository Operations (Feature 005)
  // ============================================================================

  addPrivateRepo: (params: {
    url: string;
    pat: string;
    displayName?: string;
  }): Promise<IPCResponse<PrivateRepo>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_ADD, params);
  },

  listPrivateRepos: (): Promise<IPCResponse<PrivateRepo[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_LIST);
  },

  getPrivateRepo: (repoId: string): Promise<IPCResponse<PrivateRepo | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_GET, { repoId });
  },

  updatePrivateRepo: (repoId: string, updates: Partial<PrivateRepo>): Promise<IPCResponse<PrivateRepo>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_UPDATE, { repoId, updates });
  },

  removePrivateRepo: (repoId: string): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_REMOVE, { repoId });
  },

  testPrivateRepoConnection: (repoId: string): Promise<IPCResponse<{
    valid: boolean;
    repository?: {
      name: string;
      description: string;
      defaultBranch: string;
    };
    error?: string;
  }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_TEST_CONNECTION, { repoId });
  },

  getPrivateRepoSkills: (repoId: string): Promise<IPCResponse<PrivateSkill[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_GET_SKILLS, { repoId });
  },

  searchPrivateRepoSkills: (params: {
    repoId: string;
    query: string;
  }): Promise<IPCResponse<PrivateSkill[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_SEARCH_SKILLS, params);
  },

  installPrivateSkill: (params: {
    repoId: string;
    skillPath: string;
    targetDirectory: 'project' | 'global';
    conflictResolution?: 'overwrite' | 'rename' | 'skip';
  }): Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_INSTALL_SKILL, params);
  },

  checkPrivateSkillUpdates: (): Promise<IPCResponse<Map<string, { hasUpdate: boolean }>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_CHECK_UPDATES);
  },

  updatePrivateSkill: (params: {
    skillPath: string;
    createBackup?: boolean;
  }): Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_UPDATE_SKILL, params);
  },

  // ============================================================================
  // GitHub Operations (Feature 004 - Public Skill Discovery)
  // ============================================================================

  searchGitHub: (
    query: string,
    page?: number
  ): Promise<IPCResponse<{
    results: SearchResult[];
    totalCount: number;
    incomplete: boolean;
    rateLimit: RateLimitInfo;
  }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_SEARCH_SKILLS, { query, page });
  },

  previewGitHubSkill: (downloadUrl: string): Promise<IPCResponse<{ content: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_PREVIEW_SKILL, { downloadUrl });
  },

  installGitHubSkill: (params: {
    repositoryName: string;
    skillFilePath: string;
    downloadUrl: string;
    targetDirectory: 'project' | 'global';
    conflictResolution?: 'overwrite' | 'rename' | 'skip';
    applyToAll?: boolean;
  }): Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_INSTALL_SKILL, params);
  },

  setGitHubConflictPreference: (resolution: 'overwrite' | 'rename' | 'skip'): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_SET_CONFLICT_PREFERENCE, { resolution });
  },

  clearGitHubConflictPreference: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_CLEAR_CONFLICT_PREFERENCE);
  },

  getCuratedSources: (): Promise<IPCResponse<{ sources: CuratedSource[] }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_GET_CURATED_SOURCES);
  },

  getSkillsFromSource: (params: {
    repositoryUrl: string;
    page?: number;
  }): Promise<IPCResponse<{ results: SearchResult[]; totalCount: number; hasMore: boolean }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_GET_SKILLS_FROM_SOURCE, params);
  },

  cancelGitHubInstall: (params: {
    skillName: string;
    repositoryFullName: string;
  }): Promise<IPCResponse<{ cancelled: boolean; cleanedUp: boolean }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GITHUB_CANCEL_INSTALL, params);
  },

  onGitHubInstallProgress: (callback: (event: any, progress: InstallProgress) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.GITHUB_INSTALL_PROGRESS, callback);
  },

  removeGitHubInstallProgressListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.GITHUB_INSTALL_PROGRESS);
  },
});

// Log successful preload
console.log('Preload script executed successfully');
