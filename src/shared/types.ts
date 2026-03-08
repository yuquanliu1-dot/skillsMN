/**
 * Shared type definitions used across main and renderer processes
 */

// =============================================================================
// Core Domain Types
// =============================================================================

/**
 * Represents a Claude Code skill file
 */
export interface Skill {
  /** Unique identifier (file path hash or canonical path) */
  id: string;
  /** Skill name from frontmatter or filename */
  name: string;
  /** Skill description from frontmatter */
  description: string;
  /** Absolute canonical path to skill file */
  filePath: string;
  /** Which directory the skill belongs to */
  source: 'project' | 'global';
  /** Last modification timestamp */
  modifiedAt: string; // ISO 8601
  /** File size in bytes */
  fileSize: number;
  /** Whether frontmatter is valid YAML */
  isValid: boolean;
  /** Frontmatter validation errors (if any) */
  validationErrors: string[];
}

/**
 * Represents a directory containing skill files
 */
export interface SkillDirectory {
  /** Unique identifier (canonical path) */
  id: string;
  /** Absolute canonical directory path */
  path: string;
  /** Directory type */
  type: 'project' | 'global';
  /** Whether directory currently exists on disk */
  exists: boolean;
  /** Number of skills in directory (cached) */
  skillCount: number;
  /** Last scan timestamp */
  lastScanned: string | null; // ISO 8601
}

/**
 * Application configuration
 */
export interface Configuration {
  /** Absolute path to project skills directory */
  projectSkillDir: string;
  /** Absolute path to global skills directory */
  globalSkillDir: string;
  /** Where new skills install by default */
  defaultInstallTarget: 'project' | 'global';
  /** Default behavior when opening skills */
  editorDefaultMode: 'edit' | 'preview';
  /** Whether to watch for file system changes */
  autoRefresh: boolean;
}

// =============================================================================
// IPC Request/Response Types
// =============================================================================

/**
 * Standard IPC response wrapper
 */
export type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;

export interface IPCSuccessResponse<T> {
  success: true;
  data: T;
}

export interface IPCErrorResponse {
  success: false;
  error: AppError;
}

/**
 * Application error with actionable guidance
 */
export interface AppError {
  /** Machine-readable error code */
  code: string;
  /** Technical error message */
  message: string;
  /** User-friendly error description */
  userMessage: string;
  /** Suggested action to resolve */
  action: string;
}

// =============================================================================
// Skill Operations
// =============================================================================

export interface SkillListRequest {
  filter?: SkillFilter;
  sort?: SkillSortOption;
}

export interface SkillListResponse {
  skills: Skill[];
  totalCount: number;
  projectCount: number;
  globalCount: number;
}

export interface SkillFilter {
  source?: 'project' | 'global';
  searchTerm?: string;
}

export interface SkillSortOption {
  field: 'name' | 'modifiedAt';
  direction: 'asc' | 'desc';
}

export interface SkillCreateRequest {
  name: string;
  targetDirectory: 'project' | 'global';
  initialContent?: string;
}

export interface SkillCreateResponse {
  id: string;
  filePath: string;
  name: string;
}

export interface SkillReadRequest {
  filePath: string;
}

export interface SkillReadResponse {
  filePath: string;
  content: string;
  metadata: {
    name: string;
    description: string;
  };
}

export interface SkillUpdateRequest {
  filePath: string;
  content: string;
}

export interface SkillUpdateResponse {
  filePath: string;
  modifiedAt: string;
  fileSize: number;
}

export interface SkillDeleteRequest {
  filePath: string;
}

export interface SkillDeleteResponse {
  filePath: string;
  recycled: boolean;
}

// =============================================================================
// Config Operations
// =============================================================================

export interface ConfigGetRequest {}

export type ConfigGetResponse = Configuration;

export interface ConfigSetRequest {
  projectSkillDir?: string;
  globalSkillDir?: string;
  defaultInstallTarget?: 'project' | 'global';
  editorDefaultMode?: 'edit' | 'preview';
  autoRefresh?: boolean;
}

export type ConfigSetResponse = Configuration;

export interface ConfigValidateProjectDirRequest {
  path: string;
}

export interface ConfigValidateProjectDirResponse {
  isValid: boolean;
  hasClaudeFolder: boolean;
  skillsDir: string | null;
  errors: string[];
}

// =============================================================================
// Directory Operations
// =============================================================================

export interface DirectoryScanRequest {
  directoryPath: string;
  recursive?: boolean;
}

export interface DirectoryScanResponse {
  directory: string;
  skills: Array<{
    id: string;
    name: string;
    filePath: string;
    modifiedAt: string;
    fileSize: number;
  }>;
  totalCount: number;
  scanDuration: number; // milliseconds
}

export interface DirectoryStartWatchRequest {
  directoryPath: string;
}

export interface DirectoryStartWatchResponse {
  watcherId: string;
  directory: string;
}

export interface DirectoryStopWatchRequest {
  watcherId: string;
}

export interface DirectoryStopWatchResponse {
  watcherId: string;
  stopped: boolean;
}

export interface DirectoryChangeEvent {
  watcherId: string;
  directory: string;
  changes: Array<{
    type: 'add' | 'modify' | 'delete';
    filePath: string;
    timestamp: string; // ISO 8601
  }>;
}
