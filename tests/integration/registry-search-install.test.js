"use strict";
/**
 * Registry Search Integration Tests
 *
 * Tests the complete flow from search → install → verify
 * Uses real file system operations in temporary directories
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const electron_1 = require("electron");
const RegistryService_1 = require("../../src/main/services/RegistryService");
const SkillInstaller_1 = require("../../src/main/services/SkillInstaller");
const gitOperations_1 = require("../../src/main/utils/gitOperations");
const skillDiscovery_1 = require("../../src/main/utils/skillDiscovery");
const registryHandlers_1 = require("../../src/main/ipc/registryHandlers");
// Mock node-fetch at module level
jest.mock('node-fetch');
describe('Registry Search Integration Tests', () => {
    let tempDir;
    let skillsDir;
    let registryService;
    let skillInstaller;
    beforeAll(() => {
        // Create temp directory for tests
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsmn-integration-'));
        skillsDir = path.join(tempDir, 'skills');
        fs.mkdirSync(skillsDir, { recursive: true });
        // Initialize services
        registryService = new RegistryService_1.RegistryService();
        skillInstaller = new SkillInstaller_1.SkillInstaller();
        // Register IPC handlers
        (0, registryHandlers_1.registerRegistryHandlers)();
    });
    afterAll(() => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    describe('Search Flow', () => {
        it('should search skills.sh API and return results', async () => {
            const query = 'code review';
            // Get the mocked fetch
            const fetch = require('node-fetch');
            // Mock successful response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    skills: [
                        {
                            id: 'test-skill-1',
                            skillId: 'code-review-helper',
                            name: 'Code Review Helper',
                            installs: 1500,
                            source: 'testuser/code-review-skills'
                        }
                    ],
                    total: 1,
                    query
                })
            });
            const results = await registryService.searchSkills(query);
            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].skillId).toBe('code-review-helper');
        }, 10000);
        it('should handle empty search results', async () => {
            const query = 'nonexistent-skill-xyz';
            const fetch = require('node-fetch');
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    skills: [],
                    total: 0,
                    query
                })
            });
            const results = await registryService.searchSkills(query);
            expect(results).toBeDefined();
            expect(results.length).toBe(0);
        });
    });
    describe('Installation Flow', () => {
        let testRepoDir;
        beforeEach(() => {
            testRepoDir = path.join(tempDir, 'test-repo');
            fs.mkdirSync(testRepoDir, { recursive: true });
        });
        afterEach(() => {
            if (fs.existsSync(testRepoDir)) {
                fs.rmSync(testRepoDir, { recursive: true, force: true });
            }
        });
        it('should install a skill from a single-skill repository', async () => {
            const request = {
                source: 'testuser/single-skill',
                skillId: 'test-skill',
                targetToolId: 'claude-code'
            };
            // Create a mock skill directory structure
            const skillContent = `---
name: Test Skill
description: A test skill for integration testing
---

# Test Skill

This is a test skill.
`;
            fs.writeFileSync(path.join(testRepoDir, 'SKILL.md'), skillContent);
            // Mock git operations
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123d'
            });
            const progressEvents = [];
            const result = await skillInstaller.installFromRegistry(request, skillsDir, (event) => progressEvents.push(event.message));
            expect(result.success).toBe(true);
            expect(result.skillPath).toBeDefined();
            expect(fs.existsSync(result.skillPath)).toBe(true);
            expect(progressEvents.length).toBeGreaterThan(0);
            // Verify metadata was written
            const metadataPath = path.join(result.skillPath, '.source.json');
            expect(fs.existsSync(metadataPath)).toBe(true);
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            expect(metadata.type).toBe('registry');
            expect(metadata.source).toBe(request.source);
            expect(metadata.skillId).toBe(request.skillId);
            mockClone.mockRestore();
        }, 15000);
        it('should install a skill from a multi-skill repository', async () => {
            const request = {
                source: 'testuser/multi-skill',
                skillId: 'skill-2',
                targetToolId: 'claude-code'
            };
            // Create multi-skill structure
            const skill1Dir = path.join(testRepoDir, 'skill-1');
            const skill2Dir = path.join(testRepoDir, 'skill-2');
            fs.mkdirSync(skill1Dir, { recursive: true });
            fs.mkdirSync(skill2Dir, { recursive: true });
            fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), '---\nname: Skill 1\n---\n# Skill 1');
            fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), '---\nname: Skill 2\n---\n# Skill 2');
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'def456g'
            });
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(true);
            expect(result.skillPath).toBeDefined();
            // Verify correct skill was installed
            const skillMd = path.join(result.skillPath, 'SKILL.md');
            const content = fs.readFileSync(skillMd, 'utf-8');
            expect(content).toContain('Skill 2');
            mockClone.mockRestore();
        }, 15000);
        it('should cleanup temporary files on installation failure', async () => {
            const request = {
                source: 'testuser/failing-repo',
                skillId: 'nonexistent-skill',
                targetToolId: 'claude-code'
            };
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123'
            });
            // Don't create SKILL.md, so discovery will fail
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(false);
            // Verify temp directory was cleaned up
            const tempDirs = fs.readdirSync(os.tmpdir()).filter(d => d.startsWith('skillsMN-'));
            expect(tempDirs.length).toBe(0);
            mockClone.mockRestore();
        });
        it('should track installation progress through all stages', async () => {
            const request = {
                source: 'testuser/progress-test',
                skillId: 'test-skill',
                targetToolId: 'claude-code'
            };
            fs.writeFileSync(path.join(testRepoDir, 'SKILL.md'), '---\nname: Test\n---\n# Test');
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123'
            });
            const progressStages = [];
            await skillInstaller.installFromRegistry(request, skillsDir, (event) => progressStages.push(event.stage));
            expect(progressStages).toContain('cloning');
            expect(progressStages).toContain('discovering');
            expect(progressStages).toContain('copying');
            expect(progressStages).toContain('writing_metadata');
            expect(progressStages).toContain('cleaning_up');
            expect(progressStages).toContain('completed');
            mockClone.mockRestore();
        }, 15000);
    });
    describe('Error Handling', () => {
        it('should handle git not found error', async () => {
            const request = {
                source: 'testuser/test',
                skillId: 'test-skill',
                targetToolId: 'claude-code'
            };
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: false,
                directory: '/tmp/test',
                error: 'Git is required but not installed',
                errorCode: 'GIT_NOT_FOUND'
            });
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('GIT_NOT_FOUND');
            mockClone.mockRestore();
        });
        it('should handle private repository error', async () => {
            const request = {
                source: 'testuser/private-repo',
                skillId: 'private-skill',
                targetToolId: 'claude-code'
            };
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: false,
                directory: '/tmp/test',
                error: 'Authentication failed',
                errorCode: 'PRIVATE_REPO'
            });
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('PRIVATE_REPO');
            mockClone.mockRestore();
        });
        it('should handle repository not found error', async () => {
            const request = {
                source: 'testuser/nonexistent',
                skillId: 'test-skill',
                targetToolId: 'claude-code'
            };
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: false,
                directory: '/tmp/test',
                error: 'Repository not found',
                errorCode: 'REPO_NOT_FOUND'
            });
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('REPO_NOT_FOUND');
            mockClone.mockRestore();
        });
        it('should handle skill not found in repository', async () => {
            const request = {
                source: 'testuser/empty-repo',
                skillId: 'missing-skill',
                targetToolId: 'claude-code'
            };
            // Create empty repo
            const testRepoDir = path.join(tempDir, 'empty-repo');
            fs.mkdirSync(testRepoDir, { recursive: true });
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123'
            });
            const result = await skillInstaller.installFromRegistry(request, skillsDir);
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('REGISTRY_SKILL_NOT_FOUND');
            mockClone.mockRestore();
            fs.rmSync(testRepoDir, { recursive: true, force: true });
        });
    });
    describe('IPC Integration', () => {
        it('should handle registry:search IPC call', async () => {
            const fetch = require('node-fetch');
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    skills: [
                        {
                            id: 'test-1',
                            skillId: 'test-skill',
                            name: 'Test Skill',
                            installs: 100,
                            source: 'test/repo'
                        }
                    ],
                    total: 1,
                    query: 'test'
                })
            });
            // Simulate IPC call
            const event = {};
            const result = await electron_1.ipcMain.handle('registry:search', event, {
                query: 'test',
                limit: 20
            });
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.length).toBe(1);
        });
        it('should handle registry:install IPC call with progress events', async () => {
            const testRepoDir = path.join(tempDir, 'ipc-test-repo');
            fs.mkdirSync(testRepoDir, { recursive: true });
            fs.writeFileSync(path.join(testRepoDir, 'SKILL.md'), '---\nname: Test\n---\n# Test');
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123'
            });
            const request = {
                source: 'test/ipc-test',
                skillId: 'test-skill',
                targetToolId: 'claude-code'
            };
            // Simulate IPC call
            const event = {
                sender: {
                    send: jest.fn()
                }
            };
            const result = await electron_1.ipcMain.handle('registry:install', event, {
                request,
                targetDirectory: skillsDir
            });
            expect(result.success).toBe(true);
            // Verify progress events were sent
            expect(event.sender.send).toHaveBeenCalledWith('registry:install:progress', expect.objectContaining({
                stage: expect.any(String)
            }));
            mockClone.mockRestore();
            fs.rmSync(testRepoDir, { recursive: true, force: true });
        });
    });
    describe('File System Operations', () => {
        it('should create .source.json metadata file', async () => {
            const skillDir = path.join(skillsDir, 'metadata-test');
            fs.mkdirSync(skillDir, { recursive: true });
            const discovery = new skillDiscovery_1.SkillDiscovery();
            const metadata = {
                type: 'registry',
                registryUrl: 'https://skills.sh',
                source: 'test/metadata-test',
                skillId: 'metadata-skill',
                installedAt: new Date().toISOString(),
                commitHash: 'abc123'
            };
            await discovery.writeSourceMetadata(skillDir, metadata);
            const metadataPath = path.join(skillDir, '.source.json');
            expect(fs.existsSync(metadataPath)).toBe(true);
            const content = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            expect(content).toEqual(metadata);
            fs.rmSync(skillDir, { recursive: true, force: true });
        });
        it('should slugify skill names correctly', async () => {
            const testCases = [
                { input: 'Code Review Helper', expected: 'code-review-helper' },
                { input: 'Data_Analysis', expected: 'data-analysis' },
                { input: 'Test   Skill', expected: 'test-skill' },
                { input: 'UPPERCASE', expected: 'uppercase' }
            ];
            for (const { input, expected } of testCases) {
                const result = skillInstaller.slugify(input);
                expect(result).toBe(expected);
            }
        });
        it('should handle special characters in skill names', () => {
            const testCases = [
                { input: 'Skill@Name', expected: 'skillname' },
                { input: 'Test!Skill#123', expected: 'testskill123' },
                { input: 'Skill$Name%', expected: 'skillname' }
            ];
            for (const { input, expected } of testCases) {
                const result = skillInstaller.slugify(input);
                expect(result).toBe(expected);
            }
        });
    });
    describe('Performance', () => {
        it('should complete search in under 3 seconds', async () => {
            const fetch = require('node-fetch');
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ skills: [], total: 0, query: 'test' })
            });
            const start = Date.now();
            await registryService.searchSkills('test');
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(3000);
        });
        it('should complete installation in under 30 seconds (excluding network)', async () => {
            const testRepoDir = path.join(tempDir, 'perf-test');
            fs.mkdirSync(testRepoDir, { recursive: true });
            fs.writeFileSync(path.join(testRepoDir, 'SKILL.md'), '---\nname: Perf\n---\n# Perf');
            const gitOps = new gitOperations_1.GitOperations();
            const mockClone = jest.spyOn(gitOps, 'shallowClone').mockResolvedValue({
                success: true,
                directory: testRepoDir,
                commitHash: 'abc123'
            });
            const request = {
                source: 'test/perf',
                skillId: 'perf-skill',
                targetToolId: 'claude-code'
            };
            const start = Date.now();
            await skillInstaller.installFromRegistry(request, skillsDir);
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(30000);
            mockClone.mockRestore();
            fs.rmSync(testRepoDir, { recursive: true, force: true });
        }, 30000);
    });
});
//# sourceMappingURL=registry-search-install.test.js.map