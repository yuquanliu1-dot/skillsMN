"use strict";
/**
 * PrivateReposPage - Page Object Model for Private Repositories
 *
 * Handles interactions with private repository management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateReposPage = void 0;
const AppPage_1 = require("./AppPage");
class PrivateReposPage extends AppPage_1.AppPage {
    constructor(app, page) {
        super(app, page);
    }
    /**
     * Navigate to Private Repos view
     */
    async goto() {
        await this.navigateTo('private-repos');
    }
    /**
     * Wait for repositories to load
     */
    async waitForReposLoad(timeout = 10000) {
        await this.page.waitForSelector('[data-testid="private-repos-list"]', { timeout });
    }
    /**
     * Get list of repositories
     */
    async getRepositories() {
        const repos = [];
        const options = await this.page.$$('#repo-select option');
        for (const option of options) {
            const value = await option.getAttribute('value');
            const text = await option.textContent();
            if (value && text) {
                repos.push({
                    id: value,
                    name: text,
                    type: text.includes('gitlab') ? 'gitlab' : 'github'
                });
            }
        }
        return repos;
    }
    /**
     * Select a repository
     */
    async selectRepository(repoId) {
        await this.page.selectOption('#repo-select', repoId);
        await this.page.waitForTimeout(1000); // Wait for skills to load
    }
    /**
     * Get selected repository ID
     */
    async getSelectedRepository() {
        return await this.page.$eval('#repo-select', (el) => el.value);
    }
    /**
     * Get skills count for current repository
     */
    async getSkillsCount() {
        const countText = await this.page.$('.text-xs.text-gray-500:has-text("skills")');
        const text = await countText?.textContent() || '0 skills';
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }
    /**
     * Search skills in repository
     */
    async searchSkills(query) {
        const searchInput = await this.page.$('[data-testid="private-repos-list"] input[type="text"]');
        if (searchInput) {
            await searchInput.fill(query);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(1000);
        }
    }
    /**
     * Clear search
     */
    async clearSearch() {
        const searchInput = await this.page.$('[data-testid="private-repos-list"] input[type="text"]');
        if (searchInput) {
            await searchInput.fill('');
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(500);
        }
    }
    /**
     * Sort skills
     */
    async sortSkills(sortBy) {
        await this.page.selectOption('#sort-by-private', sortBy);
        await this.page.waitForTimeout(300);
    }
    /**
     * Refresh skills list
     */
    async refresh() {
        await this.page.click('button[title="Refresh skills list"]');
        await this.page.waitForTimeout(1000);
    }
    /**
     * Check if loading
     */
    async isLoading() {
        return await this.page.isVisible('[data-testid="private-repos-list"] .animate-spin');
    }
    /**
     * Check if error is visible
     */
    async hasError() {
        return await this.page.isVisible('[role="alert"]');
    }
    /**
     * Get error message
     */
    async getError() {
        const errorElement = await this.page.$('[role="alert"] .text-red-400');
        return await errorElement?.textContent() || null;
    }
    /**
     * Check if authentication error
     */
    async isAuthError() {
        const error = await this.getError();
        return error?.toLowerCase().includes('authentication') ||
            error?.toLowerCase().includes('pat') ||
            error?.toLowerCase().includes('unauthorized') ||
            false;
    }
    /**
     * Click retry button
     */
    async retryLoad() {
        await this.page.click('button:has-text("Retry")');
        await this.page.waitForTimeout(1000);
    }
    /**
     * Click settings link in auth error
     */
    async goToSettingsFromError() {
        await this.page.click('button:has-text("Settings")');
    }
    /**
     * Check if no repositories configured
     */
    async hasNoRepos() {
        return await this.page.isVisible('text=/No repositories configured/i');
    }
    /**
     * Check if no skills in repository
     */
    async hasNoSkills() {
        return await this.page.isVisible('text=/No skills available|No skills found/i');
    }
    /**
     * Get visible skills (for pagination testing)
     */
    async getVisibleSkillCount() {
        const skills = await this.page.$$('li');
        return skills.length;
    }
    /**
     * Click load more button
     */
    async loadMore() {
        await this.page.click('button:has-text("Load More")');
        await this.page.waitForTimeout(500);
    }
    /**
     * Check if load more button is visible
     */
    async hasLoadMoreButton() {
        return await this.page.isVisible('button:has-text("Load More")');
    }
    /**
     * Get remaining skills count from load more button
     */
    async getRemainingSkillCount() {
        const button = await this.page.$('button:has-text("Load More")');
        const text = await button?.textContent() || '';
        const match = text.match(/\((\d+) remaining\)/);
        return match ? parseInt(match[1], 10) : 0;
    }
    /**
     * Install a skill from private repo
     */
    async installSkill(skillName) {
        const skillCard = await this.page.$(`li:has-text("${skillName}")`);
        if (!skillCard) {
            throw new Error(`Skill "${skillName}" not found`);
        }
        await skillCard.hover();
        await skillCard.click('button:has-text("Install")');
    }
    /**
     * Preview a skill
     */
    async previewSkill(skillName) {
        const skillCard = await this.page.$(`li:has-text("${skillName}")`);
        if (!skillCard) {
            throw new Error(`Skill "${skillName}" not found`);
        }
        await skillCard.click();
    }
}
exports.PrivateReposPage = PrivateReposPage;
//# sourceMappingURL=PrivateReposPage.js.map