/**
 * Electron API Type Definitions for Renderer Process
 */

import type {
  Configuration,
  Skill,
  IPCResponse,
  FSEvent,
  AIGenerationRequest,
  PrivateRepo,
  PrivateSkill,
  AIConfiguration,
  SearchSkillResult,
  InstallFromRegistryRequest,
  InstallProgressEvent,
  SkillSymlinkConfig,
  MigrationOptions,
  MigrationProgress,
  MigrationResult,
} from '../../shared/types';

export interface ElectronAPI {
  // Skill Operations
  listSkills: (config?: Configuration) => Promise<IPCResponse<Skill[]>>;
  getSkill: (path: string) => Promise<IPCResponse<{ metadata: Skill; content: string }>>;
  createSkill: (name: string) => Promise<IPCResponse<Skill>>;
  updateSkill: (
    path: string,
    content: string,
    expectedLastModified?: number
  ) => Promise<IPCResponse<Skill>>;
  deleteSkill: (path: string) => Promise<IPCResponse<void>>;
  openFolder: (path: string) => Promise<IPCResponse<void>>;
  checkForUpdates: (
    skills: Skill[]
  ) => Promise<IPCResponse<Record<string, { hasUpdate: boolean; remoteSHA?: string }>>>;
  updateSkillFromSource: (
    skillPath: string,
    createBackup?: boolean
  ) => Promise<IPCResponse<{ newPath: string }>>;

  // Dialog Operations
  selectDirectory: () => Promise<IPCResponse<{ canceled: boolean; filePaths: string[] }>>;

  // Configuration Operations
  loadConfig: () => Promise<IPCResponse<Configuration>>;
  saveConfig: (config: Partial<Configuration>) => Promise<IPCResponse<Configuration>>;
  checkClaudeInstall: () => Promise<IPCResponse<{ installed: boolean; version?: string }>>;

  // File System Watching
  startWatching: () => Promise<IPCResponse<void>>;
  stopWatching: () => Promise<IPCResponse<void>>;
  onFSChange: (callback: (event: FSEvent) => void) => void;
  removeFSChangeListener: () => void;

  // AI Operations
  generateAI: (params: {
    requestId: string;
    request: AIGenerationRequest;
  }) => Promise<IPCResponse<void>>;
  cancelAI: (requestId: string) => Promise<IPCResponse<void>>;
  onAIChunk: (callback: (event: any, chunk: any) => void) => void;
  removeAIChunkListener: () => void;
  getAIConfiguration: () => Promise<IPCResponse<AIConfiguration>>;
  saveAIConfiguration: (config: AIConfiguration) => Promise<IPCResponse<void>>;
  testAIConnection: (config?: AIConfiguration) => Promise<IPCResponse<{ success: boolean; latency?: number }>>;

  // Private Repository Operations
  addPrivateRepo: (params: {
    url: string;
    pat: string;
    displayName?: string;
    provider?: 'github' | 'gitlab';
    instanceUrl?: string;
  }) => Promise<IPCResponse<PrivateRepo>>;
  listPrivateRepos: () => Promise<IPCResponse<PrivateRepo[]>>;
  getPrivateRepo: (repoId: string) => Promise<IPCResponse<PrivateRepo | null>>;
  updatePrivateRepo: (repoId: string, updates: Partial<PrivateRepo>) => Promise<IPCResponse<PrivateRepo>>;
  removePrivateRepo: (repoId: string) => Promise<IPCResponse<void>>;
  testPrivateRepoConnection: (repoId: string) => Promise<
    IPCResponse<{
      valid: boolean;
      repository?: {
        name: string;
        description: string;
        defaultBranch: string;
      };
      error?: string;
    }>
  >;
  getPrivateRepoSkills: (repoId: string) => Promise<IPCResponse<PrivateSkill[]>>;
  searchPrivateRepoSkills: (params: {
    repoId: string;
    query: string;
  }) => Promise<IPCResponse<PrivateSkill[]>>;
  getPrivateRepoSkillContent: (repoId: string, skillPath: string) => Promise<IPCResponse<string>>;
  uploadSkillToPrivateRepo: (params: {
    repoId: string;
    skillPath: string;
    skillContent: string;
    skillName: string;
    commitMessage?: string;
  }) => Promise<IPCResponse<{ sha: string }>>;
  installPrivateRepoSkill: (params: {
    repoId: string;
    skillPath: string;
    conflictResolution?: 'overwrite' | 'rename' | 'skip';
  }) => Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>>;
  checkPrivateSkillUpdates: () => Promise<IPCResponse<Map<string, { hasUpdate: boolean }>>>;
  updatePrivateSkill: (params: {
    skillPath: string;
    createBackup?: boolean;
  }) => Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>>;

