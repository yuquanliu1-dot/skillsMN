/**
 * Playwright Configuration for Electron App Testing
 *
 * Configuration for E2E tests with priority-based test selection
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Electron tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Only one worker for Electron
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  // Test file patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  // Global setup (if needed)
  // globalSetup: require.resolve('./tests/e2e/global-setup'),
  // Global teardown (if needed)
  // globalTeardown: require.resolve('./tests/e2e/global-teardown'),
  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',
  // Web server (not needed for Electron)
  // webServer: undefined,
});
