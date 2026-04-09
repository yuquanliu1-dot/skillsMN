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
  VersionComparison,
  RateLimitInfo,
  CuratedSource,
  SearchResult,
  InstallProgress,
  AgentTool,
  SkillFileTreeNode,
  SkillFileContent,
  NormalizedMessage,
  PermissionDecision,
  PendingPermissionRequest,
  SkillGroup,
  RepoContributionStats,
  UserBadge,
  DetectedSkill,
  ImportOptions,
  ImportProgress,
  ImportResult,
  UrlScanResult,
} from '../../shared/types';
import type { BadgeDefinition } from '../../shared/types';

export interface ElectronAPI {
  // Skill Operations
  listSkills: (config?: Configuration) => Promise<IPCResponse<Skill[]>>;
  getSkill: (path: string) => Promise<IPCResponse<{ metadata: Skill; content: string }>>;
  createSkill: (name: string) => Promise<IPCResponse<Skill>>;
  copySkill: (sourcePath: string, newName: string) => Promise<IPCResponse<Skill>>;
  updateSkill: (
    path: string,
    content: string,
    expectedLastModified?: number
  ) => Promise<IPCResponse<Skill>>;
  deleteSkill: (path: string) => Promise<IPCResponse<void>>;
  openFolder: (path: string) => Promise<IPCResponse<void>>;
  checkForUpdates: (
    skills: Skill[]
  ) => Promise<IPCResponse<Record<string, VersionComparison>>>;
  updateSkillFromSource: (
    skillPath: string
  ) => Promise<IPCResponse<{ newPath: string }>>;
  getSkillFileTree: (skillPath: string) => Promise<IPCResponse<SkillFileTreeNode>>;
  readSkillFile: (filePath: string) => Promise<IPCResponse<SkillFileContent>>;
  writeSkillFile: (filePath: string, content: string) => Promise<IPCResponse<void>>;
  ensureSourceMetadata: (skillPath: string) => Promise<IPCResponse<void>>;

  // Dialog Operations
  selectDirectory: () => Promise<IPCResponse<{ canceled: boolean; filePaths: string[] }>>;
  selectFiles: (options?: {
    multiple?: boolean;
    filters?: string[];
  }) => Promise<IPCResponse<{ canceled: boolean; filePaths: string[] }>>;

  // Configuration Operations
  loadConfig: () => Promise<IPCResponse<Configuration>>;
  saveConfig: (config: Partial<Configuration>) => Promise<IPCResponse<Configuration>>;
  checkClaudeInstall: () => Promise<IPCResponse<{ installed: boolean; version?: string }>>;
  openClaudeInTerminal: (workingDirectory: string) => Promise<IPCResponse<void>>;

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
  onAIMessage: (callback: (event: any, message: NormalizedMessage) => void) => void;
  removeAIMessageListener: () => void;
  getAIConfiguration: () => Promise<IPCResponse<AIConfiguration>>;
  saveAIConfiguration: (config: AIConfiguration) => Promise<IPCResponse<void>>;
  testAIConnection: (config?: AIConfiguration) => Promise<IPCResponse<{ success: boolean; latency?: number }>>;

  // AI Session & Permission Management
  abortAISession: (sessionId: string) => Promise<IPCResponse<boolean>>;
  checkSessionStatus: (sessionId: string) => Promise<IPCResponse<{
    isActive: boolean;
    pendingPermissions: PendingPermissionRequest[];
  }>>;
  getActiveSessions: () => Promise<IPCResponse<string[]>>;
  resolvePermission: (params: {
    requestId: string;
    decision: PermissionDecision;
  }) => Promise<IPCResponse<boolean>>;
  getPendingPermissions: (sessionId?: string) => Promise<IPCResponse<PendingPermissionRequest[]>>;
  reconnectSession: (sessionId: string) => Promise<IPCResponse<boolean>>;

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
  getRepoReadme: (repoId: string) => Promise<IPCResponse<string>>;
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

  // Multi-Target Symlink Operations
  getInstalledTools: () => Promise<IPCResponse<AgentTool[]>>;
  updateSymlinkTarget: (params: {
    skillName: string;
    skillPath: string;
    toolId: string;
    enabled: boolean;
  }) => Promise<IPCResponse<void>>;
  getMultiSymlinkStatus: (skillName: string) => Promise<IPCResponse<Record<string, boolean>>>;

