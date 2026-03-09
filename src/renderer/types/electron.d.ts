/**
 * Electron API Type Definitions
 *
 * Type definitions for the Electron API exposed by preload script
 */

import type {
  Configuration,
  Skill,
  IPCResponse,
  FSEvent,
  SkillSource,
} from '../../shared/types';

export interface ElectronAPI {
  // Skill operations
  listSkills: (config?: Configuration) => Promise<IPCResponse<Skill[]>>;
  getSkill: (path: string) => Promise<IPCResponse<{ metadata: Skill; content: string }>>;
  createSkill: (name: string, directory: SkillSource) => Promise<IPCResponse<Skill>>;
  updateSkill: (path: string, content: string) => Promise<IPCResponse<Skill>>;
  deleteSkill: (path: string) => Promise<IPCResponse<void>>;
  openFolder: (path: string) => Promise<IPCResponse<void>>;

  // Configuration operations
  loadConfig: () => Promise<IPCResponse<Configuration>>;
  saveConfig: (config: Partial<Configuration>) => Promise<IPCResponse<Configuration>>;

  // File system watching
  startWatching: () => Promise<IPCResponse<void>>;
  stopWatching: () => Promise<IPCResponse<void>>;
  onFSChange: (callback: (event: FSEvent) => void) => void;
  removeFSChangeListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
