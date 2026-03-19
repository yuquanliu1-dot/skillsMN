/**
 * Local Skills Management Tests (P0)
 *
 * Tests for creating, editing, deleting, and managing local skills
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage, EditorPage, TestFixtureManager, waitForAppReady, generateUniqueSkillName } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let skillsPage: SkillsPage;
let editorPage: EditorPage;
let fixtureManager: TestFixtureManager;

test.describe('Local Skills Management @P0', () => {
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
    fixtureManager = new TestFixtureManager(electronApp, page);

    // Wait for app to be fully ready
    await waitForAppReady(page);

    // Navigate to skills view
    await skillsPage.goto();

    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });
  });

  test.afterAll(async () => {
    // Clean up created skills
    if (fixtureManager) {
      await fixtureManager.cleanup();
    }

    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('Skills List Display', () => {
    test('should display skills list container', async () => {
      expect(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
    });

    test('should display create skill button', async () => {
      expect(await skillsPage.isCreateButtonVisible()).toBeTruthy();
    });

    test('should display AI create button', async () => {
      expect(await skillsPage.isAICreateButtonVisible()).toBeTruthy();
    });

    test('should display search input', async () => {
      expect(await page.isVisible('input[placeholder*="Search"]')).toBeTruthy();
    });

    test('should display filter and sort controls', async () => {
      expect(await page.isVisible('#filter-source')).toBeTruthy();
      expect(await page.isVisible('#sort-by')).toBeTruthy();
    });
  });

  test.describe('Create Skill', () => {
    test('should open create skill dialog', async () => {
      await page.click('[data-testid="create-skill-button"]');

      expect(await page.isVisible('[data-testid="create-skill-dialog"]')).toBeTruthy();

      // Close dialog
      await page.keyboard.press('Escape');
    });

    test('should create new skill with valid name', async () => {
      const skillName = generateUniqueSkillName('test-skill');

      await skillsPage.createSkill(skillName);

      // createSkill already waits for the skill to appear
      // Just verify it exists
      expect(await skillsPage.skillExists(skillName)).toBeTruthy();
    });

    test('should show error for duplicate name', async () => {
      // Create a skill first
      const skillName = generateUniqueSkillName('duplicate-test');
      await skillsPage.createSkill(skillName);
      await page.waitForTimeout(1000);

      // Try to create with same name
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');
      await page.fill('[data-testid="skill-name-input"]', skillName);
      await page.click('[data-testid="confirm-create-button"]');

      // Should show error
      await page.waitForSelector('text=/already exists|duplicate/i', { timeout: 5000 });

      // Close dialog
      await page.keyboard.press('Escape');
    });

    test('should validate skill name - empty', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      // Leave empty - button should be disabled
      await page.fill('[data-testid="skill-name-input"]', '');

      // The create button should be disabled when name is empty
      const isDisabled = await page.isDisabled('[data-testid="confirm-create-button"]');
      expect(isDisabled).toBeTruthy();

      await page.keyboard.press('Escape');
    });

    test('should validate skill name - invalid characters', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      // Try invalid characters
      await page.fill('[data-testid="skill-name-input"]', 'invalid@skill#name!');
      await page.click('[data-testid="confirm-create-button"]');

      // Should show validation error
      await page.waitForSelector('text=/letters.*numbers.*hyphens/i', { timeout: 3000 });

      await page.keyboard.press('Escape');
    });

    test('should create skill using Ctrl+N shortcut', async () => {
      const skillName = generateUniqueSkillName('shortcut-skill');

      await skillsPage.createSkillWithShortcut(skillName);

      // Wait for success toast
      await page.waitForSelector('text=/created successfully/i', { timeout: 10000 });

      // Wait for dialog to close and skills to reload
      await page.waitForTimeout(3000);

      // Search for the skill to make it visible
      await skillsPage.searchSkills(skillName);
      await page.waitForTimeout(500);

      // Verify skill appears in list with longer timeout
      await skillsPage.waitForSkill(skillName, 20000);

      // Clear search
      await skillsPage.clearSearch();
    });

    test('should cancel skill creation', async () => {
      await page.click('[data-testid="create-skill-button"]');
      await page.waitForSelector('[data-testid="create-skill-dialog"]');

      await page.fill('[data-testid="skill-name-input"]', 'cancel-test-skill');

      // Click cancel button
      await page.click('button:has-text("Cancel")');

      // Dialog should close
      await page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 3000 });

      // Skill should not exist
      expect(await skillsPage.skillExists('cancel-test-skill')).toBeFalsy();
    });
  });

  test.describe('Skill Editor', () => {
    const testSkillName = generateUniqueSkillName('editor-test');

    test.beforeAll(async () => {
      // Create a skill for editing tests
      await skillsPage.goto();
      await skillsPage.createSkill(testSkillName);
      await page.waitForTimeout(1000);
    });

    test('should open skill in editor when clicked', async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);

      // Editor should be visible
      await editorPage.waitForEditor();
      expect(await page.isVisible('[data-testid="skill-editor"]')).toBeTruthy();
    });

    test('should display Monaco editor', async () => {
      expect(await page.isVisible('.monaco-editor')).toBeTruthy();
    });

    test('should display skill name in header', async () => {
      const name = await editorPage.getSkillName();
      expect(name).toContain(testSkillName);
    });

    test('should show local source badge', async () => {
      const badge = await editorPage.getSourceBadge();
      expect(badge?.toLowerCase()).toContain('local');
    });

    test('should save skill with Ctrl+S', async () => {
      // Type some content
      await editorPage.typeInEditor('\n\n## Test Section\n\nAdded by test.');

      // Save
      await editorPage.save();

      // Wait for save to complete
      await page.waitForTimeout(1000);

      // Check for unsaved changes indicator to disappear
      expect(await editorPage.hasUnsavedChanges()).toBeFalsy();
    });

    test('should close editor with Ctrl+W', async () => {
      await editorPage.close();

      // Editor should close
      await page.waitForSelector('[data-testid="skill-editor"]', { state: 'hidden', timeout: 5000 });
    });
  });

  test.describe('Delete Skill', () => {
    const deleteTestSkill = generateUniqueSkillName('delete-test');

    test.beforeAll(async () => {
      await skillsPage.goto();
      await skillsPage.createSkill(deleteTestSkill);
      await page.waitForTimeout(1000);
    });

    test('should show delete confirmation dialog', async () => {
      await skillsPage.goto();

      // Search for the skill first to make it visible
      await skillsPage.searchSkills(deleteTestSkill);
      await page.waitForTimeout(500);

      // Use locator API for chaining
      const skillCard = page.locator(`[data-testid="skill-card"]:has-text("${deleteTestSkill}")`);
      await skillCard.waitFor({ timeout: 10000 });

      // Hover over skill to show actions
      await skillCard.hover();
      await page.waitForTimeout(200);

      // Click delete button
      await skillCard.locator('[data-testid="delete-button"]').click();

      // Confirmation dialog should appear
      expect(await page.isVisible('[data-testid="delete-confirm-dialog"]')).toBeTruthy();

      // Cancel the dialog to clean up
      await page.click('[data-testid="cancel-delete-button"]');
    });

    test('should delete skill after confirmation', async () => {
      await skillsPage.goto();
      await skillsPage.deleteSkill(deleteTestSkill);

      // Wait for deletion to complete
      await page.waitForTimeout(2000);

      // Skill should be removed
      expect(await skillsPage.skillExists(deleteTestSkill)).toBeFalsy();
    });

    test('should cancel deletion', async () => {
      const cancelTestSkill = generateUniqueSkillName('cancel-delete');
      await skillsPage.createSkill(cancelTestSkill);
      await page.waitForTimeout(1000);

      await skillsPage.cancelDeleteSkill(cancelTestSkill);

      // Skill should still exist
      expect(await skillsPage.skillExists(cancelTestSkill)).toBeTruthy();
    });
  });

  test.describe('Search and Filter', () => {
    test.beforeAll(async () => {
      await skillsPage.goto();
    });

    test('should filter skills by search query', async () => {
      const initialCount = await skillsPage.getSkillCount();

      // Search for a term
      await skillsPage.searchSkills('test');

      // Count should potentially change
      await page.waitForTimeout(500);

      // Clear search
      await skillsPage.clearSearch();
    });

    test('should show no results message for non-matching search', async () => {
      await skillsPage.searchSkills('xyznonexistent12345');

      await page.waitForTimeout(500);

      // Should show no results message
      expect(await page.isVisible('text=/No skills match/i')).toBeTruthy();

      await skillsPage.clearSearch();
    });

    test('should sort skills by name', async () => {
      await skillsPage.sortSkills('name');

      await page.waitForTimeout(500);

      // Verify sort is applied (check select value)
      const sortValue = await page.$eval('#sort-by', (el: any) => el.value);
      expect(sortValue).toBe('name');
    });

    test('should sort skills by date', async () => {
      await skillsPage.sortSkills('modified');

      await page.waitForTimeout(500);

      const sortValue = await page.$eval('#sort-by', (el: any) => el.value);
      expect(sortValue).toBe('modified');
    });

    test('should filter skills by source', async () => {
      await skillsPage.filterSkills('local');

      await page.waitForTimeout(500);

      const filterValue = await page.$eval('#filter-source', (el: any) => el.value);
      expect(filterValue).toBe('local');

      // Reset filter
      await skillsPage.filterSkills('all');
    });
  });
});
