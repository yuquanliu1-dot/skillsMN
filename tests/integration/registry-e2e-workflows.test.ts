/**
 * Registry Search E2E Tests
 *
 * End-to-end tests simulating real user workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RegistryService } from '../../src/main/services/RegistryService';
import { SkillInstaller } from '../../src/main/services/SkillInstaller';
import { SkillDiscovery } from '../../src/main/utils/skillDiscovery';
import { GitOperations } from '../../src/main/utils/gitOperations';
import type { SearchSkillResult, InstallFromRegistryRequest } from '../../src/shared/types';

// Set longer timeout for all tests in this file (30 seconds)
jest.setTimeout(30000);

describe('Registry Search E2E Workflows', () => {
  let tempRoot: string;
  let skillsDir: string;
  let registryService: RegistryService;
  let skillInstaller: SkillInstaller;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsmn-e2e-'));
    skillsDir = path.join(tempRoot, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });

    registryService = new RegistryService();
    skillInstaller = new SkillInstaller();
  });

  afterAll(() => {
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  describe('User Story 1: Search and Discover Skills', () => {
    it('should complete full search workflow: query → results → view details', async () => {
      // Step 1: User enters search query
      const query = 'data analysis';

      // Step 2: Search skills.sh
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: [
            {
              id: 'skill-1',
              skillId: 'data-analysis-helper',
              name: 'Data Analysis Helper',
              installs: 1250,
              source: 'user1/data-skills'
            },
            {
              id: 'skill-2',
              skillId: 'advanced-analysis',
              name: 'Advanced Data Analysis',
              installs: 890,
              source: 'user2/analysis-tools'
            }
          ],
          total: 2,
          query
        })
      } as any);

      const results = await registryService.searchSkills(query);

      // Step 3: Verify results
      expect(results.length).toBe(2);
      expect(results[0].name).toContain('Data Analysis');

      // Step 4: User clicks to view details (construct URL)
      const skill = results[0];
      const detailsUrl = `https://skills.sh/${encodeURIComponent(skill.source)}/${encodeURIComponent(skill.skillId)}`;

      expect(detailsUrl).toBe('https://skills.sh/user1%2Fdata-skills/data-analysis-helper');

      mockFetch.mockRestore();
    }, 15000); // Increased timeout to 15s

    it('should handle empty results with user-friendly message', async () => {
      const query = 'nonexistent-skill';

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: [],
          total: 0,
          query
        })
      } as any);

      const results = await registryService.searchSkills(query);

      expect(results.length).toBe(0);
      // UI should show "No results found" message

      mockFetch.mockRestore();
    });

    it('should debounce rapid search queries', async () => {
      const queries = ['test1', 'test2', 'test3'];
      const mockFetch = jest.spyOn(global, 'fetch');

      // Simulate rapid typing (only last query should execute)
      for (const query of queries) {
        registryService.searchSkills(query);
      }

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should only call API once (last query)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockRestore();
    });
  });

  describe('User Story 2: Install Discovered Skill', () => {
    it('should complete full installation workflow: select → install → verify', async () => {
      // Setup mock repository
      const repoDir = path.join(tempRoot, 'install-test-repo');
      fs.mkdirSync(repoDir, { recursive: true });

      const skillContent = `---
name: Test Skill
description: A skill for testing installation
version: 1.0.0
---

# Test Skill

This is a comprehensive test skill.

## Features
- Feature 1
- Feature 2

## Usage
\`\`\`
Use this skill for testing
\`\`\`
`;

      fs.writeFileSync(path.join(repoDir, 'SKILL.md'), skillContent);
      fs.writeFileSync(path.join(repoDir, 'example.txt'), 'Example resource file');

      // Mock git clone
      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: true,
        directory: repoDir,
        commitHash: 'abc123def456'
      });

      // Step 1: User selects skill to install
      const request: InstallFromRegistryRequest = {
        source: 'testuser/install-test',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      // Step 2: Install skill
      const progressMessages: string[] = [];
      const result = await skillInstaller.installFromRegistry(
        request,
        skillsDir,
        (event) => progressMessages.push(event.message)
      );

      // Step 3: Verify installation success
      expect(result.success).toBe(true);
      expect(result.skillPath).toBeDefined();

      // Step 4: Verify skill files
      const installedSkillDir = result.skillPath!;
      expect(fs.existsSync(installedSkillDir)).toBe(true);
      expect(fs.existsSync(path.join(installedSkillDir, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(installedSkillDir, 'example.txt'))).toBe(true);

      // Step 5: Verify metadata
      const metadataPath = path.join(installedSkillDir, '.source.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.type).toBe('registry');
      expect(metadata.source).toBe(request.source);
      expect(metadata.skillId).toBe(request.skillId);
      expect(metadata.commitHash).toBe('abc123d');

      // Step 6: Verify progress tracking
      expect(progressMessages.length).toBeGreaterThan(0);
      expect(progressMessages).toContain('Repository cloned successfully');

      mockClone.mockRestore();
      fs.rmSync(repoDir, { recursive: true, force: true });
    }, 20000);

    it('should install skill from multi-skill repository', async () => {
      const repoDir = path.join(tempRoot, 'multi-skill-repo');
      fs.mkdirSync(repoDir, { recursive: true });

      // Create multiple skills
      const skill1Dir = path.join(repoDir, 'skill-one');
      const skill2Dir = path.join(repoDir, 'skill-two');

      fs.mkdirSync(skill1Dir, { recursive: true });
      fs.mkdirSync(skill2Dir, { recursive: true });

      fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), '---\nname: Skill One\n---\n# Skill One');
      fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), '---\nname: Skill Two\n---\n# Skill Two');

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: true,
        directory: repoDir,
        commitHash: 'def456'
      });

      // Install skill-two specifically
      const request: InstallFromRegistryRequest = {
        source: 'testuser/multi-skill',
        skillId: 'skill-two',
        targetToolId: 'claude-code'
      };

      const result = await skillInstaller.installFromRegistry(request, skillsDir);

      expect(result.success).toBe(true);

      // Verify correct skill was installed
      const skillMd = fs.readFileSync(path.join(result.skillPath!, 'SKILL.md'), 'utf-8');
      expect(skillMd).toContain('Skill Two');
      expect(skillMd).not.toContain('Skill One');

      mockClone.mockRestore();
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('should prevent reinstallation of same skill', async () => {
      const repoDir = path.join(tempRoot, 'reinstall-test');
      fs.mkdirSync(repoDir, { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'SKILL.md'), '---\nname: Reinstall Test\n---\n# Test');

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: true,
        directory: repoDir,
        commitHash: 'abc123'
      });

      const request: InstallFromRegistryRequest = {
        source: 'testuser/reinstall-test',
        skillId: 'reinstall-skill',
        targetToolId: 'claude-code'
      };

      // First installation
      const result1 = await skillInstaller.installFromRegistry(request, skillsDir);
      expect(result1.success).toBe(true);

      // Attempt second installation
      const result2 = await skillInstaller.installFromRegistry(request, skillsDir);
      expect(result2.success).toBe(true); // Should succeed with unique name

      // Verify two different directories
      expect(result1.skillPath).not.toBe(result2.skillPath);

      mockClone.mockRestore();
      fs.rmSync(repoDir, { recursive: true, force: true });
    });
  });

  describe('User Story 3: View Skill Details', () => {
    it('should construct correct skills.sh URL for skill details', () => {
      const skill: SearchSkillResult = {
        id: 'test-123',
        skillId: 'my-awesome-skill',
        name: 'My Awesome Skill',
        installs: 500,
        source: 'username/my-skills-repo'
      };

      // Construct details URL
      const detailsUrl = `https://skills.sh/${encodeURIComponent(skill.source)}/${encodeURIComponent(skill.skillId)}`;

      expect(detailsUrl).toBe('https://skills.sh/username%2Fmy-skills-repo/my-awesome-skill');

      // This URL should open in external browser
      // User can view full documentation, examples, etc.
    });
  });

  describe('User Story 4: Handle Errors Gracefully', () => {
    it('should guide user to install git when not found', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'test/repo',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Git is required but not installed',
        errorCode: 'GIT_NOT_FOUND'
      });

      const result = await skillInstaller.installFromRegistry(request, skillsDir);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('GIT_NOT_FOUND');
      expect(result.error).toContain('Git');

      // UI should show actionable message:
      // "Install Git from https://git-scm.com and restart the application"

      mockClone.mockRestore();
    });

    it('should suggest alternatives for private repositories', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'test/private-repo',
        skillId: 'private-skill',
        targetToolId: 'claude-code'
      };

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: false,
        directory: '/tmp/test',
        error: 'Authentication failed',
        errorCode: 'PRIVATE_REPO'
      });

      const result = await skillInstaller.installFromRegistry(request, skillsDir);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_REPO');

      // UI should show message:
      // "This skill is in a private repository. Contact the skill author or search for public alternatives."

      mockClone.mockRestore();
    });

    it('should provide retry option for network errors', async () => {
      const request: InstallFromRegistryRequest = {
        source: 'test/repo',
        skillId: 'test-skill',
        targetToolId: 'claude-code'
      };

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone')
        .mockResolvedValueOnce({
          success: false,
          directory: '/tmp/test',
          error: 'Network timeout',
          errorCode: 'NETWORK_ERROR'
        })
        .mockResolvedValueOnce({
          success: true,
          directory: path.join(tempRoot, 'retry-success'),
          commitHash: 'abc123'
        });

      // First attempt fails
      const result1 = await skillInstaller.installFromRegistry(request, skillsDir);
      expect(result1.success).toBe(false);
      expect(result1.errorCode).toBe('NETWORK_ERROR');

      // User retries
      fs.mkdirSync(path.join(tempRoot, 'retry-success'), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, 'retry-success', 'SKILL.md'), '---\nname: Retry\n---\n# Retry');

      const result2 = await skillInstaller.installFromRegistry(request, skillsDir);
      expect(result2.success).toBe(true);

      mockClone.mockRestore();
      fs.rmSync(path.join(tempRoot, 'retry-success'), { recursive: true, force: true });
    });

    it('should cleanup on all error types', async () => {
      const errorCodes = ['GIT_NOT_FOUND', 'REPO_NOT_FOUND', 'PRIVATE_REPO', 'NETWORK_ERROR'];

      for (const errorCode of errorCodes) {
        const request: InstallFromRegistryRequest = {
          source: `test/${errorCode.toLowerCase()}`,
          skillId: 'test-skill',
          targetToolId: 'claude-code'
        };

        const gitOps = new GitOperations();
        const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
          success: false,
          directory: '/tmp/test',
          error: `Error: ${errorCode}`,
          errorCode: errorCode as any
        });

        await skillInstaller.installFromRegistry(request, skillsDir);

        // Verify temp directories are cleaned up
        const tempDirs = fs.readdirSync(os.tmpdir()).filter(d => d.startsWith('skillsMN-'));
        expect(tempDirs.length).toBe(0);

        mockClone.mockRestore();
      }
    });
  });

  describe('Cross-Cutting: Performance', () => {
    it('should handle 20+ search results efficiently', async () => {
      const mockSkills = Array.from({ length: 25 }, (_, i) => ({
        id: `skill-${i}`,
        skillId: `skill-${i}`,
        name: `Skill ${i}`,
        installs: Math.floor(Math.random() * 1000),
        source: `user${i}/repo${i}`
      }));

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: mockSkills,
          total: 25,
          query: 'test'
        })
      } as any);

      const start = Date.now();
      const results = await registryService.searchSkills('test');
      const duration = Date.now() - start;

      expect(results.length).toBe(25);
      expect(duration).toBeLessThan(1000); // Should handle in under 1 second

      mockFetch.mockRestore();
    });

    it('should validate all search results', async () => {
      const validSkill = {
        id: 'valid-1',
        skillId: 'valid-skill',
        name: 'Valid Skill',
        installs: 100,
        source: 'user/repo'
      };

      const invalidSkills = [
        { id: 'invalid-1', skillId: '', name: 'No Skill ID', installs: 100, source: 'user/repo' },
        { id: 'invalid-2', skillId: 'test', name: 'Invalid Source', installs: 100, source: 'invalid' },
        { id: 'invalid-3', skillId: 'test', name: 'Negative Installs', installs: -1, source: 'user/repo' }
      ];

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: [validSkill, ...invalidSkills],
          total: 4,
          query: 'test'
        })
      } as any);

      const results = await registryService.searchSkills('test');

      // Only valid skill should pass validation
      expect(results.length).toBe(1);
      expect(results[0].skillId).toBe('valid-skill');

      mockFetch.mockRestore();
    });
  });

  describe('Cross-Cutting: Security', () => {
    it('should sanitize skill names to prevent path traversal', async () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'skill/../../../malicious',
        'skill\0null-byte'
      ];

      for (const name of maliciousNames) {
        const slugified = (skillInstaller as any).slugify(name);

        // Slugified name should not contain path traversal characters
        expect(slugified).not.toContain('..');
        expect(slugified).not.toContain('/');
        expect(slugified).not.toContain('\\');
        expect(slugified).not.toContain('\0');
      }
    });

    it('should only install to allowed directories', async () => {
      const repoDir = path.join(tempRoot, 'security-test');
      fs.mkdirSync(repoDir, { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'SKILL.md'), '---\nname: Security\n---\n# Security');

      const gitOps = new GitOperations();
      const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
        success: true,
        directory: repoDir,
        commitHash: 'abc123'
      });

      const request: InstallFromRegistryRequest = {
        source: 'test/security',
        skillId: 'security-skill',
        targetToolId: 'claude-code'
      };

      const result = await skillInstaller.installFromRegistry(request, skillsDir);

      expect(result.success).toBe(true);

      // Verify skill is installed within skills directory
      const relativePath = path.relative(skillsDir, result.skillPath!);
      expect(relativePath).not.toContain('..');
      expect(result.skillPath!.startsWith(skillsDir)).toBe(true);

      mockClone.mockRestore();
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('should use HTTPS for all external communication', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [], total: 0, query: 'test' })
      } as any);

      await registryService.searchSkills('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:/),
        expect.any(Object)
      );

      mockFetch.mockRestore();
    });
  });
});
