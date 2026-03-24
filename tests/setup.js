"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
// Mock Electron modules before any imports
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/user/data'),
        getVersion: jest.fn(() => '1.0.0'),
    },
    safeStorage: {
        isEncryptionAvailable: jest.fn(() => true),
        encryptString: jest.fn((str) => Buffer.from(str)),
        decryptString: jest.fn((buf) => buf.toString()),
    },
    ipcMain: {
        handle: jest.fn(),
        on: jest.fn(),
    },
    ipcRenderer: {
        invoke: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
    },
    contextBridge: {
        exposeInMainWorld: jest.fn(),
    },
}));
// Mock fetch globally for Node.js environment
if (typeof global !== 'undefined') {
    global.fetch = jest.fn();
}
// Mock Electron APIs for testing
global.window.electronAPI = {
    // Skill Operations
    listSkills: jest.fn(),
    getSkill: jest.fn(),
    createSkill: jest.fn(),
    updateSkill: jest.fn(),
    deleteSkill: jest.fn(),
    openFolder: jest.fn(),
    checkForUpdates: jest.fn(),
    updateSkillFromSource: jest.fn(),
    // Dialog Operations
    selectDirectory: jest.fn(),
    // Configuration Operations
    loadConfig: jest.fn(),
    saveConfig: jest.fn(),
    checkClaudeInstall: jest.fn(),
    // File System Watching
    startWatching: jest.fn(),
    stopWatching: jest.fn(),
    onFSChange: jest.fn(),
    removeFSChangeListener: jest.fn(),
    // AI Operations
    generateAI: jest.fn(),
    cancelAI: jest.fn(),
    onAIChunk: jest.fn(),
    removeAIChunkListener: jest.fn(),
    getAIConfiguration: jest.fn(),
    saveAIConfiguration: jest.fn(),
    testAIConnection: jest.fn(),
    // Private Repository Operations
    addPrivateRepo: jest.fn(),
    listPrivateRepos: jest.fn(),
    getPrivateRepo: jest.fn(),
    updatePrivateRepo: jest.fn(),
    removePrivateRepo: jest.fn(),
    testPrivateRepoConnection: jest.fn(),
    getPrivateRepoSkills: jest.fn(),
    getPrivateRepoSkillContent: jest.fn(),
    searchPrivateRepoSkills: jest.fn(),
    installPrivateRepoSkill: jest.fn(),
    checkPrivateSkillUpdates: jest.fn(),
    updatePrivateSkill: jest.fn(),
    uploadSkillToPrivateRepo: jest.fn(),
    // Registry Operations (Feature 006)
    searchRegistry: jest.fn(),
    installFromRegistry: jest.fn(),
    checkSkillInstalled: jest.fn(),
    getRegistrySkillContent: jest.fn(),
    onInstallProgress: jest.fn(),
    removeInstallProgressListener: jest.fn(),
    // GitHub Operations (Feature 004)
    searchGitHub: jest.fn(),
    previewGitHubSkill: jest.fn(),
    installGitHubSkill: jest.fn(),
    getCuratedSources: jest.fn(),
    getSkillsFromSource: jest.fn(),
    cancelGitHubInstall: jest.fn(),
    onGitHubInstallProgress: jest.fn(),
    removeGitHubInstallProgressListener: jest.fn(),
    setGitHubConflictPreference: jest.fn(),
    clearGitHubConflictPreference: jest.fn(),
    // Symlink Operations
    updateSymlink: jest.fn(),
    getSymlinkStatus: jest.fn(),
    getClaudeDirectories: jest.fn(),
    getInstalledTools: jest.fn(),
    updateSymlinkTarget: jest.fn(),
    getMultiSymlinkStatus: jest.fn(),
    // Migration Operations
    checkMigrationNeeded: jest.fn(),
    detectExistingSkills: jest.fn(),
    startMigration: jest.fn(),
    onMigrationProgress: jest.fn(),
    removeMigrationProgressListener: jest.fn(),
};
//# sourceMappingURL=setup.js.map