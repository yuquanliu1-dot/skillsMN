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
  /** Origin directory type */
  source: SkillSource;
  /** Last modification timestamp */
  lastModified: Date;
  /** Count of non-skill.md files in directory */
  resourceCount: number;
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
}

// ============================================================================
// Configuration Types
// ============================================================================

export type InstallDirectory = 'project' | 'global';
export type EditorMode = 'edit' | 'preview';

export interface Configuration {
  /** Path to Claude project directory (null if not configured) */
  projectDirectory: string | null;
  /** Default location for new skills */
  defaultInstallDirectory: InstallDirectory;
  /** Default behavior when opening skills */
  editorDefaultMode: EditorMode;
  /** Auto-refresh skill list on file changes */
  autoRefresh: boolean;
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
}

export interface AIStreamChunk {
  /** Chunk of generated text */
  text: string;
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Error message if generation failed */
  error?: string;
}
