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
export declare class DiscoverPage extends AppPage {
    constructor(app: ElectronApplication, page: Page);
    /**
     * Navigate to Discover view
     */
    goto(): Promise<void>;
    /**
     * Search for skills
     */
    search(query: string): Promise<void>;
    /**
     * Clear search
     */
    clearSearch(): Promise<void>;
    /**
     * Get search input value
     */
    getSearchValue(): Promise<string>;
    /**
     * Check if loading indicator is visible
     */
    isLoading(): Promise<boolean>;
    /**
     * Wait for search results to load
     */
    waitForResults(timeout?: number): Promise<void>;
    /**
     * Get search results
     */
    getResults(): Promise<SearchResult[]>;
    /**
     * Get result count
     */
    getResultCount(): Promise<number>;
    /**
     * Check if no results message is visible
     */
    hasNoResults(): Promise<boolean>;
    /**
     * Click on a search result to preview
     */
    clickResult(name: string): Promise<void>;
    /**
     * Install a skill from search results
     */
    installSkill(name: string): Promise<void>;
    /**
     * Check if install button exists for a skill
     */
    hasInstallButton(name: string): Promise<boolean>;
    /**
     * Wait for skill preview panel
     */
    waitForPreview(timeout?: number): Promise<void>;
    /**
     * Check if preview panel is visible
     */
    isPreviewVisible(): Promise<boolean>;
    /**
     * Get preview content
     */
    getPreviewContent(): Promise<string>;
    /**
     * Close preview panel
     */
    closePreview(): Promise<void>;
    /**
     * Check if preview has YAML frontmatter
     */
    previewHasFrontmatter(): Promise<boolean>;
    /**
     * Check for error message
     */
    hasError(): Promise<boolean>;
    /**
     * Get error message
     */
    getError(): Promise<string | null>;
    /**
     * Wait for installation to complete
     */
    waitForInstallComplete(timeout?: number): Promise<void>;
    /**
     * Wait for installation to fail
     */
    waitForInstallError(timeout?: number): Promise<void>;
}
//# sourceMappingURL=DiscoverPage.d.ts.map