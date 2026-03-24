/**
 * GitHub API Mock Utilities
 *
 * Provides utilities for mocking GitHub API calls
 */
import { Page } from '@playwright/test';
export interface MockGitHubOptions {
    failAuth?: boolean;
    rateLimited?: boolean;
    noRepos?: boolean;
    largeRepo?: boolean;
}
/**
 * Mock GitHub API authentication check
 */
export declare function mockGitHubAuth(page: Page, options?: MockGitHubOptions): Promise<void>;
/**
 * Mock GitHub repository contents API
 */
export declare function mockGitHubRepoContents(page: Page, owner: string, repo: string, contents: Array<{
    name: string;
    type: string;
    path: string;
}>): Promise<void>;
/**
 * Mock GitHub file content API
 */
export declare function mockGitHubFileContent(page: Page, owner: string, repo: string, path: string, content: string): Promise<void>;
/**
 * Mock GitHub create file API (for uploads)
 */
export declare function mockGitHubCreateFile(page: Page, owner: string, repo: string): Promise<void>;
/**
 * Mock GitHub update file API (for commits)
 */
export declare function mockGitHubUpdateFile(page: Page, owner: string, repo: string): Promise<void>;
/**
 * Mock GitHub rate limit error
 */
export declare function mockGitHubRateLimit(page: Page): Promise<void>;
/**
 * Mock GitHub server error
 */
export declare function mockGitHubServerError(page: Page): Promise<void>;
/**
 * Clear all GitHub mocks
 */
export declare function clearGitHubMocks(page: Page): Promise<void>;
//# sourceMappingURL=github-api.d.ts.map