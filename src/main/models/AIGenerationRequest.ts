/**
 * AI Generation Request Model
 *
 * Represents a request to generate or modify skill content using AI
 */

import type { AIGenerationMode } from '../../shared/types';

export interface AIGenerationRequest {
  /** Unique request identifier for tracking */
  id?: string;
  /** The prompt describing what to generate */
  prompt: string;
  /** Generation mode */
  mode: AIGenerationMode;
  /** Timestamp of the request */
  timestamp?: Date;
  /** Skill context for AI generation */
  skillContext?: {
    /** Current skill content (for modify/insert/replace modes) */
    content?: string;
    /** Cursor position (for insert mode) */
    cursorPosition?: number;
    /** Selected text (for replace mode) */
    selectedText?: string;
    /** Skill name */
    name?: string;
    /** Skill metadata */
    metadata?: Record<string, any>;
  };
}

export interface AIStreamChunk {
  /** Chunk of generated text */
  text: string;
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Validate AI generation request
 */
export function validateAIGenerationRequest(request: AIGenerationRequest): string | null {
  if (!request.prompt || request.prompt.trim().length === 0) {
    return 'Prompt is required';
  }

  if (request.prompt.length > 10000) {
    return 'Prompt must be less than 10,000 characters';
  }

  const validModes: AIGenerationMode[] = ['new', 'modify', 'insert', 'replace'];
  if (!validModes.includes(request.mode)) {
    return 'Invalid generation mode';
  }

  // For modify/insert/replace modes, check if context is provided
  if (request.mode !== 'new') {
    if (!request.skillContext?.content) {
      return 'Skill content is required for modify/insert/replace modes';
    }
  }

  // For insert mode, cursor position should be provided
  if (request.mode === 'insert' && request.skillContext?.cursorPosition === undefined) {
    return 'Cursor position is required for insert mode';
  }

  // For replace mode, selected text should be provided
  if (request.mode === 'replace' && !request.skillContext?.selectedText) {
    return 'Selected text is required for replace mode';
  }

  return null;
}
