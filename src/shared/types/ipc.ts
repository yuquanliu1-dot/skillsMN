/**
 * IPC Type Definitions
 *
 * Shared types for IPC communication between main and renderer processes
 */

// ============================================================================
// IPC Response Types
// ============================================================================

export interface IPCResponse<T = void> {
  success: boolean;
  data?: T;
  error?: IPCError;
}

export interface IPCError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Skill IPC Types
// ============================================================================

export interface SkillListRequest {
  config?: Configuration;
}

export interface SkillListResponse {
  skills: Skill[];
  errors: SkillScanError[];
}

export interface SkillGetRequest {
  path: string;
}

export interface SkillGetResponse {
  metadata: Skill;
  content: string;
}

export interface SkillCreateRequest {
  name: string;
  directory: SkillSource;
}

export interface SkillCreateResponse {
  skill: Skill;
}

export interface SkillUpdateRequest {
  path: string;
  content: string;
  expectedLastModified?: number;
}

export interface SkillUpdateResponse {
  skill: Skill;
}

export interface SkillDeleteRequest {
  path: string;
}

export interface SkillDeleteResponse {
  // Empty response for delete
}

// ============================================================================
// Configuration IPC Types
// ============================================================================

export interface ConfigLoadRequest {
  // No parameters
}

export interface ConfigLoadResponse {
  config: Configuration;
}

export interface ConfigSaveRequest {
  config: Partial<Configuration>;
}

export interface ConfigSaveResponse {
  config: Configuration;
}

// ============================================================================
// File System IPC Types
// ============================================================================

export interface FSWatchStartRequest {
  // No parameters
}

export interface FSWatchStartResponse {
  // Empty response
}

export interface FSWatchStopRequest {
  // No parameters
}

export interface FSWatchStopResponse {
  // Empty response
}

export interface FSEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  skillPath?: string;
}

// ============================================================================
// GitHub IPC Types (for future implementation)
// ============================================================================

export interface GitHubSearchRequest {
  query: string;
}

export interface GitHubSearchResponse {
  results: SearchResult[];
  rateLimit: RateLimitInfo;
}

export interface GitHubPreviewRequest {
  repositoryName: string;
  filePath: string;
}

export interface GitHubPreviewResponse {
  content: string;
}

export interface GitHubInstallRequest {
  repositoryName: string;
  directoryPath: string;
  targetDirectory: SkillSource;
  conflictResolution?: 'overwrite' | 'rename' | 'skip';
}

export interface GitHubInstallResponse {
  skill: Skill;
  conflictDetected: boolean;
  resolution?: 'renamed' | 'overwritten';
}

// ============================================================================
// AI IPC Types (for future implementation)
// ============================================================================

export interface AIGenerateRequest {
  prompt: string;
  mode: 'new' | 'modify' | 'insert' | 'replace';
  currentContent?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface AIChunkEvent {
  type: 'ai:chunk';
  chunk: string;
}

export interface AICompleteEvent {
  type: 'ai:complete';
  fullContent: string;
}

export interface AIErrorEvent {
  type: 'ai:error';
  error: string;
}

// ============================================================================
// Entity Types (imported from main models)
// ============================================================================

export type SkillSource = 'project' | 'global';

export interface Skill {
  path: string;
  name: string;
  description?: string;
  source: SkillSource;
  lastModified: Date;
  resourceCount: number;
}

export interface SkillDirectory {
  path: string;
  type: SkillSource;
  exists: boolean;
}

export interface Configuration {
  projectDirectory: string | null;
  globalDirectory: string;
  defaultInstallDirectory: SkillSource;
  theme: 'dark' | 'light' | 'system';
  editorFontSize: number;
  editorTabSize: number;
}

export interface SkillScanError {
  path: string;
  error: string;
}

export interface SearchResult {
  repositoryName: string;
  repositoryUrl: string;
  description: string;
  stars: number;
  skillFiles: SkillFileMatch[];
}

export interface SkillFileMatch {
  path: string;
  directoryPath: string;
  downloadUrl: string;
  lastModified: Date;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
}
