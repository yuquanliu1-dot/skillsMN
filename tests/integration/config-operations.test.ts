/**
 * Integration tests for config IPC operations
 */

import { ipcRenderer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Config IPC Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillsmm-ipc-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('config:get', () => {
    it('should return configuration', async () => {
      const response = await ipcRenderer.invoke('config:get');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.projectSkillDir).toBeDefined();
      expect(response.data.globalSkillDir).toBeDefined();
    });

    it('should return default configuration on first run', async () => {
      const response = await ipcRenderer.invoke('config:get');

      expect(response.success).toBe(true);
      expect(response.data.defaultInstallTarget).toBe('project');
      expect(response.data.editorDefaultMode).toBe('edit');
      expect(response.data.autoRefresh).toBe(true);
    });
  });

  describe('config:set', () => {
    it('should update configuration', async () => {
      // First get current config
      const initial = await ipcRenderer.invoke('config:get');
      expect(initial.success).toBe(true);

      // Update a setting
      const response = await ipcRenderer.invoke('config:set', {
        defaultInstallTarget: 'global',
      });

      expect(response.success).toBe(true);
      expect(response.data.defaultInstallTarget).toBe('global');
    });

    it('should persist configuration changes', async () => {
      // Set a value
      await ipcRenderer.invoke('config:set', {
        autoRefresh: false,
      });

      // Get it back
      const response = await ipcRenderer.invoke('config:get');
      expect(response.success).toBe(true);
      expect(response.data.autoRefresh).toBe(false);
    });

    it('should reject invalid values', async () => {
      const response = await ipcRenderer.invoke('config:set', {
        defaultInstallTarget: 'invalid' as any,
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe('EINVAL');
    });

    it('should validate project directory path', async () => {
      const response = await ipcRenderer.invoke('config:set', {
        projectSkillDir: '/nonexistent/path',
      });

      // Should accept any valid path string (validation happens separately)
      expect(response.success).toBe(true);
    });
  });

  describe('config:validate-project-dir', () => {
    it('should validate directory with .claude folder', async () => {
      const projectDir = path.join(tempDir, 'valid-project');
      const claudeDir = path.join(projectDir, '.claude', 'skills');
      fs.mkdirSync(claudeDir, { recursive: true });

      const response = await ipcRenderer.invoke('config:validate-project-dir', projectDir);

      expect(response.success).toBe(true);
      expect(response.data.isValid).toBe(true);
      expect(response.data.hasClaudeFolder).toBe(true);
      expect(response.data.skillsDir).toContain('.claude');
      expect(response.data.errors).toHaveLength(0);
    });

    it('should detect missing .claude folder', async () => {
      const projectDir = path.join(tempDir, 'invalid-project');
      fs.mkdirSync(projectDir, { recursive: true });

      const response = await ipcRenderer.invoke('config:validate-project-dir', projectDir);

      expect(response.success).toBe(true);
      expect(response.data.isValid).toBe(false);
      expect(response.data.hasClaudeFolder).toBe(false);
      expect(response.data.errors.length).toBeGreaterThan(0);
    });

    it('should handle non-existent directory', async () => {
      const response = await ipcRenderer.invoke('config:validate-project-dir', '/nonexistent/directory');

      expect(response.success).toBe(true);
      expect(response.data.isValid).toBe(false);
      expect(response.data.errors).toContain(expect.stringContaining('does not exist'));
    });

    it('should provide actionable error messages', async () => {
      const response = await ipcRenderer.invoke('config:validate-project-dir', '/invalid');

      expect(response.success).toBe(true);
      expect(response.data.errors.length).toBeGreaterThan(0);

      // Errors should suggest solutions
      const errorText = response.data.errors.join(' ');
      expect(
        errorText.includes('select') ||
        errorText.includes('create') ||
        errorText.includes('choose')
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return actionable errors', async () => {
    const response = await ipcRenderer.invoke('config:set', {
      defaultInstallTarget: 'invalid',
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error.code).toBeDefined();
    expect(response.error.userMessage).toBeDefined();
    expect(response.error.action).toBeDefined();
  });
});
});
