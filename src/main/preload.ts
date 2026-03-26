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
  SearchSkillResult,
  InstallFromRegistryRequest,
  SkillInstallationStatus,
  InstallProgressEvent,
  SkillSymlinkConfig,
  MigrationOptions,
  MigrationProgress,
  MigrationResult,
  VersionComparison,
  AgentTool,
  AIConversation,
  SkillFileTreeNode,
  SkillFileContent,
  NormalizedMessage,
  PermissionDecision,
  PendingPermissionRequest,
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

  createSkill: (name: string): Promise<IPCResponse<Skill>> => {
    // Skills are always created in the centralized application directory
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_CREATE, { name, directory: 'application' });
  },

  copySkill: (sourcePath: string, newName: string): Promise<IPCResponse<Skill>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_COPY, { sourcePath, newName });
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

  checkForUpdates: (
    skills: Skill[]
  ): Promise<IPCResponse<Record<string, VersionComparison>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_CHECK_UPDATES, { skills });
  },

  updateSkillFromSource: (
    skillPath: string,
    createBackup: boolean = true
  ): Promise<IPCResponse<{ newPath: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_UPDATE_SKILL, { skillPath, createBackup });
  },

  getSkillFileTree: (skillPath: string): Promise<IPCResponse<SkillFileTreeNode>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_FILE_TREE, { skillPath });
  },

  readSkillFile: (filePath: string): Promise<IPCResponse<SkillFileContent>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SKILL_FILE_READ, { filePath });
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

  selectDirectory: (): Promise<IPCResponse<{ canceled: boolean; filePaths: string[] }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY);
  },

  checkClaudeInstall: (): Promise<IPCResponse<{ installed: boolean; version?: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_CHECK_INSTALL);
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
    console.log('[Preload] onFSChange: Registering listener for', IPC_CHANNELS.FS_CHANGE);
    ipcRenderer.on(IPC_CHANNELS.FS_CHANGE, (_event, change) => {
      console.log('[Preload] Received FS_CHANGE event:', change);
      callback(change as FSEvent);
    });
  },

  removeFSChangeListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.FS_CHANGE);
  },

  // ============================================================================
  // AI Operations (extended - Permission & Session management)
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

  onAIMessage: (callback: (event: any, message: NormalizedMessage) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.AI_MESSAGE, callback);
  },

  removeAIChunkListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.AI_CHUNK);
  },

  removeAIMessageListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.AI_MESSAGE);
  },

  getAIConfiguration: (): Promise<IPCResponse<AIConfiguration>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_GET);
  },

  saveAIConfiguration: (config: AIConfiguration): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_SAVE, { config });
  },

  testAIConnection: (config?: AIConfiguration): Promise<IPCResponse<{ success: boolean; latency?: number }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_TEST, { config });
  },

  // Permission & Session Management
  abortAISession: (sessionId: string): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_ABORT_SESSION, { sessionId });
  },

  checkSessionStatus: (sessionId: string): Promise<IPCResponse<{
    isActive: boolean;
    pendingPermissions: any[];
  }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CHECK_SESSION_STATUS, { sessionId });
  },

  getActiveSessions: (): Promise<IPCResponse<string[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_GET_ACTIVE_SESSIONS);
  },

  resolvePermission: (params: {
    requestId: string;
    decision: PermissionDecision;
  }): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_RESOLVE_PERMISSION, params);
  },

  getPendingPermissions: (sessionId?: string): Promise<IPCResponse<any[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_GET_PENDING_PERMISSIONS, { sessionId });
  },

  reconnectSession: (sessionId: string): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_RECONNECT_SESSION, { sessionId });
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

  installPrivateRepoSkill: (params: {
    repoId: string;
    skillPath: string;
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

  getPrivateRepoSkillContent: (repoId: string, skillPath: string): Promise<IPCResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_GET_SKILL_CONTENT, { repoId, skillPath });
  },

  uploadSkillToPrivateRepo: (params: {
    repoId: string;
    skillPath: string;
    skillContent: string;
    skillName: string;
    commitMessage?: string;
  }): Promise<IPCResponse<{ sha: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRIVATE_REPO_UPLOAD_SKILL, params);
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

  // ============================================================================
  // Registry Operations (Feature 006 - Skills Registry Search)
  // ============================================================================

  searchRegistry: (
    query: string,
    limit?: number
  ): Promise<IPCResponse<SearchSkillResult[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REGISTRY_SEARCH, { query, limit });
  },

  installFromRegistry: (
    request: InstallFromRegistryRequest,
    targetDirectory: string
  ): Promise<IPCResponse<{ success: boolean; skillPath?: string; error?: string }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REGISTRY_INSTALL, { request, targetDirectory });
  },

  checkSkillInstalled: (
    skillId: string,
    targetDirectory: string
  ): Promise<IPCResponse<SkillInstallationStatus>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REGISTRY_CHECK_INSTALLED, { skillId, targetDirectory });
  },

  getRegistrySkillContent: (
    source: string,
    skillId: string
  ): Promise<IPCResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REGISTRY_GET_CONTENT, { source, skillId });
  },

  onInstallProgress: (callback: (event: any, progress: InstallProgressEvent) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.REGISTRY_INSTALL_PROGRESS, callback);
  },

  removeInstallProgressListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.REGISTRY_INSTALL_PROGRESS);
  },

  // ============================================================================
  // Symlink Operations
  // ============================================================================

  updateSymlink: (params: {
    skillName: string;
    config: SkillSymlinkConfig;
  }): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_UPDATE, params);
  },

  getSymlinkStatus: (skillName: string): Promise<IPCResponse<SkillSymlinkConfig | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_GET_STATUS, { skillName });
  },

  getClaudeDirectories: (): Promise<IPCResponse<string[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_GET_CLAUDE_DIRS);
  },

  getInstalledTools: (): Promise<IPCResponse<AgentTool[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_GET_INSTALLED_TOOLS);
  },

  updateSymlinkTarget: (params: {
    skillName: string;
    skillPath: string;
    toolId: string;
    enabled: boolean;
  }): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_UPDATE_TARGET, params);
  },

  getMultiSymlinkStatus: (skillName: string): Promise<IPCResponse<Record<string, boolean>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYMLINK_GET_MULTI_STATUS, { skillName });
  },

  // ============================================================================
  // Migration Operations
  // ============================================================================

  checkMigrationNeeded: (): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MIGRATION_CHECK_NEEDED);
  },

  detectExistingSkills: (): Promise<IPCResponse<{
    global: Skill[];
    project: Skill[];
  }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MIGRATION_DETECT_SKILLS);
  },

  startMigration: (params: {
    skills: Skill[];
    options: MigrationOptions;
  }): Promise<IPCResponse<MigrationResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MIGRATION_START, params);
  },

  onMigrationProgress: (callback: (event: any, progress: MigrationProgress) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.MIGRATION_PROGRESS, callback);
  },

  removeMigrationProgressListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.MIGRATION_PROGRESS);
  },

  checkDirectoryForSkills: (directoryPath: string): Promise<IPCResponse<Skill[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MIGRATION_CHECK_DIRECTORY, { directoryPath });
  },

  // ============================================================================
  // AI Conversation History Operations
  // ============================================================================

  saveAIConversation: (conversation: AIConversation): Promise<IPCResponse<AIConversation>> => {
    return ipcRenderer.invoke('ai-conversation:save', conversation);
  },

  loadAIConversations: (): Promise<IPCResponse<AIConversation[]>> => {
    return ipcRenderer.invoke('ai-conversation:load-all');
  },

  getAIConversation: (conversationId: string): Promise<IPCResponse<AIConversation | null>> => {
    return ipcRenderer.invoke('ai-conversation:get', conversationId);
  },

  deleteAIConversation: (conversationId: string): Promise<IPCResponse<void>> => {
    return ipcRenderer.invoke('ai-conversation:delete', conversationId);
  },
});

// Log successful preload
console.log('Preload script executed successfully');
