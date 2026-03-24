/**
 * Test Helpers for Skill Manager E2E Tests
 */
import { Page, ElectronApplication } from '@playwright/test';
/**
 * Helper class for Skill Manager testing
 */
export declare class SkillManagerHelper {
    private app;
    private page;
    constructor(app: ElectronApplication, page: Page);
    /**
     * Navigate to Skills view
     */
    navigateToSkills(): Promise<void>;
    /**
     * Navigate to Discover view
     */
    navigateToDiscover(): Promise<void>;
    /**
     * Navigate to Private Repos view
     */
    navigateToPrivateRepos(): Promise<void>;
    /**
     * Search for skills in registry
     */
    searchSkill(query: string): Promise<void>;
    /**
     * Get skill card by name
     */
    getSkillCard(skillName: string): Promise<import("playwright-core").Locator>;
    /**
     * Install a skill from registry
     */
    installSkill(skillName: string): Promise<void>;
    /**
     * Check if skill is installed
     */
    isSkillInstalled(skillName: string): Promise<boolean>;
    /**
     * Get installed skill count
     */
    getInstalledSkillCount(): Promise<number>;
    /**
     * Preview skill content
     */
    previewSkill(skillName: string): Promise<void>;
    /**
     * Close preview panel
     */
    closePreview(): Promise<void>;
    /**
     * Open DevTools for debugging
     */
    openDevTools(): Promise<void>;
    /**
     * Wait for toast notification
     */
    waitForToast(message?: string, timeout?: number): Promise<import("playwright-core").ElementHandle<HTMLElement | SVGElement>>;
    /**
     * Get console logs
     */
    getConsoleLogs(): Promise<string[]>;
    /**
     * Mock API response
     */
    mockAPI(url: string, response: any): Promise<void>;
    /**
     * Take screenshot
     */
    takeScreenshot(name: string): Promise<void>;
    /**
     * Check if button is disabled
     */
    isButtonDisabled(testId: string): Promise<boolean>;
    /**
     * Get element text content
     */
    getTextContent(testId: string): Promise<string>;
}
/**
 * Test data fixtures
 */
export declare const TestData: {
    mockSkill: {
        id: string;
        skillId: string;
        name: string;
        description: string;
        version: string;
        author: string;
        source: string;
    };
    mockSearchResults: {
        id: string;
        skillId: string;
        name: string;
        installs: number;
        source: string;
    }[];
    mockSkillContent: string;
};
export * from './index';
//# sourceMappingURL=test-helpers.d.ts.map