"use strict";
/**
 * Test Fixtures - Sample Configuration Data
 *
 * Provides sample configurations for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoSaveDelays = exports.tabSizes = exports.fontSizes = exports.editorThemes = exports.migrationTestData = exports.invalidConfig = exports.emptyConfig = exports.minimalConfig = exports.sampleConfig = exports.samplePrivateRepos = exports.sampleAIConfig = exports.sampleEditorConfig = void 0;
exports.generateTestConfig = generateTestConfig;
/**
 * Sample skill editor configuration
 */
exports.sampleEditorConfig = {
    fontSize: 14,
    theme: 'light',
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    showMinimap: false,
    lineNumbers: 'on',
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    tabSize: 2,
    wordWrap: true,
};
/**
 * Sample AI configuration
 */
exports.sampleAIConfig = {
    provider: 'anthropic',
    apiKey: 'sk-test-api-key',
    model: 'claude-3-sonnet-20240229',
    baseUrl: undefined,
};
/**
 * Sample private repository configuration
 */
exports.samplePrivateRepos = [
    {
        id: 'github-test-1',
        type: 'github',
        owner: 'test-org',
        repo: 'test-skills',
        pat: 'ghp_test_token',
        displayName: 'test-org/test-skills',
    },
    {
        id: 'gitlab-test-1',
        type: 'gitlab',
        url: 'https://gitlab.test.com/team/skills',
        pat: 'glpat_test_token',
        displayName: 'team/skills (GitLab)',
    },
];
/**
 * Sample full configuration
 */
exports.sampleConfig = {
    projectDirectories: ['/test/skills/directory'],
    applicationSkillsDirectory: '/test/.skillsmn/skills',
    editorDefaultMode: 'edit',
    autoRefresh: true,
    skillEditorConfig: exports.sampleEditorConfig,
    aiConfig: exports.sampleAIConfig,
    privateRepos: exports.samplePrivateRepos,
};
/**
 * Minimal configuration (no AI, no private repos)
 */
exports.minimalConfig = {
    projectDirectories: ['/test/skills/directory'],
    applicationSkillsDirectory: '/test/.skillsmn/skills',
    editorDefaultMode: 'edit',
    autoRefresh: true,
    skillEditorConfig: exports.sampleEditorConfig,
};
/**
 * Configuration without project directories (initial state)
 */
exports.emptyConfig = {
    projectDirectories: [],
    applicationSkillsDirectory: undefined,
    editorDefaultMode: 'edit',
    autoRefresh: true,
    skillEditorConfig: exports.sampleEditorConfig,
};
/**
 * Generate test configuration with custom directories
 */
function generateTestConfig(directories) {
    return {
        ...exports.sampleConfig,
        projectDirectories: directories,
        applicationSkillsDirectory: directories[0] ? `${directories[0]}/.skillsmn` : undefined,
    };
}
/**
 * Invalid configuration for error testing
 */
exports.invalidConfig = {
    projectDirectories: ['/nonexistent/path'],
    skillEditorConfig: {
        fontSize: -1, // Invalid
        theme: 'invalid-theme', // Invalid
    },
};
/**
 * Migration test data
 */
exports.migrationTestData = {
    oldConfigPath: '/old/.skillsmn/config.json',
    newConfigPath: '/new/.skillsmn/config.json',
    skillsToMigrate: [
        { name: 'Old Skill 1', path: '/old/.skills/skill-1' },
        { name: 'Old Skill 2', path: '/old/.skills/skill-2' },
    ],
};
/**
 * Editor themes for testing
 */
exports.editorThemes = ['light', 'dark', 'vs-dark'];
/**
 * Font sizes for testing
 */
exports.fontSizes = [10, 12, 14, 16, 18, 20];
/**
 * Tab sizes for testing
 */
exports.tabSizes = [2, 4, 8];
/**
 * Auto-save delays for testing (in ms)
 */
exports.autoSaveDelays = [1000, 2000, 5000, 10000];
//# sourceMappingURL=config.js.map