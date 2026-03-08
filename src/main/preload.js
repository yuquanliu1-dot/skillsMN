//preload.js - Exposed API to renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config operations
  configGet: () => ipcRenderer.invoke('config:get'),
  configSet: (data) => ipcRenderer.invoke('config:set', data),
  configValidateProjectDir: (path) => ipcRenderer.invoke('config:validate-project-dir', path),

  // Skill operations
  skillList: (filter, sort) => ipcRenderer.invoke('skill:list', { filter, sort }),
  skillCreate: (data) => ipcRenderer.invoke('skill:create', data),
  skillRead: (filePath) => ipcRenderer.invoke('skill:read', { filePath }),
  skillUpdate: (filePath, content) => ipcRenderer.invoke('skill:update', { filePath, content }),
  skillDelete: (filePath) => ipcRenderer.invoke('skill:delete', { filePath }),

  // Directory operations
  directoryScan: (dirPath, recursive) => ipcRenderer.invoke('directory:scan', { directoryPath: dirPath, recursive }),
  directoryStartWatch: (dirPath) => ipcRenderer.invoke('directory:start-watch', { directoryPath: dirPath }),
  directoryStopWatch: (watcherId) => ipcRenderer.invoke('directory:stop-watch', { watcherId }),

  // Events
  onDirectoryChange: (callback) => {
    ipcRenderer.on('directory:change', (event, ...args) => callback(...args));
  },
  removeDirectoryChangeListener: () => {
    ipcRenderer.removeAllListeners('directory:change');
  },
});
