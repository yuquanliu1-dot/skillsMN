/**
 * AI Service
 *
 * Handles AI-powered skill generation using Claude API with streaming support
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/Logger';
import type { AIGenerationRequest, AIStreamChunk } from '../models/AIGenerationRequest';
import { validateAIGenerationRequest } from '../models/AIGenerationRequest';

const anthropic = new Anthropic();

/**
 * Active generation streams (for cancellation)
 */
const activeStreams = new Map<string, AbortController>();

/**
 * AI Service for skill generation
 */
export class AIService {
  /**
   * Generate skill content with streaming
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
   * Cancel active generation
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
   * Test AI connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Testing AI connection', 'AIService');

      // Simple test request
      await anthropic.messages.create({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "OK" if you can read this.',
          },
        ],
      });

      logger.info('AI connection test successful', 'AIService');
      return { success: true };
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
