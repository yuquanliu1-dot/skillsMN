/**
 * Path validation service - CRITICAL for security
 * Prevent path traversal attacks by validating all file operations
 * are within whitelisted directories
 */

import * as path from 'path';
import * as fs from 'fs';

export class PathValidator {
  private whitelistedDirs: Set<string> = new Set();

  /**
   * Initialize with whitelisted directories
   */
  constructor(allowedDirectories: string[]) {
    this.whitelistedDirs = new Set(
      allowedDirectories.map(dir => this.getCanonicalPath(dir)).filter(Boolean)
    );
  }

  /**
   * Get canonical path (resolve symlinks, .., etc.)
   */
  private getCanonicalPath(filePath: string): string {
    try {
      // Resolve the directory part to handle symlinks in parent directories
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);

      // Resolve symlinks in the directory path
      const realDir = fs.existsSync(dir) ? fs.realpathSync(dir) : path.resolve(dir);
      const realPath = path.join(realDir, base);

      // Normalize for the current platform
      let normalized = path.normalize(realPath);

      // On Windows, normalize case for case-insensitive comparison
      if (process.platform === 'win32') {
        normalized = normalized.toLowerCase();
      }

      return normalized;
    } catch (error) {
      // If path doesn't exist, still resolve relative paths
      let normalized = path.normalize(path.resolve(filePath));

      // On Windows, normalize case for case-insensitive comparison
      if (process.platform === 'win32') {
        normalized = normalized.toLowerCase();
      }

      return normalized;
    }
  }

  /**
   * Validate that a path is within whitelisted directories
   */
  public validate(filePath: string): { isValid: boolean; error?: string } {
    try {
      const canonicalPath = this.getCanonicalPath(filePath);

      // Check if path starts with any whitelisted directory
      const isAllowed = Array.from(this.whitelistedDirs).some(whitelisted => {
        return canonicalPath.startsWith(whitelisted + path.sep);
      });

      if (!isAllowed) {
        return {
          isValid: false,
          error: `Path "${filePath}" is outside allowed directories. Access denied for security reasons.`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Add a directory to whitelist
   */
  public addToWhitelist(directoryPath: string): void {
    const canonical = this.getCanonicalPath(directoryPath);
    if (canonical) {
      this.whitelistedDirs.add(canonical);
    }
  }

  /**
   * Remove a directory from whitelist
   */
  public removeFromWhitelist(directoryPath: string): void {
    const canonical = this.getCanonicalPath(directoryPath);
    this.whitelistedDirs.delete(canonical);
  }

  /**
   * Get all whitelisted directories
   */
  public getWhitelistedDirectories(): string[] {
    return Array.from(this.whitelistedDirs);
  }

  /**
   * Check if a path is whitelisted
   */
  public isWhitelisted(filePath: string): boolean {
    const result = this.validate(filePath);
    return result.isValid;
  }
}
