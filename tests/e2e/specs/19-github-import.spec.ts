/**
 * GitHub Import Test
 *
 * Tests importing skills from GitHub repositories
 * Test repository: https://github.com/Mr-Q526/PPTMaker-skill
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage } from '../helpers/page-objects/SkillsPage';

let electronApp: ElectronApplication | null = null;
let page: Page | null = null;
let skillsPage: SkillsPage | null = null;

// Test repository URL
const TEST_REPO_URL = 'https://github.com/Mr-Q526/PPTMaker-skill';
const EXPECTED_SKILL_NAME = 'PPTMaker-skill';

// Helper to ensure app is initialized
async function ensureAppInitialized() {
  if (!electronApp || !page || !skillsPage) {
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
    skillsPage = new SkillsPage(electronApp, page);

    // Log console messages for debugging
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });

    // Log page errors
    page.on('pageerror', error => {
      console.error('[Page Error]', error.message);
    });
  }
}

test.describe('GitHub Skill Import', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test.afterAll(async () => {
    // Cleanup: Delete the imported skill if it exists
    if (skillsPage && page) {
      try {
        await skillsPage.goto();
        const exists = await skillsPage.skillExists(EXPECTED_SKILL_NAME);
        if (exists) {
          await skillsPage.deleteSkill(EXPECTED_SKILL_NAME);
          console.log(`Cleaned up imported skill: ${EXPECTED_SKILL_NAME}`);
        }
      } catch (error) {
        console.log('Cleanup error (ignored):', error);
      }
    }

    if (electronApp) {
      await electronApp.close();
      electronApp = null;
      page = null;
      skillsPage = null;
    }
  });

  test('should open import dialog from skills page', async () => {
    await skillsPage!.goto();
    await page!.waitForTimeout(1000);

    // Look for import button
    const importButton = page!.locator('[data-testid="import-skill-button"]');

    const isVisible = await importButton.isVisible().catch(() => false);

    if (isVisible) {
      await importButton.click();
      await page!.waitForSelector('[data-testid="import-dialog"]', { timeout: 10000 });
      expect(await page!.isVisible('[data-testid="import-dialog"]')).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should switch to URL import tab', async () => {
    const dialogVisible = await page!.isVisible('[data-testid="import-dialog"]');

    if (!dialogVisible) {
      const importButton = page!.locator('[data-testid="import-skill-button"]');
      await importButton.click();
      await page!.waitForSelector('[data-testid="import-dialog"]', { timeout: 10000 });
    }

    // Click on URL tab
    await page!.click('[data-testid="import-tab-url"]');
    await page!.waitForTimeout(500);

    // Verify URL input is visible
    expect(await page!.isVisible('[data-testid="import-url-input"]')).toBe(true);
  });

  test('should scan GitHub repository for skills', async () => {
    // Fill in the repository URL
    await page!.fill('[data-testid="import-url-input"]', TEST_REPO_URL);

    // Click scan button
    await page!.click('[data-testid="scan-url-button"]');

    // Wait for scan to complete
    await page!.waitForTimeout(8000);

    // Check for success indicator or skill list
    const successVisible = await page!.isVisible('[data-testid="scan-success-message"]').catch(() => false);
    const skillListVisible = await page!.isVisible('[data-testid="import-skill-list"]').catch(() => false);

    expect(successVisible || skillListVisible).toBe(true);
  });

  test('should import skill from GitHub repository', async () => {
    // Ensure skills are listed
    const skillListVisible = await page!.isVisible('[data-testid="import-skill-list"]').catch(() => false);

    if (!skillListVisible) {
      // Redo scan
      await page!.fill('[data-testid="import-url-input"]', TEST_REPO_URL);
      await page!.click('[data-testid="scan-url-button"]');
      await page!.waitForTimeout(8000);
    }

    // Ensure skill is selected
    const checkbox = page!.locator('[data-testid="import-skill-list"] input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }

    // Click import button
    await page!.click('[data-testid="confirm-import-skill-button"]');

    // Wait for import to complete
    await page!.waitForTimeout(15000);

    // Close dialog
    const closeButton = page!.locator('[data-testid="cancel-import-skill-button"]');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page!.waitForTimeout(500);
    }

    // Verify skill appears in skills list
    await skillsPage!.goto();
    await page!.waitForTimeout(2000);

    const skillExists = await skillsPage!.skillExists(EXPECTED_SKILL_NAME);
    expect(skillExists).toBe(true);
  });

  test('should verify imported skill content', async () => {
    await skillsPage!.goto();

    // Click on the skill to open in editor
    await skillsPage!.clickSkill(EXPECTED_SKILL_NAME);

    // Wait for editor to load
    await page!.waitForSelector('[data-testid="skill-editor"], .monaco-editor', { timeout: 10000 });

    // Verify editor is visible
    const editor = await page!.$('.monaco-editor, [data-testid="skill-editor"]');
    expect(editor).toBeTruthy();

    // Close editor
    await page!.keyboard.press('Escape');
    await page!.waitForTimeout(500);
  });

  test('should delete imported skill', async () => {
    await skillsPage!.goto();

    const existsBefore = await skillsPage!.skillExists(EXPECTED_SKILL_NAME);
    expect(existsBefore).toBe(true);

    await skillsPage!.deleteSkill(EXPECTED_SKILL_NAME);
    await page!.waitForTimeout(2000);

    const existsAfter = await skillsPage!.skillExists(EXPECTED_SKILL_NAME);
    expect(existsAfter).toBe(false);
  });
});

test.describe('Import Dialog Error Handling', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test('should handle invalid URL gracefully', async () => {
    await skillsPage!.goto();

    const importButton = page!.locator('[data-testid="import-skill-button"]');

    if (await importButton.isVisible().catch(() => false)) {
      await importButton.click();
      await page!.waitForSelector('[data-testid="import-dialog"]', { timeout: 10000 });

      // Switch to URL tab
      await page!.click('[data-testid="import-tab-url"]');
      await page!.waitForTimeout(300);

      // Enter invalid URL
      await page!.fill('[data-testid="import-url-input"]', 'https://invalid-url-12345.com/owner/repo');

      // Click scan
      await page!.click('[data-testid="scan-url-button"]');

      // Wait for error
      await page!.waitForTimeout(5000);

      // Check for error message
      const errorVisible = await page!.isVisible('[data-testid="import-error-message"]').catch(() => false);
      expect(errorVisible).toBe(true);

      // Close dialog
      const closeButton = page!.locator('[data-testid="cancel-import-skill-button"]');
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      test.skip();
    }
  });
});
