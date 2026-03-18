/**
 * gitOperations Unit Tests
 *
 * Tests for shallow git cloning, error detection, and commit hash extraction
 */

import { GitOperations, ERROR_MESSAGES, GitErrorCode } from '../../../src/main/utils/gitOperations';

// Mock modules before importing anything else
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Create a hoisted mock function
const mockExecAsync = jest.hoisted(() => jest.fn());

jest.mock('util', () => ({
  promisify: () => mockExecAsync
}));

describe('GitOperations', () => {
  let gitOperations: GitOperations;

  beforeEach(() => {
    jest.clearAllMocks();
    gitOperations = new GitOperations();
  });

  describe('checkGitAvailable()', () => {
    it('should return true when git is available', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      const result = await gitOperations.checkGitAvailable();

      expect(result).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith('git --version', expect.objectContaining({ timeout: 5000 }));
    });

    it('should return false when git is not available', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('git: command not found'));

      const result = await gitOperations.checkGitAvailable();

      expect(result).toBe(false);
    });
  });

  describe('shallowClone()', () => {
    it('should successfully clone a repository with shallow depth', async () => {
      const source = 'owner/repo';
      const targetDir = '/tmp/test-repo';

      // Mock git available check
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      // Mock clone
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Cloning into /tmp/test-repo...',
        stderr: ''
      });

      // Mock getCommitHash
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'abc123d',
        stderr: ''
      });

      const result = await gitOperations.shallowClone(source, targetDir);

      expect(result.success).toBe(true);
      expect(result.directory).toBe(targetDir);
      expect(result.commitHash).toBe('abc123d');
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git clone --depth 1 --single-branch'),
        expect.any(Object)
      );
    });

    it('should return error when git is not available', async () => {
      const source = 'owner/repo';
      const targetDir = '/tmp/test-repo';

      // Mock git not available
      mockExecAsync.mockRejectedValueOnce(new Error('git: command not found'));

      const result = await gitOperations.shallowClone(source, targetDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.GIT_NOT_FOUND.user);
      expect(result.errorCode).toBe('GIT_NOT_FOUND');
    });

    it('should detect repository not found error', async () => {
      const source = 'owner/nonexistent-repo';
      const targetDir = '/tmp/test-repo';

      // Mock git available
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      // Mock clone failure
      mockExecAsync.mockRejectedValueOnce(
        new Error('fatal: repository \'https://github.com/owner/nonexistent-repo.git\' not found')
      );

      const result = await gitOperations.shallowClone(source, targetDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.REPO_NOT_FOUND.user);
      expect(result.errorCode).toBe('REPO_NOT_FOUND');
    });

    it('should detect private repository error', async () => {
      const source = 'owner/private-repo';
      const targetDir = '/tmp/test-repo';

      // Mock git available
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      // Mock clone failure with 403
      mockExecAsync.mockRejectedValueOnce(
        new Error('fatal: Authentication failed for \'https://github.com/owner/private-repo.git/\'')
      );

      const result = await gitOperations.shallowClone(source, targetDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.PRIVATE_REPO.user);
      expect(result.errorCode).toBe('PRIVATE_REPO');
    });

    it('should detect network error', async () => {
      const source = 'owner/repo';
      const targetDir = '/tmp/test-repo';

      // Mock git available
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      // Mock network failure
      mockExecAsync.mockRejectedValueOnce(
        new Error('fatal: unable to access \'https://github.com/owner/repo.git/\': Failed to connect to github.com')
      );

      const result = await gitOperations.shallowClone(source, targetDir);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CLONE_FAILED');
    });

    it('should call progress callback during clone', async () => {
      const source = 'owner/repo';
      const targetDir = '/tmp/test-repo';
      const progressCallback = jest.fn();

      // Mock git available
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'git version 2.34.1',
        stderr: ''
      });

      // Mock clone
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Cloning into /tmp/test-repo...',
        stderr: ''
      });

      // Mock getCommitHash
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'abc123d',
        stderr: ''
      });

      await gitOperations.shallowClone(source, targetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('Starting shallow clone...');
      expect(progressCallback).toHaveBeenCalledWith('Cloning into /tmp/test-repo...');
    }, 10000);
  });

  describe('parseGitError()', () => {
    it('should parse git not found error', () => {
      const error = 'git: command not found';
      const result = (gitOperations as any).parseGitError(error);

      expect(result.code).toBe('GIT_NOT_FOUND');
      expect(result.message).toBe(ERROR_MESSAGES.GIT_NOT_FOUND.user);
    });

    it('should parse repository not found error (404)', () => {
      const error = 'fatal: repository \'https://github.com/owner/repo.git\' not found';
      const result = (gitOperations as any).parseGitError(error);

      expect(result.code).toBe('REPO_NOT_FOUND');
      expect(result.message).toBe(ERROR_MESSAGES.REPO_NOT_FOUND.user);
    });

    it('should parse private repository error (403)', () => {
      const error = 'fatal: Authentication failed for \'https://github.com/owner/repo.git/\'';
      const result = (gitOperations as any).parseGitError(error);

      expect(result.code).toBe('PRIVATE_REPO');
      expect(result.message).toBe(ERROR_MESSAGES.PRIVATE_REPO.user);
    });

    it('should parse network error', () => {
      const error = 'fatal: unable to access \'https://github.com/\': Failed to connect';
      const result = (gitOperations as any).parseGitError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe(ERROR_MESSAGES.NETWORK_ERROR.user);
    });

    it('should return clone failed error for unknown git errors', () => {
      const error = 'fatal: some unknown error';
      const result = (gitOperations as any).parseGitError(error);

      expect(result.code).toBe('CLONE_FAILED');
      expect(result.message).toBe(ERROR_MESSAGES.CLONE_FAILED.user);
    });
  });

  describe('ERROR_MESSAGES constant', () => {
    it('should have all required error codes', () => {
      expect(ERROR_MESSAGES.GIT_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.REPO_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.PRIVATE_REPO).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.DISK_SPACE_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.CLONE_FAILED).toBeDefined();
    });

    it('should have user-friendly messages', () => {
      expect(ERROR_MESSAGES.GIT_NOT_FOUND.user).toContain('Git');
      expect(ERROR_MESSAGES.GIT_NOT_FOUND.action).toContain('git-scm.com');

      expect(ERROR_MESSAGES.REPO_NOT_FOUND.user).toContain('repository');
      expect(ERROR_MESSAGES.REPO_NOT_FOUND.action).toContain('alternative');
    });
  });
});
