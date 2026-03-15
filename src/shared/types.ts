/**
 * Shared Type Definitions for Local Skill Management
 *
 * These types are used across main and renderer processes
 */

// ============================================================================
// Skill Types
// ============================================================================

export type SkillSource = 'project' | 'global';

export interface Skill {
  /** Canonical path to skill directory */
  path: string;
  /** Display name from YAML frontmatter or directory name */
  name: string;
  /** Skill description from YAML frontmatter */
  description?: string;
  /** Skill version from YAML frontmatter */
  version?: string;
  /** Skill author from YAML frontmatter */
  author?: string;
  /** Skill tags from YAML frontmatter */
  tags?: string[];
  /** Origin directory type */
  source: SkillSource;
  /** Last modification timestamp */
  lastModified: Date;
  /** Count of non-skill.md files in directory */
  resourceCount: number;
  /** Source repository ID for installed skills (deprecated - use sourceMetadata) */
  sourceRepoId?: string;
  /** Source repository path (owner/repo) (deprecated - use sourceMetadata) */
  sourceRepoPath?: string;
  /** Installed directory commit SHA (deprecated - use sourceMetadata) */
  installedDirectoryCommitSHA?: string;
  /** Installation timestamp (deprecated - use sourceMetadata) */
  installedAt?: Date;
  /** Source metadata for tracking skill origin and version */
  sourceMetadata?: import('../main/models/SkillSource').SkillSource;
}

export interface SkillDirectory {
  /** Canonical path to directory */
  path: string;
  /** Directory classification */
  type: SkillSource;
  /** Whether directory exists on file system */
  exists: boolean;
}

export interface SkillFrontmatter {
  /** Skill display name */
  name: string;
  /** Skill description */
  description?: string;
  /** Skill version */
  version?: string;
  /** Skill author */
  author?: string;
  /** Skill tags */
  tags?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export type InstallDirectory = 'project' | 'global';
export type EditorMode = 'edit' | 'preview';

export interface SkillEditorConfig {
  /** Editor font size */
  fontSize: number;
  /** Editor theme */
  theme: 'light' | 'dark';
  /** Auto-save enabled */
  autoSaveEnabled: boolean;
  /** Auto-save delay in milliseconds */
  autoSaveDelay: number;
  /** Show minimap */
  showMinimap: boolean;
  /** Line numbers display mode */
  lineNumbers: 'on' | 'off' | 'relative';
  /** Editor font family */
  fontFamily: string;
  /** Tab size */
  tabSize: number;
  /** Word wrap enabled */
  wordWrap: boolean;
}

export interface Configuration {
  /** Path to Claude project directory (null if not configured) */
  projectDirectory: string | null;
  /** Default location for new skills */
  defaultInstallDirectory: InstallDirectory;
  /** Default behavior when opening skills */
  editorDefaultMode: EditorMode;
  /** Auto-refresh skill list on file changes */
  autoRefresh: boolean;
  /** Skill editor configuration */
  skillEditor?: SkillEditorConfig;
}

// ============================================================================
// IPC Types
// ============================================================================

export interface IPCError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
}

export interface IPCResponse<T> {
  /** Whether operation succeeded */
  success: boolean;
  /** Response data (if success) */
  data?: T;
  /** Error object (if failed) */
  error?: IPCError;
}

/**
 * Helper functions for creating IPC responses
 */
export namespace IPCResponse {
  /**
   * Create a successful response
   */
  export function success<T>(data: T): IPCResponse<T> {
    return { success: true, data };
  }

  /**
   * Create an error response
   */
  export function error<T = never>(code: string, message: string, details?: any): IPCResponse<T> {
    return { success: false, error: { code, message, details } };
  }

  /**
   * Type guard for checking if response is successful
   */
  export function isSuccess<T>(response: IPCResponse<T>): response is IPCResponse<T> & { data: T } {
    return response.success && response.data !== undefined;
  }

  /**
   * Type guard for checking if response is an error
   */
  export function isError<T>(response: IPCResponse<T>): response is IPCResponse<T> & { error: IPCError } {
    return !response.success && response.error !== undefined;
  }
}

// ============================================================================
// File System Event Types
// ============================================================================

export type FSEventType = 'add' | 'change' | 'unlink';

export interface FSEvent {
  /** Type of file system event */
  type: FSEventType;
  /** Path to affected file/directory */
  path: string;
  /** Which skill directory was affected */
  directory: SkillSource;
}

