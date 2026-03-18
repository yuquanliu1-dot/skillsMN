/**
 * Test Helpers for Skill Manager E2E Tests
 */

import { Page, ElectronApplication } from '@playwright/test';

/**
 * Helper class for Skill Manager testing
 */
export class SkillManagerHelper {
  constructor(
    private app: ElectronApplication,
    private page: Page
  ) {}

  /**
   * Navigate to Skills view
   */
  async navigateToSkills() {
    await this.page.click('[data-testid="nav-skills"]');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Navigate to Discover view
   */
  async navigateToDiscover() {
    await this.page.click('[data-testid="nav-discover"]');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for search input to be visible
    await this.page.waitForSelector('[data-testid="search-input"]', {
      timeout: 5000
    });
  }

  /**
   * Navigate to Private Repos view
   */
  async navigateToPrivateRepos() {
    await this.page.click('[data-testid="nav-private-repos"]');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Search for skills in registry
   */
  async searchSkill(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    // Wait for search results to load
    await this.page.waitForTimeout(1500);
  }

  /**
   * Get skill card by name
   */
  async getSkillCard(skillName: string) {
    return this.page.locator(
      `[data-testid="skill-card"]:has-text("${skillName}")`
    );
  }

  /**
   * Install a skill from registry
   */
  async installSkill(skillName: string) {
    const skillCard = await this.getSkillCard(skillName);
    await skillCard.locator('[data-testid="install-button"]').click();

    // Wait for installation dialog
    await this.page.waitForSelector('[data-testid="install-dialog"]', {
      timeout: 5000
    });

    // Confirm installation
    await this.page.click('[data-testid="confirm-install-button"]');

    // Wait for installation to complete
    await this.page.waitForSelector('text=/Installation completed|installed successfully/i', {
      timeout: 30000
    });
  }

  /**
   * Check if skill is installed
   */
  async isSkillInstalled(skillName: string): Promise<boolean> {
    await this.navigateToSkills();
    const skill = await this.page.$(`[data-testid="skill-card"]:has-text("${skillName}")`);
    return skill !== null;
  }

  /**
   * Get installed skill count
   */
  async getInstalledSkillCount(): Promise<number> {
    await this.navigateToSkills();
    const skills = await this.page.$$('[data-testid="skill-card"]');
    return skills.length;
  }

  /**
   * Preview skill content
   */
  async previewSkill(skillName: string) {
    const skillCard = await this.getSkillCard(skillName);
    await skillCard.locator('[data-testid="skill-name"]').click();

    // Wait for preview panel to load
    await this.page.waitForSelector('[data-testid="skill-preview"]', {
      timeout: 5000
    });
  }

  /**
   * Close preview panel
   */
  async closePreview() {
    await this.page.click('[data-testid="close-preview-button"]');
  }

  /**
   * Open DevTools for debugging
   */
  async openDevTools() {
    await this.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
    });
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout = 5000) {
    const selector = message
      ? `[data-testid="toast"]:has-text("${message}")`
      : '[data-testid="toast"]';

    return this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Get console logs
   */
  async getConsoleLogs() {
    const logs: string[] = [];

    this.page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    return logs;
  }

  /**
   * Mock API response
   */
  async mockAPI(url: string, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Check if button is disabled
   */
  async isButtonDisabled(testId: string): Promise<boolean> {
    const button = await this.page.$(`[data-testid="${testId}"][disabled]`);
    return button !== null;
  }

  /**
   * Get element text content
   */
  async getTextContent(testId: string): Promise<string> {
    const element = await this.page.$(`[data-testid="${testId}"]`);
    if (!element) return '';
    return element.textContent() || '';
  }
}

/**
 * Test data fixtures
 */
export const TestData = {
  mockSkill: {
    id: 'test-skill-123',
    skillId: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill for automated testing',
    version: '1.0.0',
    author: 'Test Author',
    source: 'test-org/test-repo'
  },

  mockSearchResults: [
    {
      id: 'skill-1',
      skillId: 'claude-api',
      name: 'Claude API Helper',
      installs: 1000,
      source: 'anthropics/skills'
    },
    {
      id: 'skill-2',
      skillId: 'code-review',
      name: 'Code Review Assistant',
      installs: 500,
      source: 'example/skills'
    }
  ],

  mockSkillContent: `---
name: Test Skill
description: A test skill
version: 1.0.0
author: Test Author
---

# Test Skill

This is a test skill for automated testing.
`
};
