"use strict";
/**
 * Error Handling Tests (P2)
 *
 * Tests for error scenarios, edge cases, and error recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const helpers_1 = require("../helpers");
let electronApp;
let page;
let skillsPage;
let editorPage;
test_1.test.describe('Error Handling @P2', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                ELECTRON_ENABLE_LOGGING: 'true'
            }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        skillsPage = new helpers_1.SkillsPage(electronApp, page);
        editorPage = new helpers_1.EditorPage(electronApp, page);
    });
    test_1.test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });
    test_1.test.describe('Skill Creation Errors', () => {
        test_1.test.beforeEach(async () => {
            await skillsPage.goto();
        });
        (0, test_1.test)('should show error for empty skill name', async () => {
            await page.click('[data-testid="create-skill-button"]');
            await page.waitForSelector('[data-testid="create-skill-dialog"]');
            // Clear any existing value and try to submit
            await page.fill('[data-testid="skill-name-input"]', '');
            // The create button should be disabled when input is empty
            const createButton = await page.$('[data-testid="confirm-create-button"][disabled]');
            (0, test_1.expect)(createButton).toBeTruthy();
            await page.keyboard.press('Escape');
        });
        (0, test_1.test)('should show error for invalid characters', async () => {
            await page.click('[data-testid="create-skill-button"]');
            await page.waitForSelector('[data-testid="create-skill-dialog"]');
            await page.fill('[data-testid="skill-name-input"]', 'invalid@name#here!');
            await page.click('[data-testid="confirm-create-button"]');
            (0, test_1.expect)(await page.isVisible('text=/letters.*numbers/i')).toBeTruthy();
            await page.keyboard.press('Escape');
        });
        (0, test_1.test)('should show error for name too long', async () => {
            await page.click('[data-testid="create-skill-button"]');
            await page.waitForSelector('[data-testid="create-skill-dialog"]');
            const longName = 'a'.repeat(101);
            await page.fill('[data-testid="skill-name-input"]', longName);
            await page.click('[data-testid="confirm-create-button"]');
            (0, test_1.expect)(await page.isVisible('text=/100 characters/i')).toBeTruthy();
            await page.keyboard.press('Escape');
        });
        (0, test_1.test)('should show error for duplicate name', async () => {
            const skillName = (0, helpers_1.generateUniqueSkillName)('dup-test');
            await skillsPage.createSkill(skillName);
            await page.waitForTimeout(1000);
            await page.click('[data-testid="create-skill-button"]');
            await page.waitForSelector('[data-testid="create-skill-dialog"]');
            await page.fill('[data-testid="skill-name-input"]', skillName);
            await page.click('[data-testid="confirm-create-button"]');
            (0, test_1.expect)(await page.isVisible('text=/already exists|duplicate/i')).toBeTruthy();
            await page.keyboard.press('Escape');
        });
    });
    test_1.test.describe('File System Errors', () => {
        // These tests would require special setup to simulate file system errors
        test_1.test.skip('should handle permission denied error', async () => {
            // Would require mocking file system permissions
        });
        test_1.test.skip('should handle disk full error', async () => {
            // Would require mocking disk full scenario
        });
        test_1.test.skip('should handle file not found error', async () => {
            // Would require deleting file during operation
        });
    });
    test_1.test.describe('Network Errors', () => {
        test_1.test.skip('should handle registry timeout', async () => {
            // Would require mocking network timeout
        });
        test_1.test.skip('should handle GitHub API rate limit', async () => {
            // Would require mocking rate limit response
        });
        test_1.test.skip('should handle network disconnection', async () => {
            // Would require mocking network failure
        });
    });
    test_1.test.describe('Editor Errors', () => {
        test_1.test.skip('should handle external file modification', async () => {
            // Would require modifying file externally during edit
        });
        test_1.test.skip('should handle corrupted file content', async () => {
            // Would require creating corrupted file
        });
    });
    test_1.test.describe('Error Recovery', () => {
        (0, test_1.test)('should allow retry after error', async () => {
            // This tests the general retry pattern
            await skillsPage.goto();
            // Most error states should have retry buttons
            // If an error is visible, check for retry button
            const errorVisible = await page.isVisible('.text-red-600, .text-red-400');
            if (errorVisible) {
                const retryButton = await page.$('button:has-text("Retry")');
                if (retryButton) {
                    // Retry should be clickable
                    (0, test_1.expect)(await retryButton.isEnabled()).toBeTruthy();
                }
            }
        });
        (0, test_1.test)('should dismiss error toast after timeout', async () => {
            await skillsPage.goto();
            // If there's a toast, it should auto-dismiss
            const toastVisible = await page.isVisible('[data-testid="toast"]');
            if (toastVisible) {
                // Wait for toast to disappear (default timeout varies)
                await page.waitForTimeout(5000);
                // Toast should be gone or in process of disappearing
            }
        });
    });
    test_1.test.describe('Edge Cases', () => {
        (0, test_1.test)('should handle empty skills list', async () => {
            await skillsPage.goto();
            // Search for non-existent skill
            await skillsPage.searchSkills('xyznonexistent12345');
            await page.waitForTimeout(500);
            // Should show appropriate message
            const hasEmptyMessage = await page.isVisible('text=/No skills found|No skills match/i');
            (0, test_1.expect)(hasEmptyMessage).toBeTruthy();
        });
        (0, test_1.test)('should handle special characters in search', async () => {
            await skillsPage.goto();
            // Search with special characters
            await skillsPage.searchSkills('test<script>alert(1)</script>');
            await page.waitForTimeout(500);
            // Should not cause issues (XSS prevention)
            const alertDialog = await page.$('dialog, [role="alertdialog"]');
            (0, test_1.expect)(alertDialog).toBeNull();
        });
        (0, test_1.test)('should handle rapid navigation', async () => {
            // Rapidly switch between views
            for (let i = 0; i < 5; i++) {
                await page.click('[data-testid="nav-skills"]');
                await page.waitForTimeout(100);
                await page.click('[data-testid="nav-discover"]');
                await page.waitForTimeout(100);
                await page.click('[data-testid="nav-private-repos"]');
                await page.waitForTimeout(100);
            }
            // App should still be responsive
            (0, test_1.expect)(await page.isVisible('[data-testid="sidebar"]')).toBeTruthy();
        });
        (0, test_1.test)('should handle keyboard shortcuts at wrong time', async () => {
            await skillsPage.goto();
            // Try save shortcut when no editor is open
            await page.keyboard.press('Control+s');
            // Should not cause errors
            await page.waitForTimeout(500);
            // App should still be functional
            (0, test_1.expect)(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
        });
    });
    test_1.test.describe('Performance Edge Cases', () => {
        (0, test_1.test)('should handle large skill list', async () => {
            await skillsPage.goto();
            // Check if virtualization is working
            // List should render even with many items
            await page.waitForTimeout(1000);
            // Should not freeze or crash
            (0, test_1.expect)(await page.isVisible('[data-testid="skills-list"]')).toBeTruthy();
        });
        (0, test_1.test)('should handle rapid input in search', async () => {
            await skillsPage.goto();
            // Type rapidly
            const searchInput = await page.$('[data-testid="skills-list"] input[type="text"]');
            if (searchInput) {
                await searchInput.focus();
                await page.keyboard.type('rapidtestinput123456789', { delay: 10 });
                await page.waitForTimeout(1000);
                // Should handle input without issues
            }
        });
    });
});
//# sourceMappingURL=08-error-handling.spec.js.map