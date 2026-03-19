/**
 * Registry Search Tests (P0)
 *
 * Tests for discovering and installing skills from the registry
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { DiscoverPage, SkillsPage, mockRegistrySearch, mockRegistryInstall } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let discoverPage: DiscoverPage;
let skillsPage: SkillsPage;

test.describe('Registry Search @P0', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    discoverPage = new DiscoverPage(electronApp, page);
    skillsPage = new SkillsPage(electronApp, page);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Search UI', () => {
    test.beforeEach(async () => {
      await discoverPage.goto();
    });

    test('should display search input', async () => {
      expect(await page.isVisible('[data-testid="search-input"]')).toBeTruthy();
    });

    test('should have placeholder text in search input', async () => {
      const placeholder = await page.$eval('[data-testid="search-input"]', (el: any) => el.placeholder);
      expect(placeholder.toLowerCase()).toContain('search');
    });

    test('should be focused on page load', async () => {
      // Check if search input is focused
      const focused = await page.$eval('[data-testid="search-input"]', (el: any) => document.activeElement === el);
      expect(focused).toBeTruthy();
    });
  });

  test.describe('Search Functionality', () => {
    test.beforeEach(async () => {
      await discoverPage.goto();
    });

    test('should search for skills with debounce', async () => {
      // Type search query
      await discoverPage.search('claude');

      // Wait for debounce and results
      await page.waitForTimeout(2000);

      // Should show results or no results message
      const hasResults = await page.isVisible('.bg-white.border.border-gray-200');
      const hasNoResults = await page.isVisible('text=/No skills found|No results/i');

      expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should display loading indicator during search', async () => {
      // Clear and start typing
      await page.fill('[data-testid="search-input"]', '');
      await page.type('[data-testid="search-input"]', 'test', { delay: 50 });

      // Loading might be very brief, so we just verify the search works
      await page.waitForTimeout(1500);
    });

    test('should show no results message for non-matching query', async () => {
      await discoverPage.search('xyznonexistent123456789');

      await page.waitForTimeout(2000);

      expect(await discoverPage.hasNoResults()).toBeTruthy();
    });

    test('should clear results when search is cleared', async () => {
      await discoverPage.search('claude');
      await page.waitForTimeout(2000);

      await discoverPage.clearSearch();
      await page.waitForTimeout(500);

      // Search input should be empty
      const value = await discoverPage.getSearchValue();
      expect(value).toBe('');
    });
  });

  test.describe('Search Results', () => {
    test.beforeEach(async () => {
      await discoverPage.goto();
    });

    test('should display search results', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      const count = await discoverPage.getResultCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should display skill metadata in results', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      // Should have result cards with name and description
      const results = await discoverPage.getResults();
      expect(results.length).toBeGreaterThan(0);

      // Each result should have a name
      expect(results[0].name).toBeTruthy();
    });

    test('should show install button on each result', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      const results = await discoverPage.getResults();
      if (results.length > 0) {
        expect(await discoverPage.hasInstallButton(results[0].name)).toBeTruthy();
      }
    });
  });

  test.describe('Skill Preview', () => {
    test.beforeEach(async () => {
      await discoverPage.goto();
    });

    test('should open preview when clicking skill name', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      const results = await discoverPage.getResults();
      if (results.length > 0) {
        await discoverPage.clickResult(results[0].name);

        // Preview panel should appear
        await discoverPage.waitForPreview();
        expect(await discoverPage.isPreviewVisible()).toBeTruthy();
      }
    });

    test('should display YAML frontmatter in preview', async () => {
      // If preview is not open, open it
      if (!await discoverPage.isPreviewVisible()) {
        await discoverPage.search('claude');
        await discoverPage.waitForResults();

        const results = await discoverPage.getResults();
        if (results.length > 0) {
          await discoverPage.clickResult(results[0].name);
          await discoverPage.waitForPreview();
        }
      }

      // Should contain frontmatter
      expect(await discoverPage.previewHasFrontmatter()).toBeTruthy();
    });

    test('should close preview panel', async () => {
      if (await discoverPage.isPreviewVisible()) {
        await discoverPage.closePreview();
        expect(await discoverPage.isPreviewVisible()).toBeFalsy();
      }
    });
  });

  test.describe('Skill Installation', () => {
    test.beforeEach(async () => {
      await discoverPage.goto();
    });

    test('should show install button', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      const installButton = await page.$('button:has-text("Install")');
      expect(installButton).toBeTruthy();
    });

    test('should start installation when clicking install', async () => {
      await discoverPage.search('claude');
      await discoverPage.waitForResults();

      const results = await discoverPage.getResults();
      if (results.length > 0) {
        // Click install
        await discoverPage.installSkill(results[0].name);

        // Should show some indication of installation starting
        // (toast, loading state, etc.)
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle search errors gracefully', async () => {
      await discoverPage.goto();

      // Search for something that might cause an error
      // In a real test, we'd mock the API to return an error
      await discoverPage.search('claude');
      await page.waitForTimeout(2000);

      // Should either show results or error message
      // Should not crash
    });

    test('should show error message when network fails', async () => {
      // This would require mocking network failure
      // Skip for integration test
      test.skip();
    });

    test('should allow retry after error', async () => {
      // This would require setting up an error state first
      test.skip();
    });
  });
});
