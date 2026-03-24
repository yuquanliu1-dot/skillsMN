/**
 * Registry API Mock Utilities
 *
 * Provides utilities for mocking the skills registry API
 */
import { Page } from '@playwright/test';
export interface SearchParams {
    query?: string;
    page?: number;
    limit?: number;
}
export interface MockRegistryOptions {
    searchDelay?: number;
    failSearch?: boolean;
    failInstall?: boolean;
    emptyResults?: boolean;
}
/**
 * Mock the registry search API
 */
export declare function mockRegistrySearch(page: Page, options?: MockRegistryOptions): Promise<void>;
/**
 * Mock the registry skill content API
 */
export declare function mockRegistrySkillContent(page: Page, skillId: string, content: string): Promise<void>;
/**
 * Mock the registry install API
 */
export declare function mockRegistryInstall(page: Page, options?: {
    fail?: boolean;
    delay?: number;
}): Promise<void>;
/**
 * Mock network timeout
 */
export declare function mockRegistryTimeout(page: Page): Promise<void>;
/**
 * Mock rate limit response
 */
export declare function mockRegistryRateLimit(page: Page): Promise<void>;
/**
 * Clear all registry mocks
 */
export declare function clearRegistryMocks(page: Page): Promise<void>;
//# sourceMappingURL=registry-api.d.ts.map