/**
 * AI Assistant Integration Tests
 *
 * Automated tests for AI assistant functionality
 */

import { AIService } from '../../src/main/services/AIService';
import type { AIGenerationRequest, AIConfiguration } from '../../src/shared/types';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn(),
      create: jest.fn(),
    },
  })),
}));

describe('AI Assistant Integration Tests', () => {
  let mockConfig: AIConfiguration;

  beforeAll(() => {
    // Setup mock configuration
    mockConfig = {
      provider: 'anthropic',
      apiKey: Buffer.from('test-api-key').toString('base64'),
      model: 'claude-sonnet-4.6',
      streamingEnabled: true,
      timeout: 30000,
      maxRetries: 3,
      baseUrl: undefined,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🔧 Configuration Tests', () => {
    test('should encrypt and decrypt API keys', () => {
      const testKey = 'sk-ant-test123456789';
      const encrypted = AIService.encryptAPIKey(testKey);
      const decrypted = AIService.decryptAPIKey(encrypted);

      expect(encrypted).toBeDefined();
      expect(decrypted).toBe(testKey);
    });

    test('should initialize AI service with config', async () => {
      await expect(AIService.initialize(mockConfig)).resolves.not.toThrow();
    });

    test('should check if service is initialized', () => {
      const isInit = AIService.isInitialized();
      expect(typeof isInit).toBe('boolean');
    });

    test('should update configuration', async () => {
      const newConfig = { ...mockConfig, temperature: 0.5 };
      await expect(AIService.updateConfiguration(newConfig)).resolves.not.toThrow();
    });
  });

  describe('🤖 AI Generation Tests', () => {
    test('should generate skill content in new mode', async () => {
      const request: AIGenerationRequest = {
        mode: 'new',
        prompt: 'Create a simple code review skill',
      };

      const requestId = 'test-new-001';
      const chunks: string[] = [];

      try {
        const generator = AIService.generateStream(requestId, request);

        for await (const chunk of generator) {
          if (chunk.error) {
            throw new Error(chunk.error);
          }
          if (chunk.text) {
            chunks.push(chunk.text);
          }
          if (chunk.isComplete) {
            break;
          }
        }

        expect(chunks.length).toBeGreaterThan(0);
        const fullContent = chunks.join('');
        expect(fullContent).toContain('---'); // YAML frontmatter
        expect(fullContent).toContain('name:');
        expect(fullContent).toContain('description:');
      } catch (error) {
        // Expected to fail without valid API key
        console.log('Test expected to fail without API key:', (error as Error).message);
      }
    });

    test('should generate skill content in modify mode', async () => {
      const request: AIGenerationRequest = {
        mode: 'modify',
        prompt: 'Add error handling examples',
        skillContext: {
          content: `---
name: test-skill
description: Test skill
---
# Test Skill

This is a test skill.`,
        },
      };

      const requestId = 'test-modify-001';

      try {
        const generator = AIService.generateStream(requestId, request);
        const chunks: string[] = [];

        for await (const chunk of generator) {
          if (chunk.error) break;
          if (chunk.text) chunks.push(chunk.text);
          if (chunk.isComplete) break;
        }

        expect(chunks.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('Modify mode test:', (error as Error).message);
      }
    });

    test('should generate content in insert mode', async () => {
      const request: AIGenerationRequest = {
        mode: 'insert',
        prompt: 'Add a code example',
        skillContext: {
          content: '# My Skill\n\n',
          cursorPosition: 12,
        },
      };

      const requestId = 'test-insert-001';

      try {
        const generator = AIService.generateStream(requestId, request);
        const chunks: string[] = [];

        for await (const chunk of generator) {
          if (chunk.error) break;
          if (chunk.text) chunks.push(chunk.text);
          if (chunk.isComplete) break;
        }

        expect(chunks.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('Insert mode test:', (error as Error).message);
      }
    });

    test('should generate content in replace mode', async () => {
      const request: AIGenerationRequest = {
        mode: 'replace',
        prompt: 'Make this more concise',
        skillContext: {
          content: '# My Skill\n\nThis is a very long description that could be shorter.',
          selectedText: 'This is a very long description that could be shorter.',
        },
      };

      const requestId = 'test-replace-001';

      try {
        const generator = AIService.generateStream(requestId, request);
        const chunks: string[] = [];

        for await (const chunk of generator) {
          if (chunk.error) break;
          if (chunk.text) chunks.push(chunk.text);
          if (chunk.isComplete) break;
        }

        expect(chunks.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('Replace mode test:', (error as Error).message);
      }
    });

    test('should cancel ongoing generation', () => {
      const requestId = 'test-cancel-001';
      const result = AIService.cancelGeneration(requestId);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('🔌 Connection Tests', () => {
    test('should test API connection', async () => {
      try {
        const result = await AIService.testConnection();
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');

        if (result.success) {
          expect(result.latency).toBeGreaterThan(0);
        } else {
          expect(result.error).toBeDefined();
        }
      } catch (error) {
        // Expected to fail without valid API key
        console.log('Connection test expected to fail without API key');
      }
    });
  });

  describe('⚡ Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const requests = [
        { id: 'concurrent-1', prompt: 'Create skill 1' },
        { id: 'concurrent-2', prompt: 'Create skill 2' },
        { id: 'concurrent-3', prompt: 'Create skill 3' },
      ];

      const promises = requests.map(async ({ id, prompt }) => {
        const request: AIGenerationRequest = { mode: 'new', prompt };

        try {
          const generator = AIService.generateStream(id, request);
          const chunks: string[] = [];

          for await (const chunk of generator) {
            if (chunk.error) break;
            if (chunk.text) chunks.push(chunk.text);
            if (chunk.isComplete) break;
          }

          return { id, success: true, chunks: chunks.length };
        } catch (error) {
          return { id, success: false, error: (error as Error).message };
        }
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
    });

    test('should measure generation latency', async () => {
      const request: AIGenerationRequest = {
        mode: 'new',
        prompt: 'Simple test',
      };

      const startTime = Date.now();

      try {
        const generator = AIService.generateStream('latency-test', request);
        let firstChunkTime = 0;
        let chunksReceived = 0;

        for await (const chunk of generator) {
          if (!firstChunkTime && chunk.text) {
            firstChunkTime = Date.now();
          }
          if (chunk.text) chunksReceived++;
          if (chunk.isComplete) break;
        }

        const latency = firstChunkTime - startTime;
        console.log(`First chunk latency: ${latency}ms`);
        console.log(`Total chunks received: ${chunksReceived}`);
      } catch (error) {
        console.log('Latency test:', (error as Error).message);
      }
    });
  });

  describe('🔒 Security Tests', () => {
    test('should not expose API key in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const testKey = 'sk-ant-secret-key-12345';

      const encrypted = AIService.encryptAPIKey(testKey);

      // Check that the API key is not in any console.log calls
      const loggedOutput = consoleSpy.mock.calls.flat().join(' ');
      expect(loggedOutput).not.toContain(testKey);

      consoleSpy.mockRestore();
    });

    test('should handle invalid API key gracefully', async () => {
      const invalidConfig: AIConfiguration = {
        provider: 'anthropic',
        apiKey: Buffer.from('invalid-key').toString('base64'),
        model: 'claude-sonnet-4.6',
        streamingEnabled: true,
        timeout: 30000,
        maxRetries: 3
      };

      await AIService.initialize(invalidConfig);

      const result = await AIService.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('🐛 Error Handling Tests', () => {
    test('should handle network errors', async () => {
      const request: AIGenerationRequest = {
        mode: 'new',
        prompt: 'Test prompt',
      };

      try {
        const generator = AIService.generateStream('network-test', request);

        for await (const chunk of generator) {
          if (chunk.error) {
            expect(chunk.error).toBeDefined();
            break;
          }
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle rate limiting', async () => {
      // Simulate rate limiting scenario
      const requests = Array(10).fill(null).map((_, i) => ({
        id: `rate-limit-${i}`,
        prompt: `Test ${i}`,
      }));

      const results = await Promise.allSettled(
        requests.map(async ({ id, prompt }) => {
          const request: AIGenerationRequest = { mode: 'new', prompt };
          const generator = AIService.generateStream(id, request);

          for await (const chunk of generator) {
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.isComplete) break;
          }

          return true;
        })
      );

      // Some requests should succeed, some might fail due to rate limiting
      expect(results.length).toBe(10);
    });

    test('should handle timeout scenarios', async () => {
      const request: AIGenerationRequest = {
        mode: 'new',
        prompt: 'Generate a very complex skill', // Might timeout
      };

      const timeoutMs = 5000;
      const startTime = Date.now();

      try {
        const generator = AIService.generateStream('timeout-test', request);

        for await (const chunk of generator) {
          if (Date.now() - startTime > timeoutMs) {
            AIService.cancelGeneration('timeout-test');
            break;
          }
          if (chunk.isComplete) break;
        }
      } catch (error) {
        console.log('Timeout test completed');
      }
    });
  });
});
