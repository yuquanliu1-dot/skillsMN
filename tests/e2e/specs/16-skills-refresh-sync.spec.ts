/**
 * Skills Refresh Synchronization Tests
 *
 * Tests for verifying that the `skills:refresh` IPC event mechanism
 * correctly synchronizes state across components.
 *
 * @see https://github.com/anthropics/claude-code/issues/70
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage, generateUniqueSkillName } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let skillsPage: SkillsPage;

test.describe('Skills Refresh Synchronization @P1', () => {
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

    // Wait for app to be fully ready
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="main-content"]', { timeout: 15000 });

    // Navigate to skills view
    await skillsPage.goto();

    // Additional wait for React to fully render
    await page.waitForTimeout(2000);

    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should remove skill from list after deletion @P1', async () => {
    // Wait for app to be stable
    await page.waitForTimeout(1000);

    // First, clear any existing search
    await skillsPage.clearSearch();
    await page.waitForTimeout(500);

    // Get initial skill count
    const initialCount = await skillsPage.getSkillCount();
    console.log(`Initial skill count: ${initialCount}`);

    // Skip test if no skills available to delete
    if (initialCount < 1) {
      console.log('No skills available for deletion test, skipping');
      test.skip();
      return;
    }

    // Use github-issue-workflow which is a local skill (Created locally)
    const skillName = 'github-issue-workflow';
    console.log(`Testing deletion of skill: ${skillName}`);

    // Search for the skill to make it visible
    await skillsPage.searchSkills(skillName);
    await page.waitForTimeout(500);

    // Get the specific skill card after search
    const targetSkillCard = page.getByRole('button', { name: new RegExp(skillName, 'i') }).first();
    await targetSkillCard.waitFor({ timeout: 10000 });

    // Delete the skill using the helper method
    await skillsPage.deleteSkill(skillName);

    // Wait for skills:refresh event to propagate
    await page.waitForTimeout(3000);

    // Clear search
    await skillsPage.clearSearch();
    await page.waitForTimeout(500);

    // Verify skill count decreased
    const finalCount = await skillsPage.getSkillCount();
    console.log(`Final skill count: ${finalCount}`);
    expect(finalCount).toBe(initialCount - 1);

    // Verify skill is removed from list
    await skillsPage.searchSkills(skillName);
    await page.waitForTimeout(500);
    const deletedSkill = page.locator(`button:has-text("${skillName}")`);
    expect(await deletedSkill.isVisible().catch(() => false)).toBeFalsy();

    // Clear search for next test
    await skillsPage.clearSearch();
  });

  test('should maintain skill list count across navigation @P1', async () => {
    // Navigate to skills view
    await skillsPage.goto();

    // Get initial skill count
    const initialCount = await skillsPage.getSkillCount();

    // Navigate to discover page
    await page.click('[data-testid="nav-discover"]');
    await page.waitForTimeout(500);

    // Navigate back to skills
    await skillsPage.goto();
    const afterNavigationCount = await skillsPage.getSkillCount();

    // Counts should be the same
    expect(afterNavigationCount).toBe(initialCount);
  });
});
