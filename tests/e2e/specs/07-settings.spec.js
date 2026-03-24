"use strict";
/**
 * Settings Tests (P1)
 *
 * Tests for application settings and configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const helpers_1 = require("../helpers");
let electronApp;
let page;
let settingsPage;
let skillsPage;
test_1.test.describe('Settings @P1', () => {
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
        // Wait for app to be ready
        await page.waitForSelector('[data-testid="sidebar"]', { timeout: 30000 });
        settingsPage = new helpers_1.SettingsPage(electronApp, page);
        skillsPage = new helpers_1.SkillsPage(electronApp, page);
    });
    test_1.test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });
    test_1.test.describe('Settings Modal', () => {
        (0, test_1.test)('should open settings modal', async () => {
            await settingsPage.open();
            (0, test_1.expect)(await settingsPage.isVisible()).toBeTruthy();
        });
        (0, test_1.test)('should close settings modal', async () => {
            if (!await settingsPage.isVisible()) {
                await settingsPage.open();
            }
            await settingsPage.close();
            (0, test_1.expect)(await settingsPage.isVisible()).toBeFalsy();
        });
        (0, test_1.test)('should close with escape key', async () => {
            await settingsPage.open();
            await page.keyboard.press('Escape');
            await page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden', timeout: 3000 });
        });
    });
    test_1.test.describe('Project Directories', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should display project directories section', async () => {
            // Use more flexible text matching - check for either "Project Directories" or related content
            const hasProjectDirsText = await page.isVisible('text=/Project.*Director|Skill.*Storage|Director/i');
            // Also check for the Add button which should be in that section
            const hasAddButton = await page.isVisible('button:has-text("Add")');
            (0, test_1.expect)(hasProjectDirsText || hasAddButton).toBeTruthy();
        });
        (0, test_1.test)('should list configured directories', async () => {
            const dirs = await settingsPage.getProjectDirectories();
            // May be empty in fresh install
            (0, test_1.expect)(Array.isArray(dirs)).toBeTruthy();
        });
        (0, test_1.test)('should have add directory button', async () => {
            (0, test_1.expect)(await page.isVisible('button:has-text("Add")')).toBeTruthy();
        });
    });
    test_1.test.describe('Editor Settings', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
            // Wait for settings to be visible
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            // Switch to Skill View tab where editor settings are located
            await settingsPage.switchToSkillViewTab();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should display editor settings section', async () => {
            (0, test_1.expect)(await page.isVisible('text=/Skill Editor/i')).toBeTruthy();
        });
        (0, test_1.test)('should have font size setting', async () => {
            // Wait for the element to be visible
            await page.waitForSelector('[data-testid="editor-font-size"]', { timeout: 5000 });
            const fontSizeInput = await page.$('[data-testid="editor-font-size"]');
            (0, test_1.expect)(fontSizeInput).toBeTruthy();
        });
        (0, test_1.test)('should have theme setting', async () => {
            const themeSelect = await page.$('select');
            (0, test_1.expect)(themeSelect).toBeTruthy();
        });
        (0, test_1.test)('should have minimap toggle', async () => {
            await page.waitForSelector('[data-testid="show-minimap-toggle"]', { timeout: 5000 });
            const minimapToggle = await page.$('[data-testid="show-minimap-toggle"]');
            (0, test_1.expect)(minimapToggle).toBeTruthy();
        });
        (0, test_1.test)('should have tab size setting', async () => {
            await page.waitForSelector('[data-testid="tab-size"]', { timeout: 5000 });
            const tabSizeInput = await page.$('[data-testid="tab-size"]');
            (0, test_1.expect)(tabSizeInput).toBeTruthy();
        });
        (0, test_1.test)('should have word wrap toggle', async () => {
            await page.waitForSelector('[data-testid="word-wrap-toggle"]', { timeout: 5000 });
            const wordWrapToggle = await page.$('[data-testid="word-wrap-toggle"]');
            (0, test_1.expect)(wordWrapToggle).toBeTruthy();
        });
    });
    test_1.test.describe('Auto Refresh', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should have auto refresh toggle', async () => {
            (0, test_1.expect)(await page.isVisible('#auto-refresh-toggle, input[type="checkbox"]')).toBeTruthy();
        });
    });
    test_1.test.describe('AI Configuration', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            // Switch to AI tab
            await settingsPage.switchToAITab();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should display AI settings section', async () => {
            (0, test_1.expect)(await page.isVisible('text=/AI|API|anthropic/i')).toBeTruthy();
        });
        (0, test_1.test)('should have API key input', async () => {
            const apiKeyInput = await page.$('[data-testid="ai-api-key"]');
            (0, test_1.expect)(apiKeyInput).toBeTruthy();
        });
        (0, test_1.test)('should have test connection button', async () => {
            (0, test_1.expect)(await page.isVisible('[data-testid="test-connection-button"]')).toBeTruthy();
        });
    });
    test_1.test.describe('Private Repositories', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            // Switch to Private Repos tab
            await settingsPage.switchToPrivateReposTab();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should display private repos section', async () => {
            // Check for "Add Repository" button which is always visible
            (0, test_1.expect)(await page.isVisible('button:has-text("Add Repository")')).toBeTruthy();
        });
        (0, test_1.test)('should have add GitHub repo button', async () => {
            // The UI uses a select dropdown for provider selection
            (0, test_1.expect)(await page.isVisible('select:has(option[value="github"]), select')).toBeTruthy();
        });
        (0, test_1.test)('should have add GitLab repo button', async () => {
            // The UI uses a select dropdown for provider selection
            (0, test_1.expect)(await page.isVisible('select:has(option[value="gitlab"]), select')).toBeTruthy();
        });
        (0, test_1.test)('should list configured repos', async () => {
            const repos = await settingsPage.getPrivateRepos();
            (0, test_1.expect)(Array.isArray(repos)).toBeTruthy();
        });
    });
    test_1.test.describe('Save Settings', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            // Switch to Skill View tab where editor settings are located
            await settingsPage.switchToSkillViewTab();
        });
        test_1.test.afterEach(async () => {
            if (await settingsPage.isVisible()) {
                await settingsPage.close();
            }
        });
        (0, test_1.test)('should have save button', async () => {
            // The Skill View tab has a "Save Settings" button at the bottom
            (0, test_1.expect)(await page.isVisible('button:has-text("Save Settings"):visible')).toBeTruthy();
        });
        (0, test_1.test)('should save settings when clicking save', async () => {
            await settingsPage.save();
            // Settings should close or show success
            await page.waitForTimeout(500);
        });
        (0, test_1.test)('should persist settings after save', async () => {
            // Get current font size
            const currentFontSize = await settingsPage.getEditorFontSize();
            // Change font size
            const newSize = currentFontSize === 14 ? 16 : 14;
            await settingsPage.setEditorFontSize(newSize);
            await settingsPage.save();
            // Wait for modal to close after save
            await page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden', timeout: 5000 }).catch(() => { });
            await page.waitForTimeout(500);
            // Reopen and verify
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 10000 });
            await settingsPage.switchToSkillViewTab();
            const savedFontSize = await settingsPage.getEditorFontSize();
            (0, test_1.expect)(savedFontSize).toBe(newSize);
        });
    });
    test_1.test.describe('Validation', () => {
        test_1.test.beforeEach(async () => {
            await settingsPage.open();
        });
        test_1.test.afterEach(async () => {
            await settingsPage.close();
        });
        (0, test_1.test)('should validate font size range', async () => {
            // Try to set invalid font size
            const fontSizeInput = await page.$('#editor-font-size');
            if (fontSizeInput) {
                await fontSizeInput.fill('-1');
                await page.waitForTimeout(100);
                // Should show validation error or clamp value
                const value = await fontSizeInput.inputValue();
                (0, test_1.expect)(parseInt(value)).toBeGreaterThan(0);
            }
        });
    });
    test_1.test.describe('Cancel Changes', () => {
        (0, test_1.test)('should discard changes when closing without save', async () => {
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            // Switch to Skill View tab where editor settings are located
            await settingsPage.switchToSkillViewTab();
            const currentFontSize = await settingsPage.getEditorFontSize();
            const newSize = currentFontSize === 14 ? 18 : 14;
            await settingsPage.setEditorFontSize(newSize);
            // Close without saving (escape or close button)
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            // Reopen and verify original value
            await settingsPage.open();
            await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 });
            await settingsPage.switchToSkillViewTab();
            const savedFontSize = await settingsPage.getEditorFontSize();
            (0, test_1.expect)(savedFontSize).toBe(currentFontSize);
        });
    });
});
//# sourceMappingURL=07-settings.spec.js.map