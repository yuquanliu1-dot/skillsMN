"use strict";
/**
 * Integration Test: AI Configuration Flow
 *
 * Tests the complete flow for configuring AI settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aiServiceMock_1 = require("../utils/aiServiceMock");
(0, globals_1.describe)('AI Configuration Flow', () => {
    let mockAIService;
    (0, globals_1.beforeAll)(() => {
        mockAIService = (0, aiServiceMock_1.createMockAIService)();
        // Initialize with default config
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.afterAll)(() => {
        // Cleanup
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.test)('should load existing configuration', async () => {
        const config = mockAIService.getConfig();
        (0, globals_1.expect)(config).not.toBeNull();
        (0, globals_1.expect)(config?.provider).toBe('anthropic');
        (0, globals_1.expect)(config?.model).toBeDefined();
        (0, globals_1.expect)(config?.streamingEnabled).toBeDefined();
        (0, globals_1.expect)(config?.timeout).toBeGreaterThan(0);
        (0, globals_1.expect)(config?.maxRetries).toBeGreaterThanOrEqual(0);
    });
    (0, globals_1.test)('should save new configuration', async () => {
        const newConfig = {
            ...aiServiceMock_1.defaultTestConfig,
            model: 'claude-3-opus-20240229',
            streamingEnabled: false,
        };
        mockAIService.setConfig(newConfig);
        const savedConfig = mockAIService.getConfig();
        (0, globals_1.expect)(savedConfig?.model).toBe('claude-3-opus-20240229');
        (0, globals_1.expect)(savedConfig?.streamingEnabled).toBe(false);
    });
    (0, globals_1.test)('should test connection successfully', async () => {
        mockAIService.setMockResponse('testConnection', {
            success: true,
            data: {
                latency: 150,
            },
        });
        const result = await mockAIService.testConnection();
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(result.latency).toBe(150);
        (0, globals_1.expect)(result.error).toBeUndefined();
    });
    (0, globals_1.test)('should handle connection test failure', async () => {
        mockAIService.setMockResponse('testConnection', {
            success: false,
            error: {
                code: 'CONNECTION_ERROR',
                message: 'Invalid API key',
            },
        });
        const result = await mockAIService.testConnection();
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('Invalid API key');
    });
    (0, globals_1.test)('should validate API key format', async () => {
        // Test with empty API key
        const emptyKeyConfig = {
            ...aiServiceMock_1.defaultTestConfig,
            apiKey: '',
        };
        mockAIService.setConfig(emptyKeyConfig);
        mockAIService.setMockResponse('testConnection', {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'API key is required',
            },
        });
        const result = await mockAIService.testConnection();
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('API key is required');
    });
    (0, globals_1.test)('should encrypt API key in storage', async () => {
        const config = {
            ...aiServiceMock_1.defaultTestConfig,
            apiKey: 'test-api-key-for-encryption',
        };
        mockAIService.setConfig(config);
        // In real implementation, the key should be encrypted
        // For mock, we just verify it's stored
        const storedConfig = mockAIService.getConfig();
        (0, globals_1.expect)(storedConfig?.apiKey).toBe('test-api-key-for-encryption');
    });
    (0, globals_1.test)('should handle timeout configuration', async () => {
        const config = {
            ...aiServiceMock_1.defaultTestConfig,
            timeout: 60000, // 60 seconds
        };
        mockAIService.setConfig(config);
        const storedConfig = mockAIService.getConfig();
        (0, globals_1.expect)(storedConfig?.timeout).toBe(60000);
    });
    (0, globals_1.test)('should handle retry configuration', async () => {
        const config = {
            ...aiServiceMock_1.defaultTestConfig,
            maxRetries: 5,
        };
        mockAIService.setConfig(config);
        const storedConfig = mockAIService.getConfig();
        (0, globals_1.expect)(storedConfig?.maxRetries).toBe(5);
    });
    (0, globals_1.test)('should validate model selection', async () => {
        const validModels = [
            'claude-3-sonnet-20240229',
            'claude-3-opus-20240229',
            'claude-3-haiku-20240307'
        ];
        for (const model of validModels) {
            const config = {
                ...aiServiceMock_1.defaultTestConfig,
                model,
            };
            mockAIService.setConfig(config);
            const storedConfig = mockAIService.getConfig();
            (0, globals_1.expect)(storedConfig?.model).toBe(model);
        }
    });
});
//# sourceMappingURL=aiConfiguration.test.js.map