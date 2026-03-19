/**
 * DiscoverPage - Page Object Model for Registry Search
 *
 * Handles interactions with the skills discovery/search feature
 */

import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';

export interface SearchResult {
  name: string;
  source: string;
  description?: string;
}

export class DiscoverPage extends AppPage {
  constructor(app: ElectronApplication, page: Page) {
    super(app, page);
  }

  /**
   * Navigate to Discover view
   */
  async goto(): Promise<void> {
    await this.navigateTo('discover');
  }

  /**
   * Search for skills
   */
  async search(query: string): Promise<void> {
    const searchInput = await this.page.$('[data-testid="search-input"]');
    if (!searchInput) {
      throw new Error('Search input not found');
    }

    await searchInput.fill(query);
    // Wait for debounce and results
    await this.page.waitForTimeout(1500);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    const searchInput = await this.page.$('[data-testid="search-input"]');
    if (searchInput) {
      await searchInput.fill('');
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Get search input value
   */
  async getSearchValue(): Promise<string> {
    const searchInput = await this.page.$('[data-testid="search-input"]');
    return await searchInput?.inputValue() || '';
  }

  /**
   * Check if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="loading-indicator"]');
  }

  /**
   * Wait for search results to load
   */
  async waitForResults(timeout = 15000): Promise<void> {
    // Wait for either results or no results message
    await this.page.waitForSelector(
      '.bg-white.border.border-gray-200, text=/No skills found|No results/i',
      { timeout }
    );
  }

  /**
   * Get search results
   */
  async getResults(): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const cards = await this.page.$$('.bg-white.border.border-gray-200');

    for (const card of cards) {
      const nameElement = await card.$('a.text-blue-600');
      const descElement = await card.$('p.text-gray-500');

      const name = await nameElement?.textContent() || '';
      const source = name; // Usually repo name is the source
      const description = await descElement?.textContent() || undefined;

      results.push({ name, source, description });
    }

    return results;
  }

  /**
   * Get result count
   */
  async getResultCount(): Promise<number> {
    const cards = await this.page.$$('.bg-white.border.border-gray-200');
    return cards.length;
  }

  /**
   * Check if no results message is visible
   */
  async hasNoResults(): Promise<boolean> {
    return await this.page.isVisible('text=/No skills found|No results/i');
  }

  /**
   * Click on a search result to preview
   */
  async clickResult(name: string): Promise<void> {
    const card = await this.page.$(`.bg-white.border.border-gray-200:has-text("${name}")`);
    if (!card) {
      throw new Error(`Result "${name}" not found`);
    }

    // Click on the skill name link
    await card.click('a.text-blue-600');
  }

  /**
   * Install a skill from search results
   */
  async installSkill(name: string): Promise<void> {
    const card = await this.page.$(`.bg-white.border.border-gray-200:has-text("${name}")`);
    if (!card) {
      throw new Error(`Result "${name}" not found`);
    }

    // Click install button
    await card.click('button:has-text("Install")');
  }

  /**
   * Check if install button exists for a skill
   */
  async hasInstallButton(name: string): Promise<boolean> {
    const card = await this.page.$(`.bg-white.border.border-gray-200:has-text("${name}")`);
    if (!card) return false;

    return await card.$('button:has-text("Install")') !== null;
  }

  /**
   * Wait for skill preview panel
   */
  async waitForPreview(timeout = 10000): Promise<void> {
    await this.page.waitForSelector('[data-testid="skill-preview"]', { timeout });
  }

  /**
   * Check if preview panel is visible
   */
  async isPreviewVisible(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="skill-preview"]');
  }

  /**
   * Get preview content
   */
  async getPreviewContent(): Promise<string> {
    const contentElement = await this.page.$('[data-testid="skill-preview-content"]');
    return await contentElement?.textContent() || '';
  }

  /**
   * Close preview panel
   */
  async closePreview(): Promise<void> {
    await this.page.click('[data-testid="close-preview-button"]');
    await this.page.waitForSelector('[data-testid="skill-preview"]', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Check if preview has YAML frontmatter
   */
  async previewHasFrontmatter(): Promise<boolean> {
    const content = await this.getPreviewContent();
    return content.includes('---');
  }

  /**
   * Check for error message
   */
  async hasError(): Promise<boolean> {
    return await this.page.isVisible('text=/error|failed/i');
  }

  /**
   * Get error message
   */
  async getError(): Promise<string | null> {
    const errorElement = await this.page.$('.text-red-600, .text-red-400');
    return await errorElement?.textContent() || null;
  }

  /**
   * Wait for installation to complete
   */
  async waitForInstallComplete(timeout = 60000): Promise<void> {
    await this.page.waitForSelector(
      'text=/Installation completed|installed successfully/i',
      { timeout }
    );
  }

  /**
   * Wait for installation to fail
   */
  async waitForInstallError(timeout = 30000): Promise<void> {
    await this.page.waitForSelector(
      'text=/Installation failed|error/i',
      { timeout }
    );
  }
}
