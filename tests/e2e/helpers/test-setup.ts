/**
 * Test Setup Utilities
 *
 * Provides utilities for setting up test fixtures and cleaning up after tests
 */

import { Page, ElectronApplication } from '@playwright/test';
import { generateSkillContent, generateUniqueSkillName } from './fixtures/skills';

export interface TestFixtureOptions {
  /** Number of test skills to create */
  skillCount?: number;
  /** Prefix for skill names */
  skillPrefix?: string;
  /** Whether to create registry skills */
  includeRegistry?: boolean;
  /** Whether to create private repo skills */
  includePrivate?: boolean;
}

export interface TestFixtureResult {
  /** Created skill names */
  skillNames: string[];
  /** Registry skill names */
  registrySkillNames: string[];
  /** Private repo skill names */
  privateSkillNames: string[];
  /** Cleanup function */
  cleanup: () => Promise<void>;
}

/**
 * Test fixture manager for E2E tests
 */
export class TestFixtureManager {
  private createdSkills: string[] = [];
  private page: Page;
  private app: ElectronApplication;

  constructor(app: ElectronApplication, page: Page) {
    this.app = app;
    this.page = page;
  }

  /**
   * Create a single skill
   */
  async createSkill(name: string): Promise<boolean> {
    try {
      // Click create button
      await this.page.click('[data-testid="create-skill-button"]');

      // Wait for dialog
      await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { timeout: 5000 });

      // Fill in skill name
      await this.page.fill('[data-testid="skill-name-input"]', name);

      // Submit
      await this.page.click('[data-testid="confirm-create-button"]');

      // Wait for dialog to close
      await this.page.waitForSelector('[data-testid="create-skill-dialog"]', { state: 'hidden', timeout: 10000 });

      // Wait for skill to appear in the list
      await this.page.waitForSelector(`[data-testid="skill-card"]:has-text("${name}")`, { timeout: 10000 });

      this.createdSkills.push(name);
      return true;
    } catch (error) {
      console.error(`Failed to create skill "${name}":`, error);
      return false;
    }
  }

  /**
   * Create multiple skills for testing
   */
  async createSkills(count: number, prefix = 'test-skill'): Promise<string[]> {
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = generateUniqueSkillName(prefix);
      const success = await this.createSkill(name);
      if (success) {
        names.push(name);
      }
      // Small delay between creations
      await this.page.waitForTimeout(300);
    }

    return names;
  }

  /**
   * Delete a single skill
   */
  async deleteSkill(name: string): Promise<boolean> {
    try {
      // Search for the skill first to make it visible
      const searchInput = await this.page.$('[data-testid="skill-search-input"], [data-testid="skills-list"] input[type="text"]');
      if (searchInput) {
        await searchInput.fill(name);
        await this.page.waitForTimeout(500);
      }

      // Use locator API
      const skillCard = this.page.locator(`[data-testid="skill-card"]:has-text("${name}")`);
      await skillCard.waitFor({ timeout: 10000 });

      // Hover to show actions
      await skillCard.hover();
      await this.page.waitForTimeout(200);

      // Click delete button using locator
      await skillCard.locator('[data-testid="delete-button"]').click();

      // Wait for confirmation dialog
      await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { timeout: 5000 });

      // Confirm deletion
      await this.page.click('[data-testid="confirm-delete-button"]');

      // Wait for dialog to close
      await this.page.waitForSelector('[data-testid="delete-confirm-dialog"]', { state: 'hidden', timeout: 15000 });

      // Remove from tracking
      this.createdSkills = this.createdSkills.filter(s => s !== name);

      return true;
    } catch (error) {
      console.error(`Failed to delete skill "${name}":`, error);
      return false;
    }
  }

  /**
   * Clean up all created skills
   */
  async cleanup(): Promise<void> {
    // Close any open modals first
    try {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    } catch {
      // Ignore errors
    }

    // Navigate to skills view first
    try {
      const navButton = this.page.locator('[data-testid="nav-skills"]');
      const isVisible = await navButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        // Check if any modal is blocking
        const modalVisible = await this.page.isVisible('[data-testid="settings-modal"], [data-testid="create-skill-dialog"], [data-testid="delete-confirm-dialog"]').catch(() => false);
        if (modalVisible) {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        }
        await navButton.click({ force: true });
        await this.page.waitForTimeout(500);
      }
    } catch {
      // Ignore navigation errors
    }

    // Delete all tracked skills
    for (const name of [...this.createdSkills]) {
      try {
        await this.deleteSkill(name);
        await this.page.waitForTimeout(200);
      } catch {
        // Ignore deletion errors during cleanup
      }
    }

    this.createdSkills = [];
  }

  /**
   * Get list of created skill names
   */
  getCreatedSkills(): string[] {
    return [...this.createdSkills];
  }

  /**
   * Track an existing skill for cleanup
   */
  trackSkill(name: string): void {
    if (!this.createdSkills.includes(name)) {
      this.createdSkills.push(name);
    }
  }
}

