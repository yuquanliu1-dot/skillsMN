"use strict";
/**
 * ConfigService Unit Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ConfigService_1 = require("../../../src/main/services/ConfigService");
// Mock Electron app
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/Users/test/.config/skillsmn'),
    },
}));
// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
    },
}));
describe('ConfigService', () => {
    let configService;
    beforeEach(() => {
        jest.clearAllMocks();
        configService = new ConfigService_1.ConfigService();
    });
    describe('load', () => {
        it('should create default config when file does not exist', async () => {
            fs_1.default.existsSync.mockReturnValue(false);
            const config = await configService.load();
            expect(config).toEqual({
                projectDirectory: null,
                defaultInstallDirectory: 'project',
                editorDefaultMode: 'edit',
                autoRefresh: true,
            });
            expect(fs_1.default.promises.writeFile).toHaveBeenCalled();
        });
        it('should load and validate existing config', async () => {
            fs_1.default.existsSync.mockReturnValue(true);
            fs_1.default.promises.readFile.mockResolvedValue(JSON.stringify({
                projectDirectory: '/Users/test/project',
                defaultInstallDirectory: 'global',
                editorDefaultMode: 'preview',
                autoRefresh: false,
            }));
            const config = await configService.load();
            expect(config.projectDirectory).toBe(path_1.default.normalize('/Users/test/project'));
            expect(config.defaultInstallDirectory).toBe('global');
            expect(config.editorDefaultMode).toBe('preview');
            expect(config.autoRefresh).toBe(false);
        });
        it('should return defaults when config file is corrupted', async () => {
            fs_1.default.existsSync.mockReturnValue(true);
            fs_1.default.promises.readFile.mockRejectedValue(new Error('Read error'));
            const config = await configService.load();
            expect(config).toEqual({
                projectDirectory: null,
                defaultInstallDirectory: 'project',
                editorDefaultMode: 'edit',
                autoRefresh: true,
            });
        });
    });
    describe('save', () => {
        it('should save valid configuration', async () => {
            const updates = {
                projectDirectory: '/Users/test/new-project',
            };
            const config = await configService.save(updates);
            expect(config.projectDirectory).toBe(path_1.default.normalize('/Users/test/new-project'));
            expect(fs_1.default.promises.writeFile).toHaveBeenCalled();
        });
        it('should merge updates with existing config', async () => {
            // Load initial config
            fs_1.default.existsSync.mockReturnValue(true);
            fs_1.default.promises.readFile.mockResolvedValue(JSON.stringify({
                projectDirectory: '/Users/test/project',
                autoRefresh: false,
            }));
            await configService.load();
            // Save partial update
            const updates = {
                defaultInstallDirectory: 'global',
            };
            const config = await configService.save(updates);
            expect(config.projectDirectory).toBe(path_1.default.normalize('/Users/test/project'));
            expect(config.defaultInstallDirectory).toBe('global');
            expect(config.autoRefresh).toBe(false);
        });
        it('should validate configuration before saving', async () => {
            const invalidUpdates = {
                defaultInstallDirectory: 'invalid',
            };
            await expect(configService.save(invalidUpdates)).rejects.toThrow();
        });
    });
    describe('reset', () => {
        it('should reset configuration to defaults', async () => {
            const config = await configService.reset();
            expect(config).toEqual({
                projectDirectory: null,
                defaultInstallDirectory: 'project',
                editorDefaultMode: 'edit',
                autoRefresh: true,
            });
        });
    });
    describe('isConfigured', () => {
        it('should return false when project directory is null', async () => {
            fs_1.default.existsSync.mockReturnValue(false);
            const isConfigured = await configService.isConfigured();
            expect(isConfigured).toBe(false);
        });
        it('should return true when project directory is set', async () => {
            fs_1.default.existsSync.mockReturnValue(true);
            fs_1.default.promises.readFile.mockResolvedValue(JSON.stringify({
                projectDirectory: '/Users/test/project',
            }));
            const isConfigured = await configService.isConfigured();
            expect(isConfigured).toBe(true);
        });
    });
});
//# sourceMappingURL=ConfigService.test.js.map