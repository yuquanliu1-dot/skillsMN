import '@testing-library/jest-dom';

// Mock Electron APIs for testing
global.window.electronAPI = {
  listSkills: jest.fn(),
  getSkill: jest.fn(),
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  deleteSkill: jest.fn(),
  openFolder: jest.fn(),
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  startWatching: jest.fn(),
  stopWatching: jest.fn(),
  onFSChange: jest.fn(),
  removeFSChangeListener: jest.fn(),
};
