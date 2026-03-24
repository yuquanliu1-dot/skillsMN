"use strict";
/**
 * E2E Test Helpers Index
 *
 * Re-exports all test utilities for convenient importing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRegistrySearch = exports.TestData = exports.SkillManagerHelper = exports.createMockErrorResponse = exports.createMockResponse = exports.mockSearchResultsResponse = exports.mockAIStreamChunk = exports.mockExternalModificationResponse = exports.mockValidationErrorResponse = exports.mockNotFoundResponse = exports.mockAuthErrorResponse = exports.mockErrorResponse = exports.mockClaudeDirectoriesResponse = exports.mockPrivateRepoSkillsResponse = exports.mockPrivateReposResponse = exports.mockConfigResponse = exports.mockDeleteSkillResponse = exports.mockUpdateSkillResponse = exports.mockCreateSkillResponse = exports.mockSkillResponse = exports.mockSkillsListResponse = exports.autoSaveDelays = exports.tabSizes = exports.fontSizes = exports.editorThemes = exports.migrationTestData = exports.invalidConfig = exports.generateTestConfig = exports.emptyConfig = exports.minimalConfig = exports.sampleConfig = exports.samplePrivateRepos = exports.sampleAIConfig = exports.sampleEditorConfig = exports.privateRepos = exports.privateSkills = exports.complexYamlSkillContent = exports.generateLargeSkillContent = exports.specialCharsSkillContent = exports.invalidSkillContent = exports.generateSkillContent = exports.generateUniqueSkillName = exports.sampleSkillContent = exports.testSkills = exports.SettingsPage = exports.PrivateReposPage = exports.DiscoverPage = exports.EditorPage = exports.SkillsPage = exports.AppPage = void 0;
exports.ensureSkillExists = exports.navigateToView = exports.waitForAppReady = exports.setupTestFixtures = exports.TestFixtureManager = exports.clearAIMocks = exports.mockAITokenLimit = exports.mockAIRateLimit = exports.mockAITimeout = exports.mockAIConnectionTest = exports.mockAIStreaming = exports.mockAIGeneration = exports.generateMockAIContent = exports.clearGitHubMocks = exports.mockGitHubServerError = exports.mockGitHubRateLimit = exports.mockGitHubUpdateFile = exports.mockGitHubCreateFile = exports.mockGitHubFileContent = exports.mockGitHubRepoContents = exports.mockGitHubAuth = exports.clearRegistryMocks = exports.mockRegistryRateLimit = exports.mockRegistryTimeout = exports.mockRegistryInstall = exports.mockRegistrySkillContent = void 0;
// Page Objects
var AppPage_1 = require("./page-objects/AppPage");
Object.defineProperty(exports, "AppPage", { enumerable: true, get: function () { return AppPage_1.AppPage; } });
var SkillsPage_1 = require("./page-objects/SkillsPage");
Object.defineProperty(exports, "SkillsPage", { enumerable: true, get: function () { return SkillsPage_1.SkillsPage; } });
var EditorPage_1 = require("./page-objects/EditorPage");
Object.defineProperty(exports, "EditorPage", { enumerable: true, get: function () { return EditorPage_1.EditorPage; } });
var DiscoverPage_1 = require("./page-objects/DiscoverPage");
Object.defineProperty(exports, "DiscoverPage", { enumerable: true, get: function () { return DiscoverPage_1.DiscoverPage; } });
var PrivateReposPage_1 = require("./page-objects/PrivateReposPage");
Object.defineProperty(exports, "PrivateReposPage", { enumerable: true, get: function () { return PrivateReposPage_1.PrivateReposPage; } });
var SettingsPage_1 = require("./page-objects/SettingsPage");
Object.defineProperty(exports, "SettingsPage", { enumerable: true, get: function () { return SettingsPage_1.SettingsPage; } });
// Fixtures - Skills
var skills_1 = require("./fixtures/skills");
Object.defineProperty(exports, "testSkills", { enumerable: true, get: function () { return skills_1.testSkills; } });
Object.defineProperty(exports, "sampleSkillContent", { enumerable: true, get: function () { return skills_1.sampleSkillContent; } });
Object.defineProperty(exports, "generateUniqueSkillName", { enumerable: true, get: function () { return skills_1.generateUniqueSkillName; } });
Object.defineProperty(exports, "generateSkillContent", { enumerable: true, get: function () { return skills_1.generateSkillContent; } });
Object.defineProperty(exports, "invalidSkillContent", { enumerable: true, get: function () { return skills_1.invalidSkillContent; } });
Object.defineProperty(exports, "specialCharsSkillContent", { enumerable: true, get: function () { return skills_1.specialCharsSkillContent; } });
Object.defineProperty(exports, "generateLargeSkillContent", { enumerable: true, get: function () { return skills_1.generateLargeSkillContent; } });
Object.defineProperty(exports, "complexYamlSkillContent", { enumerable: true, get: function () { return skills_1.complexYamlSkillContent; } });
Object.defineProperty(exports, "privateSkills", { enumerable: true, get: function () { return skills_1.privateSkills; } });
Object.defineProperty(exports, "privateRepos", { enumerable: true, get: function () { return skills_1.privateRepos; } });
// Fixtures - Config
var config_1 = require("./fixtures/config");
Object.defineProperty(exports, "sampleEditorConfig", { enumerable: true, get: function () { return config_1.sampleEditorConfig; } });
Object.defineProperty(exports, "sampleAIConfig", { enumerable: true, get: function () { return config_1.sampleAIConfig; } });
Object.defineProperty(exports, "samplePrivateRepos", { enumerable: true, get: function () { return config_1.samplePrivateRepos; } });
Object.defineProperty(exports, "sampleConfig", { enumerable: true, get: function () { return config_1.sampleConfig; } });
Object.defineProperty(exports, "minimalConfig", { enumerable: true, get: function () { return config_1.minimalConfig; } });
Object.defineProperty(exports, "emptyConfig", { enumerable: true, get: function () { return config_1.emptyConfig; } });
Object.defineProperty(exports, "generateTestConfig", { enumerable: true, get: function () { return config_1.generateTestConfig; } });
Object.defineProperty(exports, "invalidConfig", { enumerable: true, get: function () { return config_1.invalidConfig; } });
Object.defineProperty(exports, "migrationTestData", { enumerable: true, get: function () { return config_1.migrationTestData; } });
Object.defineProperty(exports, "editorThemes", { enumerable: true, get: function () { return config_1.editorThemes; } });
Object.defineProperty(exports, "fontSizes", { enumerable: true, get: function () { return config_1.fontSizes; } });
Object.defineProperty(exports, "tabSizes", { enumerable: true, get: function () { return config_1.tabSizes; } });
Object.defineProperty(exports, "autoSaveDelays", { enumerable: true, get: function () { return config_1.autoSaveDelays; } });
// Fixtures - API Responses
var api_responses_1 = require("./fixtures/api-responses");
Object.defineProperty(exports, "mockSkillsListResponse", { enumerable: true, get: function () { return api_responses_1.mockSkillsListResponse; } });
Object.defineProperty(exports, "mockSkillResponse", { enumerable: true, get: function () { return api_responses_1.mockSkillResponse; } });
Object.defineProperty(exports, "mockCreateSkillResponse", { enumerable: true, get: function () { return api_responses_1.mockCreateSkillResponse; } });
Object.defineProperty(exports, "mockUpdateSkillResponse", { enumerable: true, get: function () { return api_responses_1.mockUpdateSkillResponse; } });
Object.defineProperty(exports, "mockDeleteSkillResponse", { enumerable: true, get: function () { return api_responses_1.mockDeleteSkillResponse; } });
Object.defineProperty(exports, "mockConfigResponse", { enumerable: true, get: function () { return api_responses_1.mockConfigResponse; } });
Object.defineProperty(exports, "mockPrivateReposResponse", { enumerable: true, get: function () { return api_responses_1.mockPrivateReposResponse; } });
Object.defineProperty(exports, "mockPrivateRepoSkillsResponse", { enumerable: true, get: function () { return api_responses_1.mockPrivateRepoSkillsResponse; } });
Object.defineProperty(exports, "mockClaudeDirectoriesResponse", { enumerable: true, get: function () { return api_responses_1.mockClaudeDirectoriesResponse; } });
Object.defineProperty(exports, "mockErrorResponse", { enumerable: true, get: function () { return api_responses_1.mockErrorResponse; } });
Object.defineProperty(exports, "mockAuthErrorResponse", { enumerable: true, get: function () { return api_responses_1.mockAuthErrorResponse; } });
Object.defineProperty(exports, "mockNotFoundResponse", { enumerable: true, get: function () { return api_responses_1.mockNotFoundResponse; } });
Object.defineProperty(exports, "mockValidationErrorResponse", { enumerable: true, get: function () { return api_responses_1.mockValidationErrorResponse; } });
Object.defineProperty(exports, "mockExternalModificationResponse", { enumerable: true, get: function () { return api_responses_1.mockExternalModificationResponse; } });
Object.defineProperty(exports, "mockAIStreamChunk", { enumerable: true, get: function () { return api_responses_1.mockAIStreamChunk; } });
Object.defineProperty(exports, "mockSearchResultsResponse", { enumerable: true, get: function () { return api_responses_1.mockSearchResultsResponse; } });
Object.defineProperty(exports, "createMockResponse", { enumerable: true, get: function () { return api_responses_1.createMockResponse; } });
Object.defineProperty(exports, "createMockErrorResponse", { enumerable: true, get: function () { return api_responses_1.createMockErrorResponse; } });
// Legacy helper (keeping for backward compatibility)
var test_helpers_1 = require("./test-helpers");
Object.defineProperty(exports, "SkillManagerHelper", { enumerable: true, get: function () { return test_helpers_1.SkillManagerHelper; } });
Object.defineProperty(exports, "TestData", { enumerable: true, get: function () { return test_helpers_1.TestData; } });
// Mocks - Registry API
var registry_api_1 = require("./mocks/registry-api");
Object.defineProperty(exports, "mockRegistrySearch", { enumerable: true, get: function () { return registry_api_1.mockRegistrySearch; } });
Object.defineProperty(exports, "mockRegistrySkillContent", { enumerable: true, get: function () { return registry_api_1.mockRegistrySkillContent; } });
Object.defineProperty(exports, "mockRegistryInstall", { enumerable: true, get: function () { return registry_api_1.mockRegistryInstall; } });
Object.defineProperty(exports, "mockRegistryTimeout", { enumerable: true, get: function () { return registry_api_1.mockRegistryTimeout; } });
Object.defineProperty(exports, "mockRegistryRateLimit", { enumerable: true, get: function () { return registry_api_1.mockRegistryRateLimit; } });
Object.defineProperty(exports, "clearRegistryMocks", { enumerable: true, get: function () { return registry_api_1.clearRegistryMocks; } });
// Mocks - GitHub API
var github_api_1 = require("./mocks/github-api");
Object.defineProperty(exports, "mockGitHubAuth", { enumerable: true, get: function () { return github_api_1.mockGitHubAuth; } });
Object.defineProperty(exports, "mockGitHubRepoContents", { enumerable: true, get: function () { return github_api_1.mockGitHubRepoContents; } });
Object.defineProperty(exports, "mockGitHubFileContent", { enumerable: true, get: function () { return github_api_1.mockGitHubFileContent; } });
Object.defineProperty(exports, "mockGitHubCreateFile", { enumerable: true, get: function () { return github_api_1.mockGitHubCreateFile; } });
Object.defineProperty(exports, "mockGitHubUpdateFile", { enumerable: true, get: function () { return github_api_1.mockGitHubUpdateFile; } });
Object.defineProperty(exports, "mockGitHubRateLimit", { enumerable: true, get: function () { return github_api_1.mockGitHubRateLimit; } });
Object.defineProperty(exports, "mockGitHubServerError", { enumerable: true, get: function () { return github_api_1.mockGitHubServerError; } });
Object.defineProperty(exports, "clearGitHubMocks", { enumerable: true, get: function () { return github_api_1.clearGitHubMocks; } });
// Mocks - AI API
var ai_api_1 = require("./mocks/ai-api");
Object.defineProperty(exports, "generateMockAIContent", { enumerable: true, get: function () { return ai_api_1.generateMockAIContent; } });
Object.defineProperty(exports, "mockAIGeneration", { enumerable: true, get: function () { return ai_api_1.mockAIGeneration; } });
Object.defineProperty(exports, "mockAIStreaming", { enumerable: true, get: function () { return ai_api_1.mockAIStreaming; } });
Object.defineProperty(exports, "mockAIConnectionTest", { enumerable: true, get: function () { return ai_api_1.mockAIConnectionTest; } });
Object.defineProperty(exports, "mockAITimeout", { enumerable: true, get: function () { return ai_api_1.mockAITimeout; } });
Object.defineProperty(exports, "mockAIRateLimit", { enumerable: true, get: function () { return ai_api_1.mockAIRateLimit; } });
Object.defineProperty(exports, "mockAITokenLimit", { enumerable: true, get: function () { return ai_api_1.mockAITokenLimit; } });
Object.defineProperty(exports, "clearAIMocks", { enumerable: true, get: function () { return ai_api_1.clearAIMocks; } });
// Test Setup
var test_setup_1 = require("./test-setup");
Object.defineProperty(exports, "TestFixtureManager", { enumerable: true, get: function () { return test_setup_1.TestFixtureManager; } });
Object.defineProperty(exports, "setupTestFixtures", { enumerable: true, get: function () { return test_setup_1.setupTestFixtures; } });
Object.defineProperty(exports, "waitForAppReady", { enumerable: true, get: function () { return test_setup_1.waitForAppReady; } });
Object.defineProperty(exports, "navigateToView", { enumerable: true, get: function () { return test_setup_1.navigateToView; } });
Object.defineProperty(exports, "ensureSkillExists", { enumerable: true, get: function () { return test_setup_1.ensureSkillExists; } });
// Legacy helper (keeping for backward compatibility)
var test_helpers_2 = require("./test-helpers");
Object.defineProperty(exports, "SkillManagerHelper", { enumerable: true, get: function () { return test_helpers_2.SkillManagerHelper; } });
Object.defineProperty(exports, "TestData", { enumerable: true, get: function () { return test_helpers_2.TestData; } });
//# sourceMappingURL=index.js.map