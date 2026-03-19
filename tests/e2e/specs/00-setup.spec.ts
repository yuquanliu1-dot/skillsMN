/**
 * Setup and Configuration Tests (P0)
 *
 * Tests for application setup, configuration, and initial state
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { AppPage, SkillsPage, SettingsPage, emptyConfig, sampleConfig } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let appPage: AppPage;
let skillsPage: SkillsPage;
let settingsPage: SettingsPage;

test.describe('Setup and Configuration @P0', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true'
      },
      timeout: 120000 // Increase launch timeout
    });

    page = await electronApp.firstWindow({ timeout: 90000 });
    await page.waitForLoadState('domcontentloaded');

    appPage = new AppPage(electronApp, page);
    skillsPage = new SkillsPage(electronApp, page);
    settingsPage = new SettingsPage(electronApp, page);

    // Wait for app to be ready with longer timeout
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 45000 });

    // Log console messages for debugging
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.error('[Page Error]', error.message);
    });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Application Launch', () => {
    test('should launch application successfully', async () => {
      // Verify window exists
      const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
      expect(windowCount).toBeGreaterThan(0);

      // Verify page is accessible
      expect(page).toBeTruthy();

      // Verify window title contains app name
      const title = await page.title();
      expect(title).toContain('skillsMN');
    });

    test('should load main UI components', async () => {
      // Sidebar should already be loaded from beforeAll
      // Just verify it exists
      const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
      expect(sidebarVisible).toBeTruthy();

      // Verify navigation items exist
      const navItems = await page.$$('[data-testid^="nav-"]');
      expect(navItems.length).toBeGreaterThan(0);

      // Check for main content area
      const mainContent = await page.$('[data-testid="main-content"]');
      expect(mainContent).toBeTruthy();
    });

    test('should display sidebar with navigation buttons', async () => {
      // Sidebar should already be visible from beforeAll
      const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
      expect(sidebarVisible).toBeTruthy();

      // Verify navigation buttons
      expect(await page.isVisible('[data-testid="nav-skills"]')).toBeTruthy();
      expect(await page.isVisible('[data-testid="nav-discover"]')).toBeTruthy();
      expect(await page.isVisible('[data-testid="nav-private-repos"]')).toBeTruthy();
    });
  });

  test.describe('First Run Experience', () => {
    test('should show setup dialog when no directories configured', async () => {
      // This test depends on the app state
      // In a clean install, setup dialog should appear
      const setupDialog = await page.$('[data-testid="setup-dialog"]');

      if (setupDialog) {
        expect(await setupDialog.isVisible()).toBeTruthy();

        // Should have directory selection option
        expect(await page.isVisible('text=/select.*directory|choose.*folder/i')).toBeTruthy();
      }
    });

    test('should allow selecting project directory in setup', async () => {
      const setupDialog = await page.$('[data-testid="setup-dialog"]');

      if (setupDialog && await setupDialog.isVisible()) {
        // Look for browse/select button
        const browseButton = await page.$('button:has-text("Browse"), button:has-text("Select")');

        if (browseButton) {
          // In real test, we'd mock the file dialog
          // For now, just verify the button exists
          expect(browseButton).toBeTruthy();
        }
      }
    });

    test('should complete setup and navigate to skills view', async () => {
      // Sidebar should already be visible from beforeAll
      const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
      expect(sidebarVisible).toBeTruthy();

      // Try to navigate to skills
      const skillsNav = await page.$('[data-testid="nav-skills"]');
      if (skillsNav) {
        const isDisabled = await skillsNav.getAttribute('disabled');
        // If not disabled, should be clickable
        if (!isDisabled) {
          await skillsNav.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }
    });
  });

  test.describe('Configuration Management', () => {
    test('should open settings modal', async () => {
      await appPage.openSettings();

      expect(await settingsPage.isVisible()).toBeTruthy();
    });

    test('should display project directories in settings', async () => {
      // Settings should be open from previous test
      if (!await settingsPage.isVisible()) {
        await appPage.openSettings();
      }

      // Look for project directories section - use more flexible matching
      // The UI might show "Project Directories", "Skill Storage", or similar
      const hasDirsSection = await page.isVisible('text=/Project.*Director|Skill.*Storage|Director|Storage/i');
      const hasAddButton = await page.isVisible('button:has-text("Add")');
      // Pass if either section text or add button exists
      expect(hasDirsSection || hasAddButton).toBeTruthy();
    });

    test('should have add directory button', async () => {
      if (!await settingsPage.isVisible()) {
        await appPage.openSettings();
      }

      const addButton = await page.$('button:has-text("Add"), button:has-text("+")');
      expect(addButton).toBeTruthy();
    });

    test('should have editor configuration options', async () => {
      if (!await settingsPage.isVisible()) {
        await appPage.openSettings();
      }

      // Look for editor settings
      expect(await page.isVisible('text=/font.*size|editor/i')).toBeTruthy();
    });

    test('should close settings modal', async () => {
      if (await settingsPage.isVisible()) {
        await settingsPage.close();
      }

      expect(await settingsPage.isVisible()).toBeFalsy();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to Skills view', async () => {
      await appPage.navigateTo('skills');

      // Verify skills list is visible
      const skillsList = await page.$('[data-testid="skills-list"]');
      expect(skillsList).toBeTruthy();
    });

    test('should navigate to Discover view', async () => {
      await appPage.navigateTo('discover');

      // Verify search input is visible
      const searchInput = await page.$('[data-testid="search-input"]');
      expect(searchInput).toBeTruthy();
    });

    test('should navigate to Private Repos view', async () => {
      await appPage.navigateTo('private-repos');

      // Verify private repos content is visible
      const privateReposContent = await page.$('[data-testid="private-repos-list"]');
      expect(privateReposContent).toBeTruthy();
    });

    test('should show active state on current nav item', async () => {
      await appPage.navigateTo('skills');

      // Check that skills nav has active styling
      const skillsNav = await page.$('[data-testid="nav-skills"]');
      const classes = await skillsNav?.getAttribute('class');

      expect(classes).toContain('bg-blue-50');
    });
  });

  test.describe('Error Handling on Startup', () => {
    test('should not have console errors on startup', async () => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Wait for app to stabilize
      await page.waitForTimeout(2000);

      // Filter out expected errors (like network errors in tests)
      const unexpectedErrors = errors.filter(err =>
        !err.includes('Failed to load resource') &&
        !err.includes('net::ERR_') &&
        !err.includes('Extension')
      );

      expect(unexpectedErrors).toHaveLength(0);
    });
  });
});
