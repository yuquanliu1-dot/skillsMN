/**
 * AI API Mock Utilities
 *
 * Provides utilities for mocking AI generation API calls
 */
import { Page } from '@playwright/test';
export interface MockAIOptions {
    failGeneration?: boolean;
    streamingDelay?: number;
    incompleteContent?: boolean;
    invalidFrontmatter?: boolean;
}
/**
 * Generate mock AI content
 */
export declare function generateMockAIContent(name?: string): string;
/**
 * Mock AI generation API (non-streaming)
 */
export declare function mockAIGeneration(page: Page, options?: MockAIOptions): Promise<void>;
/**
 * Mock AI streaming API
 */
export declare function mockAIStreaming(page: Page, options?: MockAIOptions): Promise<void>;
/**
 * Mock AI connection test
 */
export declare function mockAIConnectionTest(page: Page, success?: boolean): Promise<void>;
/**
 * Mock AI timeout
 */
export declare function mockAITimeout(page: Page): Promise<void>;
/**
 * Mock AI rate limit
 */
export declare function mockAIRateLimit(page: Page): Promise<void>;
/**
 * Mock AI token usage exceeded
 */
export declare function mockAITokenLimit(page: Page): Promise<void>;
/**
 * Clear all AI mocks
 */
export declare function clearAIMocks(page: Page): Promise<void>;
//# sourceMappingURL=ai-api.d.ts.map