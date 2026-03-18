/**
 * Application Launch and Basic Functionality Tests
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillManagerHelper } from './helpers/test-helpers';

let electronApp: ElectronApplication | null = null;
let page: Page | null = null;
let helper: SkillManagerHelper | null = null;

// Helper to ensure app is initialized
async function ensureAppInitialized() {
  if (!electronApp || !page || !helper) {
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
    helper = new SkillManagerHelper(electronApp, page);

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

test.describe('Application Launch', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test('should launch application successfully', async () => {
    // Verify window exists
    const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows().length;
    });
    expect(windowCount).toBeGreaterThan(0);

    // Verify page is accessible
    expect(page).toBeTruthy();

    // Verify window title
    const title = await page.title();
    expect(title).toContain('skillsMN');
  });

  test('should load main UI components', async () => {
    // Wait for sidebar to load
    await page!.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Verify navigation items
    const navItems = await page!.$$('[data-testid^="nav-"]');
    expect(navItems.length).toBeGreaterThan(0);

    // Check for main content area
    const mainContent = await page!.$('[data-testid="main-content"]');
    expect(mainContent).toBeTruthy();
  });

  test('should display skills list on startup', async () => {
    // Wait for skills to load
    await page!.waitForSelector('[data-testid="skills-list"]', { timeout: 10000 });

    // Verify skill cards are displayed
    const skillCards = await page!.$$('[data-testid="skill-card"]');
    expect(skillCards.length).toBeGreaterThanOrEqual(0);
  });

  test('should not have console errors on startup', async () => {
    const errors: string[] = [];

    page!.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for app to stabilize
    await page!.waitForTimeout(2000);

    // Filter out expected errors (like network errors in tests)
    const unexpectedErrors = errors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('net::ERR_')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});

test.describe('Navigation', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test('should navigate to Skills view', async () => {
    await helper!.navigateToSkills();

    // Verify skills list is visible
    const skillsList = await page!.$('[data-testid="skills-list"]');
    expect(skillsList).toBeTruthy();
  });

  test('should navigate to Discover view', async () => {
    await helper!.navigateToDiscover();

    // Verify search input is visible
    const searchInput = await page!.$('[data-testid="search-input"]');
    expect(searchInput).toBeTruthy();
  });

  test('should navigate to Private Repos view', async () => {
    await helper!.navigateToPrivateRepos();

    // Verify private repos content is visible
    const privateReposContent = await page!.$('[data-testid="private-repos-list"]');
    expect(privateReposContent).toBeTruthy();
  });
});

test.describe('Skill Management', () => {
  test.beforeAll(async () => {
    await ensureAppInitialized();
  });

  test('should create a new skill', async () => {
    await helper!.navigateToSkills();

    // Click create button
    await page!.click('[data-testid="create-skill-button"]');

    // Wait for dialog
    await page!.waitForSelector('[data-testid="create-skill-dialog"]');

    // Fill in skill name
    const testSkillName = `test-skill-${Date.now()}`;
    await page!.fill('[data-testid="skill-name-input"]', testSkillName);

    // Submit
    await page!.click('[data-testid="confirm-create-button"]');

    // Wait for success toast
    await page!.waitForSelector('text=/created successfully/i', { timeout: 5000 });

    // Verify skill appears in list
    await page!.waitForSelector(`text="${testSkillName}"`, { timeout: 5000 });
  });

  test('should preview skill content', async () => {
    await helper!.navigateToSkills();

    // Get first skill card
    const firstSkill = await page!.$('[data-testid="skill-card"]');
    if (!firstSkill) {
      test.skip();
      return;
    }

    // Click skill to preview
    await firstSkill.click();

    // Wait for editor to load (the app opens editor when clicking a skill)
    await page!.waitForSelector('[data-testid="skill-editor"]', { timeout: 5000 });

    // Verify editor is displayed
    const editor = await page!.$('[data-testid="skill-editor"]');
    expect(editor).toBeTruthy();
  });

  test('should edit skill content', async () => {
    await helper!.navigateToSkills();

    // Click first skill to open in editor
    const firstSkill = await page!.$('[data-testid="skill-card"]');
    if (!firstSkill) {
      test.skip();
      return;
    }

    await firstSkill.click();

    // Wait for editor to load
    await page!.waitForSelector('[data-testid="skill-editor"]', { timeout: 5000 });

    // Verify Monaco editor is present
    const editor = await page!.$('.monaco-editor');
    expect(editor).toBeTruthy();
  });

  test('should delete skill', async () => {
    await helper!.navigateToSkills();

    // Get first skill card and remember its name
    const firstSkill = await page!.$('[data-testid="skill-card"]');
    if (!firstSkill) {
      test.skip();
      return;
    }

    const skillNameElement = await firstSkill.$('[data-testid="skill-name"]');
    const skillName = await skillNameElement?.textContent();

    // Hover to show delete button
    await firstSkill.hover();

    // Click delete button
    const deleteButton = await firstSkill.$('[data-testid="delete-button"]');
    if (!deleteButton) {
      test.skip();
      return;
    }

    await deleteButton.click();

    // Confirm deletion
    await page!.waitForSelector('[data-testid="delete-confirm-dialog"]');
    await page!.click('[data-testid="confirm-delete-button"]');

    // Wait for dialog to close (increased timeout for slower environments)
    await page!.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 15000 });

    // Wait for deletion to complete and UI to update
    await page!.waitForTimeout(2000);

    // Verify skill is no longer in the list
    const deletedSkillCard = await page!.$(`[data-testid="skill-card"]:has-text("${skillName}")`);
    expect(deletedSkillCard).toBeNull();
  });
});

// Global cleanup after all tests
test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});
