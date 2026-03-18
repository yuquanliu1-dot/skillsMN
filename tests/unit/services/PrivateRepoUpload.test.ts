/**
 * Tests for PrivateRepoService upload and source metadata update
 */

import { PrivateRepoService } from '../../../src/main/services/PrivateRepoService';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock the safeStorage module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => os.tmpdir()),
  },
  safeStorage: {
    encryptString: jest.fn((str: string) => Buffer.from(str)),
    decryptString: jest.fn((buf: Buffer) => buf.toString()),
  },
}));

describe('PrivateRepoService - Upload and Source Update', () => {
  let tempDir: string;
  let skillDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
    skillDir = path.join(tempDir, 'test-skill');
    await fs.ensureDir(skillDir);

    // Create a SKILL.md file
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: Test Skill\ndescription: A test skill\n---\n\n# Test Skill\n\nThis is a test.',
      'utf-8'
    );

    // Create initial source metadata (registry)
    await fs.writeJson(path.join(skillDir, '.source.json'), {
      type: 'registry',
      registryUrl: 'https://skills.sh',
      source: 'public-org/public-repo',
      skillId: 'test-skill',
      installedAt: new Date().toISOString(),
      commitHash: 'abc123',
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('updateSkillSourceToPrivateRepo', () => {
    it('should update source metadata from registry to private-repo', async () => {
      // Initialize service
      await PrivateRepoService.initialize();

      // Access private method via any cast for testing
      const service = PrivateRepoService as any;

      // Mock repository object
      const mockRepo = {
        id: 'repo-123',
        owner: 'myorg',
        repo: 'myrepo',
        provider: 'github',
      };

      // Call the method
      await service.updateSkillSourceToPrivateRepo(
        skillDir,
        'repo-123',
        mockRepo,
        'test-skill',
        'def456'
      );

      // Verify the source metadata was updated
      const sourceMetadata = await fs.readJson(path.join(skillDir, '.source.json'));

      expect(sourceMetadata.type).toBe('private-repo');
      expect(sourceMetadata.repoId).toBe('repo-123');
      expect(sourceMetadata.repoPath).toBe('myorg/myrepo');
      expect(sourceMetadata.skillPath).toBe('test-skill');
      expect(sourceMetadata.commitHash).toBe('def456');
      expect(sourceMetadata.installedAt).toBeDefined();
    });

    it('should work without commit SHA', async () => {
      await PrivateRepoService.initialize();
      const service = PrivateRepoService as any;

      const mockRepo = {
        id: 'repo-456',
        owner: 'myorg',
        repo: 'myrepo',
        provider: 'github',
      };

      await service.updateSkillSourceToPrivateRepo(
        skillDir,
        'repo-456',
        mockRepo,
        'test-skill'
        // No commit SHA provided
      );

      const sourceMetadata = await fs.readJson(path.join(skillDir, '.source.json'));

      expect(sourceMetadata.type).toBe('private-repo');
      expect(sourceMetadata.repoId).toBe('repo-456');
      expect(sourceMetadata.commitHash).toBeUndefined();
    });
  });
});
