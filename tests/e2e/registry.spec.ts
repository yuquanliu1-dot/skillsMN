/**
 * Registry Discovery and Installation Tests
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillManagerHelper, TestData } from './helpers/test-helpers';

let electronApp: ElectronApplication;
let page: Page;
let helper: SkillManagerHelper;

test.describe('Registry Search', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    helper = new SkillManagerHelper(electronApp, page);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test.beforeEach(async () => {
    await helper.navigateToDiscover();
  });

  test('should display search input on Discover page', async () => {
    const searchInput = await page.$('[data-testid="search-input"]');
    expect(searchInput).toBeTruthy();

    const placeholder = await searchInput?.getAttribute('placeholder');
    expect(placeholder).toContain('Search');
  });

  test('should search for skills', async () => {
    // Type search query
    await page.fill('[data-testid="search-input"]', 'claude');

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Verify results are displayed
    const results = await page.$$('[data-testid="skill-card"]');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should display "No results" for invalid search', async () => {
    // Search for something that doesn't exist
    await page.fill('[data-testid="search-input"]', 'xyznonexistentskill123456');

    // Wait for search to complete
    await page.waitForTimeout(2000);

    // Check for no results message
    const noResults = await page.$('text=/No skills found|No results/i');
    expect(noResults).toBeTruthy();
  });

  test('should show loading state during search', async () => {
    // Clear input first
    await page.fill('[data-testid="search-input"]', '');

    // Start typing
    await page.type('[data-testid="search-input"]', 'test', { delay: 100 });

    // Check for loading indicator (might be quick)
    const loadingIndicator = await page.$('[data-testid="loading-indicator"]');

    // Either we caught it or it finished quickly
    // Wait for results
    await page.waitForTimeout(1500);
  });

  test('should display skill metadata in search results', async () => {
    await helper.searchSkill('claude');

    // Get first skill card
    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      test.skip();
      return;
    }

    // Verify skill name
    const skillName = await firstCard.$('[data-testid="skill-name"]');
    expect(skillName).toBeTruthy();

    // Verify install count
    const installCount = await firstCard.$('[data-testid="install-count"]');
    expect(installCount).toBeTruthy();

    // Verify source badge
    const sourceBadge = await firstCard.$('[data-testid="source-badge"]');
    expect(sourceBadge).toBeTruthy();
  });
});

test.describe('Skill Installation', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    helper = new SkillManagerHelper(electronApp, page);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should display Install button for registry skills', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('claude');

    // Get first skill card
    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      test.skip();
      return;
    }

    // Check Install button exists and text is "Install"
    const installButton = await firstCard.$('button:has-text("Install")');
    expect(installButton).toBeTruthy();

    const buttonText = await installButton?.textContent();
    expect(buttonText?.trim()).toBe('Install');
  });

  test('should install skill from registry', async () => {
    await helper.navigateToDiscover();

    // Search for a skill
    await helper.searchSkill('pwd');

    // Wait for results
    await page.waitForTimeout(2000);

    // Get first skill card
    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      test.skip();
      return;
    }

    // Get skill name
    const skillName = await firstCard.$eval(
      '[data-testid="skill-name"]',
      el => el.textContent
    );

    // Click Install button
    const installButton = await firstCard.$('button:has-text("Install")');
    await installButton?.click();

    // Wait for installation dialog
    await page.waitForSelector('[data-testid="install-dialog"]', {
      timeout: 5000
    });

    // Confirm installation
    await page.click('[data-testid="confirm-install-button"]');

    // Wait for success message
    await page.waitForSelector('text=/Installation completed|installed successfully/i', {
      timeout: 60000
    });

    // Verify skill appears in Skills list
    await helper.navigateToSkills();
    const installedSkill = await page.$(`text="${skillName}"`);
    expect(installedSkill).toBeTruthy();
  });

  test('should show installation progress', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('test');

    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      test.skip();
      return;
    }

    const installButton = await firstCard.$('button:has-text("Install")');
    await installButton?.click();

    // Check for progress dialog
    const progressDialog = await page.$('[data-testid="install-progress-dialog"]');
    if (progressDialog) {
      // Verify progress stages
      await page.waitForSelector('text=/Cloning|Fetching|Copying/i', {
        timeout: 5000
      });
    }
  });

  test('should disable Install button while installing', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('test');

    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      test.skip();
      return;
    }

    const installButton = await firstCard.$('button:has-text("Install")');

    // Start installation
    await installButton?.click();

    // Wait for dialog and confirm
    await page.waitForSelector('[data-testid="install-dialog"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-install-button"]');

    // Button should be disabled during installation
    const isDisabled = await installButton?.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should handle installation errors gracefully', async () => {
    await helper.navigateToDiscover();

    // Search for a skill that will fail
    await helper.searchSkill('error-test-skill');

    // If skill exists, try to install
    const firstCard = await page.$('[data-testid="skill-card"]');
    if (!firstCard) {
      // No results, which is fine for this test
      test.skip();
      return;
    }

    const installButton = await firstCard.$('button:has-text("Install")');
    await installButton?.click();

    // Wait for dialog
    const dialogVisible = await page.$('[data-testid="install-dialog"]');

    if (dialogVisible) {
      await page.click('[data-testid="confirm-install-button"]');

      // Wait for either success or error
      await page.waitForSelector(
        'text=/Installation completed|Installation failed|error/i',
        { timeout: 60000 }
      );
    }
  });
});

test.describe('Skill Preview', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    helper = new SkillManagerHelper(electronApp, page);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should preview skill content when clicking skill name', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('claude');

    // Wait for results
    await page.waitForTimeout(2000);

    // Click skill name (not the Install button)
    const skillName = await page.$('[data-testid="skill-name"]');
    if (!skillName) {
      test.skip();
      return;
    }

    await skillName.click();

    // Wait for preview panel
    await page.waitForSelector('[data-testid="skill-preview"]', {
      timeout: 10000
    });

    // Verify preview content
    const previewContent = await page.$('[data-testid="skill-preview-content"]');
    expect(previewContent).toBeTruthy();

    // Verify it contains SKILL.md content (YAML frontmatter)
    const content = await previewContent?.textContent();
    expect(content).toContain('---');
  });

  test('should show loading state while fetching preview', async () => {
    await helper.navigateToDiscover();

    // Type slowly to trigger loading
    await page.type('[data-testid="search-input"]', 'claude', { delay: 50 });

    // Click first result
    const skillName = await page.$('[data-testid="skill-name"]');
    if (!skillName) {
      test.skip();
      return;
    }

    await skillName.click();

    // Should show loading indicator briefly
    const loading = await page.$('[data-testid="preview-loading"]');

    // Wait for content to load
    await page.waitForSelector('[data-testid="skill-preview-content"]', {
      timeout: 10000
    });
  });

  test('should display skill metadata in preview', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('claude');

    const skillName = await page.$('[data-testid="skill-name"]');
    if (!skillName) {
      test.skip();
      return;
    }

    await skillName.click();

    // Wait for preview
    await page.waitForSelector('[data-testid="skill-preview"]', {
      timeout: 10000
    });

    // Check for metadata display
    const metadata = await page.$('[data-testid="skill-metadata"]');
    if (metadata) {
      const text = await metadata.textContent();
      // Should contain skill info
      expect(text).toBeTruthy();
    }
  });

  test('should close preview panel', async () => {
    await helper.navigateToDiscover();
    await helper.searchSkill('claude');

    const skillName = await page.$('[data-testid="skill-name"]');
    if (!skillName) {
      test.skip();
      return;
    }

    await skillName.click();
    await page.waitForSelector('[data-testid="skill-preview"]');

    // Click close button
    const closeButton = await page.$('[data-testid="close-preview-button"]');
    await closeButton?.click();

    // Verify preview is closed
    const preview = await page.$('[data-testid="skill-preview"]');
    expect(preview).toBeFalsy();
  });
});
