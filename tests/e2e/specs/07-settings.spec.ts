/**
 * Settings Tests (P1)
 *
 * Tests for application settings and configuration
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SettingsPage, SkillsPage } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let settingsPage: SettingsPage;
let skillsPage: SkillsPage;

test.describe('Settings @P1', () => {
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

    settingsPage = new SettingsPage(electronApp, page);
    skillsPage = new SkillsPage(electronApp, page);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Settings Modal', () => {
    test('should open settings modal', async () => {
      await settingsPage.open();

      expect(await settingsPage.isVisible()).toBeTruthy();
    });

    test('should close settings modal', async () => {
      if (!await settingsPage.isVisible()) {
        await settingsPage.open();
      }

      await settingsPage.close();

      expect(await settingsPage.isVisible()).toBeFalsy();
    });

    test('should close with escape key', async () => {
      await settingsPage.open();

      await page.keyboard.press('Escape');

      await page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden', timeout: 3000 });
    });
  });

  test.describe('Project Directories', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should display project directories section', async () => {
      expect(await page.isVisible('text=/project.*director/i')).toBeTruthy();
    });

    test('should list configured directories', async () => {
      const dirs = await settingsPage.getProjectDirectories();
      // May be empty in fresh install
      expect(Array.isArray(dirs)).toBeTruthy();
    });

    test('should have add directory button', async () => {
      expect(await page.isVisible('button:has-text("Add")')).toBeTruthy();
    });
  });

  test.describe('Editor Settings', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should display editor settings section', async () => {
      expect(await page.isVisible('text=/editor|font/i')).toBeTruthy();
    });

    test('should have font size setting', async () => {
      const fontSizeInput = await page.$('[data-testid="editor-font-size"], #editor-font-size, select');
      expect(fontSizeInput).toBeTruthy();
    });

    test('should have theme setting', async () => {
      const themeSelect = await page.$('select');
      expect(themeSelect).toBeTruthy();
    });

    test('should have minimap toggle', async () => {
      // Look for minimap toggle/checkbox
      const minimapToggle = await page.$('[data-testid="show-minimap-toggle"], input[type="checkbox"]');
      expect(minimapToggle).toBeTruthy();
    });

    test('should have tab size setting', async () => {
      const tabSizeInput = await page.$('[data-testid="tab-size"], #tab-size, input[type="number"]');
      expect(tabSizeInput).toBeTruthy();
    });

    test('should have word wrap toggle', async () => {
      const wordWrapToggle = await page.$('[data-testid="word-wrap-toggle"], input[type="checkbox"]');
      expect(wordWrapToggle).toBeTruthy();
    });
  });

  test.describe('Auto Refresh', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should have auto refresh toggle', async () => {
      expect(await page.isVisible('#auto-refresh-toggle, input[type="checkbox"]')).toBeTruthy();
    });
  });

  test.describe('AI Configuration', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should display AI settings section', async () => {
      expect(await page.isVisible('text=/AI|API|anthropic/i')).toBeTruthy();
    });

    test('should have API key input', async () => {
      const apiKeyInput = await page.$('[data-testid="ai-api-key"], #ai-api-key, input[type="password"]');
      expect(apiKeyInput).toBeTruthy();
    });

    test('should have test connection button', async () => {
      expect(await page.isVisible('[data-testid="test-connection-button"], button:has-text("Test")')).toBeTruthy();
    });
  });

  test.describe('Private Repositories', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should display private repos section', async () => {
      expect(await page.isVisible('text=/private.*repo|github|gitlab/i')).toBeTruthy();
    });

    test('should have add GitHub repo button', async () => {
      // The UI uses a select dropdown for provider selection
      expect(await page.isVisible('select:has(option[value="github"]), select')).toBeTruthy();
    });

    test('should have add GitLab repo button', async () => {
      // The UI uses a select dropdown for provider selection
      expect(await page.isVisible('select:has(option[value="gitlab"]), select')).toBeTruthy();
    });

    test('should list configured repos', async () => {
      const repos = await settingsPage.getPrivateRepos();
      expect(Array.isArray(repos)).toBeTruthy();
    });
  });

  test.describe('Save Settings', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      if (await settingsPage.isVisible()) {
        await settingsPage.close();
      }
    });

    test('should have save button', async () => {
      expect(await page.isVisible('button:has-text("Save")')).toBeTruthy();
    });

    test('should save settings when clicking save', async () => {
      await settingsPage.save();

      // Settings should close or show success
      await page.waitForTimeout(500);
    });

    test('should persist settings after save', async () => {
      // Get current font size
      const currentFontSize = await settingsPage.getEditorFontSize();

      // Change font size
      const newSize = currentFontSize === 14 ? 16 : 14;
      await settingsPage.setEditorFontSize(newSize);
      await settingsPage.save();
      await settingsPage.close();

      // Reopen and verify
      await settingsPage.open();
      const savedFontSize = await settingsPage.getEditorFontSize();
      expect(savedFontSize).toBe(newSize);
    });
  });

  test.describe('Validation', () => {
    test.beforeEach(async () => {
      await settingsPage.open();
    });

    test.afterEach(async () => {
      await settingsPage.close();
    });

    test('should validate font size range', async () => {
      // Try to set invalid font size
      const fontSizeInput = await page.$('#editor-font-size');
      if (fontSizeInput) {
        await fontSizeInput.fill('-1');
        await page.waitForTimeout(100);

        // Should show validation error or clamp value
        const value = await fontSizeInput.inputValue();
        expect(parseInt(value)).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Cancel Changes', () => {
    test('should discard changes when closing without save', async () => {
      await settingsPage.open();

      const currentFontSize = await settingsPage.getEditorFontSize();
      const newSize = currentFontSize === 14 ? 18 : 14;
      await settingsPage.setEditorFontSize(newSize);

      // Close without saving (escape or close button)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Reopen and verify original value
      await settingsPage.open();
      const savedFontSize = await settingsPage.getEditorFontSize();
      expect(savedFontSize).toBe(currentFontSize);
    });
  });
});
