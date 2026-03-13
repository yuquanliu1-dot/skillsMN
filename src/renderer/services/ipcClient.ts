/**
 * IPC Client Service
 *
 * Provides type-safe IPC communication from renderer to main process
 */

import type {
  Configuration,
  Skill,
  FSEvent,
  SkillSource,
} from '../../shared/types';

/**
 * Check if running in Electron environment
 */
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

/**
 * IPC Client
 *
 * Wrapper around electronAPI with error handling
 */
export const ipcClient = {
  // ============================================================================
  // Skill Operations
  // ============================================================================

  async listSkills(config?: Configuration): Promise<Skill[]> {
    if (!isElectron()) {
      console.warn('[IPC Client] Running in browser mode - returning empty skills list');
      return [];
    }
    const response = await window.electronAPI.listSkills(config);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async getSkill(path: string): Promise<{ metadata: Skill; content: string }> {
    if (!isElectron()) {
      throw new Error('Cannot get skill in browser mode');
    }
    const response = await window.electronAPI.getSkill(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async createSkill(name: string, directory: SkillSource): Promise<Skill> {
    if (!isElectron()) {
      throw new Error('Cannot create skill in browser mode');
    }
    const response = await window.electronAPI.createSkill(name, directory);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async updateSkill(path: string, content: string): Promise<Skill> {
    if (!isElectron()) {
      throw new Error('Cannot update skill in browser mode');
    }
    const response = await window.electronAPI.updateSkill(path, content);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async deleteSkill(path: string): Promise<void> {
    if (!isElectron()) {
      throw new Error('Cannot delete skill in browser mode');
    }
    const response = await window.electronAPI.deleteSkill(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  async openFolder(path: string): Promise<void> {
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot open folder in browser mode');
      return;
    }
    const response = await window.electronAPI.openFolder(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  // ============================================================================
  // Configuration Operations
  // ============================================================================

  async loadConfig(): Promise<Configuration> {
    if (!isElectron()) {
      console.warn('[IPC Client] Running in browser mode - returning default config');
      return {
        projectDirectory: null,
        defaultInstallDirectory: 'project',
        editorDefaultMode: 'edit',
        autoRefresh: true,
      };
    }
    const response = await window.electronAPI.loadConfig();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async saveConfig(config: Partial<Configuration>): Promise<Configuration> {
    if (!isElectron()) {
      throw new Error('Cannot save config in browser mode');
    }
    const response = await window.electronAPI.saveConfig(config);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  // ============================================================================
  // File System Watching
  // ============================================================================

  async startWatching(): Promise<void> {
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot start watching in browser mode');
      return;
    }
    const response = await window.electronAPI.startWatching();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  async stopWatching(): Promise<void> {
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot stop watching in browser mode');
      return;
    }
    const response = await window.electronAPI.stopWatching();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  onFSChange(callback: (event: FSEvent) => void): void {
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot register FS listener in browser mode');
      return;
    }
    if (window.electronAPI?.onFSChange) {
      window.electronAPI.onFSChange(callback);
    }
  },

  removeFSChangeListener(): void {
    if (!isElectron()) {
      return;
    }
    if (window.electronAPI?.removeFSChangeListener) {
      window.electronAPI.removeFSChangeListener();
    }
  },
};
