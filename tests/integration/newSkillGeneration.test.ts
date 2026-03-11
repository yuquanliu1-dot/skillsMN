/**
 * Integration Test: New Skill Generation
 *
 * Tests the complete flow for generating a new skill with AI
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import { validSkillContent, testPrompts, expectedOutputs } from '../fixtures/skillContent';

describe('New Skill Generation Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    mockAIService.cancelGeneration('test-request-id');
  });

  test('should generate valid skill content from new mode prompt', async () => {
    // Setup mock response
    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: validSkillContent,
      },
    });

    // Test generation
    const requestId = 'test-request-id';
    const request = {
      prompt: testPrompts.new,
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
    expect(fullContent).toContain('name:');
    expect(fullContent).toContain('description:');
    expect(expectedOutputs.new.hasName).toBe(true);
    expect(expectedOutputs.new.hasDescription).toBe(true);
    expect(expectedOutputs.new.hasMarkdownContent).toBe(true);
    expect(expectedOutputs.new.isValidYAML).toBe(true);
  });

  test('should handle streaming chunks correctly', async () => {
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
      prompt: testPrompts.new,
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

    expect(receivedChunks).toBeGreaterThan(0);
    expect(lastChunk).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: false,
      error: {
        code: 'AI_ERROR',
        message: 'API rate limit exceeded',
      },
    });

    const requestId = 'test-error';
    const request = {
      prompt: testPrompts.new,
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

    expect(hasError).toBe(true);
    expect(errorMessage).toContain('API rate limit exceeded');
  });

  test('should validate generated content', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: validSkillContent,
      },
    });

    const requestId = 'test-validation';
    const request = {
      prompt: testPrompts.new,
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
    expect(yamlMatch).not.toBeNull();

    // Validate required fields
    expect(content).toMatch(/name:\s+.+/);
    expect(content).toMatch(/description:\s+.+/);
  });
});
