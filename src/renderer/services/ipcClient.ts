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
 * IPC Client
 *
 * Wrapper around electronAPI with error handling
 */
export const ipcClient = {
  // ============================================================================
  // Skill Operations
  // ============================================================================

  async listSkills(config?: Configuration): Promise<Skill[]> {
    const response = await window.electronAPI.listSkills(config);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async getSkill(path: string): Promise<{ metadata: Skill; content: string }> {
    const response = await window.electronAPI.getSkill(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async createSkill(name: string, directory: SkillSource): Promise<Skill> {
    const response = await window.electronAPI.createSkill(name, directory);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async updateSkill(path: string, content: string): Promise<Skill> {
    const response = await window.electronAPI.updateSkill(path, content);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async deleteSkill(path: string): Promise<void> {
    const response = await window.electronAPI.deleteSkill(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  async openFolder(path: string): Promise<void> {
    const response = await window.electronAPI.openFolder(path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  // ============================================================================
  // Configuration Operations
  // ============================================================================

  async loadConfig(): Promise<Configuration> {
    const response = await window.electronAPI.loadConfig();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async saveConfig(config: Partial<Configuration>): Promise<Configuration> {
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
    const response = await window.electronAPI.startWatching();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  async stopWatching(): Promise<void> {
    const response = await window.electronAPI.stopWatching();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  onFSChange(callback: (event: FSEvent) => void): void {
    window.electronAPI.onFSChange(callback);
  },

  removeFSChangeListener(): void {
    window.electronAPI.removeFSChangeListener();
  },
};
