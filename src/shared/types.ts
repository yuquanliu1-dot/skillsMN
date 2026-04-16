/**
 * Shared Type Definitions for Local Skill Management
 *
 * These types are used across main and renderer processes
 */

// ============================================================================
// Skill Types
// ============================================================================

export type SkillSource = 'project' | 'global' | 'application';

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
  /** Symlink configuration */
  symlinkConfig?: SkillSymlinkConfig;
  /** Whether skill is currently symlinked */
  isSymlinked?: boolean;
  /** Number of symlink targets enabled for this skill */
  symlinkTargetCount?: number;
}

/** Lightweight type for update checking — avoids sending full Skill[] over IPC */
export interface SkillUpdateCheckItem {
  path: string;
  name: string;
  version?: string;
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
// File Tree Types
// ============================================================================

/**
 * File tree node for skill directory structure
 */
export interface SkillFileTreeNode {
  /** File or directory name */
  name: string;
  /** Relative path from skill directory root */
  relativePath: string;
  /** Absolute path (for file operations) */
  absolutePath: string;
  /** Whether this is a file or directory */
  type: 'file' | 'directory';
  /** File extension (for files only) */
  extension?: string;
  /** Child nodes (for directories) */
  children?: SkillFileTreeNode[];
  /** Whether this is the main SKILL.md file */
  isMainFile?: boolean;
}

/**
 * Response for file content reading
 */
export interface SkillFileContent {
  /** File path */
  path: string;
  /** File content (text, or base64 for previewable binary files) */
  content: string;
  /** Whether file is binary (cannot be edited) */
  isBinary: boolean;
  /** Detected language for Monaco editor */
  language?: string;
}

// ============================================================================
// Symlink Types
// ============================================================================

export interface SkillSymlinkConfig {
  /** Whether symlink is enabled for this skill */
  enabled: boolean;
  /** Target Claude directory path */
  claudeDirectory: string;
  /** When symlink was created */
  createdAt: string;
  /** When symlink was last modified */
  lastModified: string;
}

export interface SymlinksDatabase {
  /** Database version for future migrations */
  version: number;
  /** Symlink configurations keyed by skill name */
  symlinks: Record<string, SkillSymlinkConfig>;
}

// ============================================================================
// Multi-Target Symlink Types (Agent Tools)
// ============================================================================

/**
 * Represents an AI agent tool that can receive skill symlinks
 */
export interface AgentTool {
  /** Unique identifier for the tool */
  id: string;
  /** Display name */
  name: string;
  /** Config directory path (e.g., ~/.cursor) */
  configDir: string;
  /** Skills subdirectory path (e.g., ~/.cursor/skills) */
  skillsDir: string;
  /** Type of target: 'project' for project directories, 'tool' for AI agent tools */
  type?: 'project' | 'tool';
}

/**
 * Configuration for a single symlink target
 */
export interface SymlinkTargetConfig {
  /** Tool identifier */
  toolId: string;
  /** Target directory for the symlink */
  targetDirectory: string;
  /** Whether this target is enabled */
  enabled: boolean;
  /** When this target was created */
  createdAt: string;
  /** When this target was last modified */
  lastModified: string;
}

/**
 * Multi-target symlink configuration for a skill
 */
export interface MultiTargetSymlinkConfig {
  /** Target configurations keyed by tool ID */
  targets: Record<string, SymlinkTargetConfig>;
  /** When this configuration was created */
  createdAt: string;
  /** When this configuration was last modified */
  lastModified: string;
}

/**
 * Database v2 for multi-target symlinks
 */
export interface SymlinksDatabaseV2 {
  /** Database version (2 for multi-target) */
  version: 2;
  /** Multi-target symlink configurations keyed by skill name */
  symlinks: Record<string, MultiTargetSymlinkConfig>;
}

// ============================================================================
// Migration Types
// ============================================================================

/** Strategy for handling skill name conflicts during migration */
export type ConflictStrategy = 'rename' | 'skip' | 'overwrite';

export interface MigrationOptions {
  /** Whether to move or copy skills */
  moveOrCopy: 'move' | 'copy';
  /** Whether to delete original files after migration */
  deleteOriginals: boolean;
  /** Strategy for handling name conflicts (default: 'rename') */
  conflictStrategy?: ConflictStrategy;
}

/** Information about a skill name conflict */
export interface SkillConflict {
  /** Name of the conflicting skill */
  skillName: string;
  /** Source path of the skill being migrated */
  sourcePath: string;
  /** Target path where the skill already exists */
  targetPath: string;
}

export interface MigrationProgress {
  /** Current skill being migrated */
  currentSkill: string;
  /** Current skill index */
  currentIndex: number;
  /** Total skills to migrate */
  totalSkills: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Current operation */
  operation: 'detecting' | 'moving' | 'copying' | 'verifying' | 'completed' | 'failed';
  /** Optional: renamed skill name if conflict was resolved by renaming */
  renamedTo?: string;
  /** Optional: conflict info if a conflict was encountered */
  conflict?: SkillConflict;
}

export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Number of skills successfully migrated */
  migratedCount: number;
  /** Number of skills that failed */
  failedCount: number;
  /** Number of skills skipped due to conflicts */
  skippedCount: number;
  /** Number of skills renamed due to conflicts */
  renamedCount: number;
  /** Number of skills overwritten */
  overwrittenCount: number;
  /** Array of failed skill names with error messages */
  failedSkills: Array<{ name: string; error: string }>;
  /** Array of skipped skill names */
  skippedSkills: Array<{ name: string; reason: string }>;
  /** Array of renamed skills (original -> new name) */
  renamedSkills: Array<{ originalName: string; newName: string }>;
  /** Total time taken in milliseconds */
  duration: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type InstallDirectory = 'project' | 'global';

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
  /** AI Panel width in pixels (default: 420) */
  aiPanelWidth?: number;
  /** Use TipTap rich text editor for Markdown files (default: false) */
  useTiptap?: boolean;
}

