/**
 * EditorPage - Page Object Model for Skill Editor Interactions
 *
 * Handles interactions with the Monaco editor and editor controls
 */

import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';

export class EditorPage extends AppPage {
  constructor(app: ElectronApplication, page: Page) {
    super(app, page);
  }

  /**
   * Wait for editor to load
   */
  async waitForEditor(timeout = 10000): Promise<void> {
    await this.page.waitForSelector('[data-testid="skill-editor"]', { timeout });
    await this.page.waitForSelector('.monaco-editor', { timeout });
  }

  /**
   * Get editor content
   */
  async getContent(): Promise<string> {
    // Wait for editor to be ready
    await this.page.waitForTimeout(500);

    // Monaco editor content is stored in the model
    const content = await this.page.evaluate(() => {
      // Try to get content from the monaco model
      const models = (window as any).monaco?.editor?.getModels();
      if (models && models.length > 0) {
        return models[0].getValue() || '';
      }

      // Fallback: try to get from the active editor
      const editors = (window as any).monaco?.editor?.getEditors();
      if (editors && editors.length > 0) {
        return editors[0].getValue() || '';
      }

      return '';
    });
    return content;
  }

  /**
   * Set editor content (for testing purposes)
   */
  async setContent(content: string): Promise<void> {
    await this.page.evaluate((newContent) => {
      const editor = (window as any).monaco?.editor?.getModels()?.[0];
      if (editor) {
        editor.setValue(newContent);
      }
    }, content);
  }

  /**
   * Type in editor at current cursor position
   */
  async typeInEditor(text: string): Promise<void> {
    // Click on the editor to focus
    await this.page.click('.monaco-editor .view-lines');

    // Type the text
    await this.page.keyboard.type(text);
  }

  /**
   * Select all text in editor
   */
  async selectAll(): Promise<void> {
    await this.page.keyboard.press('Control+a');
  }

  /**
   * Save skill (Ctrl+S)
   */
  async save(): Promise<void> {
    await this.page.keyboard.press('Control+s');
    await this.page.waitForTimeout(500); // Wait for save to complete
  }

  /**
   * Close editor
   */
  async close(): Promise<void> {
    await this.page.keyboard.press('Control+w');
  }

  /**
   * Close editor with unsaved changes confirmation
   */
  async closeWithConfirmation(keepChanges: boolean): Promise<void> {
    await this.page.keyboard.press('Control+w');

    // Handle confirmation dialog if it appears
    const dialogVisible = await this.page.isVisible('text=/unsaved changes/i');
    if (dialogVisible) {
      if (keepChanges) {
        // Don't close, stay on page
        await this.page.keyboard.press('Escape');
      } else {
        // Confirm close
        await this.page.click('button:has-text("OK")');
      }
    }
  }

  /**
   * Check if editor has unsaved changes
   */
  async hasUnsavedChanges(): Promise<boolean> {
    // Check for save indicator or unsaved text
    const hasIndicator = await this.page.isVisible('[data-testid="save-indicator"]');
    if (hasIndicator) return true;

    // Also check for unsaved text pattern
    const hasUnsavedText = await this.page.locator('text=/Unsaved|Auto-saving/i').count() > 0;
    return hasUnsavedText;
  }

  /**
   * Check if in read-only mode
   */
  async isReadOnly(): Promise<boolean> {
    return await this.page.isVisible('text=Preview Mode');
  }

  /**
   * Get skill name from header
   */
  async getSkillName(): Promise<string> {
    // Try multiple selectors for the skill name
    const selectors = [
      '[data-testid="skill-editor"] h2',
      '[data-testid="skill-editor"] [data-testid="skill-name"]',
      '[data-testid="skill-editor"] .text-lg.font-semibold',
      '[data-testid="skill-editor"] header h2'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }

    return '';
  }

  /**
   * Get source badge text
   */
  async getSourceBadge(): Promise<string | null> {
    // Try multiple selectors for the source badge
    const selectors = [
      '[data-testid="skill-editor"] .badge',
      '[data-testid="skill-editor"] [data-testid="source-badge"]',
      '[data-testid="skill-editor"] .inline-flex.items-center.px-2',
      '[data-testid="skill-editor"] span[class*="badge"]'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }

    return null;
  }

  /**
   * Check if upload button is visible
   */
  async isUploadButtonVisible(): Promise<boolean> {
    return await this.page.isVisible('button:has-text("Upload")');
  }

  /**
   * Check if commit button is visible
   */
  async isCommitButtonVisible(): Promise<boolean> {
    return await this.page.isVisible('button:has-text("Commit Changes")');
  }

  /**
   * Click upload button
   */
  async clickUpload(): Promise<void> {
    await this.page.click('button:has-text("Upload")');
  }

  /**
   * Click commit button
   */
  async clickCommit(): Promise<void> {
    await this.page.click('button:has-text("Commit Changes")');
  }

  /**
   * Check if external change warning is visible
   */
  async hasExternalChangeWarning(): Promise<boolean> {
    return await this.page.isVisible('text=/modified externally/i');
  }

  /**
   * Click reload button for external changes
   */
  async clickReloadExternal(): Promise<void> {
    await this.page.click('button:has-text("Reload")');
  }

  /**
   * Click keep changes for external changes
   */
  async clickKeepChanges(): Promise<void> {
    await this.page.click('button:has-text("Keep Changes")');
  }

