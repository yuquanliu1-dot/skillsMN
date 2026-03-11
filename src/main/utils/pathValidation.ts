/**
 * Path Validation Utilities
 *
 * Validates target directories for skill installation to ensure security
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from './Logger';

/**
 * Validation result
 */
export interface PathValidationResult {
  valid: boolean;
  error?: string;
  resolvedPath?: string;
}

/**
 * Validate that a target directory is within authorized directories
 *
 * @param targetPath - Path to validate
 * @param authorizedDirectories - List of authorized base directories
 * @returns Validation result
 */
export function validateTargetDirectory(
  targetPath: string,
  authorizedDirectories: string[]
): PathValidationResult {
  try {
    // Resolve to absolute path
    const resolvedPath = path.resolve(targetPath);

    // Check if path is within any authorized directory
    const isAuthorized = authorizedDirectories.some((authDir) => {
      const resolvedAuthDir = path.resolve(authDir);
      return resolvedPath.startsWith(resolvedAuthDir + path.sep) || resolvedPath === resolvedAuthDir;
    });

    if (!isAuthorized) {
      return {
        valid: false,
        error: `Target directory "${targetPath}" is not within authorized directories`,
      };
    }

    return {
      valid: true,
      resolvedPath,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid path: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if a path exists and is a directory
 *
 * @param targetPath - Path to check
 * @returns Validation result
 */
export async function validateDirectoryExists(targetPath: string): Promise<PathValidationResult> {
  try {
    const exists = await fs.pathExists(targetPath);

    if (!exists) {
      return {
        valid: false,
        error: `Directory "${targetPath}" does not exist`,
      };
    }

    const stats = await fs.stat(targetPath);

    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: `"${targetPath}" is not a directory`,
      };
    }

    return {
      valid: true,
      resolvedPath: path.resolve(targetPath),
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check write permissions for a directory
 *
 * @param targetPath - Directory to check
 * @returns Validation result
 */
export async function validateWritePermission(targetPath: string): Promise<PathValidationResult> {
  try {
    // Try to write a test file
    const testFile = path.join(targetPath, `.write-test-${Date.now()}`);
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);

    return {
      valid: true,
      resolvedPath: path.resolve(targetPath),
    };
  } catch (error) {
    return {
      valid: false,
      error: `No write permission for directory "${targetPath}"`,
    };
  }
}

/**
 * Comprehensive path validation for skill installation
 *
 * @param targetPath - Path to validate
 * @param authorizedDirectories - List of authorized base directories
 * @returns Validation result with detailed error messages
 */
export async function validateSkillInstallPath(
  targetPath: string,
  authorizedDirectories: string[]
): Promise<PathValidationResult> {
  logger.debug('Validating skill install path', 'PathValidation', {
    targetPath,
    authorizedDirectories,
  });

  // Step 1: Validate that path is within authorized directories
  const authResult = validateTargetDirectory(targetPath, authorizedDirectories);
  if (!authResult.valid) {
    logger.warn('Path authorization failed', 'PathValidation', { targetPath, error: authResult.error });
    return authResult;
  }

  // Step 2: Check if directory exists (create if needed)
  const exists = await fs.pathExists(targetPath);
  if (!exists) {
    try {
      await fs.ensureDir(targetPath);
      logger.info('Created target directory', 'PathValidation', { targetPath });
    } catch (error) {
      return {
        valid: false,
        error: `Failed to create directory "${targetPath}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Step 3: Validate write permissions
  const writeResult = await validateWritePermission(targetPath);
  if (!writeResult.valid) {
    logger.warn('Write permission check failed', 'PathValidation', { targetPath, error: writeResult.error });
    return writeResult;
  }

  logger.info('Path validation successful', 'PathValidation', { targetPath });

  return {
    valid: true,
    resolvedPath: authResult.resolvedPath,
  };
}

/**
 * Check for directory traversal attempts
 *
 * @param targetPath - Path to check
 * @returns True if path contains traversal patterns, false otherwise
 */
export function hasDirectoryTraversal(targetPath: string): boolean {
  // Check for parent directory references
  if (targetPath.includes('..')) {
    return true;
  }

  // Check for null bytes
  if (targetPath.includes('\0')) {
    return true;
  }

  // Normalize path and check again
  const normalized = path.normalize(targetPath);
  if (normalized.includes('..')) {
    return true;
  }

  return false;
}

/**
 * Sanitize a skill name for use as directory name
 *
 * @param skillName - Skill name to sanitize
 * @returns Sanitized name safe for filesystem
 */
export function sanitizeSkillName(skillName: string): string {
  // Remove or replace unsafe characters
  let sanitized = skillName
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dash
    .replace(/\s+/g, '-') // Replace spaces with dash
    .replace(/\.+/g, '.') // Collapse multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, ''); // Remove trailing dots

  // Ensure name is not empty
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'unnamed-skill';
  }

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Generate unique skill directory name if target exists
 *
 * @param baseName - Base directory name
 * @param parentDir - Parent directory
 * @param maxAttempts - Maximum rename attempts
 * @returns Unique directory path
 */
export async function generateUniqueSkillPath(
  baseName: string,
  parentDir: string,
  maxAttempts: number = 100
): Promise<string> {
  let targetPath = path.join(parentDir, baseName);
  let attempts = 0;

  while (await fs.pathExists(targetPath)) {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(`Failed to generate unique path after ${maxAttempts} attempts`);
    }

    // Generate timestamp-based suffix
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    targetPath = path.join(parentDir, `${baseName}-${timestamp}`);
  }

  return targetPath;
}

/**
 * Check if a path is a subdirectory of another path
 *
 * @param child - Potential child path
 * @param parent - Potential parent path
 * @returns True if child is subdirectory of parent
 */
export function isSubdirectory(child: string, parent: string): boolean {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);

  const relative = path.relative(resolvedParent, resolvedChild);

  // If relative path starts with .. or is absolute, it's not a subdirectory
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
