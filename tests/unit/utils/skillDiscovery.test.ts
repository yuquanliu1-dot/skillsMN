/**
 * skillDiscovery Unit Tests
 *
 * Tests for finding SKILL.md files in repositories and multi-skill repository support
 */
import * as fs from 'fs';
import * as path from 'path';
import { SkillDiscovery } from '../../../src/main/utils/skillDiscovery';
import type { SkillSource } from '../../../src/shared/types';

// Mock fs with promises
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    writeFile: jest.fn(),
  },
  existsSync: jest.fn(),
}));
jest.mock('path');

describe('SkillDiscovery', () => {
  let skillDiscovery: SkillDiscovery;

  beforeEach(() => {
    jest.clearAllMocks();
    skillDiscovery = new SkillDiscovery();
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });
  describe('findSkillByName()', () => {
    it('should find skill directory by exact name match', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'data-analysis';
      // Mock directory structure
      const mockEntries = [
        { name: 'data-analysis', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBe('/tmp/test-repo/data-analysis');
      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/test-repo/data-analysis/SKILL.md');
    });
    it('should find skill directory with case-insensitive match', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'Data-Analysis';
      const mockEntries = [
        { name: 'data-analysis', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBe('/tmp/test-repo/data-analysis');
    });
    it('should search recursively up to max depth', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'nested-skill';
      // Root level
      const rootEntries = [
        { name: 'skills', isDirectory: () => true }
      ];
      // skills/ level
      const skillsEntries = [
        { name: 'category', isDirectory: () => true }
      ];
      // skills/category/ level
      const categoryEntries = [
        { name: 'nested-skill', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock)
        .mockResolvedValueOnce(rootEntries)
        .mockResolvedValueOnce(skillsEntries)
        .mockResolvedValueOnce(categoryEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName, 3);
      expect(result).toBe('/tmp/test-repo/skills/category/nested-skill');
    });
    it('should respect maxDepth parameter', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'deep-skill';
      const rootEntries = [
        { name: 'level1', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(rootEntries);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName, 1);
      expect(result).toBeUndefined();
    });
    it('should return undefined if skill not found', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'nonexistent';
      const mockEntries = [
        { name: 'other-skill', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBeUndefined();
    });
    it('should return undefined if SKILL.md not found in matched directory', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'data-analysis';
      const mockEntries = [
        { name: 'data-analysis', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // SKILL.md not found
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBeUndefined();
    });
    it('should handle readdir errors gracefully', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'test-skill';
      (fs.promises.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBeUndefined();
    });
    it('should skip files and only search directories', async () => {
      const repoDir = '/tmp/test-repo';
      const skillName = 'test-skill';
      const mockEntries = [
        { name: 'README.md', isDirectory: () => false },
        { name: 'package.json', isDirectory: () => false },
        { name: 'test-skill', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBe('/tmp/test-repo/test-skill');
    });
  });
  describe('findFirstSkill()', () => {
    it('should find first directory containing SKILL.md', async () => {
      const repoDir = '/tmp/test-repo';
      const mockEntries = [
        { name: 'skill-1', isDirectory: () => true },
        { name: 'skill-2', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // skill-1/SKILL.md not found
        .mockReturnValueOnce(true);  // skill-2/SKILL.md found
      const result = await skillDiscovery.findFirstSkill(repoDir);
      expect(result).toBe('/tmp/test-repo/skill-2');
    });
    it('should search recursively if no skill found at root', async () => {
      const repoDir = '/tmp/test-repo';
      const rootEntries = [
        { name: 'skills', isDirectory: () => true }
      ];
      const skillsEntries = [
        { name: 'my-skill', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock)
        .mockResolvedValueOnce(rootEntries)
        .mockResolvedValueOnce(skillsEntries);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // skills/SKILL.md
        .mockReturnValueOnce(true);  // skills/my-skill/SKILL.md
      const result = await skillDiscovery.findFirstSkill(repoDir);
      expect(result).toBe('/tmp/test-repo/skills/my-skill');
    });
    it('should return undefined if no skill found', async () => {
      const repoDir = '/tmp/test-repo';
      const mockEntries = [
        { name: 'README.md', isDirectory: () => false }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findFirstSkill(repoDir);
      expect(result).toBeUndefined();
    });
    it('should respect maxDepth parameter', async () => {
      const repoDir = '/tmp/test-repo';
      const rootEntries = [
        { name: 'level1', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(rootEntries);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findFirstSkill(repoDir, 1);
      expect(result).toBeUndefined();
    });
  });
  describe('writeSourceMetadata()', () => {
    it('should write .source.json file with metadata', async () => {
      const skillDir = '/test/skills/my-skill';
      const sourceMetadata = {
        type: 'registry' as const,
        registryUrl: 'https://skills.sh',
        source: 'owner/repo',
        skillId: 'my-skill',
        installedAt: '2026-03-12T10:00:00.000Z',
        commitHash: 'abc123d'
      };
      (fs.promises.writeFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      await skillDiscovery.writeSourceMetadata(skillDir, sourceMetadata);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        '/test/skills/my-skill/.source.json',
        JSON.stringify(sourceMetadata, null, 2),
        'utf-8'
      );
    });
    it('should handle write errors', async () => {
      const skillDir = '/test/skills/my-skill';
      const sourceMetadata = {
        type: 'registry' as const,
        registryUrl: 'https://skills.sh',
        source: 'owner/repo',
        skillId: 'my-skill',
        installedAt: '2026-03-12T10:00:00.000Z'
      };
      (fs.promises.writeFile as jest.Mock) = jest.fn().mockRejectedValue(new Error('Disk full'));
      await expect(skillDiscovery.writeSourceMetadata(skillDir, sourceMetadata)).rejects.toThrow('Disk full');
    });
    it('should write metadata without commit hash', async () => {
      const skillDir = '/test/skills/my-skill';
      const sourceMetadata = {
        type: 'registry' as const,
        registryUrl: 'https://skills.sh',
        source: 'owner/repo',
        skillId: 'my-skill',
        installedAt: '2026-03-12T10:00:00.000Z'
      };
      (fs.promises.writeFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      await skillDiscovery.writeSourceMetadata(skillDir, sourceMetadata);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"type": "registry"'),
        'utf-8'
      );
    });
  });
  describe('validateSkillDirectory()', () => {
    it('should return true if SKILL.md exists', async () => {
      const skillDir = '/test/skills/my-skill';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const result = await skillDiscovery.validateSkillDirectory(skillDir);
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/skills/my-skill/SKILL.md');
    });
    it('should return false if SKILL.md not found', async () => {
      const skillDir = '/test/skills/my-skill';
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.validateSkillDirectory(skillDir);
      expect(result).toBe(false);
    });
  });
  describe('multi-skill repository support', () => {
    it('should find correct skill in multi-skill repository', async () => {
      const repoDir = '/tmp/multi-skill-repo';
      const skillName = 'skill-b';
      const mockEntries = [
        { name: 'skill-a', isDirectory: () => true },
        { name: 'skill-b', isDirectory: () => true },
        { name: 'skill-c', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // Check skill-a first, not what we want
        .mockReturnValueOnce(true);  // Check skill-b, this is what we want
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBe('/tmp/multi-skill-repo/skill-b');
    });
    it('should handle nested skills in subdirectories', async () => {
      const repoDir = '/tmp/nested-repo';
      const skillName = 'deep-skill';
      const rootEntries = [
        { name: 'category1', isDirectory: () => true },
        { name: 'category2', isDirectory: () => true }
      ];
      const category1Entries = [
        { name: 'skill-x', isDirectory: () => true }
      ];
      const category2Entries = [
        { name: 'deep-skill', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock)
        .mockResolvedValueOnce(rootEntries)
        .mockResolvedValueOnce(category1Entries)
        .mockResolvedValueOnce(category2Entries);
      (fs.existsSync as jest.Mock)
        .mockReturnValue(false) // category1/skill-x/SKILL.md
        .mockReturnValue(true);  // category2/deep-skill/SKILL.md
      const result = await skillDiscovery.findSkillByName(repoDir, skillName, 3);
      expect(result).toBe('/tmp/nested-repo/category2/deep-skill');
    });
  });
  describe('edge cases', () => {
    it('should handle empty repository directory', async () => {
      const repoDir = '/tmp/empty-repo';
      const skillName = 'test-skill';
      (fs.promises.readdir as jest.Mock).mockResolvedValue([]);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBeUndefined();
    });
    it('should handle directory with no SKILL.md files', async () => {
      const repoDir = '/tmp/no-skill-repo';
      const skillName = 'test-skill';
      const mockEntries = [
        { name: 'docs', isDirectory: () => true },
        { name: 'src', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBeUndefined();
    });
    it('should handle permission errors during directory traversal', async () => {
      const repoDir = '/tmp/protected-repo';
      const skillName = 'test-skill';
      const mockEntries = [
        { name: 'public-skill', isDirectory: () => true },
        { name: 'restricted', isDirectory: () => true }
      ];
      (fs.promises.readdir as jest.Mock)
        .mockResolvedValueOnce(mockEntries)
        .mockRejectedValueOnce(new Error('Permission denied')); // restricted/
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      // Should continue despite permission error
      expect(result).toBeUndefined();
    });
    it('should handle symbolic links', async () => {
      const repoDir = '/tmp/symlink-repo';
      const skillName = 'linked-skill';
      const mockEntries = [
        { name: 'linked-skill', isDirectory: () => true, isSymbolicLink: () => true }
      ];
      (fs.promises.readdir as jest.Mock).mockResolvedValueOnce(mockEntries);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const result = await skillDiscovery.findSkillByName(repoDir, skillName);
      expect(result).toBe('/tmp/symlink-repo/linked-skill');
    });
  });
});
