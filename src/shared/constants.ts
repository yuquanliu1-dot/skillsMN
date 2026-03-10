/**
 * Shared Constants for Local Skill Management
 */

// ============================================================================
// File Names
// ============================================================================

/** Skill markdown file name */
export const SKILL_FILE_NAME = 'skill.md';

/** Claude configuration directory name */
export const CLAUDE_DIR_NAME = '.claude';

/** Skills subdirectory name */
export const SKILLS_DIR_NAME = 'skills';

/** Configuration file name */
export const CONFIG_FILE_NAME = 'config.json';

// ============================================================================
// Default Values
// ============================================================================

/** Default install directory for new skills */
export const DEFAULT_INSTALL_DIRECTORY = 'project';

/** Default editor mode */
export const DEFAULT_EDITOR_MODE = 'edit';

/** Default auto-refresh setting */
export const DEFAULT_AUTO_REFRESH = true;

/** Configuration defaults */
export const DEFAULT_CONFIG = {
  projectDirectory: null,
  defaultInstallDirectory: DEFAULT_INSTALL_DIRECTORY,
  editorDefaultMode: DEFAULT_EDITOR_MODE,
  autoRefresh: DEFAULT_AUTO_REFRESH,
} as const;

// ============================================================================
// Performance Thresholds
// ============================================================================

/** Maximum startup time in milliseconds */
export const STARTUP_TIME_MS = 3000;

/** Maximum skill list loading time in milliseconds */
export const LIST_LOAD_TIME_MS = 2000;

/** Maximum file save time in milliseconds */
export const SAVE_TIME_MS = 100;

/** Maximum file delete time in milliseconds */
export const DELETE_TIME_MS = 200;

/** File system event debounce threshold in milliseconds */
export const FS_DEBOUNCE_MS = 200;

/** File system change detection threshold in milliseconds */
export const FS_STABILITY_THRESHOLD_MS = 200;

/** File system polling interval in milliseconds */
export const FS_POLL_INTERVAL_MS = 100;

// ============================================================================
// UI Constants
// ============================================================================

/** Skill list item height in pixels */
export const SKILL_LIST_ITEM_HEIGHT = 80;

/** Minimum window width in pixels */
export const MIN_WINDOW_WIDTH = 1024;

/** Minimum window height in pixels */
export const MIN_WINDOW_HEIGHT = 768;

/** Toast notification duration in milliseconds */
export const TOAST_DURATION_SUCCESS_MS = 3000;
export const TOAST_DURATION_ERROR_MS = 5000;

// ============================================================================
// Validation Limits
// ============================================================================

/** Maximum skill name length */
export const MAX_SKILL_NAME_LENGTH = 100;

/** Maximum skill description length */
export const MAX_SKILL_DESCRIPTION_LENGTH = 500;

// ============================================================================
// File Patterns
// ============================================================================

/** Pattern to match skill files */
export const SKILL_FILE_PATTERN = /^skill\.md$/;

/** Pattern to ignore dotfiles */
export const DOTFILE_PATTERN = /(^|[\/\\])\../;

/** Pattern for valid directory name (kebab-case) */
export const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ============================================================================
// IPC Channel Names
// ============================================================================

/** Skill operation channels */
export const IPC_CHANNELS = {
  // Skill operations
  SKILL_LIST: 'skill:list',
  SKILL_GET: 'skill:get',
  SKILL_CREATE: 'skill:create',
  SKILL_UPDATE: 'skill:update',
  SKILL_DELETE: 'skill:delete',
  SKILL_OPEN_FOLDER: 'skill:open-folder',

  // Configuration operations
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  CONFIG_TEST_AI: 'config:test-ai',

  // File system watching
  FS_WATCH_START: 'fs:watch-start',
  FS_WATCH_STOP: 'fs:watch-stop',
  FS_CHANGE: 'fs:change',

  // AI operations
  AI_GENERATE: 'ai:generate',
  AI_CANCEL: 'ai:cancel',
  AI_CHUNK: 'ai:chunk',
} as const;

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

/** Keyboard shortcuts */
export const SHORTCUTS = {
  NEW_SKILL: 'Ctrl+N',
  SAVE: 'Ctrl+S',
  CLOSE_EDITOR: 'Ctrl+W',
  DELETE: 'Delete',
} as const;