// ============================================================================
// UI State Types
// ============================================================================

export type FilterSource = 'all' | 'project' | 'global';
export type SortBy = 'name' | 'modified';

export interface UIState {
  /** Currently selected skill path */
  selectedSkill: string | null;
  /** Current filter setting */
  filterSource: FilterSource;
  /** Current sort setting */
  sortBy: SortBy;
  /** Search query */
  searchQuery: string;
}

// ============================================================================
// AI Types
// ============================================================================

export type AIGenerationMode = 'new' | 'modify' | 'insert' | 'replace';

export interface AIGenerationRequest {
  /** Unique request identifier for tracking */
  id?: string;
  /** The prompt describing what to generate */
  prompt: string;
  /** Generation mode */
  mode: AIGenerationMode;
  /** Current skill content (for modify/insert/replace modes) */
  currentContent?: string;
  /** Selection start position (for insert/replace modes) */
  selectionStart?: number;
  /** Selection end position (for insert/replace modes) */
  selectionEnd?: number;
  /** Skill context for AI */
  skillContext?: {
    name?: string;
    description?: string;
    content?: string;
    cursorPosition?: number;
    selectedText?: string;
    /** Target directory for new skills */
    targetDirectory?: 'project' | 'global';
    /** Target path where the skill will be saved */
    targetPath?: string;
  };
  /** Request timestamp */
  timestamp?: Date;
}

export interface AIStreamChunk {
  /** Type of chunk */
  type: 'text' | 'tool_use' | 'complete' | 'error';
  /** Chunk of generated text (for type: 'text') */
  text?: string;
  /** Tool information (for type: 'tool_use') */
  tool?: {
    name: string;
    input?: any;
  };
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Error message if generation failed */
  error?: string;
}

export type AIProvider = 'anthropic';

export type AIModel = string; // Allow any model name for flexibility

export interface AIConfiguration {
  /** AI service provider */
  provider: AIProvider;
  /** API key (encrypted in storage) */
  apiKey: string;
  /** Selected AI model */
  model: AIModel;
  /** Whether to stream responses */
  streamingEnabled: boolean;
  /** Generation timeout in ms */
  timeout: number;
  /** Max retry attempts */
  maxRetries: number;
  /** Custom API base URL (optional) */
  baseUrl?: string;
}

// ============================================================================
// GitHub Search Types (Feature 004)
// ============================================================================

export interface SkillFileMatch {
  /** Path to skill.md file within repository */
  path: string;
  /** Directory path containing the skill */
  directoryPath: string;
  /** Raw GitHub URL for file content */
  downloadUrl: string;
  /** Last modification timestamp */
  lastModified: Date;
}

export interface SearchResult {
  /** Full repository name (owner/repo) */
  repositoryName: string;
  /** GitHub repository URL */
  repositoryUrl: string;
  /** Repository description */
  description: string;
  /** Star count */
  stars: number;
  /** Fork count */
  forks: number;
  /** Whether repository is archived */
  archived: boolean;
  /** Primary language */
  language: string | null;
  /** Default branch name */
  defaultBranch: string;
  /** Array of skill files found in repository */
  skillFiles: SkillFileMatch[];
  /** Total number of skill files found */
  totalSkills: number;
}

export interface GitHubSearchResponse {
  /** Search results */
  results: SearchResult[];
  /** Total count of results */
  totalCount: number;
  /** Whether results are incomplete due to rate limiting */
  incomplete: boolean;
  /** Rate limit information */
  rateLimit: RateLimitInfo;
}

export interface RateLimitInfo {
  /** Remaining requests */
  remaining: number;
  /** Total requests allowed */
  limit: number;
  /** Reset time as Unix timestamp */
  resetTime: number;
  /** Reset time as Date */
  resetDate: Date;
}

export interface CuratedSource {
  id: string;
  displayName: string;
  repositoryUrl: string;
  description: string;
  tags: string[];
}

export interface InstallRequest {
  skillName: string;
  repositoryFullName: string;
  skillPath: string;
  targetDirectory: string;
  branch: string;
  conflictResolution?: 'overwrite' | 'rename' | 'skip' | null;
}

export interface InstallProgress {
  stage: 'checking' | 'downloading' | 'validating' | 'saving' | 'completed' | 'failed';
  filesCompleted: number;
  filesTotal: number;
  percentage: number;
  error?: string;
}