/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'zh-CN';

/**
 * Base configuration (project settings, editor preferences)
 */
export interface BaseConfiguration {
  /** Array of configured project directories */
  projectDirectories: string[];
  /** Default location for new skills */
  defaultInstallDirectory: InstallDirectory;
  /** Auto-refresh skill list on file changes */
  autoRefresh: boolean;
  /** Skill editor configuration */
  skillEditor?: SkillEditorConfig;
  /** Application skills directory (primary storage location) */
  applicationSkillsDirectory?: string;
  /** Whether migration from old directories has been completed */
  migrationCompleted?: boolean;
  /** Whether user has been asked about migration preference */
  migrationPreferenceAsked?: boolean;
  /** UI language preference */
  language?: LanguageCode;
  /** Whether the initial setup wizard has been completed */
  setupCompleted?: boolean;
  /** Proxy configuration settings */
  proxy?: ProxyConfig;
}

/**
 * @deprecated Use AppConfiguration instead
 */
export type Configuration = BaseConfiguration;

/**
 * AI configuration settings
 */
export interface AIConfigSection {
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
  /** Allowed tools - tool permissions that user has chosen to remember */
  allowedTools?: string[];
  /** Disallowed tools - tool permissions that user has chosen to remember and deny */
  disallowedTools?: string[];
}

/**
 * Private repository configuration section
 */
export interface PrivateRepoConfigSection {
  /** Configuration version */
  version: number;
  /** List of private repositories */
  repositories: PrivateRepo[];
}

/**
 * Proxy configuration settings
 */
