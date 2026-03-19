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
    // Monaco editor content is stored in the model
    const content = await this.page.evaluate(() => {
      const editor = (window as any).monaco?.editor?.getModels()?.[0];
      return editor?.getValue() || '';
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
    return await this.page.isVisible('[data-testid="save-indicator"], text=/Unsaved|Auto-saving/i');
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
    const header = await this.page.$('[data-testid="skill-editor"] h2');
    return await header?.textContent() || '';
  }

  /**
   * Get source badge text
   */
  async getSourceBadge(): Promise<string | null> {
    const badge = await this.page.$('[data-testid="skill-editor"] .badge');
    return await badge?.textContent() || null;
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
    await this.page.click('[data-testid="symlink-toggle"], [role="switch"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if symlink is enabled
   */
  async isSymlinkEnabled(): Promise<boolean> {
    const toggle = await this.page.$('[data-testid="symlink-toggle"][aria-checked="true"], [role="switch"][aria-checked="true"]');
    return toggle !== null;
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
    const statusElement = await this.page.$('[data-testid="symlink-status"], .text-sm.text-gray-600:has(span)');
    return await statusElement?.textContent() || '';
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
    const shortcuts = ['Ctrl', 'S', 'AI Rewrite', 'AI Insert'];
    for (const shortcut of shortcuts) {
      if (!await this.page.isVisible(`text=${shortcut}`)) {
        return false;
      }
    }
    return true;
  }
}