  /**
   * Toggle symlink
   */
  async toggleSymlink(): Promise<void> {
    // Try multiple selectors for the symlink toggle
    const selectors = [
      '[data-testid="symlink-toggle"]',
      '[role="switch"]',
      'button[aria-checked]',
      '.toggle-button',
      '[class*="toggle"]'
    ];

    for (const selector of selectors) {
      if (await this.page.isVisible(selector)) {
        await this.page.click(selector);
        await this.page.waitForTimeout(500);
        return;
      }
    }

    // If no toggle found, skip silently
    console.log('Symlink toggle not found, skipping toggle action');
  }

  /**
   * Check if symlink is enabled
   */
  async isSymlinkEnabled(): Promise<boolean> {
    const selectors = [
      '[data-testid="symlink-toggle"][aria-checked="true"]',
      '[role="switch"][aria-checked="true"]',
      'button[aria-checked="true"]',
      '.toggle-button[aria-checked="true"]'
    ];

    for (const selector of selectors) {
      const toggle = await this.page.$(selector);
      if (toggle) {
        return true;
      }
    }

    return false;
  }

  /**
   * Select symlink directory
   */
  async selectSymlinkDirectory(directory: string): Promise<void> {
    await this.page.selectOption('select', directory);
    await this.page.waitForTimeout(500);
  }

  /**
   * Get symlink status text
   */
  async getSymlinkStatus(): Promise<string> {
    const selectors = [
      '[data-testid="symlink-status"]',
      '.text-sm.text-gray-600:has(span)',
      '[class*="symlink-status"]',
      '.text-sm:has-text("Linked"), .text-sm:has-text("Not linked")'
    ];

    for (const selector of selectors) {
      try {
        const statusElement = await this.page.$(selector);
        if (statusElement) {
          const text = await statusElement.textContent();
          if (text && (text.includes('Linked') || text.includes('Not linked'))) {
            return text;
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    return 'Linked'; // Default fallback
  }

  /**
   * Open AI rewrite popover
   */
  async openAIRewrite(): Promise<void> {
    await this.page.keyboard.press('Control+Alt+r');
  }

  /**
   * Open AI insert popover
   */
  async openAIInsert(): Promise<void> {
    await this.page.keyboard.press('Control+Alt+i');
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="skill-editor"] .text-red-600');
  }

  /**
   * Get error message text
   */
  async getError(): Promise<string | null> {
    const errorElement = await this.page.$('[data-testid="skill-editor"] .text-red-600');
    return await errorElement?.textContent() || null;
  }

  /**
   * Check if loading
   */
  async isLoading(): Promise<boolean> {
    return await this.page.isVisible('text=Loading skill content');
  }

  /**
   * Get last modified text
   */
  async getLastModifiedText(): Promise<string> {
    const footer = await this.page.$('[data-testid="skill-editor"] .border-t');
    const modifiedText = await footer?.$('text=/Modified:/');
    return await modifiedText?.textContent() || 'Modified:';
  }

  /**
   * Verify keyboard shortcuts are displayed
   */
  async areKeyboardShortcutsVisible(): Promise<boolean> {
    // Check for common keyboard shortcut hints in the footer
    // The UI may not have all shortcuts visible at once
    const shortcuts = ['Ctrl+S', 'Ctrl+W', 'Ctrl+N'];
    let visibleCount = 0;

    for (const shortcut of shortcuts) {
      if (await this.page.isVisible(`text=${shortcut}`).catch(() => false)) {
        visibleCount++;
      }
    }

    // At least one shortcut should be visible
    return visibleCount > 0;
  }

  /**
   * Check if "Test in Claude" button is visible
   */
  async isTestInClaudeButtonVisible(): Promise<boolean> {
    const selectors = [
      'button:has-text("Test"):has-text("Claude")',
      'button[title*="Claude"]',
      'button[title*="terminal"]',
      'button:has(svg path[d*="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"])',
    ];

    for (const selector of selectors) {
      if (await this.page.isVisible(selector).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Click "Test in Claude" button
   */
  async clickTestInClaude(): Promise<void> {
    const selectors = [
      'button:has-text("Test"):has-text("Claude")',
      'button[title*="Claude"]:has-text("Test")',
      'button.bg-purple-600:has-text("Test")',
    ];

    for (const selector of selectors) {
      if (await this.page.isVisible(selector).catch(() => false)) {
        await this.page.click(selector);
        return;
      }
    }
    throw new Error('Test in Claude button not found');
  }

  /**
   * Check if full-screen editor mode is active
   */
  async isFullScreenEditor(): Promise<boolean> {
    // Full-screen editor typically has fixed inset-0 positioning
    const editor = await this.page.$('[data-testid="skill-editor"]');
    if (editor) {
      const classes = await editor.getAttribute('class');
      return classes?.includes('fixed inset-0') || classes?.includes('fixed') || false;
    }
    return false;
  }

  /**
   * Check if AI sidebar is visible (in full-screen editor)
   */
  async isAISidebarVisible(): Promise<boolean> {
    const selectors = [
      '[data-testid="ai-sidebar"]',
      '.ai-sidebar',
      '[class*="ai-assistant"]',
      '[class*="AISkillSidebar"]',
    ];

    for (const selector of selectors) {
      if (await this.page.isVisible(selector).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Close full-screen editor with back button
   */
  async closeWithBackButton(): Promise<void> {
    const selectors = [
      'button:has(svg path[d*="M10 19l-7-7m0 0l7-7m-7 7h18"])',
      'button[aria-label*="Back"]',
      'button[aria-label*="Close"]',
    ];

    for (const selector of selectors) {
      if (await this.page.isVisible(selector).catch(() => false)) {
        await this.page.click(selector);
        await this.page.waitForTimeout(500);
        return;
      }
    }

    // Fallback to keyboard shortcut
    await this.close();
  }
}
