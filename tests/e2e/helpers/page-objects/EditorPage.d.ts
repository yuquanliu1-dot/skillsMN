/**
 * EditorPage - Page Object Model for Skill Editor Interactions
 *
 * Handles interactions with the Monaco editor and editor controls
 */
import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';
export declare class EditorPage extends AppPage {
    constructor(app: ElectronApplication, page: Page);
    /**
     * Wait for editor to load
     */
    waitForEditor(timeout?: number): Promise<void>;
    /**
     * Get editor content
     */
    getContent(): Promise<string>;
    /**
     * Set editor content (for testing purposes)
     */
    setContent(content: string): Promise<void>;
    /**
     * Type in editor at current cursor position
     */
    typeInEditor(text: string): Promise<void>;
    /**
     * Select all text in editor
     */
    selectAll(): Promise<void>;
    /**
     * Save skill (Ctrl+S)
     */
    save(): Promise<void>;
    /**
     * Close editor
     */
    close(): Promise<void>;
    /**
     * Close editor with unsaved changes confirmation
     */
    closeWithConfirmation(keepChanges: boolean): Promise<void>;
    /**
     * Check if editor has unsaved changes
     */
    hasUnsavedChanges(): Promise<boolean>;
    /**
     * Check if in read-only mode
     */
    isReadOnly(): Promise<boolean>;
    /**
     * Get skill name from header
     */
    getSkillName(): Promise<string>;
    /**
     * Get source badge text
     */
    getSourceBadge(): Promise<string | null>;
    /**
     * Check if upload button is visible
     */
    isUploadButtonVisible(): Promise<boolean>;
    /**
     * Check if commit button is visible
     */
    isCommitButtonVisible(): Promise<boolean>;
    /**
     * Click upload button
     */
    clickUpload(): Promise<void>;
    /**
     * Click commit button
     */
    clickCommit(): Promise<void>;
    /**
     * Check if external change warning is visible
     */
    hasExternalChangeWarning(): Promise<boolean>;
    /**
     * Click reload button for external changes
     */
    clickReloadExternal(): Promise<void>;
    /**
     * Click keep changes for external changes
     */
    clickKeepChanges(): Promise<void>;
    /**
     * Toggle symlink
     */
    toggleSymlink(): Promise<void>;
    /**
     * Check if symlink is enabled
     */
    isSymlinkEnabled(): Promise<boolean>;
    /**
     * Select symlink directory
     */
    selectSymlinkDirectory(directory: string): Promise<void>;
    /**
     * Get symlink status text
     */
    getSymlinkStatus(): Promise<string>;
    /**
     * Open AI rewrite popover
     */
    openAIRewrite(): Promise<void>;
    /**
     * Open AI insert popover
     */
    openAIInsert(): Promise<void>;
    /**
     * Check if error message is visible
     */
    hasError(): Promise<boolean>;
    /**
     * Get error message text
     */
    getError(): Promise<string | null>;
    /**
     * Check if loading
     */
    isLoading(): Promise<boolean>;
    /**
     * Get last modified text
     */
    getLastModifiedText(): Promise<string>;
    /**
     * Verify keyboard shortcuts are displayed
     */
    areKeyboardShortcutsVisible(): Promise<boolean>;
}
//# sourceMappingURL=EditorPage.d.ts.map