export interface ProxyConfig {
  /** Whether proxy is enabled */
  enabled: boolean;
  /** Proxy type: 'system' reads from env vars, 'custom' uses customUrl */
  type: 'system' | 'custom';
  /** Custom proxy URL (only used when type is 'custom') */
  customUrl?: string;
  /** @deprecated Use 'enabled' and 'type' instead */
  useSystemProxy?: boolean;
  /** @deprecated Use 'customUrl' instead */
  customProxyUrl?: string;
  /** @deprecated Proxy now applies to all network requests when enabled */
  proxyGitHub?: boolean;
  /** @deprecated Proxy now applies to all network requests when enabled */
  proxyRegistry?: boolean;
}

/**
 * Unified application configuration
 * Combines base config, AI config, and private repos into a single file
 */
export interface AppConfiguration extends BaseConfiguration {
  /** Configuration file version for future migrations */
  version: number;
  /** AI configuration settings */
  ai: AIConfigSection;
  /** Private repository settings */
  privateRepos: PrivateRepoConfigSection;
  /** Proxy configuration settings */
  proxy?: ProxyConfig;
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

export type FilterSource = 'all' | 'local' | 'registry' | 'private-repo';
export type SortBy = 'name' | 'modified';

/**
 * Commit information for update display
 */
export interface CommitInfo {
  /** Commit SHA */
  sha: string;
  /** Short SHA (first 7 characters) */
  shortSha: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit date */
  date: string;
}

/**
 * Version comparison result for skill updates
 */
export interface VersionComparison {
  /** Whether an update is available (remote > local) */
  hasUpdate: boolean;
  /** Whether upload is available (local > remote, private repo only) */
  canUpload: boolean;
  /** Local version string */
  localVersion?: string;
  /** Remote version string */
  remoteVersion?: string;
  /** Remote commit SHA for update tracking */
  remoteSHA?: string;
  /** Number of commits ahead */
  commitsAhead?: number;
  /** List of commits between local and remote (only when hasUpdate is true) */
  commits?: CommitInfo[];
  /** Warning message if metadata save failed (update detection may be inaccurate on next check) */
  warning?: string;
}

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

export type AIGenerationMode = 'new' | 'modify' | 'insert' | 'replace' | 'evaluate' | 'benchmark' | 'optimize';

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
    /** Target path for skill creation (parent directory where skill directory should be created) */
    targetPath?: string;
    /** Full path to the current skill directory (for modify mode - ensures writes go to this directory) */
    skillPath?: string;
  };
  /** Request timestamp */
  timestamp?: Date;
}

/**
 * @deprecated Use NormalizedMessage instead
 */
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

/**
 * @deprecated Use AIConfigSection instead
 */
export type AIConfiguration = AIConfigSection;

// ============================================================================
// Normalized Message Types (claudecodeui pattern)
// ============================================================================

/**
 * Normalized message kind - unified across all AI providers
 */
export type MessageKind =
  | 'text'           // Regular text message
  | 'tool_use'       // Tool is being invoked
  | 'tool_result'    // Tool execution result
  | 'thinking'       // AI thinking/reasoning
  | 'stream_delta'   // Streaming text chunk
  | 'stream_end'     // Streaming completed
  | 'error'          // Error occurred
  | 'complete'       // Generation completed
  | 'status'         // Status update (tokens, etc.)
  | 'permission_request'   // Request user permission for tool
  | 'permission_cancelled' // Permission request cancelled
  | 'session_created'      // New session created
  | 'interactive_prompt';  // Interactive prompt for user

/**
 * Normalized message format - all AI providers output to this format
 */
export interface NormalizedMessage {
  /** Unique message ID */
  id: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** AI provider */
  provider: AIProvider;
  /** Message kind */
  kind: MessageKind;