  // GitHub Operations (Feature 004 - Public Skill Discovery)
  searchGitHub: (
    query: string,
    page?: number
  ) => Promise<IPCResponse<{
    results: SearchResult[];
    totalCount: number;
    incomplete: boolean;
    rateLimit: RateLimitInfo;
  }>>;
  previewGitHubSkill: (downloadUrl: string) => Promise<IPCResponse<{ content: string }>>;
  installGitHubSkill: (params: {
    repositoryName: string;
    skillFilePath: string;
    downloadUrl: string;
    targetDirectory: 'project' | 'global';
    conflictResolution?: 'overwrite' | 'rename' | 'skip';
    applyToAll?: boolean;
  }) => Promise<IPCResponse<{ success: boolean; newPath?: string; error?: string }>>;
  setGitHubConflictPreference: (resolution: 'overwrite' | 'rename' | 'skip') => Promise<void>;
  clearGitHubConflictPreference: () => Promise<void>;
  getCuratedSources: () => Promise<IPCResponse<{ sources: CuratedSource[] }>>;
  getSkillsFromSource: (params: {
    repositoryUrl: string;
    page?: number;
  }) => Promise<IPCResponse<{ results: SearchResult[]; totalCount: number; hasMore: boolean }>>;
  cancelGitHubInstall: (params: {
    skillName: string;
    repositoryFullName: string;
  }) => Promise<IPCResponse<{ cancelled: boolean; cleanedUp: boolean }>>;
  onGitHubInstallProgress: (callback: (event: any, progress: InstallProgress) => void) => void;
  removeGitHubInstallProgressListener: () => void;

  // Registry Operations (Feature 006 - Skills Registry Search)
  searchRegistry: (query: string, limit?: number) => Promise<IPCResponse<SearchSkillResult[]>>;
  installFromRegistry: (
    request: InstallFromRegistryRequest,
    targetDirectory: string
  ) => Promise<IPCResponse<{ success: boolean; skillPath?: string; error?: string; errorCode?: string }>>;
  checkSkillInstalled: (
    skillId: string,
    targetDirectory: string
  ) => Promise<IPCResponse<{ installed: boolean }>>;
  getRegistrySkillContent: (
    source: string,
    skillId: string
  ) => Promise<IPCResponse<string>>;
  onInstallProgress: (callback: (event: any, progress: InstallProgressEvent) => void) => void;
  removeInstallProgressListener: () => void;

  // Symlink Operations (Feature - Skill Storage Architecture Refactoring)
  updateSymlink: (params: {
    skillName: string;
    config: import('../../shared/types').SkillSymlinkConfig;
  }) => Promise<IPCResponse<void>>;
  getSymlinkStatus: (skillName: string) => Promise<IPCResponse<import('../../shared/types').SkillSymlinkConfig | null>>;
  getClaudeDirectories: () => Promise<IPCResponse<string[]>>;

  // Migration Operations (Feature - Skill Storage Architecture Refactoring)
  checkMigrationNeeded: () => Promise<IPCResponse<boolean>>;
  detectExistingSkills: () => Promise<IPCResponse<{
    global: Skill[];
    project: Skill[];
  }>>;
  startMigration: (params: {
    skills: Skill[];
    options: import('../../shared/types').MigrationOptions;
  }) => Promise<IPCResponse<import('../../shared/types').MigrationResult>>;
  onMigrationProgress: (callback: (event: any, progress: import('../../shared/types').MigrationProgress) => void) => void;
  removeMigrationProgressListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
