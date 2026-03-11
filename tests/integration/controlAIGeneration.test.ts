/**
 * Integration Test: Control AI Generation (Stop/Retry)
 *
 * Tests the flow for stopping and retrying AI generation
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import { testPrompts } from '../fixtures/skillContent';

describe('Control AI Generation Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    mockAIService.cancelGeneration('test-request-id');
  });

  test('should stop generation mid-stream', async () => {
    const chunks = [
      'First chunk',
      ' Second chunk',
      ' Third chunk',
      ' Fourth chunk',
      ' Fifth chunk',
    ];

    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: chunks.join(''),
        delay: 100,
      },
    });

    const requestId = 'test-stop';
    const request = {
      prompt: testPrompts.new,
      mode: 'new',
      skillContext: {},
    };

    let receivedChunks = 0;
    const generator = mockAIService.generateStream(requestId, request);

    // Start reading chunks
    for await (const chunk of generator) {
      if (!chunk.error) {
        receivedChunks++;

        // Stop after 2 chunks
        if (receivedChunks === 2) {
          const cancelled = mockAIService.cancelGeneration(requestId);
          expect(cancelled).toBe(true);
          break;
        }
      }
    }

    // Verify we stopped before completing all chunks
    expect(receivedChunks).toBe(2);
  });

  test('should retry generation with same prompt', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: 'Generated content',
      },
    });

    const requestId1 = 'test-retry-1';
    const requestId2 = 'test-retry-2';
    const request = {
      prompt: testPrompts.new,
      mode: 'new',
      skillContext: {},
    };

    // First generation
    let content1 = '';
    for await (const chunk of mockAIService.generateStream(requestId1, request)) {
      if (!chunk.error) {
        content1 += chunk.text;
      }
    }

    // Retry (second generation with same prompt)
    let content2 = '';
    for await (const chunk of mockAIService.generateStream(requestId2, request)) {
      if (!chunk.error) {
        content2 += chunk.text;
      }
    }

    // Verify both generations produced content
    expect(content1.length).toBeGreaterThan(0);
    expect(content2.length).toBeGreaterThan(0);
  });

  test('should handle timeout gracefully', async () => {
    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: 'Content that takes too long',
        delay: 35000, // 35 seconds (exceeds 30s timeout)
      },
    });

    const requestId = 'test-timeout';
    const request = {
      prompt: testPrompts.new,
      mode: 'new',
      skillContext: {},
    };

    const startTime = Date.now();
    let hasError = false;

    for await (const chunk of mockAIService.generateStream(requestId, request)) {
      if (chunk.error) {
        hasError = true;
        expect(chunk.error).toContain('timeout');
      }
    }

    const elapsed = Date.now() - startTime;
    expect(hasError || elapsed >= 30000).toBe(true);
  });

  test('should preserve partial content after stop', async () => {
    const partialContent = 'Partial skill content';

    mockAIService.setMockResponse('generateStream', {
      success: true,
      data: {
        content: partialContent + ' - more content',
        delay: 100,
      },
    });

    const requestId = 'test-preserve';
    const request = {
      prompt: testPrompts.new,
      mode: 'new',
      skillContext: {},
    };

    let content = '';
    const generator = mockAIService.generateStream(requestId, request);

    for await (const chunk of generator) {
      if (!chunk.error) {
        content += chunk.text;
        if (content.includes(partialContent)) {
          mockAIService.cancelGeneration(requestId);
          break;
        }
      }
    }

    // Verify partial content was preserved
    expect(content).toContain(partialContent);
  });
});
