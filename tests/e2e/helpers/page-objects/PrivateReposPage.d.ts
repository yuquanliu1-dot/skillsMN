/**
 * PrivateReposPage - Page Object Model for Private Repositories
 *
 * Handles interactions with private repository management
 */
import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';
export interface PrivateRepoInfo {
    id: string;
    name: string;
    type: 'github' | 'gitlab';
}
export interface PrivateSkillInfo {
    name: string;
    path: string;
    lastModified: string;
}
export declare class PrivateReposPage extends AppPage {
    constructor(app: ElectronApplication, page: Page);
    /**
     * Navigate to Private Repos view
     */
    goto(): Promise<void>;
    /**
     * Wait for repositories to load
     */
    waitForReposLoad(timeout?: number): Promise<void>;
    /**
     * Get list of repositories
     */
    getRepositories(): Promise<PrivateRepoInfo[]>;
    /**
     * Select a repository
     */
    selectRepository(repoId: string): Promise<void>;
    /**
     * Get selected repository ID
     */
    getSelectedRepository(): Promise<string | null>;
    /**
     * Get skills count for current repository
     */
    getSkillsCount(): Promise<number>;
    /**
     * Search skills in repository
     */
    searchSkills(query: string): Promise<void>;
    /**
     * Clear search
     */
    clearSearch(): Promise<void>;
    /**
     * Sort skills
     */
    sortSkills(sortBy: 'name' | 'modified'): Promise<void>;
    /**
     * Refresh skills list
     */
    refresh(): Promise<void>;
    /**
     * Check if loading
     */
    isLoading(): Promise<boolean>;
    /**
     * Check if error is visible
     */
    hasError(): Promise<boolean>;
    /**
     * Get error message
     */
    getError(): Promise<string | null>;
    /**
     * Check if authentication error
     */
    isAuthError(): Promise<boolean>;
    /**
     * Click retry button
     */
    retryLoad(): Promise<void>;
    /**
     * Click settings link in auth error
     */
    goToSettingsFromError(): Promise<void>;
    /**
     * Check if no repositories configured
     */
    hasNoRepos(): Promise<boolean>;
    /**
     * Check if no skills in repository
     */
    hasNoSkills(): Promise<boolean>;
    /**
     * Get visible skills (for pagination testing)
     */
    getVisibleSkillCount(): Promise<number>;
    /**
     * Click load more button
     */
    loadMore(): Promise<void>;
    /**
     * Check if load more button is visible
     */
    hasLoadMoreButton(): Promise<boolean>;
    /**
     * Get remaining skills count from load more button
     */
    getRemainingSkillCount(): Promise<number>;
    /**
     * Install a skill from private repo
     */
    installSkill(skillName: string): Promise<void>;
    /**
     * Preview a skill
     */
    previewSkill(skillName: string): Promise<void>;
}
//# sourceMappingURL=PrivateReposPage.d.ts.map