/**
 * Set up test fixtures with sample skills
 */
export async function setupTestFixtures(
  app: ElectronApplication,
  page: Page,
  options: TestFixtureOptions = {}
): Promise<TestFixtureResult> {
  const {
    skillCount = 3,
    skillPrefix = 'fixture-skill',
    includeRegistry = false,
    includePrivate = false
  } = options;

  const manager = new TestFixtureManager(app, page);

  // Navigate to skills view
  await page.click('[data-testid="nav-skills"]');
  await page.waitForTimeout(500);

  // Create local skills
  const skillNames = await manager.createSkills(skillCount, skillPrefix);

  // Note: Registry and private skills would require mocking or actual API setup
  // For now, we just track the names
  const registrySkillNames: string[] = [];
  const privateSkillNames: string[] = [];

  return {
    skillNames,
    registrySkillNames,
    privateSkillNames,
    cleanup: async () => {
      await manager.cleanup();
    }
  };
}

/**
 * Wait for app to be fully ready
 */
export async function waitForAppReady(page: Page, timeout = 30000): Promise<void> {
  // Wait for sidebar
  await page.waitForSelector('[data-testid="sidebar"]', { timeout });

  // Wait for main content
  await page.waitForSelector('[data-testid="main-content"]', { timeout });

  // Wait for loading to complete
  await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout })
    .catch(() => {
      // Loading indicator might not exist, which is fine
    });

  // Additional wait for React to settle
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific view and wait for it to load
 */
export async function navigateToView(page: Page, view: 'skills' | 'discover' | 'private-repos'): Promise<void> {
  await page.click(`[data-testid="nav-${view}"]`);
  await page.waitForLoadState('domcontentloaded');

  // Wait for view-specific content
  switch (view) {
    case 'skills':
      try {
        await page.waitForSelector('[data-testid="skills-list"]', { timeout: 5000 });
      } catch {
        // List might show "No skills" message instead
        await page.waitForSelector('text=/No skills/i', { timeout: 5000 }).catch(() => {});
      }
      break;
    case 'discover':
      await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
      break;
    case 'private-repos':
      await page.waitForSelector('[data-testid="private-repos-list"]', { timeout: 10000 });
      break;
  }
}

/**
 * Ensure at least one skill exists for tests that need it
 */
export async function ensureSkillExists(
  app: ElectronApplication,
  page: Page,
  manager: TestFixtureManager
): Promise<string> {
  // Check if any skills exist
  await navigateToView(page, 'skills');
  await page.waitForTimeout(500);

  const existingSkills = await page.$$('[data-testid="skill-card"]');

  if (existingSkills.length > 0) {
    // Get the name of the first skill
    const nameElement = await existingSkills[0].$('[data-testid="skill-name"]');
    if (nameElement) {
      return await nameElement.textContent() || '';
    }
  }

  // Create a new skill
  const name = generateUniqueSkillName('test-skill');
  await manager.createSkill(name);
  return name;
}
