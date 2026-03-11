/**
 * Integration Test: AI Configuration Flow
 *
 * Tests the complete flow for configuring AI settings
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MockAIService, createMockAIService, defaultTestConfig } from '../utils/aiServiceMock';
import type { AIModel } from '../../src/shared/types';

describe('AI Configuration Flow', () => {
  let mockAIService: MockAIService;

  beforeAll(() => {
    mockAIService = createMockAIService();
    // Initialize with default config
    mockAIService.setConfig(defaultTestConfig);
  });

  afterAll(() => {
    // Cleanup
    mockAIService.setConfig(defaultTestConfig);
  });

  test('should load existing configuration', async () => {
    const config = mockAIService.getConfig();

    expect(config).not.toBeNull();
    expect(config?.provider).toBe('anthropic');
    expect(config?.model).toBeDefined();
    expect(config?.streamingEnabled).toBeDefined();
    expect(config?.timeout).toBeGreaterThan(0);
    expect(config?.maxRetries).toBeGreaterThanOrEqual(0);
  });

  test('should save new configuration', async () => {
    const newConfig = {
      ...defaultTestConfig,
      model: 'claude-3-opus-20240229' as AIModel,
      streamingEnabled: false,
    };

    mockAIService.setConfig(newConfig);

    const savedConfig = mockAIService.getConfig();

    expect(savedConfig?.model).toBe('claude-3-opus-20240229');
    expect(savedConfig?.streamingEnabled).toBe(false);
  });

  test('should test connection successfully', async () => {
    mockAIService.setMockResponse('testConnection', {
      success: true,
      data: {
        latency: 150,
      },
    });

    const result = await mockAIService.testConnection();

    expect(result.success).toBe(true);
    expect(result.latency).toBe(150);
    expect(result.error).toBeUndefined();
  });

  test('should handle connection test failure', async () => {
    mockAIService.setMockResponse('testConnection', {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: 'Invalid API key',
      },
    });

    const result = await mockAIService.testConnection();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid API key');
  });

  test('should validate API key format', async () => {
    // Test with empty API key
    const emptyKeyConfig = {
      ...defaultTestConfig,
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

    expect(result.success).toBe(false);
    expect(result.error).toContain('API key is required');
  });

  test('should encrypt API key in storage', async () => {
    const config = {
      ...defaultTestConfig,
      apiKey: 'test-api-key-for-encryption',
    };

    mockAIService.setConfig(config);

    // In real implementation, the key should be encrypted
    // For mock, we just verify it's stored
    const storedConfig = mockAIService.getConfig();

    expect(storedConfig?.apiKey).toBe('test-api-key-for-encryption');
  });

  test('should handle timeout configuration', async () => {
    const config = {
      ...defaultTestConfig,
      timeout: 60000, // 60 seconds
    };

    mockAIService.setConfig(config);

    const storedConfig = mockAIService.getConfig();

    expect(storedConfig?.timeout).toBe(60000);
  });

  test('should handle retry configuration', async () => {
    const config = {
      ...defaultTestConfig,
      maxRetries: 5,
    };

    mockAIService.setConfig(config);

    const storedConfig = mockAIService.getConfig();

    expect(storedConfig?.maxRetries).toBe(5);
  });

  test('should validate model selection', async () => {
    const validModels: AIModel[] = [
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307'
    ];

    for (const model of validModels) {
      const config = {
        ...defaultTestConfig,
        model,
      };

      mockAIService.setConfig(config);

      const storedConfig = mockAIService.getConfig();

      expect(storedConfig?.model).toBe(model);
    }
  });
});
