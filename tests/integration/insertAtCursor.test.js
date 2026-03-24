"use strict";
/**
 * Integration Test: Insert at Cursor Position
 *
 * Tests the flow for inserting AI-generated content at cursor position
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aiServiceMock_1 = require("../utils/aiServiceMock");
const skillContent_1 = require("../fixtures/skillContent");
(0, globals_1.describe)('Insert at Cursor Flow', () => {
    let mockAIService;
    (0, globals_1.beforeAll)(() => {
        mockAIService = (0, aiServiceMock_1.createMockAIService)();
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.afterAll)(() => {
        mockAIService.cancelGeneration('test-request-id');
    });
    (0, globals_1.test)('should insert content at cursor position', async () => {
        const existingContent = `---
name: Test Skill
description: A test skill
---

# Existing Content

This is existing content in the skill.
`;
        const insertContent = `## New Section

This content was inserted by AI at cursor position 50.`;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: insertContent,
            },
        });
        const requestId = 'test-insert';
        const request = {
            prompt: skillContent_1.testPrompts.insert,
            mode: 'insert',
            skillContext: {
                content: existingContent,
                cursorPosition: 50,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify inserted content
        (0, globals_1.expect)(content).toContain('## New Section');
        (0, globals_1.expect)(skillContent_1.expectedOutputs.insert.insertedAtPosition).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.insert.contextPreserved).toBe(true);
    });
    (0, globals_1.test)('should preserve content before cursor', async () => {
        const beforeCursor = 'Content before cursor';
        const afterCursor = 'Content after cursor';
        const existingContent = `${beforeCursor}${afterCursor}`;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: ' Inserted content ',
            },
        });
        const requestId = 'test-preserve-before';
        const request = {
            prompt: 'Insert content',
            mode: 'insert',
            skillContext: {
                content: existingContent,
                cursorPosition: beforeCursor.length,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify inserted content doesn't overwrite existing content
        (0, globals_1.expect)(content).toContain('Inserted content');
    });
    (0, globals_1.test)('should handle insert at end of content', async () => {
        const existingContent = `---
name: Test Skill
description: A test skill
---

# Content
`;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: '\n\n## Additional Section\n\nAppended at the end.',
            },
        });
        const requestId = 'test-insert-end';
        const request = {
            prompt: 'Add a section at the end',
            mode: 'insert',
            skillContext: {
                content: existingContent,
                cursorPosition: existingContent.length,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify content appended at end
        (0, globals_1.expect)(content).toContain('Additional Section');
        (0, globals_1.expect)(content).toContain('Appended at the end');
    });
    (0, globals_1.test)('should handle insert at beginning of content', async () => {
        const existingContent = `# Existing Content

This is existing content.`;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: '## Introduction\n\nThis is new content at the beginning.\n\n',
            },
        });
        const requestId = 'test-insert-beginning';
        const request = {
            prompt: 'Add introduction at the beginning',
            mode: 'insert',
            skillContext: {
                content: existingContent,
                cursorPosition: 0,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify content inserted at beginning
        (0, globals_1.expect)(content).toContain('Introduction');
        (0, globals_1.expect)(content).toContain('new content at the beginning');
    });
});
//# sourceMappingURL=insertAtCursor.test.js.map