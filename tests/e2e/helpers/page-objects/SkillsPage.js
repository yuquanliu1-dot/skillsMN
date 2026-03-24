"use strict";
/**
 * SkillsPage - Page Object Model for Local Skills Management
 *
 * Handles interactions with the skills list, creation, editing, and deletion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsPage = void 0;
const AppPage_1 = require("./AppPage");
class SkillsPage extends AppPage_1.AppPage {
    constructor(app, page) {
        super(app, page);
    }
    /**
     * Navigate to Skills view
     */
    async goto() {
        await this.navigateTo('skills');
    }
    /**
     * Create a new skill
     */
    async createSkill(name) {
        // Click create button
        await this.page.click('[data-testid="create-skill-button"]');
        // Wait for dialog
        await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { timeout: 5000 });
        // Fill in skill name
        await this.page.fill('[data-testid="skill-name-input"]', name);
        // Submit
        await this.page.click('[data-testid="confirm-create-button"]');
        // Wait for dialog to close (with better error handling)
        try {
            await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 15000 });
        }
        catch {
            // Dialog didn't close - check for error
            const hasError = await this.page.isVisible('.text-red-600, .text-red-400');
            if (hasError) {
                // Press escape to close dialog
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(500);
                throw new Error(`Failed to create skill "${name}" - validation error`);
            }
            // Try pressing escape anyway
            await this.page.keyboard.press('Escape');
            await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 5000 });
        }
        // Wait for the skill list to update (file watcher needs time)
        await this.page.waitForTimeout(2000);
        // Try to refresh the skills list by pressing Ctrl+R
        await this.page.keyboard.press('Control+r');
        await this.page.waitForTimeout(1000);
        // Search for the skill to make it visible (handles virtualized list)
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        // Now wait for skill to appear in the filtered list
        await this.waitForSkill(name, 15000);
        // Clear search to show all skills
        await this.clearSearch();
    }
    /**
     * Create a new skill using keyboard shortcut
     */
    async createSkillWithShortcut(name) {
        await this.page.keyboard.press('Control+n');
        // Wait for dialog
        await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { timeout: 5000 });
        // Fill in skill name
        await this.page.fill('[data-testid="skill-name-input"]', name);
        // Submit
        await this.page.click('[data-testid="confirm-create-button"]');
        // Wait for dialog to close
        await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 10000 });
    }
    /**
     * Cancel skill creation
     */
    async cancelCreateSkill() {
        await this.page.click('[data-testid="create-skill-dialog"] button:has-text("Cancel")');
        await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 5000 });
    }
    /**
     * Open AI skill creation dialog
     */
    async openAICreationDialog() {
        await this.page.click('[data-testid="ai-create-skill-button"]');
        // Wait for AI dialog - it has a gradient header
        await this.page.waitForSelector('text=AI Skill Creator', { timeout: 5000 });
    }
    /**
     * Get all skill cards
     */
    async getSkillCards() {
        const cards = await this.page.$$('[data-testid="skill-card"]');
        const names = [];
        for (const card of cards) {
            const nameElement = await card.$('[data-testid="skill-name"]');
            if (nameElement) {
                const name = await nameElement.textContent();
                if (name)
                    names.push(name);
            }
        }
        return names;
    }
    /**
     * Get skill count
     */
    async getSkillCount() {
        const cards = await this.page.$$('[data-testid="skill-card"]');
        return cards.length;
    }
    /**
     * Check if skill exists (with scroll for virtualized list)
     */
    async skillExists(name) {
        // First try direct search
        const skill = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
        if (skill)
            return true;
        // Try searching for it
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        const found = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
        // Clear search
        await this.clearSearch();
        return found !== null;
    }
    /**
     * Click on a skill to open in editor
     */
    async clickSkill(name) {
        // Search for the skill first to make it visible
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        // Use locator API
        const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
        await skillCard.waitFor({ timeout: 10000 });
        // Click on the skill name to open editor
        await skillCard.click();
        await this.page.waitForSelector('[data-testid="skill-editor"]', { timeout: 10000 });
        // Clear search after opening editor
        await this.clearSearch();
    }
    /**
     * Delete a skill
     */
    async deleteSkill(name) {
        // Search for the skill first to make it visible (handles virtualized list)
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        // Use locator API for chaining
        const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
        await skillCard.waitFor({ timeout: 10000 });
        // Hover to show actions
        await skillCard.hover();
        await this.page.waitForTimeout(200);
        // Click delete button using locator
        await skillCard.locator('[data-testid="delete-button"]').click();
        // Wait for confirmation dialog
        await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { timeout: 5000 });
        // Confirm deletion - try multiple button selectors
        const confirmButton = this.page.locator('[data-testid="confirm-delete-button"], button:has-text("Delete"):not([data-testid="delete-button"])');
        await confirmButton.first().click();
        // Wait for dialog to close with multiple attempts
        try {
            await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 10000 });
        }
        catch {
            // If dialog still visible, try pressing Enter or Escape
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(500);
            try {
                await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 5000 });
            }
            catch {
                // Try Escape as fallback
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(500);
            }
        }
        // Clear search
        await this.clearSearch();
    }
    /**
     * Cancel skill deletion
     */
    async cancelDeleteSkill(name) {
        // Search for the skill first to make it visible
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        // Use locator API for chaining
        const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
        await skillCard.waitFor({ timeout: 10000 });
        // Hover to show actions
        await skillCard.hover();
        await this.page.waitForTimeout(200);
        // Click delete button using locator
        await skillCard.locator('[data-testid="delete-button"]').click();
        // Wait for confirmation dialog
        await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { timeout: 5000 });
        // Cancel deletion
        await this.page.click('[data-testid="cancel-delete-button"]');
        // Wait for dialog to close
        await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 5000 });
        // Clear search
        await this.clearSearch();
    }
    /**
     * Search for skills
     */
    async searchSkills(query) {
        // Find the search input in skills list
        const searchInput = await this.page.$('[data-testid="skill-search-input"], [data-testid="skills-list"] input[type="text"]');
        if (searchInput) {
            await searchInput.fill(query);
            await this.page.waitForTimeout(500); // Wait for filtering
        }
    }
    /**
     * Clear search
     */
    async clearSearch() {
        const searchInput = await this.page.$('[data-testid="skill-search-input"], [data-testid="skills-list"] input[type="text"]');
        if (searchInput) {
            await searchInput.fill('');
            await this.page.waitForTimeout(300);
        }
    }
    /**
     * Sort skills by
     */
    async sortSkills(sortBy) {
        await this.page.selectOption('#sort-by', sortBy);
        await this.page.waitForTimeout(300);
    }
    /**
     * Filter skills by source
     */
    async filterSkills(filter) {
        await this.page.selectOption('#filter-source', filter);
        await this.page.waitForTimeout(300);
    }
    /**
     * Get displayed skill count text
     */
    async getSkillCountText() {
        const countElement = await this.page.$('[data-testid="skills-list"] .text-xs.text-gray-500');
        return await countElement?.textContent() || '';
    }
    /**
     * Check if skill has update indicator
     */
    async skillHasUpdate(name) {
        const skillCard = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
        if (!skillCard)
            return false;
        const updateIndicator = await skillCard.$('[data-testid="update-indicator"]');
        return updateIndicator !== null;
    }
    /**
     * Open folder for skill
     */
    async openSkillFolder(name) {
        // Search for the skill first
        await this.searchSkills(name);
        await this.page.waitForTimeout(500);
        // Use locator API
        const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
        await skillCard.waitFor({ timeout: 10000 });
        // Hover to show actions
        await skillCard.hover();
        await this.page.waitForTimeout(200);
        // Click folder button using locator
        await skillCard.locator('[data-testid="open-folder-button"]').click();
        // Clear search
        await this.clearSearch();
    }
    /**
     * Get skill source badge text
     */
    async getSkillSourceBadge(name) {
        const skillCard = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
        if (!skillCard)
            return null;
        const badge = await skillCard.$('.badge');
        return await badge?.textContent() || null;
    }
    /**
     * Check if create button is visible
     */
    async isCreateButtonVisible() {
        return await this.page.isVisible('[data-testid="create-skill-button"]');
    }
    /**
     * Check if AI create button is visible
     */
    async isAICreateButtonVisible() {
        return await this.page.isVisible('[data-testid="ai-create-skill-button"]');
    }
    /**
     * Wait for skill to appear in list
     */
    async waitForSkill(name, timeout = 10000) {
        await this.page.waitForSelector(`[data-testid="skill-card"]:has-text("${name}")`, { timeout });
    }
    /**
     * Wait for skill to be removed from list
     */
    async waitForSkillRemoval(name, timeout = 10000) {
        await this.page.waitForSelector(`[data-testid="skill-card"]:has-text("${name}")`, { state: 'detached', timeout });
    }
}
exports.SkillsPage = SkillsPage;
//# sourceMappingURL=SkillsPage.js.map