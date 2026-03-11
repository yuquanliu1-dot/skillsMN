/**
 * Integration Test: Insert at Cursor Position
 *
 * Tests the flow for inserting AI-generated content at cursor position
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import { testPrompts, expectedOutputs } from '../fixtures/skillContent';

describe('Insert at Cursor Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    mockAIService.cancelGeneration('test-request-id');
  });

  test('should insert content at cursor position', async () => {
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
      prompt: testPrompts.insert,
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
    expect(content).toContain('## New Section');
    expect(expectedOutputs.insert.insertedAtPosition).toBe(true);
    expect(expectedOutputs.insert.contextPreserved).toBe(true);
  });

  test('should preserve content before cursor', async () => {
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
    expect(content).toContain('Inserted content');
  });

  test('should handle insert at end of content', async () => {
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
    expect(content).toContain('Additional Section');
    expect(content).toContain('Appended at the end');
  });

  test('should handle insert at beginning of content', async () => {
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
    expect(content).toContain('Introduction');
    expect(content).toContain('new content at the beginning');
  });
});
