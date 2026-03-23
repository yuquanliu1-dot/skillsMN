/**
 * AI Service (Using Claude Agent SDK)
 *
 * Handles AI-powered skill generation using Claude Agent SDK
 */

import { safeStorage, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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
 * Get the correct path to the Claude Agent SDK
 * In packaged apps, the SDK is unpacked to app.asar.unpacked
 */
function getSDKPath(): string {
  const sdkPackageName = '@anthropic-ai/claude-agent-sdk';

  // Check if running in packaged mode
  if (app.isPackaged) {
    // In packaged mode, use the unpacked version
    const unpackedPath = path.join(
      path.dirname(app.getPath('exe')),
      'resources',
      'app.asar.unpacked',
      'node_modules',
      sdkPackageName,
      'sdk.mjs'  // Point to the specific ES module file
    );

    if (fs.existsSync(unpackedPath)) {
      // Convert to file:// URL for Windows compatibility
      const fileUrl = 'file:///' + unpackedPath.replace(/\\/g, '/');
      logger.info('Using unpacked SDK path', 'AIService', { path: unpackedPath, fileUrl });
      return fileUrl;
    }
  }

  // In development or fallback, use normal path
  return sdkPackageName;
}

/**
 * Load Claude Agent SDK module dynamically
 * Uses Function constructor to prevent TypeScript from transpiling import() to require()
 */
async function loadSDK(): Promise<ClaudeAgentSDK> {
  if (!sdkModule) {
    const sdkPath = getSDKPath();

    // Use Function constructor to prevent TypeScript from transpiling to require()
    // This is necessary because @anthropic-ai/claude-agent-sdk is an ES Module
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const module = await dynamicImport(sdkPath);

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
   * Get executable options for the SDK
   * In packaged apps, we need to specify the path to the CLI
   * The SDK will auto-detect Node.js on the system
   */
  private static getExecutableOptions(): { executable?: string; pathToClaudeCodeExecutable?: string; executableArgs?: string[] } {
    if (app.isPackaged) {
      const cliPath = path.join(
        path.dirname(app.getPath('exe')),
        'resources',
        'app.asar.unpacked',
        'node_modules',
        '@anthropic-ai',
        'claude-agent-sdk',
        'cli.js'
      );

      if (fs.existsSync(cliPath)) {
        logger.info('Using CLI path for packaged app', 'AIService', { cliPath });
        // Only specify the CLI path, let SDK auto-detect Node.js
        // executable option should be 'node' string, not a path
        return {
          executable: 'node',
          pathToClaudeCodeExecutable: cliPath,
        };
      }
    }
    return {};
  }

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

      // Check if model is configured
      if (!currentConfig?.model) {
        throw new Error('AI model is not configured. Please configure the model in Settings.');
      }

      // Log query parameters for debugging
      logger.info('SDK query parameters', 'AIService', {
        model: currentConfig.model,
        cwd: workingDirectory,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        hasBaseUrl: !!process.env.ANTHROPIC_BASE_URL,
        baseUrlValue: process.env.ANTHROPIC_BASE_URL,
      });

      // Build query options
      // Note: permissionMode is NOT included as it's not compatible with some custom API providers (e.g., 智谱AI)
      const execOptions = AIService.getExecutableOptions();
      logger.info('Generation executable options', 'AIService', execOptions);

      const queryOptions: any = {
        prompt: userPrompt,
        options: {
          systemPrompt,
          model: currentConfig.model,
          cwd: workingDirectory,
          allowedTools: ['Write', 'Read', 'Edit', 'Bash', 'Grep', 'Glob', 'Skill', 'NotebookEdit', 'TaskOutput'],
          // Configure executable for packaged app
          ...execOptions,
          // Add stderr capture for debugging
          stderr: (msg: string) => {
            logger.info('CLI stderr output', 'AIService', { stderr: msg });
          },
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

      // Check if model is configured
      if (!currentConfig?.model) {
        return { success: false, error: 'AI model is not configured. Please configure the model in Settings.' };
      }

      // Use a simple query to test the connection
      // Enable debug mode to capture CLI stderr
      const execOptions = AIService.getExecutableOptions();
      logger.info('Test connection executable options', 'AIService', execOptions);

      const stream = query({
        prompt: 'Say "OK" if you can read this.',
        options: {
          model: currentConfig.model,
          ...execOptions,
          stderr: (msg: string) => {
            logger.info('CLI stderr', 'AIService', { stderr: msg });
          },
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
   * Designed to work with skill-creator skill for comprehensive skill management
   * @private
   */
  private static buildSystemPrompt(mode: AIGenerationRequest['mode'], request?: AIGenerationRequest): string {
    const targetPath = request?.skillContext?.targetPath;

    const basePrompt = `You are a skill management assistant that works with the skill-creator skill.

## Your Role

You help users manage Claude Code skills through these capabilities:

1. **Create New Skills** - Generate complete, production-ready skills from scratch
2. **Modify Existing Skills** - Update and enhance existing skill content
3. **Improve Skills** - Optimize skill structure, clarity, and effectiveness
4. **Measure Performance** - Analyze skill effectiveness and identify issues
5. **Run Evals** - Design and execute test cases to validate skill behavior
6. **Benchmark Skills** - Compare performance across scenarios with variance analysis
7. **Optimize Descriptions** - Improve triggering accuracy through better descriptions

## IMPORTANT: Use the Skill Tool

Before performing any task, invoke the skill-creator skill for guidance:
\`\`\`
Use Skill tool with skill name: "skill-creator"
\`\`\`

The skill-creator skill provides comprehensive guidelines for:
- Skill structure and format best practices
- Effective description writing for triggering
- Evaluation and benchmarking methodologies
- Common patterns and anti-patterns

## Available Tools
- **Skill** - Access skill-creator and other skills for guidance
- **Write** - Create or modify skill files (SKILL.md)
- **Read** - Examine existing skill content
- **Edit** - Make targeted changes to skill files
- **Bash** - File system operations (mkdir, etc.)
- **Grep/Glob** - Search skill content

${targetPath ? `
## Path Requirements
CRITICAL: All skill files MUST be saved to: ${targetPath}
- Create directory: ${targetPath}/<skill-name>/
- Write file: ${targetPath}/<skill-name>/SKILL.md
- DO NOT use ~/.claude/skills/ or ~/.local/share/claude-cli/skills/` : ''}

## Skill File Format
\`\`\`markdown
---
name: Skill Name
description: Clear description for accurate triggering (what users would say)
version: 1.0.0
author: Author Name
tags: [tag1, tag2, tag3]
trigger_glob: Optional glob pattern (e.g., "**/*.py")
trigger_type: Optional file type hint
---

# Skill Title

Skill content with instructions, examples, and guidance.
\`\`\``;

    const modeInstructions: Record<string, string> = {
      new: targetPath
        ? `

## Task: Create New Skill

1. First, invoke the skill-creator skill for creation guidelines
2. Analyze user requirements to determine skill purpose and scope
3. Convert skill name to kebab-case (e.g., "Code Reviewer" → "code-reviewer")
4. Create directory: mkdir -p "${targetPath}/<skill-name>"
5. Write skill file: ${targetPath}/<skill-name>/SKILL.md

IMPORTANT: The Write tool file_path MUST be exactly:
${targetPath}/<skill-name>/SKILL.md`
        : `

## Task: Create New Skill

1. First, invoke the skill-creator skill for creation guidelines
2. Create a complete, production-ready skill based on user requirements`,

      modify: targetPath
        ? `

## Task: Modify Existing Skill

Skill location: ${targetPath}/${request?.skillContext?.name || 'unknown'}/SKILL.md

1. First, invoke the skill-creator skill for best practices
2. Apply the requested modifications
3. Save changes to the same path
4. Ensure improvements align with skill-creator guidelines`
        : `

## Task: Modify Existing Skill

1. First, invoke the skill-creator skill for best practices
2. Apply the requested modifications while preserving core purpose`,

      insert: `

## Task: Insert Content

1. First, invoke the skill-creator skill for content guidelines
2. Generate content that fits naturally at the specified position
3. Maintain consistent style and tone with existing content`,

      replace: `

## Task: Replace Selected Content

1. First, invoke the skill-creator skill for content guidelines
2. Generate replacement text that improves upon the original
3. Maintain context and flow with surrounding content`,

      evaluate: `

## Task: Evaluate Skill Performance

1. First, invoke the skill-creator skill for evaluation methodology
2. Analyze skill effectiveness:
   - Clarity of instructions and examples
   - Completeness of coverage
   - Ease of understanding
   - Edge cases and ambiguities
3. Assess description accuracy for triggering
4. Provide actionable improvement suggestions`,

      benchmark: `

## Task: Benchmark Skill with Variance Analysis

1. First, invoke the skill-creator skill for benchmarking methodology
2. Analyze performance across different scenarios
3. Identify variance in behavior:
   - Consistency issues
   - Edge case handling
   - Response quality variance
4. Compare with best practices
5. Provide optimization recommendations`,

      optimize: `

## Task: Optimize Skill Description

1. First, invoke the skill-creator skill for description guidelines
2. Analyze current description:
   - Trigger phrase coverage
   - Specificity vs generality
   - False positive risks
3. Propose optimized description options
4. Suggest any frontmatter improvements for better triggering`
    };

    return basePrompt + (modeInstructions[mode] || '');
  }

  /**
   * Build user prompt based on request
   * @private
   */
  private static buildUserPrompt(request: AIGenerationRequest): string {
    const { mode, prompt, skillContext } = request;
    const currentContent = skillContext?.content;
    const cursorPosition = skillContext?.cursorPosition;
    const selectedText = skillContext?.selectedText;
    const skillName = skillContext?.name;

    switch (mode) {
      case 'new':
        return `Create a new skill with these requirements:\n\n${prompt}`;

      case 'modify':
        return `Modify this skill according to the instructions.\n\n## Instructions\n${prompt}\n\n## Current Skill Content\n\n${currentContent || '(empty)'}`;

      case 'insert':
        return `Insert content at position ${cursorPosition ?? 0}.\n\n## Instructions\n${prompt}\n\n## Current Content\n\n${currentContent || '(empty)'}`;

      case 'replace':
        return `Replace the selected text with new content.\n\n## Selected Text\n"${selectedText || '(nothing selected)'}"\n\n## Instructions\n${prompt}\n\n## Context (surrounding content)\n${currentContent || '(empty)'}\n\nGenerate ONLY the replacement text.`;

      case 'evaluate':
        return `Evaluate this skill's performance.\n\n## Skill Name\n${skillName || 'Unknown'}\n\n## Evaluation Focus\n${prompt || 'General evaluation'}\n\n## Skill Content\n\n${currentContent || '(empty)'}`;

      case 'benchmark':
        return `Benchmark this skill with variance analysis.\n\n## Skill Name\n${skillName || 'Unknown'}\n\n## Benchmark Focus\n${prompt || 'General benchmarking'}\n\n## Skill Content\n\n${currentContent || '(empty)'}`;

      case 'optimize':
        return `Optimize this skill's description for better triggering.\n\n## Skill Name\n${skillName || 'Unknown'}\n\n## Optimization Focus\n${prompt || 'General optimization'}\n\n## Current Skill Content\n\n${currentContent || '(empty)'}`;

      default:
        return prompt;
    }
  }
}
