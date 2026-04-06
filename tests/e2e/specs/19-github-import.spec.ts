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

// Helper to close import dialog if open
async function closeImportDialogIfOpen() {
  if (!page) return;

  try {
    const dialogVisible = await page.isVisible('[data-testid="import-dialog"]').catch(() => false);
    if (dialogVisible) {
      // Try clicking the close button (X) with force to bypass overlay interception
      const closeButton = page.locator('[data-testid="close-import-dialog"]');
      const closeVisible = await closeButton.isVisible().catch(() => false);
      if (closeVisible) {
        await closeButton.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        // Fallback: Use JavaScript to dispatch Escape key event
        await page.evaluate(() => {
          const event = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(event);
        });
        await page.waitForTimeout(500);
      }

      // Final check - if still visible, try clicking with position
      const stillVisible = await page.isVisible('[data-testid="import-dialog"]').catch(() => false);
      if (stillVisible) {
        // Try clicking at the X button position directly
        await page.mouse.click(570, 135); // Approximate position of X button
        await page.waitForTimeout(500);
      }
    }
  } catch {
    // Ignore errors during cleanup
  }
}

// Helper to open import dialog
async function openImportDialog() {
  if (!page || !skillsPage) return false;

  await skillsPage.goto();
  await page.waitForTimeout(1000);

  const importButton = page.locator('[data-testid="import-skill-button"]');
  const isVisible = await importButton.isVisible().catch(() => false);

  if (isVisible) {
    await importButton.click();
    // Wait for dialog to appear using data-testid (works with any language)
    await page.waitForSelector('[data-testid="import-dialog"]', { timeout: 10000 });
    return true;
  }
  return false;
}

