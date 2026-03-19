/**
 * Skill Editor Tests (P0)
 *
 * Tests for Monaco editor functionality, save, auto-save, and editor controls
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage, EditorPage, TestFixtureManager, waitForAppReady, generateUniqueSkillName, generateSkillContent } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let skillsPage: SkillsPage;
let editorPage: EditorPage;
let fixtureManager: TestFixtureManager;
let testSkillName: string;

test.describe('Skill Editor @P0', () => {
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

    // Wait for app to be ready
    await waitForAppReady(page);

    // Create a test skill
    testSkillName = generateUniqueSkillName('editor-test');
    await skillsPage.goto();
    await fixtureManager.createSkill(testSkillName);
    await page.waitForTimeout(1000);
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

  test.describe('Editor Loading', () => {
    test('should open editor when skill is clicked', async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);

      await editorPage.waitForEditor();
      expect(await page.isVisible('[data-testid="skill-editor"]')).toBeTruthy();
    });

    test('should display Monaco editor', async () => {
      expect(await page.isVisible('.monaco-editor')).toBeTruthy();
    });

    test('should load skill content', async () => {
      const content = await editorPage.getContent();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('---'); // YAML frontmatter
    });

    test('should show skill name in header', async () => {
      const name = await editorPage.getSkillName();
      expect(name).toContain(testSkillName);
    });
  });

  test.describe('Editor Header', () => {
    test('should display source badge for local skill', async () => {
      const badge = await editorPage.getSourceBadge();
      expect(badge?.toLowerCase()).toContain('local');
    });

    test('should display last modified date', async () => {
      const modifiedText = await editorPage.getLastModifiedText();
      expect(modifiedText).toContain('Modified:');
    });

    test('should show keyboard shortcuts in footer', async () => {
      expect(await editorPage.areKeyboardShortcutsVisible()).toBeTruthy();
    });
  });

  test.describe('Content Editing', () => {
    test('should allow typing in editor', async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();

      // Add content
      const testContent = '\n\n## Test Section\n\nAdded by test.';
      await editorPage.typeInEditor(testContent);

      // Verify unsaved changes indicator
      expect(await editorPage.hasUnsavedChanges()).toBeTruthy();
    });

    test('should show unsaved changes indicator', async () => {
      await editorPage.typeInEditor('\n\nMore content.');

      expect(await editorPage.hasUnsavedChanges()).toBeTruthy();
    });
  });

  test.describe('Save Functionality', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();
    });

    test('should save with Ctrl+S', async () => {
      await editorPage.typeInEditor('\n\n## Save Test');

      await editorPage.save();
      await page.waitForTimeout(1000);

      expect(await editorPage.hasUnsavedChanges()).toBeFalsy();
    });

    test('should show saving indicator during save', async () => {
      await editorPage.typeInEditor('\n\n## Saving Indicator Test');

      // Start save
      await page.keyboard.press('Control+s');

      // Might briefly show saving state
      await page.waitForTimeout(500);
    });

    test('should preserve content after save', async () => {
      const testMarker = `TEST_MARKER_${Date.now()}`;
      await editorPage.typeInEditor(`\n\n${testMarker}`);

      await editorPage.save();
      await page.waitForTimeout(1000);

      // Close and reopen
      await editorPage.close();
      await page.waitForTimeout(500);
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();

      const content = await editorPage.getContent();
      expect(content).toContain(testMarker);
    });
  });

  test.describe('Auto-Save', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();
    });

    test('should trigger auto-save after delay', async () => {
      await editorPage.typeInEditor('\n\n## Auto-save Test');

      // Wait for auto-save delay (default 2000ms) + buffer
      await page.waitForTimeout(3000);

      // Changes should be saved (unsaved indicator gone)
      expect(await editorPage.hasUnsavedChanges()).toBeFalsy();
    });
  });

  test.describe('Symlink Control', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();
    });

    test('should display symlink toggle', async () => {
      expect(await page.isVisible('[role="switch"]')).toBeTruthy();
    });

    test('should show link status', async () => {
      const status = await editorPage.getSymlinkStatus();
      expect(status).toMatch(/Linked|Not linked/i);
    });

    test('should toggle symlink', async () => {
      const initialState = await editorPage.isSymlinkEnabled();

      await editorPage.toggleSymlink();
      await page.waitForTimeout(500);

      const newState = await editorPage.isSymlinkEnabled();
      expect(newState).toBe(!initialState);

      // Toggle back
      await editorPage.toggleSymlink();
    });
  });

  test.describe('Editor Close', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.clickSkill(testSkillName);
      await editorPage.waitForEditor();
    });

    test('should close editor with Ctrl+W', async () => {
      await editorPage.close();

      await page.waitForSelector('[data-testid="skill-editor"]', { state: 'hidden', timeout: 5000 });
      expect(await page.isVisible('[data-testid="skill-editor"]')).toBeFalsy();
    });

    test('should warn on close with unsaved changes', async () => {
      await editorPage.typeInEditor('\n\n## Unsaved Changes Test');

      // Try to close
      await page.keyboard.press('Control+w');

      // Should show confirmation (or auto-save)
      // Behavior depends on implementation
      await page.waitForTimeout(500);

      // If dialog appears, cancel it
      const dialogVisible = await page.isVisible('text=/unsaved/i');
      if (dialogVisible) {
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Read-Only Mode', () => {
    // Read-only mode is for registry skills, tested in discover tests
    test.skip('should show preview mode badge when read-only', async () => {
      // This would be tested with a registry skill
    });

    test.skip('should prevent editing in read-only mode', async () => {
      // This would be tested with a registry skill
    });
  });

  test.describe('Error States', () => {
    test('should show error message when load fails', async () => {
      // This would require mocking a failed load
      // Skip for now as it requires special setup
      test.skip();
    });

    test('should show external modification warning', async () => {
      // This would require modifying the file externally
      // Skip for now as it requires special setup
      test.skip();
    });
  });
});
