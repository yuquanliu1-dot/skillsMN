/**
 * Type declarations for Electron renderer APIs
 */

import { IPCResponse } from './shared/types';

export interface ElectronAPI {
  configGet: () => Promise<IPCResponse<any>>;
  configSet: (updates: any) => Promise<IPCResponse<any>>;
  configValidateProjectDir: (path: string) => Promise<IPCResponse<any>>;
  skillList: (filter?: any, sort?: any) => Promise<IPCResponse<any>>;
  skillCreate: (name: string, targetDirectory: string, description?: string) => Promise<IPCResponse<any>>;
  skillRead: (filePath: string) => Promise<IPCResponse<any>>;
  skillUpdate: (filePath: string, content: string) => Promise<IPCResponse<any>>;
  skillDelete: (filePath: string) => Promise<IPCResponse<any>>;
  directoryScan: (directoryPath: string, recursive?: boolean) => Promise<IPCResponse<any>>;
  directoryStartWatch: (directoryPath: string) => Promise<IPCResponse<any>>;
  directoryStopWatch: (watcherId: string) => Promise<IPCResponse<any>>;
  onDirectoryChange: (callback: (event: any) => void) => void;
  removeDirectoryChangeListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
