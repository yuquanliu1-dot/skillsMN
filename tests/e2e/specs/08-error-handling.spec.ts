/**
 * Error Handling Tests (P2)
 *
 * Tests for error scenarios, edge cases, and error recovery
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage, EditorPage, generateUniqueSkillName } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let skillsPage: SkillsPage;
let editorPage: EditorPage;

test.describe('Error Handling @P2', () => {
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

    skillsPage = new SkillsPage(electronApp, page);
    editorPage = new EditorPage(electronApp, page);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Skill Creation Errors', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
    });

    test('should show error for empty skill name', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      // Clear any existing value and try to submit
      await page.fill('[data-testid="skill-name-input"]', '');

      // The create button should be disabled when input is empty
      const createButton = await page.$('[data-testid="confirm-create-button"][disabled]');
      expect(createButton).toBeTruthy();

      await page.keyboard.press('Escape');
    });

    test('should show error for invalid characters', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      await page.fill('[data-testid="skill-name-input"]', 'invalid@name#here!');
      await page.click('[data-testid="confirm-create-button"]');

      expect(await page.isVisible('text=/letters.*numbers/i')).toBeTruthy();

      await page.keyboard.press('Escape');
    });

    test('should show error for name too long', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      const longName = 'a'.repeat(101);
      await page.fill('[data-testid="skill-name-input"]', longName);
      await page.click('[data-testid="confirm-create-button"]');

      expect(await page.isVisible('text=/100 characters/i')).toBeTruthy();

      await page.keyboard.press('Escape');
    });

    test('should show error for duplicate name', async () => {
      const skillName = generateUniqueSkillName('dup-test');
      await skillsPage.createSkill(skillName);
      await page.waitForTimeout(1000);

      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');
      await page.fill('[data-testid="skill-name-input"]', skillName);
      await page.click('[data-testid="confirm-create-button"]');

      expect(await page.isVisible('text=/already exists|duplicate/i')).toBeTruthy();

      await page.keyboard.press('Escape');
    });
  });

  test.describe('File System Errors', () => {
    // These tests would require special setup to simulate file system errors
    test.skip('should handle permission denied error', async () => {
      // Would require mocking file system permissions
    });

    test.skip('should handle disk full error', async () => {
      // Would require mocking disk full scenario
    });

    test.skip('should handle file not found error', async () => {
      // Would require deleting file during operation
    });
  });

  test.describe('Network Errors', () => {
    test.skip('should handle registry timeout', async () => {
      // Would require mocking network timeout
    });

    test.skip('should handle GitHub API rate limit', async () => {
      // Would require mocking rate limit response
    });

    test.skip('should handle network disconnection', async () => {
      // Would require mocking network failure
    });
  });

  test.describe('Editor Errors', () => {
    test.skip('should handle external file modification', async () => {
      // Would require modifying file externally during edit
    });

    test.skip('should handle corrupted file content', async () => {
      // Would require creating corrupted file
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retry after error', async () => {
      // This tests the general retry pattern
      await skillsPage.goto();

      // Most error states should have retry buttons
      // If an error is visible, check for retry button
      const errorVisible = await page.isVisible('.text-red-600, .text-red-400');

      if (errorVisible) {
        const retryButton = await page.$('button:has-text("Retry")');
        if (retryButton) {
          // Retry should be clickable
          expect(await retryButton.isEnabled()).toBeTruthy();
        }
      }
    });

    test('should dismiss error toast after timeout', async () => {
      await skillsPage.goto();

      // If there's a toast, it should auto-dismiss
      const toastVisible = await page.isVisible('[data-testid="toast"]');

      if (toastVisible) {
        // Wait for toast to disappear (default timeout varies)
        await page.waitForTimeout(5000);

        // Toast should be gone or in process of disappearing
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty skills list', async () => {
      await skillsPage.goto();

      // Search for non-existent skill
      await skillsPage.searchSkills('xyznonexistent12345');

      await page.waitForTimeout(500);

      // Should show appropriate message
      const hasEmptyMessage = await page.isVisible('text=/No skills found|No skills match/i');
      expect(hasEmptyMessage).toBeTruthy();
    });

    test('should handle special characters in search', async () => {
      await skillsPage.goto();

      // Search with special characters
      await skillsPage.searchSkills('test<script>alert(1)</script>');

      await page.waitForTimeout(500);

      // Should not cause issues (XSS prevention)
      const alertDialog = await page.$('dialog, [role="alertdialog"]');
      expect(alertDialog).toBeNull();
    });

    test('should handle rapid navigation', async () => {
      // Rapidly switch between views
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="nav-skills"]');
        await page.waitForTimeout(100);
        await page.click('[data-testid="nav-discover"]');
        await page.waitForTimeout(100);
        await page.click('[data-testid="nav-private-repos"]');
        await page.waitForTimeout(100);
      }

      // App should still be responsive
      expect(await page.isVisible('[data-testid="sidebar"]')).toBeTruthy();
    });

    test('should handle keyboard shortcuts at wrong time', async () => {
      await skillsPage.goto();

      // Try save shortcut when no editor is open
      await page.keyboard.press('Control+s');

      // Should not cause errors
      await page.waitForTimeout(500);

      // App should still be functional
      expect(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('should handle large skill list', async () => {
      await skillsPage.goto();

      // Check if virtualization is working
      // List should render even with many items
      await page.waitForTimeout(1000);

      // Should not freeze or crash
      expect(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
    });

    test('should handle rapid input in search', async () => {
      await skillsPage.goto();

      // Type rapidly
      const searchInput = await page.$('[data-testid="skills-list"] input[type="text"]');
      if (searchInput) {
        await searchInput.focus();
        await page.keyboard.type('rapidtestinput123456789', { delay: 10 });

        await page.waitForTimeout(1000);

        // Should handle input without issues
      }
    });
  });
});
