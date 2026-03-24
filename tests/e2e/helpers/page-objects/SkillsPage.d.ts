/**
 * SkillsPage - Page Object Model for Local Skills Management
 *
 * Handles interactions with the skills list, creation, editing, and deletion
 */
import { Page, ElectronApplication } from '@playwright/test';
import { AppPage } from './AppPage';
export interface SkillInfo {
    name: string;
    path: string;
    description?: string;
    sourceType?: string;
}
export declare class SkillsPage extends AppPage {
    constructor(app: ElectronApplication, page: Page);
    /**
     * Navigate to Skills view
     */
    goto(): Promise<void>;
    /**
     * Create a new skill
     */
    createSkill(name: string): Promise<void>;
    /**
     * Create a new skill using keyboard shortcut
     */
    createSkillWithShortcut(name: string): Promise<void>;
    /**
     * Cancel skill creation
     */
    cancelCreateSkill(): Promise<void>;
    /**
     * Open AI skill creation dialog
     */
    openAICreationDialog(): Promise<void>;
    /**
     * Get all skill cards
     */
    getSkillCards(): Promise<string[]>;
    /**
     * Get skill count
     */
    getSkillCount(): Promise<number>;
    /**
     * Check if skill exists (with scroll for virtualized list)
     */
    skillExists(name: string): Promise<boolean>;
    /**
     * Click on a skill to open in editor
     */
    clickSkill(name: string): Promise<void>;
    /**
     * Delete a skill
     */
    deleteSkill(name: string): Promise<void>;
    /**
     * Cancel skill deletion
     */
    cancelDeleteSkill(name: string): Promise<void>;
    /**
     * Search for skills
     */
    searchSkills(query: string): Promise<void>;
    /**
     * Clear search
     */
    clearSearch(): Promise<void>;
    /**
     * Sort skills by
     */
    sortSkills(sortBy: 'name' | 'modified'): Promise<void>;
    /**
     * Filter skills by source
     */
    filterSkills(filter: 'all' | 'local' | 'registry' | 'private-repo'): Promise<void>;
    /**
     * Get displayed skill count text
     */
    getSkillCountText(): Promise<string>;
    /**
     * Check if skill has update indicator
     */
    skillHasUpdate(name: string): Promise<boolean>;
    /**
     * Open folder for skill
     */
    openSkillFolder(name: string): Promise<void>;
    /**
     * Get skill source badge text
     */
    getSkillSourceBadge(name: string): Promise<string | null>;
    /**
     * Check if create button is visible
     */
    isCreateButtonVisible(): Promise<boolean>;
    /**
     * Check if AI create button is visible
     */
    isAICreateButtonVisible(): Promise<boolean>;
    /**
     * Wait for skill to appear in list
     */
    waitForSkill(name: string, timeout?: number): Promise<void>;
    /**
     * Wait for skill to be removed from list
     */
    waitForSkillRemoval(name: string, timeout?: number): Promise<void>;
}
//# sourceMappingURL=SkillsPage.d.ts.map