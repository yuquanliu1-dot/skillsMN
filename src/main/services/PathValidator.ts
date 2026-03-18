/**
 * Path Validator Service
 *
 * CRITICAL SECURITY COMPONENT
 * Validates all file system paths to prevent path traversal attacks.
 * Ensures all file operations occur within allowed directories only.
 */

import path from 'path';
import { logger } from '../utils/Logger';
import { PathTraversalError } from '../utils/ErrorHandler';

export class PathValidator {
  private allowedDirectories: Set<string>;
  private applicationDirectory: string | null = null;
  private static instance: PathValidator | null = null;

  constructor(projectDir: string | null, globalDir: string) {
    this.allowedDirectories = new Set();

    // Add global directory (always allowed)
    const resolvedGlobal = path.resolve(globalDir);
    this.allowedDirectories.add(resolvedGlobal);
    logger.info(`Global directory allowed: ${resolvedGlobal}`, 'PathValidator');

    // Add project directory if configured
    if (projectDir) {
      const resolvedProject = path.resolve(projectDir);
      this.allowedDirectories.add(resolvedProject);
      logger.info(`Project directory allowed: ${resolvedProject}`, 'PathValidator');
    }
  }

  /**
   * Add an allowed directory
   * @param dirPath - Directory path to add to allowed list
   */
  addAllowedDirectory(dirPath: string): void {
    const resolved = path.resolve(dirPath);
    this.allowedDirectories.add(resolved);
    logger.info(`Added allowed directory: ${resolved}`, 'PathValidator');
  }

  /**
   * Set the application skills directory
   * This is the centralized directory for all skills
   * @param dirPath - Application skills directory path
   */
  setApplicationDirectory(dirPath: string): void {
    const resolved = path.resolve(dirPath);
    this.applicationDirectory = resolved;
    this.allowedDirectories.add(resolved);
    logger.info(`Set application directory: ${resolved}`, 'PathValidator');
  }

  /**
   * Get the application skills directory
   * @returns Application directory path or null if not set
   */
  getApplicationDirectory(): string | null {
    return this.applicationDirectory;
  }

  /**
   * Remove an allowed directory
   * @param dirPath - Directory path to remove from allowed list
   */
  removeAllowedDirectory(dirPath: string): void {
    const resolved = path.resolve(dirPath);
    this.allowedDirectories.delete(resolved);
    logger.info(`Removed allowed directory: ${resolved}`, 'PathValidator');
  }

  /**
   * Get singleton instance (for backward compatibility with static calls)
   * @internal
   */
  static getInstance(): PathValidator | null {
    return PathValidator.instance;
  }

  /**
   * Set singleton instance
   * @internal
   */
  static setInstance(instance: PathValidator): void {
    PathValidator.instance = instance;
  }

  /**
   * Get allowed directories (static method for backward compatibility)
   * @returns Object with 'project' and 'global' directory paths
   */
  static getAllowedDirectories(): { project?: string; global: string } {
    if (!PathValidator.instance) {
      throw new Error('PathValidator not initialized. Call setInstance() first.');
    }
    const dirs = PathValidator.instance.getAllowedDirectories();
    const result: { project?: string; global: string } = { global: '' };

    // Assuming the first directory is global, second is project (if exists)
    const dirArray = Array.from(PathValidator.instance['allowedDirectories']);
    if (dirArray.length >= 1) {
      result.global = dirArray[0];
    }
    if (dirArray.length >= 2) {
      result.project = dirArray[1];
    }

    return result;
  }

  /**
   * Validate that a path is within allowed directories
   * Critical security method to prevent path traversal attacks
   * @param requestedPath - Path to validate (can be relative or absolute)
   * @returns Resolved absolute path if valid
   * @throws PathTraversalError if path is outside allowed directories
   * @example
   * try {
   *   const validPath = pathValidator.validate(userInput);
   *   // Safe to use validPath for file operations
   * } catch (error) {
   *   console.error('Invalid path:', error.message);
   * }
   */
  validate(requestedPath: string): string {
    const resolved = path.resolve(requestedPath);

    // On Windows, file system is case-insensitive, so compare in lowercase
    const isWindows = process.platform === 'win32';
    const normalizedResolved = isWindows ? resolved.toLowerCase() : resolved;

    // Check each allowed directory
    for (const allowed of this.allowedDirectories) {
      const normalizedAllowed = isWindows ? allowed.toLowerCase() : allowed;

      if (normalizedResolved.startsWith(normalizedAllowed + path.sep) || normalizedResolved === normalizedAllowed) {
        logger.debug(`Path validated: ${resolved}`, 'PathValidator');
        return resolved; // Return original resolved path (preserves original case)
      }
    }

    // Path is outside all allowed directories
    logger.error(`Path traversal attempt blocked: ${requestedPath}`, 'PathValidator', {
      requested: requestedPath,
      resolved,
      allowed: Array.from(this.allowedDirectories),
    });
    throw new PathTraversalError(requestedPath);
  }

