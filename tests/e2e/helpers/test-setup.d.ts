/**
 * Test Setup Utilities
 *
 * Provides utilities for setting up test fixtures and cleaning up after tests
 */
import { Page, ElectronApplication } from '@playwright/test';
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
export declare class TestFixtureManager {
    private createdSkills;
    private page;
    private app;
    constructor(app: ElectronApplication, page: Page);
    /**
     * Create a single skill
     */
    createSkill(name: string): Promise<boolean>;
    /**
     * Create multiple skills for testing
     */
    createSkills(count: number, prefix?: string): Promise<string[]>;
    /**
     * Delete a single skill
     */
    deleteSkill(name: string): Promise<boolean>;
    /**
     * Clean up all created skills
     */
    cleanup(): Promise<void>;
    /**
     * Get list of created skill names
     */
    getCreatedSkills(): string[];
    /**
     * Track an existing skill for cleanup
     */
    trackSkill(name: string): void;
}
/**
 * Set up test fixtures with sample skills
 */
export declare function setupTestFixtures(app: ElectronApplication, page: Page, options?: TestFixtureOptions): Promise<TestFixtureResult>;
/**
 * Wait for app to be fully ready
 */
export declare function waitForAppReady(page: Page, timeout?: number): Promise<void>;
/**
 * Navigate to a specific view and wait for it to load
 */
export declare function navigateToView(page: Page, view: 'skills' | 'discover' | 'private-repos'): Promise<void>;
/**
 * Ensure at least one skill exists for tests that need it
 */
export declare function ensureSkillExists(app: ElectronApplication, page: Page, manager: TestFixtureManager): Promise<string>;
//# sourceMappingURL=test-setup.d.ts.map