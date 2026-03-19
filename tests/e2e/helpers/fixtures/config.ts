/**
 * Test Fixtures - Sample Configuration Data
 *
 * Provides sample configurations for testing
 */

import type { Configuration, SkillEditorConfig, PrivateRepo, AIConfiguration } from '../../../shared/types';

/**
 * Sample skill editor configuration
 */
export const sampleEditorConfig: SkillEditorConfig = {
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
export const sampleAIConfig: AIConfiguration = {
  provider: 'anthropic',
  apiKey: 'sk-test-api-key',
  model: 'claude-3-sonnet-20240229',
  baseUrl: undefined,
};

/**
 * Sample private repository configuration
 */
export const samplePrivateRepos: PrivateRepo[] = [
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
export const sampleConfig: Configuration = {
  projectDirectories: ['/test/skills/directory'],
  applicationSkillsDirectory: '/test/.skillsmn/skills',
  editorDefaultMode: 'edit',
  autoRefresh: true,
  skillEditorConfig: sampleEditorConfig,
  aiConfig: sampleAIConfig,
  privateRepos: samplePrivateRepos,
};

/**
 * Minimal configuration (no AI, no private repos)
 */
export const minimalConfig: Configuration = {
  projectDirectories: ['/test/skills/directory'],
  applicationSkillsDirectory: '/test/.skillsmn/skills',
  editorDefaultMode: 'edit',
  autoRefresh: true,
  skillEditorConfig: sampleEditorConfig,
};

/**
 * Configuration without project directories (initial state)
 */
export const emptyConfig: Partial<Configuration> = {
  projectDirectories: [],
  applicationSkillsDirectory: undefined,
  editorDefaultMode: 'edit',
  autoRefresh: true,
  skillEditorConfig: sampleEditorConfig,
};

/**
 * Generate test configuration with custom directories
 */
export function generateTestConfig(directories: string[]): Configuration {
  return {
    ...sampleConfig,
    projectDirectories: directories,
    applicationSkillsDirectory: directories[0] ? `${directories[0]}/.skillsmn` : undefined,
  };
}

/**
 * Invalid configuration for error testing
 */
export const invalidConfig = {
  projectDirectories: ['/nonexistent/path'],
  skillEditorConfig: {
    fontSize: -1, // Invalid
    theme: 'invalid-theme', // Invalid
  },
};

/**
 * Migration test data
 */
export const migrationTestData = {
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
export const editorThemes = ['light', 'dark', 'vs-dark'] as const;

/**
 * Font sizes for testing
 */
export const fontSizes = [10, 12, 14, 16, 18, 20];

/**
 * Tab sizes for testing
 */
export const tabSizes = [2, 4, 8];

/**
 * Auto-save delays for testing (in ms)
 */
export const autoSaveDelays = [1000, 2000, 5000, 10000];
