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

    // Check each allowed directory
    for (const allowed of this.allowedDirectories) {
      if (resolved.startsWith(allowed + path.sep) || resolved === allowed) {
        logger.debug(`Path validated: ${resolved}`, 'PathValidator');
        return resolved;
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

    for (const allowed of this.allowedDirectories) {
      if (resolved.startsWith(allowed + path.sep)) {
        // Determine if this is project or global based on path
        // This is a simple heuristic - you might need to adjust based on your actual directory structure
        const relative = path.relative(allowed, resolved);
        const parts = relative.split(path.sep);

        // If the path contains .claude/skills, it's project
        // Otherwise, it's global
        if (parts.includes('.claude') && parts.includes('skills')) {
          return 'project';
        }
      }
    }

    // Default to global
    return 'global';
  }
}
