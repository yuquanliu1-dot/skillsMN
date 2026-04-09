/**
 * Shared Constants for Local Skill Management
 */

// ============================================================================
// File Names
// ============================================================================

/** Skill markdown file name */
export const SKILL_FILE_NAME = 'SKILL.md';

/** Claude configuration directory name */
export const CLAUDE_DIR_NAME = '.claude';

/** Skills subdirectory name */
export const SKILLS_DIR_NAME = 'skills';

/** Unified configuration file name (stored in userData directory) */
export const CONFIG_FILE_NAME = 'config.json';

/** @deprecated Use CONFIG_FILE_NAME - unified config now includes all settings */
export const PRIVATE_REPOS_FILE_NAME = 'private-repos.json';

/** Current configuration version */
export const CONFIG_VERSION = 1;

// ============================================================================
// Default Values
// ============================================================================

/** Default install directory for new skills */
export const DEFAULT_INSTALL_DIRECTORY = 'project';

/** Default auto-refresh setting */
export const DEFAULT_AUTO_REFRESH = true;

/** Configuration defaults */
export const DEFAULT_CONFIG = {
  projectDirectories: [],
  defaultInstallDirectory: DEFAULT_INSTALL_DIRECTORY,
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
export const SKILL_LIST_ITEM_HEIGHT = 144; // 136px card + 8px margin

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

/** Pattern to match skill files (case-insensitive) */
export const SKILL_FILE_PATTERN = /^skill\.md$/i;

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
  SKILL_COPY: 'skill:copy',
  SKILL_UPDATE: 'skill:update',
  SKILL_DELETE: 'skill:delete',
  SKILL_OPEN_FOLDER: 'skill:open-folder',
  SKILL_CHECK_UPDATES: 'skill:check-updates',
  SKILL_UPDATE_SKILL: 'skill:update-skill',
  SKILL_FILE_TREE: 'skill:file-tree',
  SKILL_FILE_READ: 'skill:file-read',
  SKILL_FILE_WRITE: 'skill:file-write',
  SKILL_ENSURE_SOURCE_METADATA: 'skill:ensure-source-metadata',

  // Configuration operations
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  CONFIG_TEST_AI: 'config:test-ai',
  DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',
  DIALOG_SELECT_FILES: 'dialog:select-files',
  CLAUDE_CHECK_INSTALL: 'claude:check-install',

  // File system watching
  FS_WATCH_START: 'fs:watch-start',
  FS_WATCH_STOP: 'fs:watch-stop',
  FS_CHANGE: 'fs:change',

  // AI operations
  AI_GENERATE: 'ai:generate',
  AI_CANCEL: 'ai:cancel',
  AI_CHUNK: 'ai:chunk',
  AI_MESSAGE: 'ai:message', // NormalizedMessage from main to renderer
  AI_CONFIG_GET: 'ai:config:get',
  AI_CONFIG_SAVE: 'ai:config:save',
  AI_CONFIG_TEST: 'ai:config:test',
  AI_ABORT_SESSION: 'ai:abort-session',
  AI_CHECK_SESSION_STATUS: 'ai:check-session-status',
  AI_GET_ACTIVE_SESSIONS: 'ai:get-active-sessions',
  AI_RESOLVE_PERMISSION: 'ai:resolve-permission',
  AI_GET_PENDING_PERMISSIONS: 'ai:get-pending-permissions',
  AI_RECONNECT_SESSION: 'ai:reconnect-session',

  // GitHub operations (Public Skill Discovery - Feature 004)
  GITHUB_SEARCH_SKILLS: 'github:search-skills',
  GITHUB_PREVIEW_SKILL: 'github:preview-skill',
  GITHUB_INSTALL_SKILL: 'github:install-skill',
  GITHUB_GET_CURATED_SOURCES: 'github:get-curated-sources',
  GITHUB_GET_SKILLS_FROM_SOURCE: 'github:get-skills-from-source',
  GITHUB_CANCEL_INSTALL: 'github:cancel-install',
  GITHUB_INSTALL_PROGRESS: 'github:install-progress',
  GITHUB_INSTALL_COMPLETE: 'github:install-complete',
  GITHUB_INSTALL_CONFLICT: 'github:install-conflict',
  GITHUB_INSTALL_ERROR: 'github:install-error',
  GITHUB_SET_CONFLICT_PREFERENCE: 'github:set-conflict-preference',
  GITHUB_CLEAR_CONFLICT_PREFERENCE: 'github:clear-conflict-preference',

  // Private Repository operations (Feature 005)
  PRIVATE_REPO_ADD: 'private-repo:add',
  PRIVATE_REPO_LIST: 'private-repo:list',
  PRIVATE_REPO_GET: 'private-repo:get',
  PRIVATE_REPO_UPDATE: 'private-repo:update',
  PRIVATE_REPO_REMOVE: 'private-repo:remove',
  PRIVATE_REPO_TEST_CONNECTION: 'private-repo:test-connection',
  PRIVATE_REPO_GET_SKILLS: 'private-repo:get-skills',
  PRIVATE_REPO_SEARCH_SKILLS: 'private-repo:search-skills',
  PRIVATE_REPO_INSTALL_SKILL: 'private-repo:install-skill',
  PRIVATE_REPO_CHECK_UPDATES: 'private-repo:check-updates',
  PRIVATE_REPO_GET_SKILL_METADATA: 'private-repo:get-skill-metadata',
  PRIVATE_REPO_GET_SKILL_CONTENT: 'private-repo:get-skill-content',
  PRIVATE_REPO_UPLOAD_SKILL: 'private-repo:upload-skill',
  PRIVATE_REPO_GET_README: 'private-repo:get-readme',

  // Skills Registry operations (Feature 006)
  REGISTRY_SEARCH: 'registry:search',
  REGISTRY_INSTALL: 'registry:install',
  REGISTRY_CHECK_INSTALLED: 'registry:check-installed',
  REGISTRY_INSTALL_PROGRESS: 'registry:install:progress',
  REGISTRY_GET_CONTENT: 'registry:get-content',

  // Symlink operations
  SYMLINK_UPDATE: 'symlink:update',
  SYMLINK_GET_STATUS: 'symlink:get-status',
  SYMLINK_GET_CLAUDE_DIRS: 'symlink:get-claude-dirs',
  SYMLINK_GET_INSTALLED_TOOLS: 'symlink:get-installed-tools',
  SYMLINK_UPDATE_TARGET: 'symlink:update-target',
  SYMLINK_GET_MULTI_STATUS: 'symlink:get-multi-status',

  // Migration operations
  MIGRATION_CHECK_NEEDED: 'migration:check-needed',
  MIGRATION_DETECT_SKILLS: 'migration:detect-skills',
  MIGRATION_START: 'migration:start',
  MIGRATION_PROGRESS: 'migration:progress',
  MIGRATION_CHECK_DIRECTORY: 'migration:check-directory',
  MIGRATION_GET_TARGET_DIRECTORY: 'migration:get-target-directory',

  // Import operations
  IMPORT_SCAN_DIRECTORY: 'import:scan-directory',
  IMPORT_SCAN_URL: 'import:scan-url',
  IMPORT_LOCAL_SKILLS: 'import:local-skills',
  IMPORT_URL_SKILLS: 'import:url-skills',
  IMPORT_PROGRESS: 'import:progress',

  // Skill Group operations
  SKILL_GROUP_LIST: 'skill-group:list',
  SKILL_GROUP_GET: 'skill-group:get',
  SKILL_GROUP_CREATE: 'skill-group:create',
  SKILL_GROUP_UPDATE: 'skill-group:update',
  SKILL_GROUP_DELETE: 'skill-group:delete',
  SKILL_GROUP_UPDATE_KEYWORDS: 'skill-group:update-keywords',
  SKILL_GROUP_REORDER: 'skill-group:reorder',
  SKILL_GROUP_INIT_DEFAULTS: 'skill-group:init-defaults',
  SKILL_GROUP_RESET_DEFAULTS: 'skill-group:reset-defaults',
  SKILL_GROUP_GET_DEFAULTS: 'skill-group:get-defaults',

  // Terminal operations
  TERMINAL_OPEN_CLAUDE: 'terminal:open-claude',

  // Skills refresh event (for cross-component state synchronization)
  SKILLS_REFRESH: 'skills:refresh',

  // Contribution stats cache cleared event
  CONTRIBUTION_CACHE_CLEARED: 'contribution:cache-cleared',
} as const;

// ============================================================================
// Skills Registry Constants (Feature 006)
// ============================================================================

/** Skills.sh Registry API base URL */
export const REGISTRY_API_BASE_URL = 'https://skills.sh';

/** Skills.sh Registry API search endpoint */
export const REGISTRY_SEARCH_ENDPOINT = '/api/search';

/** Default search result limit */
export const REGISTRY_SEARCH_LIMIT = 20;

/** Search debounce delay in milliseconds */
export const SEARCH_DEBOUNCE_MS = 400;

/** Registry API timeout in milliseconds */
export const REGISTRY_API_TIMEOUT_MS = 10000;

/** Installation progress stages */
export const INSTALL_STAGES = {
  CLONING: 'cloning',
  DISCOVERING: 'discovering',
  COPYING: 'copying',
  WRITING_METADATA: 'writing_metadata',
  CLEANING_UP: 'cleaning_up',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

/** Source metadata file name */
export const SOURCE_METADATA_FILE = '.source.json';


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