export interface ConflictInfo {
  skillName: string;
  existingPath: string;
  newSource: string;
  resolution?: 'overwrite' | 'rename' | 'skip' | null;
  applyToAll: boolean;
}

export interface PreviewContent {
  skillName: string;
  repositoryFullName: string;
  skillMdContent: string;
  directoryTree: DirectoryTreeNode[];
}

export interface DirectoryTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryTreeNode[];
  size?: number;
  downloadUrl?: string;
}

export type GitHubErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'INVALID_QUERY'
  | 'SKILL_NOT_FOUND'
  | 'INVALID_CONTENT'
  | 'CONFLICT_DETECTED'
  | 'INVALID_TARGET'
  | 'DOWNLOAD_FAILED'
  | 'VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'INSTALL_NOT_FOUND'
  | 'GITHUB_API_ERROR';

// ============================================================================
// Private Repository Types (Feature 005)
// ============================================================================

export interface PrivateRepo {
  id: string;
  url: string;
  owner: string;
  repo: string;
  displayName?: string;
  description?: string;
  defaultBranch?: string;
  patEncrypted: string;
  skillCount?: number;
  lastSyncTime?: Date;
  addedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  provider: 'github' | 'gitlab';
  instanceUrl?: string; // For self-hosted GitLab instances
}

export interface PrivateRepoConfig {
  version: number;
  repositories: PrivateRepo[];
}

export interface PrivateSkill {
  name: string;
  path: string;
  directoryPath: string;
  downloadUrl: string;
  lastModified: Date;
  repoId: string;
  repoName: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: Date;
  fileCount?: number;
  directoryCommitSHA?: string;
  skillFilePath?: string; // Path to SKILL.md file
}

export interface ContentValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors: string[];
  warnings: string[];
  frontmatter?: SkillFrontmatter;
}

// ============================================================================
// Skills Registry Types (Feature 006)
// ============================================================================

/**
 * Result from skills.sh registry search
 */
export interface SearchSkillResult {
  /** Unique identifier from registry */
  id: string;
  /** Skill identifier (may differ from id) */
  skillId: string;
  /** Display name of the skill */
  name: string;
  /** Number of installations */
  installs: number;
  /** GitHub repository path (format: "org/repo") */
  source: string;
}

/**
 * Request to install a skill from the registry
 */
export interface InstallFromRegistryRequest {
  /** GitHub repository path (format: "org/repo") */
  source: string;
  /** Skill identifier to install */
  skillId: string;
  /** Target tool identifier */
  targetToolId: string;
}

/**
 * Source metadata for tracking installed skills (alias for unified SkillSource)
 * @deprecated Use SkillSource types from '../main/models/SkillSource' instead
 */
export type SkillSourceMetadata = {
  /** Source type identifier */
  type: 'registry';
  /** Base URL of the registry */
  registryUrl: string;
  /** GitHub repository path */
  source: string;
  /** Skill identifier */
  skillId: string;
  /** Installation timestamp (ISO 8601) */
  installedAt: string;
  /** Git commit hash (optional) */
  commitHash?: string;
};

/**
 * Response from skills.sh registry search API
 */
export interface SearchSkillsResponse {
  /** Array of search results */
  skills: SearchSkillResult[];
}

/**
 * Installation status check result
 */
export interface SkillInstallationStatus {
  /** Whether the skill is installed */
  installed: boolean;
  /** Path to installed skill (if installed) */
  skillPath?: string;
  /** Installation timestamp (if installed) */
  installedAt?: string;
}

/**
 * Installation progress event
 */
export interface InstallProgressEvent {
  /** Current installation stage */
  stage: 'cloning' | 'discovering' | 'copying' | 'writing_metadata' | 'cleaning_up' | 'completed' | 'failed';
  /** Progress message */
  message: string;
  /** Progress percentage (0-100) */
  progress?: number;
}

/**
 * Registry-specific error codes
 */
export type RegistryErrorCode =
  | 'REGISTRY_NETWORK_ERROR'
  | 'REGISTRY_TIMEOUT'
  | 'REGISTRY_INVALID_RESPONSE'
  | 'GIT_NOT_FOUND'
  | 'REPO_NOT_FOUND'
  | 'REPO_PRIVATE'
  | 'REPO_NETWORK_ERROR'
  | 'DISK_SPACE_ERROR'
  | 'INVALID_SKILL'
  | 'INSTALLATION_FAILED';

