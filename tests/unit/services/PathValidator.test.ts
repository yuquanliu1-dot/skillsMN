/**
 * Unit tests for PathValidator service
 * CRITICAL: Tests for path traversal prevention
 */

import { PathValidator } from '../../../src/main/services/PathValidator';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('PathValidator', () => {
  let validator: PathValidator;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsmm-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validate', () => {
    it('should allow paths within whitelisted directory', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      const testFile = path.join(allowedDir, 'test.txt');
      const result = validator.validate(testFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject paths outside whitelisted directory', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      const outsidePath = path.join(tempDir, 'not-allowed', 'test.txt');
      const result = validator.validate(outsidePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should prevent path traversal with ..', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      // Try to escape with ..
      const maliciousPath = path.join(allowedDir, '..', 'not-allowed', 'test.txt');
      const result = validator.validate(maliciousPath);

      expect(result.isValid).toBe(false);
    });

    it('should handle symlinks safely', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      const outsideDir = path.join(tempDir, 'outside');
      fs.mkdirSync(allowedDir, { recursive: true });
      fs.mkdirSync(outsideDir, { recursive: true });

      // Create symlink pointing outside allowed directory
      const symlinkPath = path.join(allowedDir, 'symlink');
      fs.symlinkSync(outsideDir, symlinkPath, 'junction');

      validator = new PathValidator([allowedDir]);

      // Try to access file through symlink
      const targetFile = path.join(symlinkPath, 'test.txt');
      const result = validator.validate(targetFile);

      // Should reject because symlink resolves to outside allowed directory
      expect(result.isValid).toBe(false);

      // Cleanup symlink
      fs.unlinkSync(symlinkPath);
    });

    it('should handle non-existent paths gracefully', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      const nonExistent = path.join(allowedDir, 'does-not-exist', 'file.txt');
      const result = validator.validate(nonExistent);

      // Should still validate correctly even if path doesn't exist
      expect(result.isValid).toBe(true);
    });

    it('should handle absolute vs relative paths', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      // Relative path should be resolved to absolute
      const relativePath = './test.txt';
      const result = validator.validate(relativePath);

      // Should reject because relative path resolves outside allowed directory
      expect(result.isValid).toBe(false);
    });
  });

  describe('whitelist management', () => {
    it('should add directories to whitelist', () => {
      const dir1 = path.join(tempDir, 'dir1');
      const dir2 = path.join(tempDir, 'dir2');
      fs.mkdirSync(dir1, { recursive: true });
      fs.mkdirSync(dir2, { recursive: true });

      validator = new PathValidator([dir1]);

      expect(validator.getWhitelistedDirectories()).toHaveLength(1);

      validator.addToWhitelist(dir2);
      expect(validator.getWhitelistedDirectories()).toHaveLength(2);
    });

    it('should remove directories from whitelist', () => {
      const dir1 = path.join(tempDir, 'dir1');
      const dir2 = path.join(tempDir, 'dir2');
      fs.mkdirSync(dir1, { recursive: true });
      fs.mkdirSync(dir2, { recursive: true });

      validator = new PathValidator([dir1, dir2]);

      expect(validator.getWhitelistedDirectories()).toHaveLength(2);

      validator.removeFromWhitelist(dir2);
      expect(validator.getWhitelistedDirectories()).toHaveLength(1);

      // On Windows, paths are case-insensitive, so check accordingly
      const whitelisted = validator.getWhitelistedDirectories()[0];
      expect(whitelisted).toBeDefined();
      if (process.platform === 'win32') {
        expect(whitelisted!.toLowerCase()).toBe(dir1.toLowerCase());
      } else {
        expect(validator.getWhitelistedDirectories()).toContain(dir1);
      }
    });

    it('should check if path is whitelisted', () => {
      const allowedDir = path.join(tempDir, 'allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      const insidePath = path.join(allowedDir, 'test.txt');
      const outsidePath = path.join(tempDir, 'test.txt');

      expect(validator.isWhitelisted(insidePath)).toBe(true);
      expect(validator.isWhitelisted(outsidePath)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty path gracefully', () => {
      validator = new PathValidator([]);

      const result = validator.validate('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null path gracefully', () => {
      validator = new PathValidator([]);

      const result = validator.validate(null as any);

      expect(result.isValid).toBe(false);
    });

    it('should handle paths with special characters', () => {
      const allowedDir = path.join(tempDir, 'allowed dir with spaces');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      const testFile = path.join(allowedDir, 'test file.txt');
      const result = validator.validate(testFile);

      expect(result.isValid).toBe(true);
    });

    it('should handle case sensitivity on Windows', () => {
      // This test is platform-specific
      if (process.platform !== 'win32') {
        return;
      }

      const allowedDir = path.join(tempDir, 'Allowed');
      fs.mkdirSync(allowedDir, { recursive: true });

      validator = new PathValidator([allowedDir]);

      // Try different case
      const testFile = path.join(tempDir, 'ALLOWED', 'test.txt');
      const result = validator.validate(testFile);

      // On Windows, case should be insensitive
      expect(result.isValid).toBe(true);
    });
  });
});
