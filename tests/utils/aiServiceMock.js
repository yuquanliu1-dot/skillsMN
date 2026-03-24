"use strict";
/**
 * AI Service Mock Utilities
 *
 * Provides mock implementations for AI services in tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTestConfig = exports.MockAIService = void 0;
exports.createMockAIService = createMockAIService;
/**
 * Mock AI Service
 */
class MockAIService {
    constructor() {
        this.mockResponses = new Map();
    }
    /**
     * Set mock configuration
     */
    setConfig(config) {
        this.config = config;
    }
    /**
     * Get mock configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Set mock response for a specific operation
     */
    setMockResponse(operation, response) {
        this.mockResponses.set(operation, response);
    }
    /**
     * Get mock response for a specific operation
     */
    getMockResponse(operation) {
        return this.mockResponses.get(operation);
    }
    /**
     * Test connection
     */
    async testConnection() {
        const response = this.mockResponses.get('testConnection');
        if (response) {
            // If there's an error object, extract the message
            if (response.error) {
                return {
                    success: response.success,
                    error: response.error.message,
                };
            }
            // Otherwise return the response as-is (with data)
            return {
                success: response.success,
                latency: response.data?.latency,
            };
        }
        return { success: true, latency: 100 };
    }
    /**
     * Generate stream (mock)
     */
    async *generateStream(requestId, request) {
        const response = this.mockResponses.get('generateStream');
        if (response && !response.success) {
            yield { text: '', isComplete: false, error: response.error.message };
            return;
        }
        // Check for simulated timeout
        const delay = response?.data?.delay || 0;
        const timeout = response?.data?.timeout || 30000; // Default 30s timeout
        if (delay > timeout) {
            // Simulate timeout error
            yield { text: '', isComplete: false, error: 'Request timeout after ' + timeout + 'ms' };
            return;
        }
        // Mock streaming response
        const content = response?.data?.content || 'Mock AI generated content';
        const chunks = content.split('\n\n');
        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 50));
            yield { text: chunk + '\n\n', isComplete: false };
        }
        yield { text: '', isComplete: true };
    }
    /**
     * Cancel generation
     */
    cancelGeneration(requestId) {
        return true;
    }
}
exports.MockAIService = MockAIService;
/**
 * Create default mock AI service
 */
function createMockAIService() {
    return new MockAIService();
}
/**
 * Default test configuration
 */
exports.defaultTestConfig = {
    provider: 'anthropic',
    apiKey: 'test-api-key-12345',
    model: 'claude-3-sonnet-20240229',
    streamingEnabled: true,
    timeout: 30000,
    maxRetries: 2,
};
//# sourceMappingURL=aiServiceMock.js.map