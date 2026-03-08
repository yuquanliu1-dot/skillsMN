/**
 * IPC Client - Wrapper for renderer-to-main communication
 * Provides typed methods for all IPC operations
 */

import {
  ConfigGetResponse,
  ConfigSetRequest,
  ConfigSetResponse,
  ConfigValidateProjectDirResponse,
  SkillListResponse,
  SkillCreateRequest,
  SkillCreateResponse,
  SkillReadRequest,
  SkillReadResponse,
  SkillUpdateRequest,
  SkillUpdateResponse,
  SkillDeleteRequest,
  SkillDeleteResponse,
  DirectoryScanResponse,
  DirectoryStartWatchResponse,
  DirectoryStopWatchResponse,
  DirectoryChangeEvent,
} from '../../shared/types';

/**
 * IPC Client wrapper with typed methods
 */
export class IPCClient {
  /**
   * Configuration operations
   */
  config = {
    /**
     * Get current configuration
     */
    get: async (): Promise<ConfigGetResponse> => {
      return window.electronAPI.configGet();
    },

    /**
     * Update configuration
     */
    set: async (updates: ConfigSetRequest): Promise<ConfigSetResponse> => {
      return window.electronAPI.configSet(updates);
    },

    /**
     * Validate project directory
     */
    validateProjectDir: async (path: string): Promise<ConfigValidateProjectDirResponse> => {
        return window.electronAPI.configValidateProjectDir(path);
      },
  };

  /**
   * Skill operations
   */
  skill = {
    /**
     * List all skills
     */
    list: async (
      filter?: { source?: 'project' | 'global'; searchTerm?: string },
      sort?: { field: 'name' | 'modifiedAt'; direction: 'asc' | 'desc' }
    ): Promise<SkillListResponse> => {
      return window.electronAPI.skillList(filter, sort);
    },

    /**
     * Create a new skill
     */
    create: async (
      name: string,
      targetDirectory: string,
      description?: string
    ): Promise<SkillCreateResponse> => {
      return window.electronAPI.skillCreate(name, targetDirectory, description);
    },

    /**
     * Read skill content
     */
    read: async (filePath: string): Promise<SkillReadResponse> => {
      return window.electronAPI.skillRead(filePath);
    },

    /**
     * Update skill content
     */
    update: async (filePath: string, content: string): Promise<SkillUpdateResponse> => {
      return window.electronAPI.skillUpdate(filePath, content);
    },

    /**
     * Delete a skill
     */
    delete: async (filePath: string): Promise<SkillDeleteResponse> => {
      return window.electronAPI.skillDelete(filePath);
    },
  };

  /**
   * Directory operations
   */
  directory = {
    /**
     * Scan directory for skills
     */
    scan: async (
      directoryPath: string,
      recursive = false
    ): Promise<DirectoryScanResponse> => {
      return window.electronAPI.directoryScan(directoryPath, recursive);
    },

    /**
     * Start watching directory for changes
     */
    startWatch: async (directoryPath: string): Promise<DirectoryStartWatchResponse> => {
      return window.electronAPI.directoryStartWatch(directoryPath);
    },

    /**
     * Stop watching directory
     */
    stopWatch: async (watcherId: string): Promise<DirectoryStopWatchResponse> => {
      return window.electronAPI.directoryStopWatch(watcherId);
    },

    /**
     * Subscribe to directory change events
     */
    onChange: (callback: (event: DirectoryChangeEvent) => void): (() => void) => {
      window.electronAPI.onDirectoryChange(callback);

      // Return unsubscribe function
      return () => {
        window.electronAPI.removeDirectoryChangeListener();
      };
    },
  };
}

/**
 * Singleton instance
 */
export const ipcClient = new IPCClient();
