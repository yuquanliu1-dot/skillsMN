/**
 * AI Client Service
 *
 * Frontend service for AI operations with streaming support
 */

import { IPC_CHANNELS } from '../../shared/constants';
import type { AIConfiguration, AIGenerationRequest } from '../../shared/types';

/**
 * Callback types for streaming
 */
export interface AIStreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

/**
 * AI Client Service
 */
export class AIClientService {
  private static instance: AIClientService;
  private activeCallbacks: Map<string, AIStreamCallbacks> = new Map();

  private constructor() {
    // Register streaming event listener
    window.electronAPI.onAIChunk((_event, data) => {
      const { requestId, chunk, isComplete, error } = data;
      const callbacks = this.activeCallbacks.get(requestId);

      if (!callbacks) {
        console.warn(`No callbacks found for request: ${requestId}`);
        return;
      }

      if (error) {
        callbacks.onError(error);
        this.activeCallbacks.delete(requestId);
      } else if (isComplete) {
        callbacks.onComplete();
        this.activeCallbacks.delete(requestId);
      } else {
        callbacks.onChunk(chunk);
      }
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIClientService {
    if (!AIClientService.instance) {
      AIClientService.instance = new AIClientService();
    }
    return AIClientService.instance;
  }

  /**
   * Generate skill content with streaming
   */
  async generateStream(
    requestId: string,
    request: AIGenerationRequest,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    // Store callbacks
    this.activeCallbacks.set(requestId, callbacks);

    try {
      // Start generation
      const response = await window.electronAPI.generateAI({
        requestId,
        request,
      });

      if (!response.success) {
        callbacks.onError(response.error?.message || 'Generation failed');
        this.activeCallbacks.delete(requestId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callbacks.onError(errorMessage);
      this.activeCallbacks.delete(requestId);
    }
  }

  /**
   * Cancel active generation
   */
  async cancelGeneration(requestId: string): Promise<boolean> {
    try {
      const response = await window.electronAPI.cancelAI(requestId);
      return response.success;
    } catch (error) {
      console.error('Failed to cancel generation:', error);
      return false;
    }
  }

  /**
   * Get AI configuration
   */
  async getConfig(): Promise<AIConfiguration> {
    try {
      const response = await window.electronAPI.getAIConfiguration();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load config');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get AI config:', error);
      throw error;
    }
  }

  /**
   * Save AI configuration
   */
  async saveConfig(config: AIConfiguration): Promise<void> {
    try {
      const response = await window.electronAPI.saveAIConfiguration(config);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save config');
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
      throw error;
    }
  }

  /**
   * Test AI configuration
   */
  async testConfig(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await window.electronAPI.testAIConnection();
      return {
        success: response.success,
        error: response.error?.message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.activeCallbacks.clear();
  }
}

// Export singleton instance
export const aiClient = AIClientService.getInstance();
