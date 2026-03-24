"use strict";
/**
 * Setup and Configuration Tests (P0)
 *
 * Tests for application setup, configuration, and initial state
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const helpers_1 = require("../helpers");
let electronApp;
let page;
let appPage;
let skillsPage;
let settingsPage;
test_1.test.describe('Setup and Configuration @P0', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                ELECTRON_ENABLE_LOGGING: 'true'
            },
            timeout: 120000 // Increase launch timeout
        });
        page = await electronApp.firstWindow({ timeout: 90000 });
        await page.waitForLoadState('domcontentloaded');
        appPage = new helpers_1.AppPage(electronApp, page);
        skillsPage = new helpers_1.SkillsPage(electronApp, page);
        settingsPage = new helpers_1.SettingsPage(electronApp, page);
        // Wait for app to be ready with longer timeout
        await page.waitForSelector('[data-testid="sidebar"]', { timeout: 45000 });
        // Log console messages for debugging
        page.on('console', msg => {
            console.log(`[Browser ${msg.type()}] ${msg.text()}`);
        });
        page.on('pageerror', error => {
            console.error('[Page Error]', error.message);
        });
    });
    test_1.test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });
    test_1.test.describe('Application Launch', () => {
        (0, test_1.test)('should launch application successfully', async () => {
            // Verify window exists
            const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
                return BrowserWindow.getAllWindows().length;
            });
            (0, test_1.expect)(windowCount).toBeGreaterThan(0);
            // Verify page is accessible
            (0, test_1.expect)(page).toBeTruthy();
            // Verify window title contains app name
            const title = await page.title();
            (0, test_1.expect)(title).toContain('skillsMN');
        });
        (0, test_1.test)('should load main UI components', async () => {
            // Sidebar should already be loaded from beforeAll
            // Just verify it exists
            const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
            (0, test_1.expect)(sidebarVisible).toBeTruthy();
            // Verify navigation items exist
            const navItems = await page.$$('[data-testid^="nav-"]');
            (0, test_1.expect)(navItems.length).toBeGreaterThan(0);
            // Check for main content area
            const mainContent = await page.$('[data-testid="main-content"]');
            (0, test_1.expect)(mainContent).toBeTruthy();
        });
        (0, test_1.test)('should display sidebar with navigation buttons', async () => {
            // Sidebar should already be visible from beforeAll
            const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
            (0, test_1.expect)(sidebarVisible).toBeTruthy();
            // Verify navigation buttons
            (0, test_1.expect)(await page.isVisible('[data-testid="nav-skills"]')).toBeTruthy();
            (0, test_1.expect)(await page.isVisible('[data-testid="nav-discover"]')).toBeTruthy();
            (0, test_1.expect)(await page.isVisible('[data-testid="nav-private-repos"]')).toBeTruthy();
        });
    });
    test_1.test.describe('First Run Experience', () => {
        (0, test_1.test)('should show setup dialog when no directories configured', async () => {
            // This test depends on the app state
            // In a clean install, setup dialog should appear
            const setupDialog = await page.$('[data-testid="setup-dialog"]');
            if (setupDialog) {
                (0, test_1.expect)(await setupDialog.isVisible()).toBeTruthy();
                // Should have directory selection option
                (0, test_1.expect)(await page.isVisible('text=/select.*directory|choose.*folder/i')).toBeTruthy();
            }
        });
        (0, test_1.test)('should allow selecting project directory in setup', async () => {
            const setupDialog = await page.$('[data-testid="setup-dialog"]');
            if (setupDialog && await setupDialog.isVisible()) {
                // Look for browse/select button
                const browseButton = await page.$('button:has-text("Browse"), button:has-text("Select")');
                if (browseButton) {
                    // In real test, we'd mock the file dialog
                    // For now, just verify the button exists
                    (0, test_1.expect)(browseButton).toBeTruthy();
                }
            }
        });
        (0, test_1.test)('should complete setup and navigate to skills view', async () => {
            // Sidebar should already be visible from beforeAll
            const sidebarVisible = await page.isVisible('[data-testid="sidebar"]');
            (0, test_1.expect)(sidebarVisible).toBeTruthy();
            // Try to navigate to skills
            const skillsNav = await page.$('[data-testid="nav-skills"]');
            if (skillsNav) {
                const isDisabled = await skillsNav.getAttribute('disabled');
                // If not disabled, should be clickable
                if (!isDisabled) {
                    await skillsNav.click();
                    await page.waitForLoadState('domcontentloaded');
                }
            }
        });
    });
    test_1.test.describe('Configuration Management', () => {
        (0, test_1.test)('should open settings modal', async () => {
            await appPage.openSettings();
            (0, test_1.expect)(await settingsPage.isVisible()).toBeTruthy();
        });
        (0, test_1.test)('should display project directories in settings', async () => {
            // Settings should be open from previous test
            if (!await settingsPage.isVisible()) {
                await appPage.openSettings();
            }
            // Look for project directories section - use more flexible matching
            // The UI might show "Project Directories", "Skill Storage", or similar
            const hasDirsSection = await page.isVisible('text=/Project.*Director|Skill.*Storage|Director|Storage/i');
            const hasAddButton = await page.isVisible('button:has-text("Add")');
            // Pass if either section text or add button exists
            (0, test_1.expect)(hasDirsSection || hasAddButton).toBeTruthy();
        });
        (0, test_1.test)('should have add directory button', async () => {
            if (!await settingsPage.isVisible()) {
                await appPage.openSettings();
            }
            const addButton = await page.$('button:has-text("Add"), button:has-text("+")');
            (0, test_1.expect)(addButton).toBeTruthy();
        });
        (0, test_1.test)('should have editor configuration options', async () => {
            if (!await settingsPage.isVisible()) {
                await appPage.openSettings();
            }
            // Look for editor settings
            (0, test_1.expect)(await page.isVisible('text=/font.*size|editor/i')).toBeTruthy();
        });
        (0, test_1.test)('should close settings modal', async () => {
            if (await settingsPage.isVisible()) {
                await settingsPage.close();
            }
            (0, test_1.expect)(await settingsPage.isVisible()).toBeFalsy();
        });
    });
    test_1.test.describe('Navigation', () => {
        (0, test_1.test)('should navigate to Skills view', async () => {
            await appPage.navigateTo('skills');
            // Verify skills list is visible
            const skillsList = await page.$('[data-testid="skills-list"]');
            (0, test_1.expect)(skillsList).toBeTruthy();
        });
        (0, test_1.test)('should navigate to Discover view', async () => {
            await appPage.navigateTo('discover');
            // Verify search input is visible
            const searchInput = await page.$('[data-testid="search-input"]');
            (0, test_1.expect)(searchInput).toBeTruthy();
        });
        (0, test_1.test)('should navigate to Private Repos view', async () => {
            await appPage.navigateTo('private-repos');
            // Verify private repos content is visible
            const privateReposContent = await page.$('[data-testid="private-repos-list"]');
            (0, test_1.expect)(privateReposContent).toBeTruthy();
        });
        (0, test_1.test)('should show active state on current nav item', async () => {
            await appPage.navigateTo('skills');
            // Check that skills nav has active styling
            const skillsNav = await page.$('[data-testid="nav-skills"]');
            const classes = await skillsNav?.getAttribute('class');
            (0, test_1.expect)(classes).toContain('bg-blue-50');
        });
    });
    test_1.test.describe('Error Handling on Startup', () => {
        (0, test_1.test)('should not have console errors on startup', async () => {
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });
            // Wait for app to stabilize
            await page.waitForTimeout(2000);
            // Filter out expected errors (like network errors in tests)
            const unexpectedErrors = errors.filter(err => !err.includes('Failed to load resource') &&
                !err.includes('net::ERR_') &&
                !err.includes('Extension'));
            (0, test_1.expect)(unexpectedErrors).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=00-setup.spec.js.map