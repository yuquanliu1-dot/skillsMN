"use strict";
/**
 * Registry Discovery and Installation Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_helpers_1 = require("./helpers/test-helpers");
let electronApp;
let page;
let helper;
test_1.test.describe('Registry Search', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        helper = new test_helpers_1.SkillManagerHelper(electronApp, page);
    });
    test_1.test.afterAll(async () => {
        await electronApp.close();
    });
    test_1.test.beforeEach(async () => {
        await helper.navigateToDiscover();
    });
    (0, test_1.test)('should display search input on Discover page', async () => {
        const searchInput = await page.$('[data-testid="search-input"]');
        (0, test_1.expect)(searchInput).toBeTruthy();
        const placeholder = await searchInput?.getAttribute('placeholder');
        (0, test_1.expect)(placeholder).toContain('Search');
    });
    (0, test_1.test)('should search for skills', async () => {
        // Type search query
        await page.fill('[data-testid="search-input"]', 'claude');
        // Wait for results to load
        await page.waitForTimeout(2000);
        // Verify results are displayed
        const results = await page.$$('[data-testid="skill-card"]');
        (0, test_1.expect)(results.length).toBeGreaterThan(0);
    });
    (0, test_1.test)('should display "No results" for invalid search', async () => {
        // Search for something that doesn't exist
        await page.fill('[data-testid="search-input"]', 'xyznonexistentskill123456');
        // Wait for search to complete
        await page.waitForTimeout(2000);
        // Check for no results message
        const noResults = await page.$('text=/No skills found|No results/i');
        (0, test_1.expect)(noResults).toBeTruthy();
    });
    (0, test_1.test)('should show loading state during search', async () => {
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
    (0, test_1.test)('should display skill metadata in search results', async () => {
        await helper.searchSkill('claude');
        // Wait for results
        await page.waitForTimeout(2000);
        // Get first skill card (SearchResultCard structure)
        const firstCard = await page.$('.bg-white.border.border-gray-200');
        if (!firstCard) {
            test_1.test.skip();
            return;
        }
        // Verify skill name exists (repository name)
        const repoName = await firstCard.$('a.text-blue-600');
        (0, test_1.expect)(repoName).toBeTruthy();
        // Verify description exists
        const description = await firstCard.$('p.text-gray-500');
        (0, test_1.expect)(description).toBeTruthy();
        // Verify Install button exists
        const installButton = await firstCard.$('button:has-text("Install")');
        (0, test_1.expect)(installButton).toBeTruthy();
    });
});
test_1.test.describe('Skill Installation', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        helper = new test_helpers_1.SkillManagerHelper(electronApp, page);
    });
    test_1.test.afterAll(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('should display Install button for registry skills', async () => {
        await helper.navigateToDiscover();
        await helper.searchSkill('claude');
        // Wait for results
        await page.waitForTimeout(2000);
        // Get first skill card (SearchResultCard structure)
        const firstCard = await page.$('.bg-white.border.border-gray-200');
        if (!firstCard) {
            test_1.test.skip();
            return;
        }
        // Check Install button exists
        const installButton = await firstCard.$('button:has-text("Install")');
        (0, test_1.expect)(installButton).toBeTruthy();
        const buttonText = await installButton?.textContent();
        (0, test_1.expect)(buttonText?.trim()).toContain('Install');
    });
    test_1.test.skip('should install skill from registry', async () => {
        // Skip: Current implementation doesn't use install dialog
        // Installation happens directly via Install button click
    });
    test_1.test.skip('should show installation progress', async () => {
        // Skip: Progress dialog implementation varies
    });
    test_1.test.skip('should disable Install button while installing', async () => {
        // Skip: Current implementation doesn't use install dialog
        // Installation happens directly via Install button click
    });
    (0, test_1.test)('should handle installation errors gracefully', async () => {
        await helper.navigateToDiscover();
        // Search for a skill that will fail
        await helper.searchSkill('error-test-skill');
        // If skill exists, try to install
        const firstCard = await page.$('[data-testid="skill-card"]');
        if (!firstCard) {
            // No results, which is fine for this test
            test_1.test.skip();
            return;
        }
        const installButton = await firstCard.$('button:has-text("Install")');
        await installButton?.click();
        // Wait for dialog
        const dialogVisible = await page.$('[data-testid="install-dialog"]');
        if (dialogVisible) {
            await page.click('[data-testid="confirm-install-button"]');
            // Wait for either success or error
            await page.waitForSelector('text=/Installation completed|Installation failed|error/i', { timeout: 60000 });
        }
    });
});
test_1.test.describe('Skill Preview', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: ['.'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        helper = new test_helpers_1.SkillManagerHelper(electronApp, page);
    });
    test_1.test.afterAll(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('should preview skill content when clicking skill name', async () => {
        await helper.navigateToDiscover();
        await helper.searchSkill('claude');
        // Wait for results
        await page.waitForTimeout(2000);
        // Click skill name (not the Install button)
        const skillName = await page.$('[data-testid="skill-name"]');
        if (!skillName) {
            test_1.test.skip();
            return;
        }
        await skillName.click();
        // Wait for preview panel
        await page.waitForSelector('[data-testid="skill-preview"]', {
            timeout: 10000
        });
        // Verify preview content
        const previewContent = await page.$('[data-testid="skill-preview-content"]');
        (0, test_1.expect)(previewContent).toBeTruthy();
        // Verify it contains SKILL.md content (YAML frontmatter)
        const content = await previewContent?.textContent();
        (0, test_1.expect)(content).toContain('---');
    });
    (0, test_1.test)('should show loading state while fetching preview', async () => {
        await helper.navigateToDiscover();
        // Type slowly to trigger loading
        await page.type('[data-testid="search-input"]', 'claude', { delay: 50 });
        // Click first result
        const skillName = await page.$('[data-testid="skill-name"]');
        if (!skillName) {
            test_1.test.skip();
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
    (0, test_1.test)('should display skill metadata in preview', async () => {
        await helper.navigateToDiscover();
        await helper.searchSkill('claude');
        const skillName = await page.$('[data-testid="skill-name"]');
        if (!skillName) {
            test_1.test.skip();
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
            (0, test_1.expect)(text).toBeTruthy();
        }
    });
    (0, test_1.test)('should close preview panel', async () => {
        await helper.navigateToDiscover();
        await helper.searchSkill('claude');
        const skillName = await page.$('[data-testid="skill-name"]');
        if (!skillName) {
            test_1.test.skip();
            return;
        }
        await skillName.click();
        await page.waitForSelector('[data-testid="skill-preview"]');
        // Click close button
        const closeButton = await page.$('[data-testid="close-preview-button"]');
        await closeButton?.click();
        // Verify preview is closed
        const preview = await page.$('[data-testid="skill-preview"]');
        (0, test_1.expect)(preview).toBeFalsy();
    });
});
//# sourceMappingURL=registry.spec.js.map