  // Migration Operations (Feature - Skill Storage Architecture Refactoring)
  checkMigrationNeeded: () => Promise<IPCResponse<boolean>>;
  detectExistingSkills: () => Promise<IPCResponse<Skill[]>>;
  startMigration: (params: {
    skills: Skill[];
    options: import('../../shared/types').MigrationOptions;
  }) => Promise<IPCResponse<import('../../shared/types').MigrationResult>>;
  onMigrationProgress: (callback: (event: any, progress: import('../../shared/types').MigrationProgress) => void) => void;
  removeMigrationProgressListener: () => void;
  checkDirectoryForSkills: (directoryPath: string) => Promise<IPCResponse<Skill[]>>;
  getMigrationTargetDirectory: () => Promise<IPCResponse<string>>;

  // AI Conversation History Operations
  saveAIConversation: (conversation: import('../../shared/types').AIConversation) => Promise<IPCResponse<import('../../shared/types').AIConversation>>;
  loadAIConversations: () => Promise<IPCResponse<import('../../shared/types').AIConversation[]>>;
  getAIConversation: (conversationId: string) => Promise<IPCResponse<import('../../shared/types').AIConversation | null>>;
  deleteAIConversation: (conversationId: string) => Promise<IPCResponse<void>>;

  // Skill Group Operations
  listSkillGroups: () => Promise<IPCResponse<SkillGroup[]>>;
  getSkillGroup: (id: string) => Promise<IPCResponse<SkillGroup>>;
  createSkillGroup: (data: Omit<SkillGroup, 'id' | 'tags' | 'createdAt' | 'updatedAt'>) => Promise<IPCResponse<SkillGroup>>;
  updateSkillGroup: (id: string, data: Partial<Omit<SkillGroup, 'id' | 'createdAt'>>) => Promise<IPCResponse<SkillGroup>>;
  deleteSkillGroup: (id: string) => Promise<IPCResponse<void>>;
  updateGroupKeywords: (groupId: string, keywords: string[]) => Promise<IPCResponse<SkillGroup>>;
  reorderSkillGroups: (groupIds: string[]) => Promise<IPCResponse<void>>;
  initDefaultSkillGroups: () => Promise<IPCResponse<{ initialized: boolean; groups: SkillGroup[] }>>;
  resetDefaultSkillGroups: () => Promise<IPCResponse<SkillGroup[]>>;
  getDefaultSkillGroups: () => Promise<IPCResponse<SkillGroup[]>>;

  // Skills Refresh Event
  onSkillsRefresh: (callback: () => void) => () => void; // Returns unsubscribe function
  removeSkillsRefreshListener: () => void; // Deprecated: use unsubscribe function

  // Contribution Stats Operations (激励徽章系统)
  getRepoContributionStats: (repoId: string) => Promise<IPCResponse<RepoContributionStats>>;
  getUserBadges: (repoId: string) => Promise<IPCResponse<{
    earned: UserBadge[];
    nextBadges: Array<{ badge: BadgeDefinition; progress: number; remaining: number }>;
  }>>;
  recordSkillInstall: (skillPath: string, repoId: string) => Promise<IPCResponse<void>>;
  setCurrentUserGitInfo: (username: string, email: string) => Promise<IPCResponse<void>>;
  getCurrentUserGitInfo: () => Promise<IPCResponse<{ username?: string; email?: string } | undefined>>;
  fetchUserInfoFromPAT: (repoId: string) => Promise<IPCResponse<{
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  }>>;
  clearContributionCache: (repoId?: string) => Promise<IPCResponse<void>>;
  getSkillInstallCount: (skillPath: string) => Promise<IPCResponse<number>>;
  getLevelInfo: (level: string) => Promise<IPCResponse<{
    level: string;
    nameKey: string;
    minScore: number;
    icon: string;
    color: string;
  }>>;
  getNextLevelInfo: (currentLevel: string) => Promise<IPCResponse<{
    level: string;
    nameKey: string;
    minScore: number;
    icon: string;
    color: string;
  } | null>>;

  // Import Operations
  scanDirectoryForImport: (dirPath: string) => Promise<IPCResponse<DetectedSkill[]>>;
  scanUrlForImport: (url: string, pat?: string) => Promise<UrlScanResult>;
  importLocalSkills: (params: {
    skills: DetectedSkill[];
    options: ImportOptions;
  }) => Promise<IPCResponse<ImportResult>>;
  importSkillsFromUrl: (params: {
    url: string;
    skillPaths: string[];
    pat?: string;
    options: ImportOptions;
  }) => Promise<IPCResponse<ImportResult>>;
  onImportProgress: (callback: (event: any, progress: ImportProgress) => void) => void;
  removeImportProgressListener: () => void;

  // Contribution Cache Cleared Event
  onContributionCacheCleared: (callback: (event: any, data: { repoId?: string }) => void) => void;
  removeContributionCacheClearedListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
