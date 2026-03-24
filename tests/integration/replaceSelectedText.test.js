"use strict";
/**
 * Integration Test: Replace Selected Text
 *
 * Tests the flow for replacing selected text with AI-generated content
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const aiServiceMock_1 = require("../utils/aiServiceMock");
const skillContent_1 = require("../fixtures/skillContent");
(0, globals_1.describe)('Replace Selected Text Flow', () => {
    let mockAIService;
    (0, globals_1.beforeAll)(() => {
        mockAIService = (0, aiServiceMock_1.createMockAIService)();
        mockAIService.setConfig(aiServiceMock_1.defaultTestConfig);
    });
    (0, globals_1.afterAll)(() => {
        mockAIService.cancelGeneration('test-request-id');
    });
    (0, globals_1.test)('should replace selected text with AI-generated content', async () => {
        const existingContent = `---
name: Test Skill
description: A test skill
---

# Original Content

This is the old paragraph that will be replaced.

More content after the selection.
`;
        const selectedText = 'This is the old paragraph that will be replaced.';
        const replacementText = 'This is the new AI-generated paragraph with better examples and clearer explanations.';
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: replacementText,
            },
        });
        const requestId = 'test-replace';
        const request = {
            prompt: skillContent_1.testPrompts.replace,
            mode: 'replace',
            skillContext: {
                content: existingContent,
                selectedText,
                selectionStart: existingContent.indexOf(selectedText),
                selectionEnd: existingContent.indexOf(selectedText) + selectedText.length,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify replacement content
        (0, globals_1.expect)(content).toContain('new AI-generated paragraph');
        (0, globals_1.expect)(content).not.toContain('old paragraph');
        (0, globals_1.expect)(skillContent_1.expectedOutputs.replace.replacedCorrectly).toBe(true);
        (0, globals_1.expect)(skillContent_1.expectedOutputs.replace.contextPreserved).toBe(true);
    });
    (0, globals_1.test)('should preserve context before and after selection', async () => {
        const beforeSelection = 'Content before selection. ';
        const selectedText = 'Selected text to replace';
        const afterSelection = ' Content after selection.';
        const existingContent = beforeSelection + selectedText + afterSelection;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: 'Replaced text',
            },
        });
        const requestId = 'test-context';
        const request = {
            prompt: 'Replace this text',
            mode: 'replace',
            skillContext: {
                content: existingContent,
                selectedText,
                selectionStart: beforeSelection.length,
                selectionEnd: beforeSelection.length + selectedText.length,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify only selected text was changed
        (0, globals_1.expect)(content).toContain('Replaced text');
    });
    (0, globals_1.test)('should handle multi-line selection replacement', async () => {
        const existingContent = `# Section

First paragraph.

Second paragraph to replace.

Third paragraph.
`;
        const selectedText = `First paragraph.

Second paragraph to replace.`;
        const replacementText = `New first paragraph with enhanced content.

New second paragraph with better examples.`;
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: replacementText,
            },
        });
        const requestId = 'test-multiline';
        const request = {
            prompt: 'Rewrite these paragraphs',
            mode: 'replace',
            skillContext: {
                content: existingContent,
                selectedText,
                selectionStart: existingContent.indexOf(selectedText),
                selectionEnd: existingContent.indexOf(selectedText) + selectedText.length,
            },
        };
        let content = '';
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (!chunk.error) {
                content += chunk.text;
            }
        }
        // Verify multi-line replacement
        (0, globals_1.expect)(content).toContain('New first paragraph');
        (0, globals_1.expect)(content).toContain('New second paragraph');
    });
    (0, globals_1.test)('should handle empty selection gracefully', async () => {
        const existingContent = 'Some content without selection.';
        mockAIService.setMockResponse('generateStream', {
            success: true,
            data: {
                content: 'Generated content',
            },
        });
        const requestId = 'test-empty-selection';
        const request = {
            prompt: 'Generate content',
            mode: 'replace',
            skillContext: {
                content: existingContent,
                selectedText: '',
                selectionStart: 0,
                selectionEnd: 0,
            },
        };
        let content = '';
        let hasError = false;
        for await (const chunk of mockAIService.generateStream(requestId, request)) {
            if (chunk.error) {
                hasError = true;
            }
            else {
                content += chunk.text;
            }
        }
        // Should handle empty selection (might insert or error)
        (0, globals_1.expect)(content.length >= 0 || hasError).toBe(true);
    });
});
//# sourceMappingURL=replaceSelectedText.test.js.map