  // kind-specific fields
  /** Text content (for text, stream_delta, thinking, error kinds) */
  content?: string;
  /** Message role (for text kind) */
  role?: 'user' | 'assistant';
  /** Tool name (for tool_use, permission_request kinds) */
  toolName?: string;
  /** Tool input (for tool_use kind) */
  toolInput?: any;
  /** Tool ID (for tool_use, tool_result kinds) */
  toolId?: string;
  /** Tool result content (for tool_result kind) */
  toolResult?: {
    content: string;
    isError: boolean;
  };
  /** Permission request ID (for permission_request, permission_cancelled kinds) */
  requestId?: string;
  /** Permission context (for permission_request kind) */
  context?: any;
  /** Error message (for error kind) */
  error?: string;
  /** Exit code (for complete kind) */
  exitCode?: number;
  /** Whether session was aborted (for complete kind) */
  aborted?: boolean;
  /** New session ID (for session_created kind) */
  newSessionId?: string;
  /** Token budget info (for status kind with text='token_budget') */
  tokenBudget?: {
    used: number;
    total: number;
  };
  /** Status text (for status kind) */
  text?: string;
  /** Whether can interrupt (for status kind) */
  canInterrupt?: boolean;
}

/**
 * Helper function to create a NormalizedMessage with common fields pre-filled
 */
