/**
 * AI Generation Request Model
 *
 * Represents a request to generate or modify skill content using AI
 */

export type AIGenerationMode = 'new' | 'modify' | 'insert' | 'replace';

export interface AIGenerationRequest {
  /** The prompt describing what to generate */
  prompt: string;
  /** Generation mode */
  mode: AIGenerationMode;
  /** Current skill content (for modify/insert/replace modes) */
  currentContent?: string;
  /** Selection start position (for insert/replace modes) */
  selectionStart?: number;
  /** Selection end position (for insert/replace modes) */
  selectionEnd?: number;
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

  if (!['new', 'modify', 'insert', 'replace'].includes(request.mode)) {
    return 'Invalid generation mode';
  }

  if (request.mode !== 'new' && !request.currentContent) {
    return 'Current content is required for modify/insert/replace modes';
  }

  if (request.mode === 'insert' || request.mode === 'replace') {
    if (request.selectionStart === undefined || request.selectionEnd === undefined) {
      return 'Selection positions are required for insert/replace modes';
    }
    if (request.selectionStart < 0 || request.selectionEnd < request.selectionStart) {
      return 'Invalid selection positions';
    }
  }

  return null;
}
