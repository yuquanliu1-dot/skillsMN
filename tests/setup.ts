// Jest setup file - runs before each test
import '@testing-library/jest-dom';

// Mock Electron APIs for tests
global.window = {
  electronAPI: {
    configGet: jest.fn(),
    configSet: jest.fn(),
    configValidateProjectDir: jest.fn(),
    skillList: jest.fn(),
    skillCreate: jest.fn(),
    skillRead: jest.fn(),
    skillUpdate: jest.fn(),
    skillDelete: jest.fn(),
    directoryScan: jest.fn(),
    directoryStartWatch: jest.fn(),
    directoryStopWatch: jest.fn(),
    onDirectoryChange: jest.fn(),
    removeDirectoryChangeListener: jest.fn(),
  },
} as any;

// Increase timeout for slower CI environments
jest.setTimeout(10000);

// Suppress console logs in tests unless needed
if (process.env.VERBOSE !== 'true') {
  global.console.log = jest.fn();
  global.console.info = jest.fn();
  global.console.warn = jest.fn();
}
