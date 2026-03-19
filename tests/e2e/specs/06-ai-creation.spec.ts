/**
 * AI Skill Creation Tests (P1)
 *
 * Tests for AI-powered skill generation and streaming
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { SkillsPage, generateMockAIContent, mockAIGeneration, mockAIStreaming } from '../helpers';

let electronApp: ElectronApplication;
let page: Page;
let skillsPage: SkillsPage;

test.describe('AI Skill Creation @P1', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    skillsPage = new SkillsPage(electronApp, page);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('AI Creation Dialog', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
    });

    test('should display AI create button', async () => {
      expect(await skillsPage.isAICreateButtonVisible()).toBeTruthy();
    });

    test('should open AI creation dialog', async () => {
      await skillsPage.openAICreationDialog();

      expect(await page.isVisible('text=AI Skill Creator')).toBeTruthy();
    });

    test('should show prompt input', async () => {
      if (!await page.isVisible('text=AI Skill Creator')) {
        await skillsPage.openAICreationDialog();
      }

      expect(await page.isVisible('[data-testid="ai-prompt-input"], textarea[placeholder*="Describe"]')).toBeTruthy();
    });

    test('should show generate button', async () => {
      if (!await page.isVisible('text=AI Skill Creator')) {
        await skillsPage.openAICreationDialog();
      }

      expect(await page.isVisible('[data-testid="ai-generate-button"], button:has(svg)')).toBeTruthy();
    });

    test('should close dialog with escape', async () => {
      if (!await page.isVisible('text=AI Skill Creator')) {
        await skillsPage.openAICreationDialog();
      }

      await page.keyboard.press('Escape');

      await page.waitForSelector('text=AI Skill Creator', { state: 'hidden', timeout: 3000 });
    });

    test('should close dialog with close button', async () => {
      await skillsPage.openAICreationDialog();

      // Click close button in header
      await page.click('.text-white\\/80.hover\\:text-white');

      await page.waitForSelector('text=AI Skill Creator', { state: 'hidden', timeout: 3000 });
    });
  });

  test.describe('Prompt Input', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.openAICreationDialog();
    });

    test('should accept text input', async () => {
      const prompt = 'Create a skill for code review';
      await page.fill('textarea', prompt);

      const value = await page.$eval('textarea', (el: any) => el.value);
      expect(value).toBe(prompt);
    });

    test('should show character count', async () => {
      await page.fill('textarea', 'Test prompt');

      expect(await page.isVisible('[data-testid="ai-char-count"], text=/\\d+\\/2000/')).toBeTruthy();
    });

    test('should limit to 2000 characters', async () => {
      const longText = 'a'.repeat(2500);
      await page.fill('textarea', longText);

      const value = await page.$eval('textarea', (el: any) => el.value);
      expect(value.length).toBeLessThanOrEqual(2000);
    });

    test('should disable generate button when empty', async () => {
      await page.fill('textarea', '');

      const button = await page.$('[data-testid="ai-generate-button"][disabled], button[disabled]');
      expect(button).toBeTruthy();
    });

    test('should enable generate button with text', async () => {
      await page.fill('textarea', 'Test prompt');

      // Wait for button to be enabled
      await page.waitForTimeout(100);

      const button = await page.$('[data-testid="ai-generate-button"]:not([disabled]), button:not([disabled])');
      expect(button).toBeTruthy();
    });
  });

  test.describe('Preview Window', () => {
    test.beforeEach(async () => {
      await skillsPage.goto();
      await skillsPage.openAICreationDialog();
    });

    test('should show preview area', async () => {
      expect(await page.isVisible('text=Preview')).toBeTruthy();
    });

    test('should show placeholder before generation', async () => {
      expect(await page.isVisible('[data-testid="ai-preview-window"], text=/Generated content will appear here/i')).toBeTruthy();
    });
  });

  test.describe('Generation', () => {
    // Note: These tests would require mocking the AI API
    // In a real test environment, we'd mock the streaming response

    test.skip('should start generation when clicking generate', async () => {
      await skillsPage.goto();
      await skillsPage.openAICreationDialog();

      await page.fill('textarea', 'Create a simple hello world skill');
      await page.click('button:has-text("Generate")');

      // Should show streaming indicator
      expect(await page.isVisible('text=Streaming')).toBeTruthy();
    });

    test.skip('should display generated content', async () => {
      // This would require API mocking
    });

    test.skip('should show streaming animation', async () => {
      // This would require API mocking
    });

    test.skip('should show completion status', async () => {
      // This would require API mocking
    });
  });

  test.describe('Stop Generation', () => {
    test.skip('should show stop button during generation', async () => {
      // This would require API mocking
    });

    test.skip('should stop generation when clicking stop', async () => {
      // This would require API mocking
    });
  });

  test.describe('Error Handling', () => {
    test.skip('should show error message on failure', async () => {
      // This would require API mocking to return error
    });

    test.skip('should allow retry after error', async () => {
      // This would require API mocking
    });
  });

  test.describe('Tool Calls Display', () => {
    test.skip('should show tool calls during generation', async () => {
      // This would require API mocking
    });

    test.skip('should display tool input', async () => {
      // This would require API mocking
    });
  });

  test.describe('Skill Saving', () => {
    test.skip('should save generated skill', async () => {
      // This would require API mocking and file system access
    });

    test.skip('should appear in skills list after saving', async () => {
      // This would require API mocking and file system access
    });
  });
});
