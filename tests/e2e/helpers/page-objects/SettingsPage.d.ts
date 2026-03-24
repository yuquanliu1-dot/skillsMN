/**
 * SettingsPage - Page Object Model for Settings
 *
 * Handles interactions with the settings/configuration panel
 */
import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';
export declare class SettingsPage extends AppPage {
    constructor(app: ElectronApplication, page: Page);
    /**
     * Open settings modal
     */
    open(): Promise<void>;
    /**
     * Close settings modal
     */
    close(): Promise<void>;
    /**
     * Wait for settings to load
     */
    waitForSettings(timeout?: number): Promise<void>;
    /**
     * Check if settings modal is visible
     */
    isVisible(): Promise<boolean>;
    /**
     * Switch to a tab
     */
    switchToTab(tabName: string): Promise<void>;
    /**
     * Get list of project directories
     */
    getProjectDirectories(): Promise<string[]>;
    /**
     * Add a project directory
     */
    addProjectDirectory(): Promise<void>;
    /**
     * Remove a project directory
     */
    removeProjectDirectory(path: string): Promise<void>;
    /**
     * Toggle auto refresh
     */
    toggleAutoRefresh(): Promise<void>;
    /**
     * Check if auto refresh is enabled
     */
    isAutoRefreshEnabled(): Promise<boolean>;
    /**
     * Set editor font size
     */
    setEditorFontSize(size: number): Promise<void>;
    /**
     * Get editor font size
     */
    getEditorFontSize(): Promise<number>;
    /**
     * Set editor theme
     */
    setEditorTheme(theme: 'light' | 'dark' | 'vs-dark'): Promise<void>;
    /**
     * Get editor theme
     */
    getEditorTheme(): Promise<string>;
    /**
     * Toggle minimap
     */
    toggleMinimap(): Promise<void>;
    /**
     * Check if minimap is enabled
     */
    isMinimapEnabled(): Promise<boolean>;
    /**
     * Set tab size
     */
    setTabSize(size: number): Promise<void>;
    /**
     * Get tab size
     */
    getTabSize(): Promise<number>;
    /**
     * Toggle word wrap
     */
    toggleWordWrap(): Promise<void>;
    /**
     * Check if word wrap is enabled
     */
    isWordWrapEnabled(): Promise<boolean>;
    /**
     * Switch to AI tab
     */
    switchToAITab(): Promise<void>;
    /**
     * Switch to Private Repos tab
     */
    switchToPrivateReposTab(): Promise<void>;
    /**
     * Switch to Skill View tab
     */
    switchToSkillViewTab(): Promise<void>;
    /**
     * Set AI API key
     */
    setAIApiKey(key: string): Promise<void>;
    /**
     * Get AI API key (masked)
     */
    getAIApiKey(): Promise<string>;
    /**
     * Test AI connection
     */
    testAIConnection(): Promise<void>;
    /**
     * Check if AI connection test was successful
     */
    isAIConnectionSuccessful(): Promise<boolean>;
    /**
     * Check if AI connection test failed
     */
    isAIConnectionFailed(): Promise<boolean>;
    /**
     * Add a GitHub private repo
     */
    addGitHubRepo(owner: string, repo: string, pat: string): Promise<void>;
    /**
     * Add a GitLab private repo
     */
    addGitLabRepo(url: string, pat: string): Promise<void>;
    /**
     * Get list of private repos
     */
    getPrivateRepos(): Promise<string[]>;
    /**
     * Remove a private repo
     */
    removePrivateRepo(repoName: string): Promise<void>;
    /**
     * Test private repo connection
     */
    testPrivateRepoConnection(repoName: string): Promise<void>;
    /**
     * Save settings
     */
    save(): Promise<void>;
    /**
     * Check if save button is disabled
     */
    isSaveDisabled(): Promise<boolean>;
    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges(): Promise<boolean>;
    /**
     * Discard changes
     */
    discardChanges(): Promise<void>;
    /**
     * Check for validation error
     */
    hasValidationError(): Promise<boolean>;
    /**
     * Get validation error message
     */
    getValidationError(): Promise<string | null>;
}
//# sourceMappingURL=SettingsPage.d.ts.map