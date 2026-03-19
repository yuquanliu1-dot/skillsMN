/**
 * E2E Test Helpers Index
 *
 * Re-exports all test utilities for convenient importing
 */

// Page Objects
export { AppPage } from './page-objects/AppPage';
export type { ViewType } from './page-objects/AppPage';
export { SkillsPage } from './page-objects/SkillsPage';
export type { SkillInfo } from './page-objects/SkillsPage';
export { EditorPage } from './page-objects/EditorPage';
export { DiscoverPage } from './page-objects/DiscoverPage';
export type { SearchResult } from './page-objects/DiscoverPage';
export { PrivateReposPage } from './page-objects/PrivateReposPage';
export type { PrivateRepoInfo, PrivateSkillInfo } from './page-objects/PrivateReposPage';
export { SettingsPage } from './page-objects/SettingsPage';

// Fixtures - Skills
export {
  testSkills,
  sampleSkillContent,
  generateUniqueSkillName,
  generateSkillContent,
  invalidSkillContent,
  specialCharsSkillContent,
  generateLargeSkillContent,
  complexYamlSkillContent,
  privateSkills,
  privateRepos,
} from './fixtures/skills';
export type { TestSkill } from './fixtures/skills';

// Fixtures - Config
export {
  sampleEditorConfig,
  sampleAIConfig,
  samplePrivateRepos,
  sampleConfig,
  minimalConfig,
  emptyConfig,
  generateTestConfig,
  invalidConfig,
  migrationTestData,
  editorThemes,
  fontSizes,
  tabSizes,
  autoSaveDelays,
} from './fixtures/config';

// Fixtures - API Responses
export {
  mockSkillsListResponse,
  mockSkillResponse,
  mockCreateSkillResponse,
  mockUpdateSkillResponse,
  mockDeleteSkillResponse,
  mockConfigResponse,
  mockPrivateReposResponse,
  mockPrivateRepoSkillsResponse,
  mockClaudeDirectoriesResponse,
  mockErrorResponse,
  mockAuthErrorResponse,
  mockNotFoundResponse,
  mockValidationErrorResponse,
  mockExternalModificationResponse,
  mockAIStreamChunk,
  mockSearchResultsResponse,
  createMockResponse,
  createMockErrorResponse,
} from './fixtures/api-responses';

// Legacy helper (keeping for backward compatibility)
export { SkillManagerHelper, TestData } from './test-helpers';

// Mocks - Registry API
export {
  mockRegistrySearch,
  mockRegistrySkillContent,
  mockRegistryInstall,
  mockRegistryTimeout,
  mockRegistryRateLimit,
  clearRegistryMocks,
} from './mocks/registry-api';
export type { SearchParams, MockRegistryOptions } from './mocks/registry-api';

// Mocks - GitHub API
export {
  mockGitHubAuth,
  mockGitHubRepoContents,
  mockGitHubFileContent,
  mockGitHubCreateFile,
  mockGitHubUpdateFile,
  mockGitHubRateLimit,
  mockGitHubServerError,
  clearGitHubMocks,
} from './mocks/github-api';
export type { MockGitHubOptions } from './mocks/github-api';

// Mocks - AI API
export {
  generateMockAIContent,
  mockAIGeneration,
  mockAIStreaming,
  mockAIConnectionTest,
  mockAITimeout,
  mockAIRateLimit,
  mockAITokenLimit,
  clearAIMocks,
} from './mocks/ai-api';
export type { MockAIOptions } from './mocks/ai-api';

// Test Setup
export {
  TestFixtureManager,
  setupTestFixtures,
  waitForAppReady,
  navigateToView,
  ensureSkillExists
} from './test-setup';
export type { TestFixtureOptions, TestFixtureResult } from './test-setup';

// Legacy helper (keeping for backward compatibility)
export { SkillManagerHelper, TestData } from './test-helpers';
