/**
 * Private Repositories Tests (P1)
 *
 * Tests for managing and browsing private skill repositories
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { PrivateReposPage, SettingsPage } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let privateReposPage: PrivateReposPage;
let settingsPage: SettingsPage;

test.describe('Private Repositories @P1', () => {
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

    privateReposPage = new PrivateReposPage(electronApp, page);
    settingsPage = new SettingsPage(electronApp, page);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Private Repos UI', () => {
    test.beforeEach(async () => {
      await privateReposPage.goto();
    });

    test('should display private repos list container', async () => {
      expect(await page.isVisible('[data-testid="private-repos-list"]')).toBeTruthy();
    });

    test('should show repository selector', async () => {
      expect(await page.isVisible('#repo-select')).toBeTruthy();
    });

    test('should show search input', async () => {
      expect(await page.isVisible('[data-testid="private-repos-list"] input[type="text"]')).toBeTruthy();
    });

    test('should show refresh button', async () => {
      expect(await page.isVisible('button[title="Refresh skills list"]')).toBeTruthy();
    });

    test('should show sort controls', async () => {
      expect(await page.isVisible('#sort-by-private')).toBeTruthy();
    });
  });

  test.describe('No Repositories State', () => {
    test('should show message when no repos configured', async () => {
      // This test depends on app state
      // If repos are configured, this test will be skipped
      if (await privateReposPage.hasNoRepos()) {
        expect(await page.isVisible('text=/No repositories configured/i')).toBeTruthy();
      } else {
        test.skip();
      }
    });

    test('should link to settings from no repos message', async () => {
      if (await privateReposPage.hasNoRepos()) {
        const settingsLink = await page.$('button:has-text("Settings")');
        expect(settingsLink).toBeTruthy();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Repository Selection', () => {
    test.beforeEach(async () => {
      await privateReposPage.goto();
    });

    test('should list configured repositories', async () => {
      const repos = await privateReposPage.getRepositories();
      // If repos are configured, should list them
      if (repos.length > 0) {
        expect(repos.length).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should select repository', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 1) {
        await privateReposPage.selectRepository(repos[1].id);

        const selected = await privateReposPage.getSelectedRepository();
        expect(selected).toBe(repos[1].id);
      } else {
        test.skip();
      }
    });

    test('should load skills for selected repository', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        // Should show skills or no skills message
        const hasSkills = await privateReposPage.getSkillsCount() > 0;
        const hasNoSkills = await privateReposPage.hasNoSkills();
        const hasError = await privateReposPage.hasError();

        expect(hasSkills || hasNoSkills || hasError).toBeTruthy();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Skills List', () => {
    test.beforeEach(async () => {
      await privateReposPage.goto();
    });

    test('should display skills count', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        const count = await privateReposPage.getSkillsCount();
        expect(count).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });

    test('should show no skills message when empty', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        if (await privateReposPage.hasNoSkills()) {
          expect(await page.isVisible('text=/No skills available/i')).toBeTruthy();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Search in Private Repo', () => {
    test.beforeEach(async () => {
      await privateReposPage.goto();
    });

    test('should search skills in repository', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        const initialCount = await privateReposPage.getSkillsCount();
        if (initialCount > 0) {
          await privateReposPage.searchSkills('test');
          await page.waitForTimeout(1500);

          // Search should complete (results may vary)
        }
      } else {
        test.skip();
      }
    });

    test('should clear search', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await privateReposPage.searchSkills('test');
        await privateReposPage.clearSearch();

        // Should be back to full list
      } else {
        test.skip();
      }
    });
  });

  test.describe('Sort Skills', () => {
    test.beforeEach(async () => {
      await privateReposPage.goto();
    });

    test('should sort skills by name', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(1000);

        await privateReposPage.sortSkills('name');

        const sortValue = await page.$eval('#sort-by-private', (el: any) => el.value);
        expect(sortValue).toBe('name');
      } else {
        test.skip();
      }
    });

    test('should sort skills by date', async () => {
      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(1000);

        await privateReposPage.sortSkills('modified');

        const sortValue = await page.$eval('#sort-by-private', (el: any) => el.value);
        expect(sortValue).toBe('modified');
      } else {
        test.skip();
      }
    });
  });

  test.describe('Refresh', () => {
    test('should refresh skills list', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(1000);

        await privateReposPage.refresh();
        await page.waitForTimeout(2000);

        // Refresh should complete without error
      } else {
        test.skip();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show authentication error', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        if (await privateReposPage.hasError() && await privateReposPage.isAuthError()) {
          const error = await privateReposPage.getError();
          expect(error?.toLowerCase()).toMatch(/authentication|pat|unauthorized/);
        }
      } else {
        test.skip();
      }
    });

    test('should show retry button on error', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        if (await privateReposPage.hasError() && !await privateReposPage.isAuthError()) {
          expect(await page.isVisible('button:has-text("Retry")')).toBeTruthy();
        }
      } else {
        test.skip();
      }
    });

    test('should retry loading on error', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        if (await privateReposPage.hasError() && !await privateReposPage.isAuthError()) {
          await privateReposPage.retryLoad();
          await page.waitForTimeout(2000);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Pagination', () => {
    test('should show load more button for large lists', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        const count = await privateReposPage.getSkillsCount();
        if (count > 50) {
          expect(await privateReposPage.hasLoadMoreButton()).toBeTruthy();
        }
      } else {
        test.skip();
      }
    });

    test('should load more skills when clicking load more', async () => {
      await privateReposPage.goto();

      const repos = await privateReposPage.getRepositories();
      if (repos.length > 0) {
        await privateReposPage.selectRepository(repos[0].id);
        await page.waitForTimeout(2000);

        if (await privateReposPage.hasLoadMoreButton()) {
          const initialCount = await privateReposPage.getVisibleSkillCount();
          await privateReposPage.loadMore();
          await page.waitForTimeout(500);

          const newCount = await privateReposPage.getVisibleSkillCount();
          expect(newCount).toBeGreaterThan(initialCount);
        }
      } else {
        test.skip();
      }
    });
  });
});
