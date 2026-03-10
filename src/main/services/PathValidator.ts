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
   * Validate that a path is within allowed directories
   * @throws PathTraversalError if path is outside allowed directories
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
   */
  getAllowedDirectories(): string[] {
    return Array.from(this.allowedDirectories);
  }

  /**
   * Determine skill source from path
   */
  getSkillSource(skillPath: string): 'project' | 'global' {
    const resolved = path.resolve(skillPath);
    const isWindows = process.platform === 'win32';
    const normalizedResolved = isWindows ? resolved.toLowerCase() : resolved;

    // Get project and global directories
    const dirs = Array.from(this.allowedDirectories);

    // Check if skill is in global directory first (more specific)
    // Global directory is typically in user home (e.g., C:\Users\...\.claude\skills)
    for (const allowed of dirs) {
      const normalizedAllowed = isWindows ? allowed.toLowerCase() : allowed;

      if (normalizedResolved.startsWith(normalizedAllowed + path.sep)) {
        // Check if this is the global directory (contains .claude/skills in path and in Users/home directory)
        const globalPattern = isWindows ? '.claude\\skills' : '.claude/skills';
        const isGlobal = normalizedAllowed.includes(globalPattern.toLowerCase()) &&
                         (normalizedAllowed.includes('users') || normalizedAllowed.includes('home'));

        if (isGlobal) {
          return 'global';
        } else {
          return 'project';
        }
      }
    }

    // Default to global if not found
    return 'global';
  }
}
