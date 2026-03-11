/**
 * ConfigService Unit Tests
 */

import fs from 'fs';
import path from 'path';
import { ConfigService } from '../../../src/main/services/ConfigService';
import { Configuration } from '../../../src/shared/types';

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
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService();
  });

  describe('load', () => {
    it('should create default config when file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = await configService.load();

      expect(config).toEqual({
        projectDirectory: null,
        defaultInstallDirectory: 'project',
        editorDefaultMode: 'edit',
        autoRefresh: true,
      });

      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should load and validate existing config', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          projectDirectory: '/Users/test/project',
          defaultInstallDirectory: 'global',
          editorDefaultMode: 'preview',
          autoRefresh: false,
        })
      );

      const config = await configService.load();

      expect(config.projectDirectory).toBe(path.normalize('/Users/test/project'));
      expect(config.defaultInstallDirectory).toBe('global');
      expect(config.editorDefaultMode).toBe('preview');
      expect(config.autoRefresh).toBe(false);
    });

    it('should return defaults when config file is corrupted', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

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
      const updates: Partial<Configuration> = {
        projectDirectory: '/Users/test/new-project',
      };

      const config = await configService.save(updates);

      expect(config.projectDirectory).toBe(path.normalize('/Users/test/new-project'));
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should merge updates with existing config', async () => {
      // Load initial config
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          projectDirectory: '/Users/test/project',
          autoRefresh: false,
        })
      );

      await configService.load();

      // Save partial update
      const updates: Partial<Configuration> = {
        defaultInstallDirectory: 'global',
      };

      const config = await configService.save(updates);

      expect(config.projectDirectory).toBe(path.normalize('/Users/test/project'));
      expect(config.defaultInstallDirectory).toBe('global');
      expect(config.autoRefresh).toBe(false);
    });

    it('should validate configuration before saving', async () => {
      const invalidUpdates: Partial<Configuration> = {
        defaultInstallDirectory: 'invalid' as any,
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
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const isConfigured = await configService.isConfigured();

      expect(isConfigured).toBe(false);
    });

    it('should return true when project directory is set', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          projectDirectory: '/Users/test/project',
        })
      );

      const isConfigured = await configService.isConfigured();

      expect(isConfigured).toBe(true);
    });
  });
});
