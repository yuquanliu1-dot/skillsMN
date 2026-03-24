"use strict";
/**
 * Integration Test: New Skill Generation
 *
 * Tests the complete flow for generating a new skill with AI
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aiServiceMock_1 = require("../utils/aiServiceMock");
const skillContent_1 = require("../fixtures/skillContent");
(0, globals_1.describe)('New Skill Generation Flow', () => {
    let mockAIService;
    (0, globals_1.beforeAll)(() => {
        mockAIService = (0, aiServiceMock_1.createMockAIService)();
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.afterAll)(() => {
        mockAIService.cancelGeneration('test-request-id');
    });
    (0, globals_1.test)('should generate valid skill content from new mode prompt', async () => {
        // Setup mock response
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: skillContent_1.validSkillContent,
            },
        });
        // Test generation
        const requestId = 'test-request-id';
        const request = {
            prompt: skillContent_1.testPrompts.new,
            mode: 'new',
            skillContext: {},
        };
        let fullContent = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                fullContent += chunk.text;
            }
        }
        // Verify output
        (0, globals_1.expect)(fullContent).toContain('name:');
        (0, globals_1.expect)(fullContent).toContain('description:');
        (0, globals_1.expect)(skillContent_1.expectedOutputs.new.hasName).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.new.hasDescription).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.new.hasMarkdownContent).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.new.isValidYAML).toBe(true);
    });
    (0, globals_1.test)('should handle streaming chunks correctly', async () => {
        const chunks = [
            '---\nname: Test',
            '\ndescription: Test description\n---',
            '\n\n# Content',
        ];
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: chunks.join('\n\n'),
            },
        });
        const requestId = 'test-streaming';
        const request = {
            prompt: skillContent_1.testPrompts.new,
            mode: 'new',
            skillContext: {},
        };
        let receivedChunks = 0;
        let lastChunk = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error && !chunk.isComplete) {
                receivedChunks++;
                lastChunk = chunk.text;
            }
        }
        (0, globals_1.expect)(receivedChunks).toBeGreaterThan(0);
        (0, globals_1.expect)(lastChunk).toBeDefined();
    });
    (0, globals_1.test)('should handle errors gracefully', async () => {
        mockAIService.setMockResponse('generateStream', {
            success: false,
            error: {
                code: 'AI_ERROR',
                message: 'API rate limit exceeded',
            },
        });
        const requestId = 'test-error';
        const request = {
            prompt: skillContent_1.testPrompts.new,
            mode: 'new',
            skillContext: {},
        };
        let hasError = false;
        let errorMessage = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (chunk.error) {
                hasError = true;
                errorMessage = chunk.error;
            }
        }
        (0, globals_1.expect)(hasError).toBe(true);
        (0, globals_1.expect)(errorMessage).toContain('API rate limit exceeded');
    });
    (0, globals_1.test)('should validate generated content', async () => {
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: skillContent_1.validSkillContent,
            },
        });
        const requestId = 'test-validation';
        const request = {
            prompt: skillContent_1.testPrompts.new,
            mode: 'new',
            skillContext: {},
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Validate YAML structure
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        (0, globals_1.expect)(yamlMatch).not.toBeNull();
        // Validate required fields
        (0, globals_1.expect)(content).toMatch(/name:\s+.+/);
        (0, globals_1.expect)(content).toMatch(/description:\s+.+/);
    });
});
//# sourceMappingURL=newSkillGeneration.test.js.map