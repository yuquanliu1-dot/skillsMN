/**
 * Preload script - Exposes selected Node.js APIs to renderer process
 * via contextBridge for secure IPC communication
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPCResponse } from '../shared/types';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration operations
  configGet: async (): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('config:get');
  },

  configSet: async (updates: any): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('config:set', updates);
  },

  configValidateProjectDir: async (path: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('config:validate-project-dir', { path });
  },

  // Skill operations
  skillList: async (filter?: any, sort?: any): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('skill:list', { filter, sort });
  },

  skillCreate: async (name: string, targetDirectory: string, description?: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('skill:create', { name, targetDirectory, description });
  },

  skillRead: async (filePath: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('skill:read', { filePath });
  },

  skillUpdate: async (filePath: string, content: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('skill:update', { filePath, content });
  },

  skillDelete: async (filePath: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('skill:delete', { filePath });
  },

  // Directory operations
  directoryScan: async (directoryPath: string, recursive?: boolean): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('directory:scan', { directoryPath, recursive });
  },

  directoryStartWatch: async (directoryPath: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('directory:start-watch', { directoryPath });
  },

  directoryStopWatch: async (watcherId: string): Promise<IPCResponse<any>> => {
    return await ipcRenderer.invoke('directory:stop-watch', { watcherId });
  },

  onDirectoryChange: (callback: (event: any) => void): void => {
    ipcRenderer.on('directory:change', callback);
  },

  removeDirectoryChangeListener: (): void => {
    ipcRenderer.removeAllListeners('directory:change');
  },
});
