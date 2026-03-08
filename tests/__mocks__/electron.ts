/**
 * Mock for electron module in tests
 */

export const app = {
  getPath: jest.fn((name: string) => {
    if (name === 'userData') {
      return '/tmp/test-user-data';
    }
    if (name === 'home') {
      return '/tmp/test-home';
    }
    return '/tmp/test-path';
  }),
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn(),
};

export const ipcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

export const BrowserWindow = {
  getAllWindows: jest.fn(() => []),
};

export const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};
