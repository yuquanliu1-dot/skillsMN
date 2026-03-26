/**
 * SkillsPage - Page Object Model for Local Skills Management
 *
 * Handles interactions with the skills list, creation, editing, and deletion
 */

import { Page, ElectronApplication, expect } from '@playwright/test';
import { AppPage } from './AppPage';

export interface SkillInfo {
  name: string;
  path: string;
  description?: string;
  sourceType?: string;
}

export class SkillsPage extends AppPage {
  constructor(app: ElectronApplication, page: Page) {
    super(app, page);
  }

  /**
   * Navigate to Skills view
   */
  async goto(): Promise<void> {
    await this.navigateTo('skills');
  }

  /**
   * Create a new skill
   */
  async createSkill(name: string): Promise<void> {
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
    } catch {
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
  async createSkillWithShortcut(name: string): Promise<void> {
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
  async cancelCreateSkill(): Promise<void> {
    await this.page.click('[data-testid="create-skill-dialog"] button:has-text("Cancel")');
    await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Open AI skill creation dialog
   */
  async openAICreationDialog(): Promise<void> {
    await this.page.click('[data-testid="ai-create-skill-button"]');
    // Wait for AI dialog - it has a gradient header
    await this.page.waitForSelector('text=AI Skill Creator', { timeout: 5000 });
  }

  /**
   * Get all skill cards
   */
  async getSkillCards(): Promise<string[]> {
    const cards = await this.page.$$('[data-testid="skill-card"]');
    const names: string[] = [];

    for (const card of cards) {
      const nameElement = await card.$('[data-testid="skill-name"]');
      if (nameElement) {
        const name = await nameElement.textContent();
        if (name) names.push(name);
      }
    }

    return names;
  }

  /**
   * Get skill count
   */
  async getSkillCount(): Promise<number> {
    const cards = await this.page.$$('[data-testid="skill-card"]');
    return cards.length;
  }

  /**
   * Check if skill exists (with scroll for virtualized list)
   */
  async skillExists(name: string): Promise<boolean> {
    // First try direct search
    const skill = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
    if (skill) return true;

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
  async clickSkill(name: string): Promise<void> {
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
  async deleteSkill(name: string): Promise<void> {
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
    } catch {
      // If dialog still visible, try pressing Enter or Escape
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);
      try {
        await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 5000 });
      } catch {
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
  async cancelDeleteSkill(name: string): Promise<void> {
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
  async searchSkills(query: string): Promise<void> {
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
  async clearSearch(): Promise<void> {
    const searchInput = await this.page.$('[data-testid="skill-search-input"], [data-testid="skills-list"] input[type="text"]');
    if (searchInput) {
      await searchInput.fill('');
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Sort skills by
   */
  async sortSkills(sortBy: 'name' | 'modified'): Promise<void> {
    await this.page.selectOption('#sort-by', sortBy);
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter skills by source
   */
  async filterSkills(filter: 'all' | 'local' | 'registry' | 'private-repo'): Promise<void> {
    await this.page.selectOption('#filter-source', filter);
    await this.page.waitForTimeout(300);
  }

  /**
   * Get displayed skill count text
   */
  async getSkillCountText(): Promise<string> {
    const countElement = await this.page.$('[data-testid="skills-list"] .text-xs.text-gray-500');
    return await countElement?.textContent() || '';
  }

  /**
   * Check if skill has update indicator
   */
  async skillHasUpdate(name: string): Promise<boolean> {
    const skillCard = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
    if (!skillCard) return false;

    const updateIndicator = await skillCard.$('[data-testid="update-indicator"]');
    return updateIndicator !== null;
  }

  /**
   * Open folder for skill
   */
  async openSkillFolder(name: string): Promise<void> {
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
  async getSkillSourceBadge(name: string): Promise<string | null> {
    const skillCard = await this.page.$(`[data-testid="skill-card"]:has-text("${name}")`);
    if (!skillCard) return null;

    const badge = await skillCard.$('.badge');
    return await badge?.textContent() || null;
  }

  /**
   * Check if create button is visible
   */
  async isCreateButtonVisible(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="create-skill-button"]');
  }

  /**
   * Check if AI create button is visible
   */
  async isAICreateButtonVisible(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="ai-create-skill-button"]');
  }

  /**
   * Wait for skill to appear in list
   */
  async waitForSkill(name: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(`[data-testid="skill-card"]:has-text("${name}")`, { timeout });
  }

  /**
   * Wait for skill to be removed from list
   */
  async waitForSkillRemoval(name: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(`[data-testid="skill-card"]:has-text("${name}")`, { state: 'detached', timeout });
  }

  /**
   * Click edit button on skill card (opens full-screen editor)
   */
  async clickEditButton(name: string): Promise<void> {
    // Search for the skill first
    await this.searchSkills(name);
    await this.page.waitForTimeout(500);

    const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
    await skillCard.waitFor({ timeout: 10000 });

    // Hover to show action buttons
    await skillCard.hover();
    await this.page.waitForTimeout(300);

    // Click edit button (pencil icon)
    const editButton = skillCard.locator('button:has(svg path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414"]), button[title*="Edit"], button[aria-label*="Edit"]').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    } else {
      // Fallback: click the skill card itself
      await skillCard.click();
    }

    // Clear search
    await this.clearSearch();
  }

  /**
   * Check if edit button is visible on skill card
   */
  async isEditButtonVisible(name: string): Promise<boolean> {
    // Search for the skill first
    await this.searchSkills(name);
    await this.page.waitForTimeout(500);

    const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
    await skillCard.waitFor({ timeout: 10000 });

    // Hover to show action buttons
    await skillCard.hover();
    await this.page.waitForTimeout(300);

    // Check for edit button
    const editButton = skillCard.locator('button:has(svg path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414"]), button[title*="Edit"], button[aria-label*="Edit"]').first();

    const isVisible = await editButton.isVisible().catch(() => false);

    // Clear search
    await this.clearSearch();

    return isVisible;
  }

  /**
   * Get action buttons on skill card
   */
  async getActionButtons(name: string): Promise<string[]> {
    // Search for the skill first
    await this.searchSkills(name);
    await this.page.waitForTimeout(500);

    const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
    await skillCard.waitFor({ timeout: 10000 });

    // Hover to show action buttons
    await skillCard.hover();
    await this.page.waitForTimeout(300);

    // Get all buttons
    const buttons = await skillCard.locator('button').all();
    const buttonTitles: string[] = [];

    for (const button of buttons) {
      const title = await button.getAttribute('title').catch(() => null);
      const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
      if (title) buttonTitles.push(title);
      else if (ariaLabel) buttonTitles.push(ariaLabel);
    }

    // Clear search
    await this.clearSearch();

    return buttonTitles;
  }
}
