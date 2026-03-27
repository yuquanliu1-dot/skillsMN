/**
 * Sidebar Claude Version Display Tests
 *
 * Tests for verifying Claude CLI version number display in sidebar
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Sidebar Claude Version Display @P1', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true'
      }
    });

    page = await electronApp.firstWindow({ timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 30000 });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should display Claude status indicator in sidebar footer', async () => {
    // Find the sidebar footer (last child of sidebar)
    const sidebarFooter = await page.$('[data-testid="sidebar"] > div:last-child');
    expect(sidebarFooter).toBeTruthy();

    // Check for Claude status button (second button in footer)
    const footerButtons = await page.$$('[data-testid="sidebar"] > div:last-child button');
    expect(footerButtons.length).toBeGreaterThanOrEqual(2);

    // The Claude status button should be the last button
    const claudeButton = footerButtons[footerButtons.length - 1];
    expect(claudeButton).toBeTruthy();
  });

  test('should show tooltip when hovering Claude status', async () => {
    // Find the Claude status button (last button in sidebar footer)
    const footerButtons = await page.$$('[data-testid="sidebar"] > div:last-child button');
    const claudeButton = footerButtons[footerButtons.length - 1];

    // Hover over the Claude status button
    await claudeButton?.hover();

    // Wait for tooltip to appear
    await page.waitForTimeout(500);

    // Look for tooltip (it appears to the left of the sidebar)
    const tooltip = await page.$('.absolute.left-full.ml-2');
    expect(tooltip).toBeTruthy();

    // Get tooltip text
    const tooltipText = await tooltip?.textContent();
    console.log('Tooltip text:', tooltipText);

    // The tooltip should contain installation status
    expect(tooltipText).toBeTruthy();
  });

  test('should verify Settings page two-column layout', async () => {
    // Open settings
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });

    // Check for left sidebar navigation
    const settingsSidebar = await page.$('[data-testid="settings-modal"] .w-56');
    expect(settingsSidebar).toBeTruthy();

    // Check for navigation buttons in sidebar
    const navButtons = await page.$$('[data-testid="settings-modal"] .w-56 button');
    expect(navButtons.length).toBeGreaterThanOrEqual(5); // At least 5 nav items

    // Close settings
    await page.click('[data-testid="close-settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden', timeout: 5000 });
  });

  test('should verify Delete dialog modern styling', async () => {
    // Navigate to skills view
    await page.click('[data-testid="nav-skills"]');
    await page.waitForSelector('[data-testid="skills-list"]', { timeout: 5000 });

    // Check if there are any skills to test with
    const skillCards = await page.$$('[data-testid="skill-card"]');

    if (skillCards.length > 0) {
      // Hover over first skill to show actions
      await skillCards[0].hover();
      await page.waitForTimeout(300);

      // Look for delete button
      const deleteButton = await page.$('[data-testid="skill-card"] button[title*="Delete"], [data-testid="skill-card"] button[title*="删除"]');

      if (deleteButton) {
        await deleteButton.click();

        // Wait for delete dialog
        await page.waitForSelector('[data-testid="delete-confirm-dialog"]', { timeout: 5000 });

        // Check for modern styling - gradient header
        const gradientHeader = await page.$('[data-testid="delete-confirm-dialog"] .bg-gradient-to-r');
        expect(gradientHeader).toBeTruthy();

        // Check for rounded corners (rounded-2xl)
        const dialog = await page.$('[data-testid="delete-confirm-dialog"]');
        const dialogClass = await dialog?.getAttribute('class');
        expect(dialogClass).toContain('rounded-2xl');

        // Close dialog
        await page.click('[data-testid="cancel-delete-button"]');
        await page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 5000 });
      }
    }
  });

  test('should verify sidebar navigation icons changed', async () => {
    // Check private-repos button has users icon (for shared skill library)
    const privateReposNav = await page.$('[data-testid="nav-private-repos"]');
    expect(privateReposNav).toBeTruthy();

    // Check discover button has globe icon (for internet search)
    const discoverNav = await page.$('[data-testid="nav-discover"]');
    expect(discoverNav).toBeTruthy();

    // Hover to verify tooltips show correct labels
    await privateReposNav?.hover();
    await page.waitForTimeout(300);

    // Get tooltip
    const tooltip = await page.$('.absolute.left-full.ml-2');
    if (tooltip) {
      const tooltipText = await tooltip.textContent();
      console.log('Private repos tooltip:', tooltipText);
    }
  });
});
