/**
 * SkillInstaller Unit Tests
 *
 * Tests for skill installation from registry, progress tracking, and error handling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillInstaller } from '../../../src/main/services/SkillInstaller';
import { GitOperations } from '../../../src/main/utils/gitOperations';
import { SkillDiscovery } from '../../../src/main/utils/skillDiscovery';
import { createRegistrySource } from '../../../src/main/models/SkillSource';
import type { InstallFromRegistryRequest, InstallProgressEvent } from '../../../src/shared/types';

// Mock dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    rm: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    cp: jest.fn(),
  },
  existsSync: jest.fn(),
}));
jest.mock('path');
jest.mock('os');
jest.mock('../../../src/main/utils/gitOperations');
jest.mock('../../../src/main/utils/skillDiscovery');
jest.mock('../../../src/main/models/SkillSource', () => ({
  createRegistrySource: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

describe('SkillInstaller', () => {
  let skillInstaller: SkillInstaller;
  let mockGitOperations: jest.Mocked<GitOperations>;
  let mockSkillDiscovery: jest.Mocked<SkillDiscovery>;
  const testTargetDir = '/test/skills';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock GitOperations
    mockGitOperations = {
      shallowClone: jest.fn(),
      checkGitAvailable: jest.fn(),
      getCommitHash: jest.fn()
    } as any;
    (GitOperations as jest.Mock).mockImplementation(() => mockGitOperations);

    // Mock SkillDiscovery
    mockSkillDiscovery = {
      findSkillByName: jest.fn(),
      writeSourceMetadata: jest.fn()
    } as any;
    (SkillDiscovery as jest.Mock).mockImplementation(() => mockSkillDiscovery);

    // Mock createRegistrySource
    (createRegistrySource as jest.Mock).mockReturnValue({
      type: 'registry',
      registryUrl: 'https://skills.sh',
      source: 'owner/repo',
      skillId: 'test-skill',
      installedAt: '2026-03-12T10:00:00.000Z',
      commitHash: 'abc123d'
    });

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.rm as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (fs.promises.readdir as jest.Mock) = jest.fn().mockResolvedValue([]);
    (fs.promises.writeFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    // Mock path
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.basename as jest.Mock).mockImplementation((p) => p.split('/').pop());

    // Mock os.tmpdir
    (os.tmpdir as jest.Mock).mockReturnValue('/tmp');

    skillInstaller = new SkillInstaller();
  });

  describe('installFromRegistry()', () => {
    const validRequest: InstallFromRegistryRequest = {
      source: 'owner/repo',
      skillId: 'test-skill',
      targetToolId: 'claude-code'
    };

    it('should successfully install a skill', async () => {
      // Mock successful clone
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/skillsMN-test-uuid-1234',
        commitHash: 'abc123d'
      });

      // Mock skill found
      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/skillsMN-test-uuid-1234/test-skill');

      const progressEvents: InstallProgressEvent[] = [];
      const result = await skillInstaller.installFromRegistry(
        validRequest,
        testTargetDir,
        (event) => progressEvents.push(event)
      );

      expect(result.success).toBe(true);
      expect(result.skillPath).toBeDefined();
      expect(progressEvents).toHaveLength(6);
      expect(progressEvents[0].stage).toBe('cloning');
      expect(progressEvents[5].stage).toBe('completed');
    });

    it('should report cloning progress (10%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'cloning',
          progress: 10
        })
      );
    });

    it('should report discovering progress (40%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'discovering',
          progress: 40
        })
      );
    });

    it('should report copying progress (60%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'copying',
          progress: 60
        })
      );
    });

    it('should report writing metadata progress (80%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'writing_metadata',
          progress: 80
        })
      );
    });

    it('should report cleaning up progress (90%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'cleaning_up',
          progress: 90
        })
      );
    });

    it('should report completed progress (100%)', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const progressCallback = jest.fn();
      await skillInstaller.installFromRegistry(validRequest, testTargetDir, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'completed',
          progress: 100
        })
      );
    });

    it('should handle git clone failure', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Git not found',
        errorCode: 'GIT_NOT_FOUND'
      });

      const result = await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Git not found');
      expect(result.errorCode).toBe('GIT_NOT_FOUND');
    });

    it('should handle skill not found in repository', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      // Skill not found
      mockSkillDiscovery.findSkillByName.mockResolvedValue(undefined);

      const result = await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('REGISTRY_SKILL_NOT_FOUND');
    });

    it('should cleanup temporary directory on success', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(fs.promises.rm).toHaveBeenCalledWith(
        expect.stringContaining('skillsMN-'),
        { recursive: true, force: true }
      );
    });

    it('should cleanup temporary directory on failure', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Clone failed',
        errorCode: 'CLONE_FAILED'
      });

      await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(fs.promises.rm).toHaveBeenCalled();
    });

    it('should slugify skill name for directory', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/Test Skill Name');

      const result = await skillInstaller.installFromRegistry(
        { ...validRequest, skillId: 'Test Skill Name' },
        testTargetDir
      );

      expect(result.success).toBe(true);
    });

    it('should write source metadata with commit hash', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123def456'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(createRegistrySource).toHaveBeenCalledWith(
        validRequest.source,
        validRequest.skillId,
        'abc123def456'
      );
    });

    it('should work without progress callback', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      const result = await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(result.success).toBe(true);
    });

    it('should handle write errors gracefully', async () => {
      mockGitOperations.shallowClone.mockResolvedValue({
        success: true,
        directory: '/tmp/test',
        commitHash: 'abc123d'
      });

      mockSkillDiscovery.findSkillByName.mockResolvedValue('/tmp/test/skill');

      // Mock write failure
      (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

      const result = await skillInstaller.installFromRegistry(validRequest, testTargetDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });

  describe('slugify()', () => {
    it('should convert spaces to hyphens', () => {
      const result = (skillInstaller as any).slugify('Test Skill Name');
      expect(result).toBe('test-skill-name');
    });

    it('should lowercase all characters', () => {
      const result = (skillInstaller as any).slugify('TestSkill');
      expect(result).toBe('testskill');
    });

    it('should remove special characters', () => {
      const result = (skillInstaller as any).slugify('Test@Skill#Name!');
      expect(result).toBe('testskillname');
    });

    it('should replace multiple spaces with single hyphen', () => {
      const result = (skillInstaller as any).slugify('Test   Skill');
      expect(result).toBe('test-skill');
    });

    it('should trim leading and trailing spaces', () => {
      const result = (skillInstaller as any).slugify('  Test Skill  ');
      expect(result).toBe('test-skill');
    });
  });

  describe('copyDirectory()', () => {
    it('should copy directory recursively', async () => {
      const srcDir = '/tmp/src';
      const destDir = '/tmp/dest';

      // Mock readdir to return files
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'subdir', isDirectory: () => true }
      ]);

      // Mock stat
      (fs.promises.stat as jest.Mock) = jest.fn().mockResolvedValue({
        isDirectory: () => false
      });

      // Mock copyFile
      (fs.promises.copyFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // Mock mkdir
      (fs.promises.mkdir as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      await (skillInstaller as any).copyDirectory(srcDir, destDir);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(destDir, { recursive: true });
    });
  });

  describe('error handling', () => {
    it('should handle GIT_NOT_FOUND error', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'owner/repo',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      mockGitOperations.shallowClone.mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Git is required but not installed',
        errorCode: 'GIT_NOT_FOUND'
      });

      const result = await skillInstaller.installFromRegistry(request, testTargetDir);

      expect(result.errorCode).toBe('GIT_NOT_FOUND');
    });

    it('should handle REPO_NOT_FOUND error', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'owner/nonexistent',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      mockGitOperations.shallowClone.mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Repository not found',
        errorCode: 'REPO_NOT_FOUND'
      });

      const result = await skillInstaller.installFromRegistry(request, testTargetDir);

      expect(result.errorCode).toBe('REPO_NOT_FOUND');
    });

    it('should handle PRIVATE_REPO error', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'owner/private',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      mockGitOperations.shallowClone.mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Private repository',
        errorCode: 'PRIVATE_REPO'
      });

      const result = await skillInstaller.installFromRegistry(request, testTargetDir);

      expect(result.errorCode).toBe('PRIVATE_REPO');
    });
  });
});
