/**
 * Electron API Type Definitions for Renderer Process
 */

import type {
  Configuration,
  Skill,
  IPCResponse,
  FSEvent,
  AIGenerationRequest,
} from '../../shared/types';

export interface ElectronAPI {
  // Skill Operations
  listSkills: (config?: Configuration) => Promise<IPCResponse<Skill[]>>;
  getSkill: (path: string) => Promise<IPCResponse<{ metadata: Skill; content: string }>>;
  createSkill: (name: string, directory: string) => Promise<IPCResponse<Skill>>;
  updateSkill: (
    path: string,
    content: string,
    expectedLastModified?: number
  ) => Promise<IPCResponse<Skill>>;
  deleteSkill: (path: string) => Promise<IPCResponse<void>>;
  openFolder: (path: string) => Promise<IPCResponse<void>>;

  // Configuration Operations
  loadConfig: () => Promise<IPCResponse<Configuration>>;
  saveConfig: (config: Partial<Configuration>) => Promise<IPCResponse<Configuration>>;

  // File System Watching
  startWatching: () => Promise<IPCResponse<void>>;
  stopWatching: () => Promise<IPCResponse<void>>;
  onFSChange: (callback: (event: FSEvent) => void) => void;
  removeFSChangeListener: () => void;

  // AI Operations
  generateAI: (params: {
    requestId: string;
    request: AIGenerationRequest;
  }) => Promise<IPCResponse<void>>;
  cancelAI: (requestId: string) => Promise<IPCResponse<void>>;
  onAIChunk: (callback: (event: any, chunk: any) => void) => void;
  removeAIChunkListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