export function createNormalizedMessage(
  fields: Partial<NormalizedMessage> & { kind: MessageKind; provider: AIProvider }
): NormalizedMessage {
  return {
    id: fields.id || generateMessageId(fields.kind),
    sessionId: fields.sessionId || '',
    timestamp: fields.timestamp || new Date().toISOString(),
    provider: fields.provider,
    kind: fields.kind,
    ...fields,
  };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(prefix: string = 'msg'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Permission decision from user
 */
export interface PermissionDecision {
  /** Whether to allow the tool use */
  allow: boolean;
  /** Optional updated input */
  updatedInput?: any;
  /** Optional message explaining the decision */
  message?: string;
  /** Optional: remember this permission for future */
  rememberEntry?: string;
  /** Whether cancelled */
  cancelled?: boolean;
}

/**
 * Pending permission request
 */
export interface PendingPermissionRequest {
  /** Request ID */
  requestId: string;
  /** Tool name */
  toolName: string;
  /** Tool input */
  input: any;
  /** Additional context */
  context?: any;
  /** Session ID */
  sessionId?: string;
  /** When request was received */
  receivedAt: Date;
}

// ============================================================================
// AI Conversation History Types
// ============================================================================

/**
 * Message in an AI conversation
 */
export interface AIConversationMessage {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: string; // ISO string for serialization
  /** Whether message is still streaming */
  isStreaming?: boolean;
  /** Tool calls made during this message */
  toolCalls?: Array<{ name: string; input?: any }>;
}

/**
 * AI Conversation session
 */
export interface AIConversation {
  /** Unique conversation ID */
  id: string;
  /** Conversation title (auto-generated from first message) */
  title: string;
  /** All messages in the conversation */
  messages: AIConversationMessage[];
  /** Creation timestamp */
  createdAt: string; // ISO string for serialization
  /** Last update timestamp */
  updatedAt: string; // ISO string for serialization
  /** Associated skill name (if editing a skill) */
  skillName?: string;
  /** Associated skill path (if editing a skill) */
  skillPath?: string;
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
  description?: string; // Skill description from frontmatter
  tags?: string[]; // Skill tags from frontmatter
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
  /** Target tool identifier (optional - no longer used) */
  targetToolId?: string;
  /** Selected directory path when multiple skills found (user selection) */
  selectedDirectoryPath?: string;
}

/**
 * Skill option for user selection when multiple skills found
 */
export interface SkillOption {
  /** Skill display name */
  name: string;
  /** Directory path in repository */
  directoryPath: string;
  /** Skill description */
  description?: string;
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
  | 'INSTALLATION_FAILED'
  | 'REGISTRY_SKILL_NOT_FOUND'
  | 'REGISTRY_MULTIPLE_SKILLS_FOUND';

// ============================================================================
// Skill Group Types
// ============================================================================

/**
 * Skill group for organizing skills by tags
 */
export interface SkillGroup {
  /** Unique group identifier */
  id: string;
  /** Group display name */
  name: string;
  /** Group description */
  description?: string;
  /** Group color (hex code) */
  color?: string;
  /** Group icon (emoji or icon name) */
  icon?: string;
  /** List of tags assigned to this group */
  tags: string[];
  /** Classification keywords (for auto-matching skills by name, description, and tags) */
  keywords?: string[];
  /** Whether the group is enabled (disabled groups are hidden from skill list) */
  enabled?: boolean;
  /** Whether this is a system default group */
  isDefault?: boolean;
  /** Display order (lower values appear first) */
  order?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Custom groups configuration (user-defined overrides and additions)
 */
export interface CustomGroupsConfig {
  /** Configuration version */
  version: number;
  /** List of custom groups (can override default groups by ID) */
  groups: SkillGroup[];
}

/**
 * Default group definition (loaded from bundled JSON)
 */
export interface DefaultGroupDefinition {
  /** Unique group identifier */
  id: string;
  /** i18n key for name */
  nameKey: string;
  /** i18n key for description */
  descriptionKey: string;
  /** Group color (hex code) */
  color: string;
  /** Group icon (emoji) */
  icon: string;
  /** Tags to pre-assign */
  tags?: string[];
  /** Classification keywords (for auto-matching) */
  keywords?: string[];
  /** Whether enabled by default */
  enabled: boolean;
  /** Whether this is a default group */
  isDefault: true;
  /** Display order */
  order: number;
}

/**
 * Default skill groups configuration file structure
 */
export interface DefaultGroupsConfig {
  /** Configuration version */
  version: number;
  /** List of default group definitions */
  groups: DefaultGroupDefinition[];
}

// ============================================================================
// Contribution & Badge Types (Feature: 激励徽章系统)
// ============================================================================

/**
 * 贡献者等级
 */
export type ContributorLevel = 'newcomer' | 'contributor' | 'active' | 'core' | 'maintainer';

/**
 * 徽章条件类型
 */
export type BadgeConditionType = 'commits' | 'skills_created' | 'downloads' | 'days_active' | 'score';

/**
 * 徽章定义
 */
export interface BadgeDefinition {
  /** 徽章唯一标识 */
  id: string;
  /** 徽章名称 (i18n key) */
  nameKey: string;
  /** 徽章描述 (i18n key) */
  descriptionKey: string;
  /** 图标 (emoji 或图标名) */
  icon: string;
  /** 颜色代码 */
  color: string;
  /** 获得条件 */
  condition: {
    type: BadgeConditionType;
    value: number;
  };
  /** 等级 (1-5, 数字越大越稀有) */
  tier: number;
}

/**
 * 用户已获得的徽章
 */
export interface UserBadge {
  /** 徽章 ID */
  badgeId: string;
  /** 获得时间 */
  earnedAt: Date;
  /** 获得时的数值 */
  earnedValue: number;
}

/**
 * 贡献者统计信息
 */
export interface ContributorStats {
  /** 用户名 (来自 Git 提交者) */
  username: string;
  /** 显示名称 */
  displayName?: string;
  /** 头像 URL */
  avatarUrl?: string;
  /** 邮箱 (用于匹配用户) */
  email?: string;
  /** 提交次数 */
  commitCount: number;
  /** 添加的技能数量 */
  skillsCreated: number;
  /** 最后活跃时间 */
  lastActiveAt: Date | null;
  /** 贡献分数 (综合计算) */
  contributionScore: number;
  /** 已获得徽章 */
  badges: UserBadge[];
  /** 贡献等级 */
  level: ContributorLevel;
}

/**
 * Skill 活跃度统计
 */
export interface SkillActivityStats {
  /** 技能路径 */
  skillPath: string;
  /** 技能名称 */
  skillName: string;
  /** 最后更新时间 */
  lastUpdatedAt: Date | null;
  /** 最后提交者 */
  lastCommitAuthor: string;
  /** 提交次数 */
  commitCount: number;
  /** 活跃度分数 */
  activityScore: number;
  /** 贡献者列表 (简化版) */
  contributors: Array<{
    username: string;
    commitCount: number;
  }>;
}

/**
 * 仓库贡献统计
 */
export interface RepoContributionStats {
  /** 仓库 ID */
  repoId: string;
  /** 仓库路径 (owner/repo) */
  repoPath: string;
  /** 统计更新时间 */
  updatedAt: Date;
  /** 总贡献者数量 */
  totalContributors: number;
  /** 总技能数 */
  totalSkills: number;
  /** 总提交数 */
  totalCommits: number;
  /** 当前用户贡献值 */
  currentUserScore: number;
  /** 当前用户排名级别 */
  currentUserLevel: ContributorLevel;
  /** 当前用户已获得徽章 */
  currentUserBadges: UserBadge[];
  /** 贡献者列表 (按贡献度排序，最多显示前20名) */
  topContributors: ContributorStats[];
  /** 技能活跃度列表 */
  skillActivities: SkillActivityStats[];
}

/**
 * 贡献统计配置 (存储在 config.json 中)
 */
export interface ContributionStatsConfig {
  /** 配置版本 */
  version: number;
  /** 仓库统计缓存 */
  repoStatsCache: Record<string, {
    stats: RepoContributionStats;
    cachedAt: Date;
  }>;
  /** 当前用户 Git 信息 (用于匹配贡献者) */
  currentUserGitInfo?: {
    username?: string;
    email?: string;
    userId?: number;
    instanceUrl?: string;
  };
}

// ============================================================================
// Import Types
// ============================================================================

/**
 * Skill detected during import scan
 */
export interface DetectedSkill {
  /** Skill name */
  name: string;
  /** Path to skill directory (local) or skill path in repo (URL) */
  path: string;
  /** Source type */
  source: 'local' | 'github' | 'gitlab';
  /** Skill description from frontmatter */
  description?: string;
  /** Skill tags from frontmatter */
  tags?: string[];
  /** Whether this skill conflicts with an existing skill */
  hasConflict: boolean;
  /** Path to existing skill if there's a conflict */
  existingPath?: string;
}

/**
 * Options for import operations
 */
export interface ImportOptions {
  /** Whether to delete original files after import (for local import) */
  deleteOriginals?: boolean;
  /** Strategy for handling conflicts */
  conflictStrategy: 'rename' | 'skip' | 'overwrite';
  /** Apply conflict strategy to all conflicts */
  applyToAll?: boolean;
}

/**
 * Progress information during import
 */
export interface ImportProgress {
  /** Current skill being processed */
  currentSkill: string;
  /** Current skill index */
  currentIndex: number;
  /** Total skills to import */
  totalSkills: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Current operation */
  operation: 'scanning' | 'downloading' | 'copying' | 'moving' | 'completed' | 'failed';
  /** Number of successfully imported skills */
  successCount: number;
  /** Number of failed imports */
  failedCount: number;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  /** Whether import was successful */
  success: boolean;
  /** Number of successfully imported skills */
  importedCount: number;
  /** Number of failed imports */
  failedCount: number;
  /** Number of skipped skills (due to conflicts) */
  skippedCount: number;
  /** Skills that were renamed due to conflicts */
  renamedSkills: Array<{ originalName: string; newName: string }>;
  /** Skills that failed to import */
  failedSkills: Array<{ name: string; error: string }>;
  /** Total time taken in milliseconds */
  duration: number;
}

/**
 * Result of scanning a URL for skills
 */
export interface UrlScanResult {
  /** Whether scan was successful */
  success: boolean;
  /** Repository provider */
  provider: 'github' | 'gitlab';
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Default branch */
  branch?: string;
  /** Skills found in repository */
  skills: DetectedSkill[];
  /** Whether repository is private */
  isPrivate: boolean;
  /** Instance URL (for self-hosted GitLab) */
  instanceUrl?: string;
  /** Error message if scan failed */
  error?: string;
}

