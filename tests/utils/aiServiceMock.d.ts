/**
 * AI Service Mock Utilities
 *
 * Provides mock implementations for AI services in tests
 */
import type { AIConfiguration } from '../../src/shared/types';
/**
 * Mock AI Service Response
 */
export interface MockAIResponse {
    success: boolean;
    data?: any;
    error?: {
        code: string;
        message: string;
    };
}
/**
 * Mock AI Service
 */
export declare class MockAIService {
    private config;
    private mockResponses;
    /**
     * Set mock configuration
     */
    setConfig(config: AIConfiguration): void;
    /**
     * Get mock configuration
     */
    getConfig(): AIConfiguration | null;
    /**
     * Set mock response for a specific operation
     */
    setMockResponse(operation: string, response: MockAIResponse): void;
    /**
     * Get mock response for a specific operation
     */
    getMockResponse(operation: string): MockAIResponse | undefined;
    /**
     * Test connection
     */
    testConnection(): Promise<{
        success: boolean;
        latency?: number;
        error?: string;
    }>;
    /**
     * Generate stream (mock)
     */
    generateStream(requestId: string, request: any): AsyncGenerator<{
        text: string;
        isComplete: boolean;
        error?: string;
    }>;
    /**
     * Cancel generation
     */
    cancelGeneration(requestId: string): boolean;
}
/**
 * Create default mock AI service
 */
export declare function createMockAIService(): MockAIService;
/**
 * Default test configuration
 */
export declare const defaultTestConfig: AIConfiguration;
//# sourceMappingURL=aiServiceMock.d.ts.map