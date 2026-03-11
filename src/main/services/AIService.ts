/**
 * AI Service
 *
 * Handles AI-powered skill generation using Claude API with streaming support
 */

import Anthropic from '@anthropic-ai/sdk';
import { safeStorage } from 'electron';
import * as https from 'https';
import { logger } from '../utils/Logger';
import type { AIGenerationRequest, AIStreamChunk } from '../models/AIGenerationRequest';
import { validateAIGenerationRequest } from '../models/AIGenerationRequest';
import type { AIConfiguration } from '../../shared/types';

let anthropic: Anthropic | null = null;
let currentConfig: AIConfiguration | null = null;

/**
 * Active generation streams (for cancellation)
 */
const activeStreams = new Map<string, AbortController>();

/**
 * AI Service for skill generation
 */
export class AIService {
  /**
   * Encrypt API key using Electron safeStorage for secure storage
   * Falls back to base64 encoding if encryption is not available (not recommended for production)
   * @param apiKey - Plain text API key to encrypt
   * @returns Encrypted API key as base64 string
   * @example
   * const encrypted = AIService.encryptAPIKey('sk-ant-...');
   * // Store encrypted key in configuration
   */
  static encryptAPIKey(apiKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn('Encryption not available, storing API key in plaintext (NOT RECOMMENDED)');
      return Buffer.from(apiKey).toString('base64');
    }

    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }

  /**
   * Decrypt API key using Electron safeStorage
   * Decrypts a previously encrypted API key for use with the Anthropic SDK
   * @param encryptedKey - Encrypted API key as base64 string
   * @returns Decrypted plain text API key
   * @example
   * const config = await AIConfigService.loadConfig();
   * const decryptedKey = AIService.decryptAPIKey(config.apiKey);
   */
  static decryptAPIKey(encryptedKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn('Encryption not available, decrypting from base64');
      return Buffer.from(encryptedKey, 'base64').toString('utf-8');
    }

    const buffer = Buffer.from(encryptedKey, 'base64');
    return safeStorage.decryptString(buffer);
  }

  /**
   * Initialize AI service with configuration
   * Decrypts the API key and creates an Anthropic client instance
   * Must be called before using generateStream or testConnection
   * @param config - AI configuration containing encrypted API key and settings
   * @throws Error if API key decryption fails or initialization fails
   * @example
   * const config = await AIConfigService.loadConfig();
   * await AIService.initialize(config);
   */
  static async initialize(config: AIConfiguration): Promise<void> {
    try {
      const apiKey = AIService.decryptAPIKey(config.apiKey);
      currentConfig = config; // Store config for custom endpoint handling

      // Build client options
      const options: any = { apiKey };

      // Add custom base URL if provided
      if (config.baseUrl) {
        options.baseURL = config.baseUrl;
        logger.info('Using custom base URL, will use direct HTTP requests for compatibility', 'AIService');
      }

      anthropic = new Anthropic(options);
      logger.info('AI service initialized successfully', 'AIService', {
        hasCustomBaseUrl: !!config.baseUrl
      });
    } catch (error) {
      logger.error('Failed to initialize AI service', 'AIService', error);
      throw new Error('Failed to initialize AI service. Please check your API key.');
    }
  }

  /**
   * Update AI service configuration
   * Re-initializes the service with new configuration
   * @param config - New AI configuration to apply
   * @throws Error if initialization fails
   * @example
   * await AIService.updateConfiguration(newConfig);
   */
  static async updateConfiguration(config: AIConfiguration): Promise<void> {
    await AIService.initialize(config);
  }

  /**
   * Check if AI service is initialized and ready to use
   * @returns True if Anthropic client is initialized, false otherwise
   * @example
   * if (!AIService.isInitialized()) {
   *   await AIService.initialize(config);
   * }
   */
  static isInitialized(): boolean {
    return anthropic !== null;
  }

  /**
   * Generate skill content with streaming support
   * Creates an async generator that yields chunks of generated text
   * Supports new skill creation, modification, insertion, and replacement modes
   * @param requestId - Unique identifier for this generation request (used for cancellation)
   * @param request - AI generation request containing mode, prompt, and optional current content
   * @yields AIStreamChunk objects containing text chunks, completion status, and potential errors
   * @example
   * for await (const chunk of AIService.generateStream('req-1', {
   *   mode: 'new',
   *   prompt: 'Create a skill for code review'
   * })) {
   *   if (chunk.error) {
   *     console.error(chunk.error);
   *     break;
   *   }
   *   process.stdout.write(chunk.text);
   * }
   */
  static async *generateStream(
    requestId: string,
    request: AIGenerationRequest
  ): AsyncGenerator<AIStreamChunk> {
    // Validate request
    const validationError = validateAIGenerationRequest(request);
    if (validationError) {
      yield { text: '', isComplete: false, error: validationError };
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    activeStreams.set(requestId, abortController);

    try {
      logger.info('Starting AI generation', 'AIService', { mode: request.mode, requestId });

      // Build the system prompt based on generation mode
      const systemPrompt = AIService.buildSystemPrompt(request.mode);
      
      // Build the user prompt
      const userPrompt = AIService.buildUserPrompt(request);

      // Create streaming message
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      let fullText = '';

      // Process stream events
      for await (const event of stream) {
        // Check if cancelled
        if (abortController.signal.aborted) {
          logger.info('AI generation cancelled', 'AIService', { requestId });
          yield { text: fullText, isComplete: false, error: 'Generation cancelled' };
          return;
        }

        // Handle text delta events
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const chunk = event.delta.text;
          fullText += chunk;

          // Yield chunk for streaming to UI (every 200ms)
          yield { text: chunk, isComplete: false };
        }
      }

      // Generation complete
      logger.info('AI generation complete', 'AIService', {
        requestId,
        length: fullText.length,
      });

      yield { text: '', isComplete: true };
    } catch (error) {
      logger.error('AI generation failed', 'AIService', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      yield { text: '', isComplete: false, error: errorMessage };
    } finally {
      activeStreams.delete(requestId);
    }
  }

  /**
   * Cancel an active AI generation stream
   * Aborts the ongoing generation request and cleans up resources
   * @param requestId - ID of the generation request to cancel
   * @returns True if cancellation was successful, false if request not found
   * @example
   * // Start generation
   * const generator = AIService.generateStream('req-1', request);
   *
   * // Later, cancel it
   * AIService.cancelGeneration('req-1');
   */
  static cancelGeneration(requestId: string): boolean {
    const controller = activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      activeStreams.delete(requestId);
      logger.info('AI generation cancelled by user', 'AIService', { requestId });
      return true;
    }
    return false;
  }

  /**
   * Make a direct HTTP request to a custom endpoint
   * Used for third-party Anthropic-compatible APIs that need special handling
   * @private
   */
  private static async makeDirectRequest(
    endpoint: string,
    requestBody: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!currentConfig) {
        reject(new Error('AI service not initialized'));
        return;
      }

      const apiKey = AIService.decryptAPIKey(currentConfig.apiKey);
      const url = new URL(currentConfig.baseUrl!);
      const path = `${url.pathname}${endpoint}`;

      const requestData = JSON.stringify(requestBody);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              const error = JSON.parse(data);
              reject(new Error(`${res.statusCode} ${JSON.stringify(error)}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(requestData);
      req.end();
    });
  }

  /**
   * Test AI connection by making a simple API request
   * Verifies that the API key is valid and the service is accessible
   * @returns Object with success status, optional error message, and latency in milliseconds
   * @example
   * const result = await AIService.testConnection();
   * if (result.success) {
   *   console.log(`Connection OK (${result.latency}ms)`);
   * } else {
   *   console.error(`Connection failed: ${result.error}`);
   * }
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      logger.info('Testing AI connection', 'AIService');

      const startTime = Date.now();

      // Use direct HTTP request for custom endpoints
      if (currentConfig?.baseUrl) {
        await AIService.makeDirectRequest('/v1/messages', {
          model: currentConfig.model || 'glm-5',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Say "OK" if you can read this.',
            },
          ],
        });
      } else {
        // Use SDK for standard Anthropic API
        await anthropic!.messages.create({
          model: 'claude-sonnet-4-6-20250514',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Say "OK" if you can read this.',
            },
          ],
        });
      }

      const latency = Date.now() - startTime;

      logger.info('AI connection test successful', 'AIService');
      return { success: true, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI connection test failed', 'AIService', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build system prompt based on generation mode
   */
  private static buildSystemPrompt(mode: AIGenerationRequest['mode']): string {
    const basePrompt = `You are an expert skill creator for Claude Code, a desktop application that helps developers manage Claude Code skills. A skill is a YAML + Markdown file that extends Claude's capabilities with specialized knowledge.

Skills follow this format:
---
name: Skill Name
description: Brief description of the skill
---

# Skill Content

Markdown content here with instructions, examples, and guidance.

Guidelines for skill generation:
- Use clear, concise language
- Include practical examples
- Provide step-by-step instructions when appropriate
- Use proper YAML syntax in frontmatter
- Follow Markdown best practices
- Make content actionable and specific`;

    switch (mode) {
      case 'new':
        return `${basePrompt}

You are generating a NEW skill from scratch based on the user's prompt. Create complete, production-ready skill content.`;

      case 'modify':
        return `${basePrompt}

You are MODIFYING existing skill content based on the user's instructions. Improve, expand, or refine the existing content while preserving its core purpose.`;

      case 'insert':
        return `${basePrompt}

You are INSERTING new content into existing skill content at a specified position. Generate content that fits naturally into the existing skill.`;

      case 'replace':
        return `${basePrompt}

You are REPLACING a selected portion of existing skill content with new content. Generate replacement content that maintains context and flow.`;

      default:
        return basePrompt;
    }
  }

  /**
   * Build user prompt based on request
   */
  private static buildUserPrompt(request: AIGenerationRequest): string {
    switch (request.mode) {
      case 'new':
        return `Create a new skill with the following requirements:\n\n${request.prompt}`;

      case 'modify':
        return `Modify the following skill content according to these instructions:\n\n${request.prompt}\n\nCurrent content:\n\n${request.currentContent}`;

      case 'insert':
        const insertPos = request.selectionStart ?? 0;
        return `Insert new content at position ${insertPos} in the following skill content.\n\nInstructions: ${request.prompt}\n\nCurrent content:\n\n${request.currentContent}`;

      case 'replace':
        const startPos = request.selectionStart ?? 0;
        const endPos = request.selectionEnd ?? startPos;
        const beforeSelection = request.currentContent?.substring(0, startPos) || '';
        const selectedText = request.currentContent?.substring(startPos, endPos) || '';
        const afterSelection = request.currentContent?.substring(endPos) || '';

        return `Replace the following selected text with new content:\n\nSelected text: "${selectedText}"\n\nInstructions: ${request.prompt}\n\nContext before selection:\n${beforeSelection}\n\nContext after selection:\n${afterSelection}\n\nGenerate ONLY the replacement text, not the entire content.`;

      default:
        return request.prompt;
    }
  }
}
