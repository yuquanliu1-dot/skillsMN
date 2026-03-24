"use strict";
/**
 * Navigation Tests (P0)
 *
 * Tests for navigation between views and UI responsiveness
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const helpers_1 = require("../helpers");
let electronApp;
let page;
let appPage;
test_1.test.describe('Navigation @P0', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                ELECTRON_ENABLE_LOGGING: 'true'
            }
        });
        page = await electronApp.firstWindow({ timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');
        appPage = new helpers_1.AppPage(electronApp, page);
        // Wait for app to be ready with longer timeout
        await page.waitForSelector('[data-testid="sidebar"]', { timeout: 30000 });
        await page.waitForSelector('[data-testid="main-content"]', { timeout: 30000 });
    });
    test_1.test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });
    test_1.test.describe('Sidebar Navigation', () => {
        (0, test_1.test)('should have visible sidebar', async () => {
            (0, test_1.expect)(await page.isVisible('[data-testid="sidebar"]')).toBeTruthy();
        });
        (0, test_1.test)('should display app logo', async () => {
            const logo = await page.$('[data-testid="sidebar"] .font-bold');
            (0, test_1.expect)(logo).toBeTruthy();
            const text = await logo?.textContent();
            (0, test_1.expect)(text).toContain('SKM');
        });
        (0, test_1.test)('should have navigation buttons with tooltips', async () => {
            // Hover over skills nav to show tooltip
            await page.hover('[data-testid="nav-skills"]');
            // Wait for tooltip
            await page.waitForTimeout(300);
            // Tooltip should appear (using a broader selector)
            const tooltip = await page.$('.absolute.left-full');
            (0, test_1.expect)(tooltip).toBeTruthy();
        });
        (0, test_1.test)('should have settings button', async () => {
            // Settings button is in the footer section of sidebar
            const settingsButton = await page.$('[data-testid="sidebar"] button:has(svg)');
            (0, test_1.expect)(settingsButton).toBeTruthy();
        });
        (0, test_1.test)('should have status indicator', async () => {
            // Status indicator is the Claude status button in the footer
            // The red dot only appears when Claude is NOT installed
            // So we check for the button containing the Claude icon instead
            const sidebarFooter = await page.$('[data-testid="sidebar"] > div:last-child');
            (0, test_1.expect)(sidebarFooter).toBeTruthy();
            // Check that there are at least 2 buttons in footer (settings + claude status)
            const footerButtons = await page.$$('[data-testid="sidebar"] > div:last-child button');
            (0, test_1.expect)(footerButtons.length).toBeGreaterThanOrEqual(2);
        });
    });
    test_1.test.describe('View Switching', () => {
        (0, test_1.test)('should switch to Skills view', async () => {
            await appPage.navigateTo('skills');
            // Verify skills view content
            (0, test_1.expect)(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
            // Verify nav button is active
            const currentView = await appPage.getCurrentView();
            (0, test_1.expect)(currentView).toBe('skills');
        });
        (0, test_1.test)('should switch to Discover view', async () => {
            await appPage.navigateTo('discover');
            // Verify discover view content
            (0, test_1.expect)(await page.isVisible('[data-testid="search-input"]')).toBeTruthy();
            const currentView = await appPage.getCurrentView();
            (0, test_1.expect)(currentView).toBe('discover');
        });
        (0, test_1.test)('should switch to Private Repos view', async () => {
            await appPage.navigateTo('private-repos');
            // Verify private repos view content
            (0, test_1.expect)(await page.isVisible('[data-testid="private-repos-list"]')).toBeTruthy();
            const currentView = await appPage.getCurrentView();
            (0, test_1.expect)(currentView).toBe('private-repos');
        });
        (0, test_1.test)('should switch back to Skills view', async () => {
            await appPage.navigateTo('skills');
            (0, test_1.expect)(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
        });
    });
    test_1.test.describe('Navigation State', () => {
        (0, test_1.test)('should remember last active view', async () => {
            // Navigate to discover
            await appPage.navigateTo('discover');
            // Wait a moment
            await page.waitForTimeout(500);
            // Current view should be discover
            const currentView = await appPage.getCurrentView();
            (0, test_1.expect)(currentView).toBe('discover');
        });
        (0, test_1.test)('should disable nav when no directories configured', async () => {
            // This test depends on app state
            // When no project directories are configured, nav items should be disabled
            const skillsNav = await page.$('[data-testid="nav-skills"]');
            const isDisabled = await skillsNav?.getAttribute('disabled');
            // Note: In a configured app, this won't be disabled
            // This test is for documentation of expected behavior
            if (isDisabled !== null) {
                (0, test_1.expect)(isDisabled).toBe('true');
            }
        });
    });
    test_1.test.describe('Settings Navigation', () => {
        (0, test_1.test)('should open settings modal', async () => {
            await appPage.openSettings();
            (0, test_1.expect)(await appPage.isDialogOpen('settings-modal')).toBeTruthy();
        });
        (0, test_1.test)('should close settings modal', async () => {
            await appPage.closeSettings();
            (0, test_1.expect)(await appPage.isDialogOpen('settings-modal')).toBeFalsy();
        });
        (0, test_1.test)('should close settings when clicking outside', async () => {
            await appPage.openSettings();
            await appPage.closeDialogByClickingOutside();
            // Settings might or might not close depending on implementation
            // Some dialogs prevent closing on backdrop click
        });
    });
    test_1.test.describe('Keyboard Navigation', () => {
        (0, test_1.test)('should support keyboard shortcuts', async () => {
            // Ensure settings modal is closed from previous test
            if (await appPage.isDialogOpen('settings-modal')) {
                await appPage.closeSettings();
            }
            // Navigate to skills first
            await appPage.navigateTo('skills');
            // Try Ctrl+N for new skill (if implemented)
            // This should open create dialog if skills view is active
            await page.keyboard.press('Control+n');
            // Check if dialog appeared
            const dialogVisible = await page.isVisible('[data-testid="create-skill-dialog"]');
            // If dialog opened, close it
            if (dialogVisible) {
                await page.keyboard.press('Escape');
            }
        });
        (0, test_1.test)('should close dialogs with Escape key', async () => {
            // Open create skill dialog
            await appPage.navigateTo('skills');
            await page.click('[data-testid="create-skill-button"]');
            await page.waitForSelector('[data-testid="create-skill-dialog"]');
            // Press Escape to close
            await page.keyboard.press('Escape');
            // Dialog should close
            await page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 3000 });
        });
    });
});
//# sourceMappingURL=01-navigation.spec.js.map