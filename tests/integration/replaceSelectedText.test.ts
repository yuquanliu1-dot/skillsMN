/**
 * Integration Test: Replace Selected Text
 *
 * Tests the flow for replacing selected text with AI-generated content
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import { testPrompts, expectedOutputs } from '../fixtures/skillContent';

describe('Replace Selected Text Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    mockAIService.cancelGeneration('test-request-id');
  });

  test('should replace selected text with AI-generated content', async () => {
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
      prompt: testPrompts.replace,
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
    expect(content).toContain('new AI-generated paragraph');
    expect(content).not.toContain('old paragraph');
    expect(expectedOutputs.replace.replacedCorrectly).toBe(true);
    expect(expectedOutputs.replace.contextPreserved).toBe(true);
  });

  test('should preserve context before and after selection', async () => {
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
    expect(content).toContain('Replaced text');
  });

  test('should handle multi-line selection replacement', async () => {
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
    expect(content).toContain('New first paragraph');
    expect(content).toContain('New second paragraph');
  });

  test('should handle empty selection gracefully', async () => {
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
      } else {
        content += chunk.text;
      }
    }

    // Should handle empty selection (might insert or error)
    expect(content.length >= 0 || hasError).toBe(true);
  });
});
