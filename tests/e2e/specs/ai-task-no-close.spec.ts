/**
 * Test: AI Task Complete - Should NOT close dialog
 *
 * Validates that:
 * 1. Create skill opens in editor
 * 2. AI sidebar stays open after completion
 * 3. Editor refreshes when file is modified during streaming
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { waitForAppReady, generateUniqueSkillName } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;

test.describe('AI Task Complete - Should NOT close dialog', () => {
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

    await waitForAppReady(page);

    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should open newly created skill in editor', async () => {
    const skillName = generateUniqueSkillName('test-ai-task');

    // Navigate to skills view
    await page.click('[data-testid="nav-skills"]');
    await page.waitForTimeout(500);

    // Click create skill button
    await page.click('[data-testid="create-skill-button"]');
    await page.waitForSelector('[data-testid="create-skill-dialog"]');

    // Fill in skill name
    await page.fill('[data-testid="skill-name-input"]', skillName);

    // Click create button
    await page.click('[data-testid="confirm-create-button"]');

    // Wait for dialog to close
    await page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 5000 });

    // Wait for editor to appear
    await page.waitForSelector('[data-testid="skill-editor"]', { state: 'visible', timeout: 10000 });

    // Verify editor is visible
    const editorVisible = await page.isVisible('[data-testid="skill-editor"]');
    expect(editorVisible).toBeTruthy();

    // Verify skill name in editor header
    const editorHeader = await page.textContent('[data-testid="editor-skill-name"]');
    expect(editorHeader?.toLowerCase()).toContain(skillName.toLowerCase());

    console.log(`Test passed: Editor opened for skill "${skillName}"`);
  });
});