  /**
   * Check if a path is within allowed directories (non-throwing version)
   * Safe alternative to validate() when you need a boolean result
   * @param filePath - Path to check
   * @returns True if path is within allowed directories, false otherwise
   * @example
   * if (pathValidator.isWithinAllowedDir(path)) {
   *   // Path is safe to use
   * } else {
   *   console.warn('Path outside allowed directories');
   * }
   */
  isWithinAllowedDir(filePath: string): boolean {
    try {
      this.validate(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all allowed directories
   * @returns Array of absolute paths that are allowed for file operations
   * @example
   * const allowed = pathValidator.getAllowedDirectories();
   * console.log('Allowed dirs:', allowed);
   */
  getAllowedDirectories(): string[] {
    return Array.from(this.allowedDirectories);
  }

  /**
   * Determine skill source directory type from path
   * Analyzes path to determine if it's in application, project, or global directory
   * @param skillPath - Absolute path to skill directory
   * @returns 'application' if in application directory, 'project' or 'global' otherwise
   * @example
   * const source = pathValidator.getSkillSource('/home/user/.claude/skills/my-skill');
   * console.log(source); // 'global'
   */
  getSkillSource(skillPath: string): 'project' | 'global' | 'application' {
    const resolved = path.resolve(skillPath);
    const isWindows = process.platform === 'win32';
    const normalizedResolved = isWindows ? resolved.toLowerCase() : resolved;

    // Check if skill is in application directory first (highest priority)
    if (this.applicationDirectory) {
      const normalizedAppDir = isWindows ? this.applicationDirectory.toLowerCase() : this.applicationDirectory;
      if (normalizedResolved.startsWith(normalizedAppDir + path.sep) || normalizedResolved === normalizedAppDir) {
        return 'application';
      }
    }

    // Get project and global directories
    const dirs = Array.from(this.allowedDirectories);

    // Check if skill is in global directory
    for (const allowed of dirs) {
      const normalizedAllowed = isWindows ? allowed.toLowerCase() : allowed;

      if (normalizedResolved.startsWith(normalizedAllowed + path.sep)) {
        // Check if this is the global directory (contains .claude/skills in path and in Users/home directory)
        const globalPattern = isWindows ? '.claude\\skills' : '.claude/skills';
        const isGlobal = normalizedAllowed.includes(globalPattern.toLowerCase()) &&
                        (normalizedAllowed.includes('users\\') || normalizedAllowed.includes('home/'));

        return isGlobal ? 'global' : 'project';
      }
    }

    // Default to application if we can't determine (new architecture)
    return 'application';
  }

  /**
   * Get project directory path from allowed directories
   * @returns Project directory path or null if not configured
   * @example
   * const projectDir = pathValidator.getProjectDirectory();
   * if (projectDir) {
   *   console.log('Project skills at:', projectDir);
   * }
   */
  getProjectDirectory(): string | null {
    const dirs = Array.from(this.allowedDirectories);
    const isWindows = process.platform === 'win32';

    // Find project directory (not global)
    for (const dir of dirs) {
      const normalizedDir = isWindows ? dir.toLowerCase() : dir;
      const globalPattern = isWindows ? '.claude\\skills' : '.claude/skills';
      const isGlobal = normalizedDir.includes(globalPattern.toLowerCase()) &&
                      (normalizedDir.includes('users\\') || normalizedDir.includes('home/'));

      if (!isGlobal) {
        return dir;
      }
    }

    return null;
  }

  /**
   * Get global directory path from allowed directories
   * @returns Global directory path (always exists)
   * @example
   * const globalDir = pathValidator.getGlobalDirectory();
   * console.log('Global skills at:', globalDir);
   */
  getGlobalDirectory(): string {
    const dirs = Array.from(this.allowedDirectories);
    const isWindows = process.platform === 'win32';

    // Find global directory
    for (const dir of dirs) {
      const normalizedDir = isWindows ? dir.toLowerCase() : dir;
      const globalPattern = isWindows ? '.claude\\skills' : '.claude/skills';
      const isGlobal = normalizedDir.includes(globalPattern.toLowerCase()) &&
                      (normalizedDir.includes('users\\') || normalizedDir.includes('home/'));

      if (isGlobal) {
        return dir;
      }
    }

    // Fallback to first directory if global not found
    return dirs[0] || '';
  }

  /**
   * Validate that a symlink target directory is allowed
   * Checks if target is in allowed Claude directories for symlinks
   * @param target - Target directory path for symlink
   * @returns True if target is valid for symlink creation
   * @example
   * if (pathValidator.validateSymlinkTarget('/home/user/.claude/skills')) {
   *   // Safe to create symlink to this location
   * }
   */
  validateSymlinkTarget(target: string): boolean {
    const resolved = path.resolve(target);
    const isWindows = process.platform === 'win32';
    const normalizedResolved = isWindows ? resolved.toLowerCase() : resolved;

    // Allowed Claude directories for symlinks
    const globalPattern = isWindows ? '.claude\\skills' : '.claude/skills';

    // Check if target is in a .claude/skills directory
    if (normalizedResolved.includes(globalPattern.toLowerCase())) {
      logger.debug(`Symlink target validated: ${resolved}`, 'PathValidator');
      return true;
    }

    logger.warn(`Invalid symlink target rejected: ${target}`, 'PathValidator', {
      resolved,
      allowedPattern: globalPattern,
    });
    return false;
  }
}
