/**
 * Shared constants used across main and renderer processes
 */

// =============================================================================
// Error Codes
// =============================================================================

export const ERROR_CODES = {
  // File system errors
  ENOENT: 'ENOENT', // File or directory not found
  EACCES: 'EACCES', // Permission denied
  EINVAL: 'EINVAL', // Invalid input or validation error
  EEXIST: 'EEXIST', // File already exists
  ENOTDIR: 'ENOTDIR', // Not a directory
  EPATH: 'EPATH', // Path validation failed (security violation)
  EPARSE: 'EPARSE', // File parsing error (invalid YAML/markdown)

  // Application errors
  ECONFIG: 'ECONFIG', // Configuration error
  ESKILL: 'ESKILL', // Skill operation error
  EDIRECTORY: 'EDIRECTORY', // Directory operation error
} as const;

// =============================================================================
// File Extensions & Patterns
// =============================================================================

export const FILE_EXTENSIONS = {
  SKILL: '.skill',
  YAML: ['.yaml', '.yml'],
  MARKDOWN: ['.md', '.markdown'],
} as const;

export const FILE_PATTERNS = {
  SKILL_FILE: /^[a-z0-9-]+\.skill$/,
  CLAUDE_DIR: '.claude',
  SKILLS_DIR: 'skills',
} as const;

// =============================================================================
// Default Paths
// =============================================================================

export const DEFAULT_PATHS = {
  CLAUDE_CONFIG_DIR: '.claude',
  SKILLS_DIR: 'skills',
  CONFIG_FILE: 'config.json',
  LOG_FILE: 'app.log',
} as const;

// =============================================================================
// Performance Thresholds
// =============================================================================

export const PERFORMANCE_LIMITS = {
  // Startup
  MAX_STARTUP_TIME: 3000, // 3 seconds

  // Skill operations
  MAX_SCAN_TIME: 2000, // 2 seconds for 500 skills
  MAX_SAVE_TIME: 100, // 100ms
  MAX_LIST_UPDATE_TIME: 500, // 500ms

  // File watching
  WATCH_DEBOUNCE: 100, // 100ms
  MAX_WATCH_START_TIME: 100, // 100ms

  // Memory
  MAX_MEMORY_MB: 300, // 300MB
  MAX_CPU_IDLE_PERCENT: 5, // 5%

  // UI
  MAX_LIST_RENDER_TIME: 100, // 100ms for 500 skills
  MAX_SEARCH_TIME: 50, // 50ms
} as const;

// =============================================================================
// Test Coverage Requirements
// =============================================================================

export const COVERAGE_THRESHOLDS = {
  BRANCHES: 70,
  FUNCTIONS: 70,
  LINES: 70,
  STATEMENTS: 70,
} as const;

// =============================================================================
// UI Constants
// =============================================================================

export const UI_CONSTANTS = {
  MIN_WINDOW_WIDTH: 1024,
  MIN_WINDOW_HEIGHT: 768,
  DEFAULT_WINDOW_WIDTH: 1200,
  DEFAULT_WINDOW_HEIGHT: 800,

  // List virtualization
  SKILL_CARD_HEIGHT: 80,
  LIST_OVERSCAN: 5,

  // Debouncing
  SEARCH_DEBOUNCE: 300, // 300ms
  FILTER_DEBOUNCE: 100, // 100ms
} as const;

// =============================================================================
// Cache Settings
// =============================================================================

export const CACHE_SETTINGS = {
  // Skill metadata cache
  SKILL_CACHE_TTL: 60000, // 60 seconds
  MAX_SKILL_CACHE_SIZE: 1000, // Max 1000 skills in cache

  // Directory scan cache
  SCAN_CACHE_TTL: 30000, // 30 seconds

  // Config cache
  CONFIG_CACHE_TTL: 300000, // 5 minutes
} as const;

// =============================================================================
// Keyboard Shortcuts
// =============================================================================

export const KEYBOARD_SHORTCUTS = {
  // Global
  NEW_SKILL: 'Ctrl+N',
  OPEN_SETTINGS: 'Ctrl+,',

  // Editor
  SAVE: 'Ctrl+S',
  CLOSE: 'Ctrl+W',

  // List
  DELETE: 'Delete',
  EDIT: 'Enter',
  SEARCH: 'Ctrl+F',
} as const;

// =============================================================================
// Default Configuration Values
// =============================================================================

export const DEFAULT_CONFIG = {
  defaultInstallTarget: 'project' as const,
  editorDefaultMode: 'edit' as const,
  autoRefresh: true,
} as const;
