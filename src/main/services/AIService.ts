/**
 * AI Service (Using Claude Agent SDK)
 *
 * Handles AI-powered skill generation using Claude Agent SDK with skill-creator tool
 */

import { safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/Logger';
import type { AIGenerationRequest, AIStreamChunk } from '../models/AIGenerationRequest';
import { validateAIGenerationRequest } from '../models/AIGenerationRequest';
import type { AIConfiguration } from '../../shared/types';

// Dynamic imports for Claude Agent SDK (ES Module)
type ClaudeAgentSDK = {
  query: any;
  createSdkMcpServer: any;
  tool: any;
};

let sdkModule: ClaudeAgentSDK | null = null;

let currentConfig: AIConfiguration | null = null;

/**
 * Active generation streams (for cancellation)
 */
const activeStreams = new Map<string, AbortController>();

/**
 * Load Claude Agent SDK module dynamically
 */
async function loadSDK(): Promise<ClaudeAgentSDK> {
  if (!sdkModule) {
    // Dynamic import for ES Module
    const module = await import('@anthropic-ai/claude-agent-sdk');
    sdkModule = {
      query: module.query,
      createSdkMcpServer: module.createSdkMcpServer,
      tool: module.tool,
    };
  }
  return sdkModule;
}

/**
 * AI Service for skill generation using Claude Agent SDK
 */
export class AIService {
  /**
   * Encrypt API key using Electron safeStorage for secure storage
   * Falls back to base64 encoding if encryption is not available (not recommended for production)
   * @param apiKey - Plain text API key to encrypt
   * @returns Encrypted API key as base64 string
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
   * Decrypts a previously encrypted API key for use with the Agent SDK
   * @param encryptedKey - Encrypted API key as base64 string
   * @returns Decrypted plain text API key
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
   * Sets up the Claude Agent SDK with the provided configuration
   * @param config - AI configuration containing API key and settings
   * @throws Error if initialization fails
   */
  static async initialize(config: AIConfiguration): Promise<void> {
    try {
      // API key should already be decrypted
      currentConfig = config;

      // Set environment variables for Claude Agent SDK
      process.env.ANTHROPIC_API_KEY = config.apiKey;

      if (config.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = config.baseUrl;
        logger.info('Using custom base URL for Claude Agent SDK', 'AIService', {
          hasCustomBaseUrl: !!config.baseUrl
        });
      }

      logger.info('AI service initialized successfully with Claude Agent SDK', 'AIService');
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
   */
  static async updateConfiguration(config: AIConfiguration): Promise<void> {
    await AIService.initialize(config);
  }

  /**
   * Check if AI service is initialized and ready to use
   * @returns True if configuration is loaded, false otherwise
   */
  static isInitialized(): boolean {
    return currentConfig !== null;
  }

  /**
   * Load skill-creator skill content to include in system prompt
   * @private
   */
  private static async loadSkillCreatorContent(): Promise<string> {
    try {
      // Try to load from project skills first
      const projectSkillPath = path.join(process.cwd(), '.claude', 'skills', 'skill-creator', 'skill.md');
      if (fs.existsSync(projectSkillPath)) {
        const content = fs.readFileSync(projectSkillPath, 'utf-8');
        logger.debug('Loaded skill-creator from project directory', 'AIService');
        return content;
      }

      // Try global skills directory
      const globalSkillPath = path.join(require('os').homedir(), '.claude', 'skills', 'skill-creator', 'skill.md');
      if (fs.existsSync(globalSkillPath)) {
        const content = fs.readFileSync(globalSkillPath, 'utf-8');
        logger.debug('Loaded skill-creator from global directory', 'AIService');
        return content;
      }

      logger.warn('skill-creator skill not found, using default guidelines', 'AIService');
      return '';
    } catch (error) {
      logger.error('Failed to load skill-creator skill', 'AIService', error);
      return '';
    }
  }

  /**
   * Generate skill content with streaming support using Claude Agent SDK
   * Creates an async generator that yields chunks of generated text
   * @param requestId - Unique identifier for this generation request (used for cancellation)
   * @param request - AI generation request containing mode, prompt, and optional current content
   * @yields AIStreamChunk objects containing text chunks, completion status, and potential errors
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
      logger.info('Starting AI generation with Claude Agent SDK', 'AIService', { mode: request.mode, requestId });

      // Build the user prompt
      const userPrompt = AIService.buildUserPrompt(request);

      // Load skill-creator skill content
      const skillCreatorContent = await AIService.loadSkillCreatorContent();

      // Build system prompt with skill-creator knowledge
      const systemPrompt = AIService.buildSystemPrompt(request.mode, skillCreatorContent);

      // Load SDK and use query
      const { query } = await loadSDK();

      // Use Claude Agent SDK query (no tools needed - skill-creator is knowledge, not a tool)
      const stream = query({
        prompt: userPrompt,
        options: {
          systemPrompt,
          // Use configured model
          model: currentConfig?.model || 'claude-sonnet-4-6-20250514',
        },
      });

      let fullText = '';

      // Process stream events
      for await (const item of stream) {
        // Check if cancelled
        if (abortController.signal.aborted) {
          logger.info('AI generation cancelled', 'AIService', { requestId });
          yield { text: fullText, isComplete: false, error: 'Generation cancelled' };
          return;
        }

        // Handle different message types
        switch (item.type) {
          case 'assistant':
            // Process assistant messages
            for (const piece of item.message.content) {
              if (piece.type === 'text') {
                const chunk = piece.text;
                fullText += chunk;
                yield { text: chunk, isComplete: false };
              } else if (piece.type === 'tool_use') {
                // Log tool usage
                logger.debug('Agent using tool', 'AIService', {
                  tool: piece.name,
                  input: piece.input
                });
              }
            }
            break;

          case 'user':
            // Process tool results
            for (const piece of item.message.content) {
              // Type guard: check if piece is an object with 'type' property
              if (typeof piece === 'object' && piece !== null && 'type' in piece && piece.type === 'tool_result') {
                const toolResult = piece as { type: 'tool_result'; content: any[] };
                for (const inner of toolResult.content) {
                  // Type guard: check if it's an object with 'type' property
                  if (typeof inner === 'object' && inner !== null && 'type' in inner && inner.type === 'text') {
                    // Tool results are included in the response
                    const textContent = inner as { type: 'text'; text: string };
                    fullText += textContent.text;
                    yield { text: textContent.text, isComplete: false };
                  }
                }
              }
            }
            break;

          case 'system':
            // Log system messages
            if (item.subtype === 'init') {
              logger.debug('Agent session initialized', 'AIService', {
                sessionId: item.session_id
              });
            }
            break;
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
   * Test AI connection by making a simple API request
   * Verifies that the API key is valid and the service is accessible
   * @returns Object with success status, optional error message, and latency in milliseconds
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      logger.info('Testing AI connection with Claude Agent SDK', 'AIService');

      const startTime = Date.now();

      // Load SDK
      const { query } = await loadSDK();

      // Use a simple query to test the connection
      const stream = query({
        prompt: 'Say "OK" if you can read this.',
        options: {
          model: currentConfig?.model || 'claude-sonnet-4-6-20250514',
        },
      });

      // Just consume the stream to verify it works
      for await (const item of stream) {
        if (item.type === 'assistant') {
          // We got a response, connection is working
          break;
        }
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
   * @private
   */
  private static buildSystemPrompt(mode: AIGenerationRequest['mode'], skillCreatorContent: string = ''): string {
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

    // Include skill-creator skill content if available
    const skillCreatorSection = skillCreatorContent
      ? `\n\n## Skill Creation Guidelines\n\nRefer to the following comprehensive skill creation guide:\n\n${skillCreatorContent}`
      : '';

    const modeInstructions = {
      new: '\n\nYou are generating a NEW skill from scratch based on the user\'s prompt. Create complete, production-ready skill content with proper frontmatter and comprehensive markdown content.',

      modify: '\n\nYou are MODIFYING existing skill content based on the user\'s instructions. Improve, expand, or refine the existing content while preserving its core purpose.',

      insert: '\n\nYou are INSERTING new content into existing skill content at a specified position. Generate content that fits naturally into the existing skill.',

      replace: '\n\nYou are REPLACING a selected portion of existing skill content with new content. Generate replacement content that maintains context and flow.'
    };

    return basePrompt + skillCreatorSection + (modeInstructions[mode] || '');
  }

  /**
   * Build user prompt based on request
   * @private
   */
  private static buildUserPrompt(request: AIGenerationRequest): string {
    const currentContent = request.skillContext?.content;
    const cursorPosition = request.skillContext?.cursorPosition;
    const selectedText = request.skillContext?.selectedText;

    switch (request.mode) {
      case 'new':
        return `Create a new skill with the following requirements:\n\n${request.prompt}`;

      case 'modify':
        return `Modify the following skill content according to these instructions:\n\n${request.prompt}\n\nCurrent content:\n\n${currentContent || ''}`;

      case 'insert':
        return `Insert new content at position ${cursorPosition ?? 0} in the following skill content.\n\nInstructions: ${request.prompt}\n\nCurrent content:\n\n${currentContent || ''}`;

      case 'replace':
        return `Replace the following selected text with new content:\n\nSelected text: "${selectedText || ''}"\n\nInstructions: ${request.prompt}\n\nCurrent content:\n${currentContent || ''}\n\nGenerate ONLY the replacement text, not the entire content.`;

      default:
        return request.prompt;
    }
  }
}
