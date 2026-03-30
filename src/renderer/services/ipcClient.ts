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
  IPCResponse,
  PrivateRepo,
  VersionComparison,
  SkillFileTreeNode,
  SkillFileContent,
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

  async createSkill(name: string): Promise<Skill> {
    if (!isElectron()) {
      throw new Error('Cannot create skill in browser mode');
    }
    // Skills are always created in the centralized application directory
    const response = await window.electronAPI.createSkill(name);
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

  async checkForUpdates(skills: Skill[]): Promise<Record<string, VersionComparison>> {
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot check updates in browser mode');
      return {};
    }
    const response = await window.electronAPI.checkForUpdates(skills);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async updateSkillFromSource(skillPath: string, createBackup: boolean = true): Promise<{ newPath: string }> {
    if (!isElectron()) {
      throw new Error('Cannot update skill in browser mode');
    }
    const response = await window.electronAPI.updateSkillFromSource(skillPath, createBackup);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async getSkillFileTree(skillPath: string): Promise<SkillFileTreeNode> {
    if (!isElectron()) {
      throw new Error('Cannot get file tree in browser mode');
    }
    const response = await window.electronAPI.getSkillFileTree(skillPath);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async readSkillFile(filePath: string): Promise<SkillFileContent> {
    if (!isElectron()) {
      throw new Error('Cannot read skill file in browser mode');
    }
    const response = await window.electronAPI.readSkillFile(filePath);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  async writeSkillFile(filePath: string, content: string): Promise<void> {
    if (!isElectron()) {
      throw new Error('Cannot write skill file in browser mode');
    }
    const response = await window.electronAPI.writeSkillFile(filePath, content);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
  },

  async ensureSourceMetadata(skillPath: string): Promise<void> {
    if (!isElectron()) {
      throw new Error('Cannot ensure source metadata in browser mode');
    }
    const response = await window.electronAPI.ensureSourceMetadata(skillPath);
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
        projectDirectories: [],
        defaultInstallDirectory: 'project',
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
    console.log('[IPC Client] startWatching() called');
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot start watching in browser mode');
      return;
    }
    console.log('[IPC Client] Calling window.electronAPI.startWatching()...');
    const response = await window.electronAPI.startWatching();
    console.log('[IPC Client] startWatching() response:', response);
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    console.log('[IPC Client] startWatching() completed successfully');
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
    console.log('[IPC Client] onFSChange called');
    if (!isElectron()) {
      console.warn('[IPC Client] Cannot register FS listener in browser mode');
      return;
    }
    if (window.electronAPI?.onFSChange) {
      console.log('[IPC Client] Registering FS change listener');
      window.electronAPI.onFSChange((event) => {
        console.log('[IPC Client] FS change event received:', event);
        callback(event);
      });
    } else {
      console.error('[IPC Client] electronAPI.onFSChange not available');
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

  // ============================================================================
  // Private Repository Operations
  // ============================================================================

  /**
   * List all private repositories
   */
  listPrivateRepos: async (): Promise<PrivateRepo[]> => {
    if (!isElectron()) {
      console.warn('[IPC Client] Running in browser mode - returning empty repos');
      return [];
    }
    const response = await window.electronAPI.listPrivateRepos();
    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }
    return response.data!;
  },

  /**
   * Upload a skill to a private repository
   */
  uploadSkillToPrivateRepo: async (params: {
    repoId: string;
    skillPath: string;
    skillContent: string;
    skillName: string;
    commitMessage?: string;
  }): Promise<IPCResponse<{ sha: string }>> => {
    if (!isElectron()) {
      return { success: false, error: { code: 'NOT_ELECTRON', message: 'Not running in Electron' } };
    }
    if (!window.electronAPI?.uploadSkillToPrivateRepo) {
      return { success: false, error: { code: 'API_NOT_AVAILABLE', message: 'Electron API not available' } };
    }
    return window.electronAPI.uploadSkillToPrivateRepo(params);
  },
};
