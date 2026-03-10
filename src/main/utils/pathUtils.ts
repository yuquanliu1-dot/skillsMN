/**
 * Path Utility Functions
 *
 * Provides cross-platform path manipulation and validation utilities
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get the user's home directory
 * @returns Home directory path
 */
export function getHomeDirectory(): string {
  return os.homedir();
}

/**
 * Get the default global skill directory path (~/.claude/skills/)
 * @returns Global skill directory path
 */
export function getDefaultGlobalSkillDirectory(): string {
  return path.join(getHomeDirectory(), '.claude', 'skills');
}

/**
 * Get the default configuration file path (~/.skillsmn/config.json)
 * @returns Configuration file path
 */
export function getDefaultConfigPath(): string {
  return path.join(getHomeDirectory(), '.skillsmn', 'config.json');
}

/**
 * Normalize a file path for the current platform
 * @param filePath - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Join path segments safely
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get the directory name of a file path
 * @param filePath - File path
 * @returns Directory name
 */
export function getDirectoryName(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get the base name (file name) of a file path
 * @param filePath - File path
 * @returns Base name
 */
export function getBaseName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Get the file extension of a file path
 * @param filePath - File path
 * @returns File extension (including the dot)
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Convert a string to kebab-case
 * @param input - String to convert
 * @returns Kebab-case string
 */
export function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

/**
 * Check if a path is absolute
 * @param filePath - Path to check
 * @returns True if path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Resolve a path to an absolute path
 * @param filePath - Path to resolve
 * @param from - Base directory (optional)
 * @returns Absolute path
 */
export function resolvePath(filePath: string, from?: string): string {
  if (from) {
    return path.resolve(from, filePath);
  }
  return path.resolve(filePath);
}

/**
 * Get the relative path from one file to another
 * @param from - Source path
 * @param to - Target path
 * @returns Relative path
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Check if a path is within a directory
 * @param filePath - File path to check
 * @param directory - Directory path
 * @returns True if file is within directory
 */
export function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedFile = resolvePath(filePath);
  const resolvedDir = resolvePath(directory);

  // Normalize paths for comparison
  const normalizedFile = normalizedPath(resolvedFile);
  const normalizedDir = normalizedPath(resolvedDir);

  return normalizedFile.startsWith(normalizedDir + path.sep);
}

/**
 * Normalize path separators for comparison (internal helper)
 * @param filePath - Path to normalize
 * @returns Normalized path with consistent separators
 */
function normalizedPath(filePath: string): string {
  // On Windows, convert backslashes to forward slashes for comparison
  return filePath.split(path.sep).join('/');
}
