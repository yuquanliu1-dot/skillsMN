/**
 * AI Service (Using Claude Agent SDK)
 *
 * Handles AI-powered skill generation using Claude Agent SDK
 */

import { safeStorage } from 'electron';
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
 * Uses Function constructor to prevent TypeScript from transpiling import() to require()
 */
async function loadSDK(): Promise<ClaudeAgentSDK> {
  if (!sdkModule) {
    // Use Function constructor to prevent TypeScript from transpiling to require()
    // This is necessary because @anthropic-ai/claude-agent-sdk is an ES Module
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const module = await dynamicImport('@anthropic-ai/claude-agent-sdk');

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
      yield { type: 'error', text: '', isComplete: false, error: validationError };
      return;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    activeStreams.set(requestId, abortController);

    // Store original environment variables to restore later
    let originalApiKey: string | undefined = process.env.ANTHROPIC_API_KEY;
    let originalBaseUrl: string | undefined = process.env.ANTHROPIC_BASE_URL;

    try {
      logger.info('Starting AI generation with Claude Agent SDK', 'AIService', {
        mode: request.mode,
        requestId,
        targetPath: request?.skillContext?.targetPath,
        hasBaseUrl: !!currentConfig?.baseUrl
      });

      // Build the user prompt
      const userPrompt = AIService.buildUserPrompt(request);

      // Build system prompt (Agent SDK will automatically load skills)
      const systemPrompt = AIService.buildSystemPrompt(request.mode, request);

      // Load SDK and use query
      const { query } = await loadSDK();

      // Set working directory to the target skills directory
      const workingDirectory = request?.skillContext?.targetPath || process.cwd();

      logger.debug('AI generation working directory', 'AIService', { workingDirectory });

      // CRITICAL: Set environment variables directly on process.env BEFORE calling SDK
      // The SDK spawns a child process that needs these variables to be available

      // Set API key
      if (currentConfig?.apiKey) {
        process.env.ANTHROPIC_API_KEY = currentConfig.apiKey;
      }

      // Set custom base URL if configured
      if (currentConfig?.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = currentConfig.baseUrl;
        logger.info('Setting custom base URL in process.env', 'AIService', { baseUrl: currentConfig.baseUrl });
      }

      // Log query parameters for debugging
      logger.info('SDK query parameters', 'AIService', {
        model: currentConfig?.model || 'claude-sonnet-4-6-20250514',
        cwd: workingDirectory,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        hasBaseUrl: !!process.env.ANTHROPIC_BASE_URL,
        baseUrlValue: process.env.ANTHROPIC_BASE_URL,
      });

      // Build query options
      // Note: permissionMode is NOT included as it's not compatible with some custom API providers (e.g., 智谱AI)
      const queryOptions: any = {
        prompt: userPrompt,
        options: {
          systemPrompt,
          model: currentConfig?.model || 'claude-sonnet-4-6-20250514',
          cwd: workingDirectory,
          allowedTools: ['Write', 'Read', 'Edit', 'Bash', 'Grep', 'Glob', 'Skill', 'NotebookEdit', 'TaskOutput'],
        },
      };

      // Use Claude Agent SDK query
      const stream = query(queryOptions);

      let fullText = '';

      // Process stream events
      for await (const item of stream) {
        // Check if cancelled
        if (abortController.signal.aborted) {
          logger.info('AI generation cancelled', 'AIService', { requestId });
          yield { type: 'error', text: fullText, isComplete: false, error: 'Generation cancelled' };
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
                yield { type: 'text', text: chunk, isComplete: false };
              } else if (piece.type === 'tool_use') {
                // Send tool usage to frontend
                logger.debug('Agent using tool', 'AIService', {
                  tool: piece.name,
                  input: piece.input
                });

                yield {
                  type: 'tool_use',
                  tool: {
                    name: piece.name,
                    input: piece.input
                  },
                  isComplete: false
                };
              }
            }
            break;

          case 'user':
            // Process tool results
            for (const piece of item.message.content) {
              // Type guard: check if piece is an object with 'type' property
              if (typeof piece === 'object' && piece !== null && 'type' in piece && piece.type === 'tool_result') {
                const toolResult = piece as { type: 'tool_result'; content: any[]; tool_use_id?: string };
                logger.debug('Tool execution result', 'AIService', {
                  tool_use_id: toolResult.tool_use_id,
                  contentLength: toolResult.content?.length
                });
                for (const inner of toolResult.content) {
                  // Type guard: check if it's an object with 'type' property
                  if (typeof inner === 'object' && inner !== null && 'type' in inner && inner.type === 'text') {
                    // Tool results are included in the response
                    const textContent = inner as { type: 'text'; text: string };
                    fullText += textContent.text;
                    yield { type: 'text', text: textContent.text, isComplete: false };
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

          case 'result':
            // Handle result messages - check for errors
            if (item.subtype && item.subtype.startsWith('error')) {
              const errorMsg = item.errors?.join('; ') || item.subtype;
              logger.error('Agent result error', 'AIService', {
                subtype: item.subtype,
                errors: item.errors,
                stop_reason: item.stop_reason
              });
              yield { type: 'error', text: fullText, isComplete: false, error: errorMsg };
              return;
            }
            break;
        }
      }

      // Generation complete
      logger.info('AI generation complete', 'AIService', {
        requestId,
        length: fullText.length,
      });

      yield { type: 'complete', text: '', isComplete: true };
    } catch (error) {
      // Capture detailed error information
      const errorDetails: any = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Check for cause property (ES2022+)
      if (error instanceof Error && 'cause' in error) {
        errorDetails.cause = (error as any).cause;
      }

      // Check for stderr/stdout if available
      if (error instanceof Error && (error as any).stderr) {
        errorDetails.stderr = (error as any).stderr;
      }
      if (error instanceof Error && (error as any).stdout) {
        errorDetails.stdout = (error as any).stdout;
      }

      logger.error('AI generation failed', 'AIService', errorDetails);

      // Build error message with actual details
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // If we have stderr, include it in the error message for debugging
      if (errorDetails.stderr) {
        errorMessage = `${errorMessage}\n\nCLI Error: ${errorDetails.stderr}`;
      }

      // For exit code errors, provide context but keep the original message
      if (errorMessage.includes('exited with code')) {
        errorMessage = `Claude CLI error: ${errorMessage}\n\nConfig: baseUrl=${currentConfig?.baseUrl || 'default'}, model=${currentConfig?.model || 'default'}`;
      }

      yield { type: 'error', text: '', isComplete: false, error: errorMessage };
    } finally {
      // Restore original environment variables
      if (originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      if (originalBaseUrl !== undefined) {
        process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
      } else {
        delete process.env.ANTHROPIC_BASE_URL;
      }

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
    // Store original environment variables to restore later
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    const originalBaseUrl = process.env.ANTHROPIC_BASE_URL;

    try {
      logger.info('Testing AI connection with Claude Agent SDK', 'AIService');

      const startTime = Date.now();

      // Load SDK
      const { query } = await loadSDK();

      // Set environment variables directly on process.env
      if (currentConfig?.apiKey) {
        process.env.ANTHROPIC_API_KEY = currentConfig.apiKey;
      }

      if (currentConfig?.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = currentConfig.baseUrl;
        logger.info('Test connection using custom base URL', 'AIService', { baseUrl: currentConfig.baseUrl });
      }

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
    } finally {
      // Restore original environment variables
      if (originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      if (originalBaseUrl !== undefined) {
        process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
      } else {
        delete process.env.ANTHROPIC_BASE_URL;
      }
    }
  }

  /**
   * Build system prompt based on generation mode
   * Note: Claude Agent SDK will automatically load and access skills from .claude/skills/
   * @private
   */
  private static buildSystemPrompt(mode: AIGenerationRequest['mode'], request?: AIGenerationRequest): string {
    const targetPath = request?.skillContext?.targetPath;

    const basePrompt = `You are an expert skill creator for Claude Code. You have access to the skill-creator skill which provides comprehensive guidelines for creating effective skills.

When generating skill content:
- Use the skill-creator skill as your guide for best practices
- Follow proper YAML frontmatter format (name, description, version, author, tags)
- Write comprehensive Markdown content with clear structure
- Include practical examples and step-by-step instructions
- Use proper formatting (headings, lists, code blocks)
- You CAN use the Write tool to directly create skill files
- You CAN use Bash and other tools as needed
- Use the Skill tool to access skill-creator guidance

${targetPath ? `CRITICAL: You MUST save all skill files to the target directory: ${targetPath}
DO NOT save to ~/.local/share/claude-cli/skills/ or any other default location.
ALWAYS use the path: ${targetPath}/<skill-name>/skill.md` : ''}

Skills follow this format:
---
name: Skill Name
description: Brief description
version: 1.0.0
author: Author Name
tags: [tag1, tag2, tag3]
---

# Skill Content

Markdown content with instructions, examples, and guidance.`;

    const modeInstructions = {
      new: targetPath
        ? `\n\nYou are creating a NEW skill from scratch. Generate complete, production-ready skill content based on the user's requirements. Use the skill-creator skill for guidance.

CRITICAL PATH REQUIREMENT:
The skill MUST be saved to: ${targetPath}/<skill-name>/skill.md

Steps:
1. Determine the skill name from the user's requirements (convert to kebab-case, e.g., "Directory Viewer" → "directory-viewer")
2. Use the Bash tool to create the directory: mkdir -p "${targetPath}/<skill-name>"
3. Use the Write tool with the EXACT path: ${targetPath}/<skill-name>/skill.md

Example: If skill name is "directory-viewer", the Write tool file_path MUST be:
${targetPath}/directory-viewer/skill.md

DO NOT use any other path. DO NOT save to ~/.claude/skills/ or ~/.local/share/claude-cli/skills/`
        : '\n\nYou are creating a NEW skill from scratch. Generate complete, production-ready skill content based on the user\'s requirements. Use the skill-creator skill for guidance.',

      modify: targetPath
        ? `\n\nYou are MODIFYING an existing skill. The skill is located at: ${targetPath}/${request?.skillContext?.name || 'unknown'}/skill.md
Save changes to this exact path. Refer to skill-creator for best practices.`
        : '\n\nYou are MODIFYING an existing skill. Improve, expand, or refine the content while preserving its core purpose. Refer to skill-creator for best practices.',

      insert: '\n\nYou are INSERTING new content into an existing skill at a specified position. Generate content that fits naturally. Follow skill-creator guidelines.',

      replace: '\n\nYou are REPLACING a selected portion of an existing skill. Generate replacement content that maintains context and flow. Use skill-creator as reference.'
    };

    return basePrompt + (modeInstructions[mode] || '');
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
