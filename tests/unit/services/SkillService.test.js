"use strict";
/**
 * SkillService Unit Tests
 *
 * Tests for skill scanning, creation, reading, updating, and deletion
 * Note: Some integration tests require full fs.promises mocking which is complex
 * This test file covers the core logic that can be reliably unit tested
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const SkillService_1 = require("../../../src/main/services/SkillService");
// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../src/main/utils/Logger');
jest.mock('../../../src/main/utils/ErrorHandler');
jest.mock('../../../src/main/models/Skill');
jest.mock('../../../src/main/models/SkillDirectory');
jest.mock('electron', () => ({
    app: {
        getAppPath: jest.fn(() => '/test/app'),
        getPath: jest.fn((name) => `/test/${name}`)
    }
}));
describe('SkillService', () => {
    let skillService;
    let mockPathValidator;
    let mockConfig;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock PathValidator
        mockPathValidator = {
            validate: jest.fn((path) => path),
            getSkillSource: jest.fn(() => 'project'),
            isGlobalPath: jest.fn(() => false),
            isProjectPath: jest.fn(() => true),
        };
        // Create SkillService instance
        skillService = new SkillService_1.SkillService(mockPathValidator);
        // Mock config
        mockConfig = {
            projectDirectory: '/test/project',
            projectDirectories: ['/test/project'],
            defaultInstallDirectory: 'project',
            editorDefaultMode: 'edit',
            autoRefresh: true,
        };
    });
    describe('listAllSkills()', () => {
        it('should scan both global and project directories', async () => {
            // Mock file system
            fs_1.default.existsSync.mockReturnValue(true);
            // Mock SkillDirectoryModel.getSkillDirectories
            const { SkillDirectoryModel } = require('../../../src/main/models/SkillDirectory');
            SkillDirectoryModel.getSkillDirectories = jest.fn()
                .mockResolvedValueOnce(['/global/skill1']) // Global
                .mockResolvedValueOnce(['/project/skill2']); // Project
            // Mock SkillModel.fromDirectory
            const { SkillModel } = require('../../../src/main/models/Skill');
            SkillModel.fromDirectory = jest.fn()
                .mockResolvedValueOnce({
                name: 'Global Skill',
                path: '/global/skill1',
                source: 'global',
                description: 'Test',
                lastModified: new Date(),
                resourceCount: 0,
            })
                .mockResolvedValueOnce({
                name: 'Project Skill',
                path: '/project/skill2',
                source: 'project',
                description: 'Test',
                lastModified: new Date(),
                resourceCount: 0,
            });
            const skills = await skillService.listAllSkills(mockConfig);
            expect(skills).toHaveLength(2);
            expect(skills[0].name).toBe('Global Skill');
            expect(skills[1].name).toBe('Project Skill');
            expect(skills[0].source).toBe('global');
            expect(skills[1].source).toBe('project');
        });
        it('should only scan global directory when no project directory configured', async () => {
            const configNoProject = { ...mockConfig, projectDirectory: null };
            fs_1.default.existsSync.mockReturnValue(true);
            const { SkillDirectoryModel } = require('../../../src/main/models/SkillDirectory');
            SkillDirectoryModel.getSkillDirectories = jest.fn().mockResolvedValue(['/global/skill1']);
            const { SkillModel } = require('../../../src/main/models/Skill');
            SkillModel.fromDirectory = jest.fn().mockResolvedValue({
                name: 'Global Skill',
                path: '/global/skill1',
                source: 'global',
            });
            await skillService.listAllSkills(configNoProject);
            // Should only scan global directory
            expect(SkillDirectoryModel.getSkillDirectories).toHaveBeenCalledTimes(1);
        });
        it('should handle scan errors gracefully', async () => {
            fs_1.default.existsSync.mockReturnValue(true);
            const { SkillDirectoryModel } = require('../../../src/main/models/SkillDirectory');
            SkillDirectoryModel.getSkillDirectories = jest.fn().mockRejectedValue(new Error('Scan failed'));
            const skills = await skillService.listAllSkills(mockConfig);
            // Should return empty array on error
            expect(skills).toEqual([]);
        });
    });
    describe('getSkill()', () => {
        it('should validate path before reading', async () => {
            const skillPath = '/malicious/path';
            mockPathValidator.validate.mockImplementation(() => {
                throw new Error('Path validation failed');
            });
            await expect(skillService.getSkill(skillPath)).rejects.toThrow('Path validation failed');
        });
    });
    describe('createSkill()', () => {
        it('should reject duplicate skill names', async () => {
            const skillName = 'Existing Skill';
            skillService.getConfig = jest.fn().mockResolvedValue(mockConfig);
            fs_1.default.existsSync.mockReturnValue(true); // Already exists
            await expect(skillService.createSkill(skillName, 'project'))
                .rejects.toThrow('Skill already exists');
        });
    });
    describe('deleteSkill()', () => {
        it('should validate path before deletion', async () => {
            const skillPath = '/malicious/path';
            mockPathValidator.validate.mockImplementation(() => {
                throw new Error('Path validation failed');
            });
            await expect(skillService.deleteSkill(skillPath))
                .rejects.toThrow('Path validation failed');
        });
    });
    describe('toKebabCase()', () => {
        it('should convert spaces to hyphens', () => {
            const result = skillService.toKebabCase('My Test Skill');
            expect(result).toBe('my-test-skill');
        });
        it('should remove special characters', () => {
            const result = skillService.toKebabCase('Test@Skill#123!');
            expect(result).toBe('test-skill-123');
        });
        it('should trim whitespace', () => {
            const result = skillService.toKebabCase('  Test Skill  ');
            expect(result).toBe('test-skill');
        });
        it('should handle multiple consecutive spaces', () => {
            const result = skillService.toKebabCase('Test   Skill');
            expect(result).toBe('test-skill');
        });
        it('should handle leading and trailing hyphens', () => {
            const result = skillService.toKebabCase('---Test Skill---');
            expect(result).toBe('test-skill');
        });
    });
    describe('scanDirectory()', () => {
        it('should return empty array when directory does not exist', async () => {
            fs_1.default.existsSync.mockReturnValue(false);
            const result = await skillService.scanDirectory('/nonexistent', 'project');
            expect(result).toEqual([]);
        });
        it('should continue on individual skill parse errors', async () => {
            fs_1.default.existsSync.mockReturnValue(true);
            const { SkillDirectoryModel } = require('../../../src/main/models/SkillDirectory');
            SkillDirectoryModel.getSkillDirectories = jest.fn()
                .mockResolvedValue(['/dir/skill1', '/dir/skill2']);
            const { SkillModel } = require('../../../src/main/models/Skill');
            SkillModel.fromDirectory = jest.fn()
                .mockRejectedValueOnce(new Error('Parse error'))
                .mockResolvedValueOnce({
                name: 'Valid Skill',
                path: '/dir/skill2',
                source: 'project',
            });
            const result = await skillService.scanDirectory('/dir', 'project');
            // Should have 1 skill (the valid one)
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Valid Skill');
        });
    });
});
//# sourceMappingURL=SkillService.test.js.map