test.describe('GitHub Skill Import', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test.afterEach(async () => {
    // Close dialog after each test to ensure clean state
    await closeImportDialogIfOpen();
  });

  test.afterAll(async () => {
    // Cleanup: Delete the imported skill if it exists
    if (skillsPage && page) {
      try {
        await closeImportDialogIfOpen();
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
    const opened = await openImportDialog();
    expect(opened).toBe(true);
    expect(await page!.isVisible('[data-testid="import-dialog"]')).toBe(true);
    // Close dialog at end of test
    await closeImportDialogIfOpen();
  });

  test('should switch to URL import tab', async () => {
    // Open dialog fresh for this test
    await openImportDialog();

    // Click on URL tab
    await page!.click('[data-testid="import-tab-url"]');
    await page!.waitForTimeout(500);

    // Verify URL input is visible
    expect(await page!.isVisible('[data-testid="import-url-input"]')).toBe(true);
    // Close dialog at end of test
    await closeImportDialogIfOpen();
  });

  test('should scan GitHub repository for skills', async () => {
    // Open dialog fresh for this test
    await openImportDialog();
    await page!.click('[data-testid="import-tab-url"]');
    await page!.waitForTimeout(300);

    // Fill in the repository URL
    await page!.fill('[data-testid="import-url-input"]', TEST_REPO_URL);

    // Click scan button
    await page!.click('[data-testid="scan-url-button"]');

    // Wait for scan to complete - wait for either success message, skill list, or error
    try {
      await page!.waitForSelector(
        '[data-testid="scan-success-message"], [data-testid="import-skill-list"], [data-testid="import-error-message"]',
        { timeout: 30000 }
      );
    } catch {
      // Timeout waiting for results
    }

    // Check for success indicator or skill list
    const successVisible = await page!.isVisible('[data-testid="scan-success-message"]').catch(() => false);
    const skillListVisible = await page!.isVisible('[data-testid="import-skill-list"]').catch(() => false);
    const errorVisible = await page!.isVisible('[data-testid="import-error-message"]').catch(() => false);

    // Log state for debugging
    console.log(`Scan result: success=${successVisible}, skillList=${skillListVisible}, error=${errorVisible}`);

    // If error is visible, get the error message text for debugging
    if (errorVisible) {
      const errorText = await page!.textContent('[data-testid="import-error-message"]').catch(() => 'unknown error');
      console.log(`Error message: ${errorText}`);

      // Skip test if GitHub API is rate limited or unavailable
      if (errorText.includes('rate limit') || errorText.includes('access repository tree')) {
        test.skip(true, 'GitHub API rate limited or unavailable - skipping test');
      }
    }

    expect(successVisible || skillListVisible).toBe(true);
    // Close dialog at end of test
    await closeImportDialogIfOpen();
  });

  test('should import skill from GitHub repository', async () => {
    // Add delay to avoid GitHub API rate limiting
    await page!.waitForTimeout(2000);

    // Open dialog and scan fresh
    await openImportDialog();
    await page!.click('[data-testid="import-tab-url"]');
    await page!.waitForTimeout(500);

    // Fill in the repository URL and scan
    await page!.fill('[data-testid="import-url-input"]', TEST_REPO_URL);
    console.log(`Scanning URL: ${TEST_REPO_URL}`);
    await page!.click('[data-testid="scan-url-button"]');

    // Wait for scan to complete
    let scanResult = null;
    try {
      scanResult = await page!.waitForSelector(
        '[data-testid="scan-success-message"], [data-testid="import-skill-list"], [data-testid="import-error-message"]',
        { timeout: 45000 }
      );
      console.log(`Scan result element found: ${await scanResult.getAttribute('data-testid')}`);
    } catch (e) {
      console.log(`Timeout waiting for scan results: ${e}`);
    }

    const skillListVisible = await page!.isVisible('[data-testid="import-skill-list"]').catch(() => false);
    const errorVisible = await page!.isVisible('[data-testid="import-error-message"]').catch(() => false);
    const successVisible = await page!.isVisible('[data-testid="scan-success-message"]').catch(() => false);
    console.log(`Import test scan: skillList=${skillListVisible}, error=${errorVisible}, success=${successVisible}`);

    // If error is visible, get the error message text for debugging
    if (errorVisible) {
      const errorText = await page!.textContent('[data-testid="import-error-message"]').catch(() => 'unknown error');
      console.log(`Error message: ${errorText}`);

      // Skip test if GitHub API is rate limited or unavailable
      if (errorText.includes('rate limit') || errorText.includes('access repository tree')) {
        test.skip(true, 'GitHub API rate limited or unavailable - skipping test');
      }
    }

    // Verify skill list is visible
    expect(skillListVisible).toBe(true);

    // Find and check the skill checkbox
    const skillCheckbox = page!.locator('[data-testid="import-skill-list"] input[type="checkbox"]').first();
    if (!(await skillCheckbox.isChecked())) {
      await skillCheckbox.check();
    }

    // Click import button
    await page!.click('[data-testid="confirm-import-button"]');

    // Wait for import to complete - dialog should close when done
    // Wait for the dialog to disappear (import complete) or error
    try {
      await page!.waitForSelector('[data-testid="import-dialog"]', { state: 'hidden', timeout: 60000 });
    } catch {
      // If dialog doesn't close, try to close it manually
      await closeImportDialogIfOpen();
    }

    // Verify skill appears in skills list
    await skillsPage!.goto();
    await page!.waitForTimeout(2000);

    const skillExists = await skillsPage!.skillExists(EXPECTED_SKILL_NAME);
    expect(skillExists).toBe(true);
  });

  test('should verify imported skill content', async () => {
    await closeImportDialogIfOpen();
    await skillsPage!.goto();
    await page!.waitForTimeout(1000);

    // Check if skill exists before trying to verify it
    const skillExists = await skillsPage!.skillExists(EXPECTED_SKILL_NAME).catch(() => false);
    if (!skillExists) {
      test.skip(true, 'Imported skill not found - skipping verification test');
    }

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
    await closeImportDialogIfOpen();
    await skillsPage!.goto();
    await page!.waitForTimeout(1000);

    const existsBefore = await skillsPage!.skillExists(EXPECTED_SKILL_NAME).catch(() => false);
    if (!existsBefore) {
      test.skip(true, 'Imported skill not found - skipping delete test');
    }

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

  test.afterEach(async () => {
    await closeImportDialogIfOpen();
  });

  test('should handle invalid URL gracefully', async () => {
    await closeImportDialogIfOpen();
    const opened = await openImportDialog();

    if (opened) {
      // Switch to URL tab
      await page!.click('[data-testid="import-tab-url"]');
      await page!.waitForTimeout(300);

      // Enter invalid URL
      await page!.fill('[data-testid="import-url-input"]', 'https://invalid-url-12345.com/owner/repo');

      // Click scan
      await page!.click('[data-testid="scan-url-button"]');

      // Wait for error message to appear (up to 30 seconds for network timeout)
      try {
        await page!.waitForSelector('[data-testid="import-error-message"]', { timeout: 30000 });
      } catch {
        // Timeout waiting for error
      }

      // Check for error message
      const errorVisible = await page!.isVisible('[data-testid="import-error-message"]').catch(() => false);
      console.log(`Error handling test: errorVisible=${errorVisible}`);
      expect(errorVisible).toBe(true);
    } else {
      test.skip();
    }
  });
});
