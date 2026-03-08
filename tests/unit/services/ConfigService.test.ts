/**
 * Unit tests for ConfigService
 */

import { ConfigService } from '../../src/main/services/ConfigService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigService', () => {
  let configService: ConfigService;
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(fs.mkdtempSync(path.join(os.tmpdir(), 'skillsmm-config-test-')).name);
    configPath = path.join(tempDir, 'config.json');
    configService = new ConfigService(configPath);
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('load', () => {
    it('should create default config if file does not exist', () => {
      const config = configService.load();

      expect(config).toBeDefined();
      expect(config.projectSkillDir).toBe('');
      expect(config.globalSkillDir).toContain('.claude');
      expect(config.defaultInstallTarget).toBe('project');
      expect(config.editorDefaultMode).toBe('edit');
      expect(config.autoRefresh).toBe(true);
    });

    it('should load existing config from file', () => {
      const testConfig = {
        projectSkillDir: '/test/project',
        globalSkillDir: '/test/global',
        defaultInstallTarget: 'global' as const,
        editorDefaultMode: 'preview' as const,
        autoRefresh: false,
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf8');

      const config = configService.load();

      expect(config.projectSkillDir).toBe(testConfig.projectSkillDir);
      expect(config.globalSkillDir).toBe(testConfig.globalSkillDir);
      expect(config.defaultInstallTarget).toBe(testConfig.defaultInstallTarget);
      expect(config.editorDefaultMode).toBe(testConfig.editorDefaultMode);
      expect(config.autoRefresh).toBe(testConfig.autoRefresh);
    });

    it('should handle invalid JSON gracefully', () => {
      fs.writeFileSync(configPath, 'invalid json', 'utf8');

      // Should return default config instead of throwing
      const config = configService.load();
      expect(config).toBeDefined();
      expect(config.projectSkillDir).toBe('');
    });

    it('should validate config on load', () => {
      const invalidConfig = {
        projectSkillDir: 123, // Should be string
        globalSkillDir: '/test/global',
      };

      fs.writeFileSync(configPath, JSON.stringify(invalidConfig), 'utf8');

      // Should return default config for invalid data
      const config = configService.load();
      expect(config.projectSkillDir).toBe('');
    });
  });

  describe('save', () => {
    it('should save config to file', () => {
      const testConfig = {
        projectSkillDir: '/test/project',
        globalSkillDir: '/test/global',
        defaultInstallTarget: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      configService.save(testConfig);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(saved).toEqual(testConfig);
    });

    it('should create parent directories if needed', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'config.json');
      const nestedService = new ConfigService(nestedPath);

      const testConfig = {
        projectSkillDir: '/test',
        globalSkillDir: '/global',
        defaultInstallTarget: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      nestedService.save(testConfig);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should write atomically (temp file + rename)', () => {
      const testConfig = {
        projectSkillDir: '/test/project',
        globalSkillDir: '/test/global',
        defaultInstallTarget: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      configService.save(testConfig);

      // Should not have temp files left behind
      const files = fs.readdirSync(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp') || f.includes('.bak'));
      expect(tempFiles).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('should return current config', () => {
      const testConfig = {
        projectSkillDir: '/test/project',
        globalSkillDir: '/test/global',
        defaultInstallTarget: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      configService.save(testConfig);
      const config = configService.get();

      expect(config).toEqual(testConfig);
    });

    it('should load config if not in memory', () => {
      const testConfig = {
        projectSkillDir: '/test/project',
        globalSkillDir: '/test/global',
        defaultInstallTarget: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf8');

      const config = configService.get();
      expect(config.projectSkillDir).toBe(testConfig.projectSkillDir);
    });
  });

  describe('set', () => {
    it('should update specific config fields', () => {
      configService.load();

      configService.set({ defaultInstallTarget: 'global' });

      const config = configService.get();
      expect(config.defaultInstallTarget).toBe('global');
      // Other fields should remain unchanged
      expect(config.editorDefaultMode).toBe('edit');
    });

    it('should persist changes to file', () => {
      configService.load();

      configService.set({ autoRefresh: false });

      // Reload from file
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(saved.autoRefresh).toBe(false);
    });

    it('should validate new values before saving', () => {
      configService.load();

      expect(() => {
        configService.set({ defaultInstallTarget: 'invalid' as any });
      }).toThrow();
    });
  });

  describe('validateProjectDirectory', () => {
    it('should return valid for directory with .claude folder', () => {
      const projectDir = path.join(tempDir, 'my-project');
      const claudeDir = path.join(projectDir, '.claude');
      const skillsDir = path.join(claudeDir, 'skills');

      fs.mkdirSync(skillsDir, { recursive: true });

      const result = configService.validateProjectDirectory(projectDir);

      expect(result.isValid).toBe(true);
      expect(result.hasClaudeFolder).toBe(true);
      expect(result.skillsDir).toBe(skillsDir);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for directory without .claude folder', () => {
      const projectDir = path.join(tempDir, 'no-claude');
      fs.mkdirSync(projectDir, { recursive: true });

      const result = configService.validateProjectDirectory(projectDir);

      expect(result.isValid).toBe(false);
      expect(result.hasClaudeFolder).toBe(false);
      expect(result.skillsDir).toBeNull();
      expect(result.errors).toContain(expect.any(String));
    });

    it('should return invalid for non-existent directory', () => {
      const result = configService.validateProjectDirectory('/nonexistent/path');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for file path (not directory)', () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'test', 'utf8');

      const result = configService.validateProjectDirectory(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path is not a directory');
    });

    it('should suggest creating .claude folder if missing', () => {
      const projectDir = path.join(tempDir, 'project');
      fs.mkdirSync(projectDir, { recursive: true });

      const result = configService.validateProjectDirectory(projectDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('.claude folder not found'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should provide actionable error messages', () => {
      const result = configService.validateProjectDirectory('/nonexistent');

      expect(result.errors.length).toBeGreaterThan(0);
      // Error should suggest a solution
      expect(result.errors.some(e =>
        e.includes('select') || e.includes('create') || e.includes('check')
      )).toBe(true);
    });
  });
});
