"use strict";
/**
 * SettingsPage - Page Object Model for Settings
 *
 * Handles interactions with the settings/configuration panel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPage = void 0;
const AppPage_1 = require("./AppPage");
class SettingsPage extends AppPage_1.AppPage {
    constructor(app, page) {
        super(app, page);
    }
    /**
     * Open settings modal
     */
    async open() {
        await this.openSettings();
    }
    /**
     * Close settings modal
     */
    async close() {
        await this.closeSettings();
    }
    /**
     * Wait for settings to load
     */
    async waitForSettings(timeout = 5000) {
        await this.page.waitForSelector('[data-testid="settings-modal"]', { timeout });
    }
    /**
     * Check if settings modal is visible
     */
    async isVisible() {
        return await this.page.isVisible('[data-testid="settings-modal"]');
    }
    /**
     * Switch to a tab
     */
    async switchToTab(tabName) {
        const tabSelector = `button:has-text("${tabName}")`;
        await this.page.click(tabSelector);
        await this.page.waitForTimeout(300);
    }
    /**
     * Get list of project directories
     */
    async getProjectDirectories() {
        const dirs = [];
        const dirElements = await this.page.$$('[data-testid="project-directory-item"]');
        for (const el of dirElements) {
            const text = await el.textContent();
            if (text) {
                dirs.push(text.replace(/Remove$/i, '').trim());
            }
        }
        return dirs;
    }
    /**
     * Add a project directory
     */
    async addProjectDirectory() {
        await this.page.click('button:has-text("Add Directory")');
        // This will open a file dialog which we can't interact with directly
        // In tests, we'll need to mock the dialog response
    }
    /**
     * Remove a project directory
     */
    async removeProjectDirectory(path) {
        const dirItem = await this.page.$(`[data-testid="project-directory-item"]:has-text("${path}")`);
        if (dirItem) {
            await dirItem.click('button:has-text("Remove")');
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Toggle auto refresh
     */
    async toggleAutoRefresh() {
        const toggle = await this.page.$('#auto-refresh-toggle');
        if (toggle) {
            await toggle.click();
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Check if auto refresh is enabled
     */
    async isAutoRefreshEnabled() {
        const toggle = await this.page.$('#auto-refresh-toggle[aria-checked="true"]');
        return toggle !== null;
    }
    /**
     * Set editor font size
     */
    async setEditorFontSize(size) {
        const selector = '[data-testid="editor-font-size"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.selectOption(selector, size.toString());
        await this.page.waitForTimeout(300);
    }
    /**
     * Get editor font size
     */
    async getEditorFontSize() {
        const selector = '[data-testid="editor-font-size"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        const value = await this.page.$eval(selector, (el) => el.value);
        return parseInt(value, 10);
    }
    /**
     * Set editor theme
     */
    async setEditorTheme(theme) {
        await this.page.selectOption('#editor-theme', theme);
        await this.page.waitForTimeout(300);
    }
    /**
     * Get editor theme
     */
    async getEditorTheme() {
        return await this.page.$eval('#editor-theme', (el) => el.value);
    }
    /**
     * Toggle minimap
     */
    async toggleMinimap() {
        const toggle = await this.page.$('#show-minimap-toggle');
        if (toggle) {
            await toggle.click();
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Check if minimap is enabled
     */
    async isMinimapEnabled() {
        const toggle = await this.page.$('#show-minimap-toggle[aria-checked="true"]');
        return toggle !== null;
    }
    /**
     * Set tab size
     */
    async setTabSize(size) {
        const selector = '[data-testid="tab-size"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.fill(selector, size.toString());
        await this.page.waitForTimeout(300);
    }
    /**
     * Get tab size
     */
    async getTabSize() {
        const selector = '[data-testid="tab-size"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        const value = await this.page.$eval(selector, (el) => el.value);
        return parseInt(value, 10);
    }
    /**
     * Toggle word wrap
     */
    async toggleWordWrap() {
        const toggle = await this.page.$('#word-wrap-toggle');
        if (toggle) {
            await toggle.click();
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Check if word wrap is enabled
     */
    async isWordWrapEnabled() {
        const toggle = await this.page.$('#word-wrap-toggle[aria-checked="true"]');
        return toggle !== null;
    }
    /**
     * Switch to AI tab
     */
    async switchToAITab() {
        // Click the "AI Configuration" tab within the settings modal
        await this.page.click('[data-testid="settings-modal"] button:has-text("AI Configuration")');
        await this.page.waitForTimeout(500);
    }
    /**
     * Switch to Private Repos tab
     */
    async switchToPrivateReposTab() {
        // Click the "Private Repositories" tab within the settings modal
        await this.page.click('[data-testid="settings-modal"] button:has-text("Private Repositories")');
        await this.page.waitForTimeout(500);
    }
    /**
     * Switch to Skill View tab
     */
    async switchToSkillViewTab() {
        // Click the "Skill View" tab within the settings modal
        await this.page.click('[data-testid="settings-modal"] button:has-text("Skill View")');
        await this.page.waitForTimeout(500);
    }
    /**
     * Set AI API key
     */
    async setAIApiKey(key) {
        const selector = '[data-testid="ai-api-key"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.fill(selector, key);
        await this.page.waitForTimeout(300);
    }
    /**
     * Get AI API key (masked)
     */
    async getAIApiKey() {
        const selector = '[data-testid="ai-api-key"]';
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return await this.page.$eval(selector, (el) => el.value);
    }
    /**
     * Test AI connection
     */
    async testAIConnection() {
        await this.page.click('button:has-text("Test Connection")');
        await this.page.waitForTimeout(2000); // Wait for test to complete
    }
    /**
     * Check if AI connection test was successful
     */
    async isAIConnectionSuccessful() {
        return await this.page.isVisible('text=/Connection successful|connected/i');
    }
    /**
     * Check if AI connection test failed
     */
    async isAIConnectionFailed() {
        return await this.page.isVisible('text=/Connection failed|error/i');
    }
    /**
     * Add a GitHub private repo
     */
    async addGitHubRepo(owner, repo, pat) {
        await this.page.click('button:has-text("Add GitHub Repo")');
        await this.page.fill('#github-owner', owner);
        await this.page.fill('#github-repo', repo);
        await this.page.fill('#github-pat', pat);
        await this.page.click('button:has-text("Add")');
        await this.page.waitForTimeout(1000);
    }
    /**
     * Add a GitLab private repo
     */
    async addGitLabRepo(url, pat) {
        await this.page.click('button:has-text("Add GitLab Repo")');
        await this.page.fill('#gitlab-url', url);
        await this.page.fill('#gitlab-pat', pat);
        await this.page.click('button:has-text("Add")');
        await this.page.waitForTimeout(1000);
    }
    /**
     * Get list of private repos
     */
    async getPrivateRepos() {
        const repos = [];
        const repoElements = await this.page.$$('[data-testid="private-repo-item"]');
        for (const el of repoElements) {
            const text = await el.textContent();
            if (text) {
                repos.push(text.replace(/Test|Remove$/i, '').trim());
            }
        }
        return repos;
    }
    /**
     * Remove a private repo
     */
    async removePrivateRepo(repoName) {
        const repoItem = await this.page.$(`[data-testid="private-repo-item"]:has-text("${repoName}")`);
        if (repoItem) {
            await repoItem.click('button:has-text("Remove")');
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Test private repo connection
     */
    async testPrivateRepoConnection(repoName) {
        const repoItem = await this.page.$(`[data-testid="private-repo-item"]:has-text("${repoName}")`);
        if (repoItem) {
            await repoItem.click('button:has-text("Test")');
            await this.page.waitForTimeout(2000);
        }
    }
    /**
     * Save settings
     */
    async save() {
        // Find the visible Save Settings button within the settings modal
        await this.page.click('[data-testid="settings-modal"] >> button:has-text("Save Settings"):visible');
        await this.page.waitForTimeout(500);
    }
    /**
     * Check if save button is disabled
     */
    async isSaveDisabled() {
        const saveButton = await this.page.$('button:has-text("Save")[disabled]');
        return saveButton !== null;
    }
    /**
     * Check if there are unsaved changes
     */
    async hasUnsavedChanges() {
        return await this.page.isVisible('text=/unsaved changes/i');
    }
    /**
     * Discard changes
     */
    async discardChanges() {
        await this.page.click('button:has-text("Discard")');
        await this.page.waitForTimeout(300);
    }
    /**
     * Check for validation error
     */
    async hasValidationError() {
        return await this.page.isVisible('.text-red-600, .text-red-400');
    }
    /**
     * Get validation error message
     */
    async getValidationError() {
        const errorElement = await this.page.$('.text-red-600, .text-red-400');
        return await errorElement?.textContent() || null;
    }
}
exports.SettingsPage = SettingsPage;
//# sourceMappingURL=SettingsPage.js.map