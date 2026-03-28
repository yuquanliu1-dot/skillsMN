/**
 * AI Client Service
 *
 * Frontend service for AI operations with streaming support
 * Updated to use NormalizedMessage format
 */

import { IPC_CHANNELS } from '../../shared/constants';
import type {
  AIConfiguration,
  AIGenerationRequest,
  NormalizedMessage,
  PermissionDecision,
  PendingPermissionRequest,
} from '../../shared/types';

/**
 * Callback types for streaming (updated for NormalizedMessage)
 */
export interface AIStreamCallbacks {
  onMessage: (message: NormalizedMessage) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  onPermissionRequest?: (request: PendingPermissionRequest) => void;
}

/**
 * AI Client Service
 */
export class AIClientService {
  private static instance: AIClientService;
  private activeCallbacks: Map<string, AIStreamCallbacks> = new Map();
  // Map from requestId to sessionId for callback lookup
  private requestIdToSessionId: Map<string, string> = new Map();
  private isListenerRegistered: boolean = false;

  private constructor() {
    // Event listener will be registered on first use
  }

  /**
   * Ensure the AI message listener is registered
   */
  private ensureListenerRegistered(): void {
    if (this.isListenerRegistered) {
      return;
    }

    // Check if electronAPI is available
    if (!window.electronAPI?.onAIMessage) {
      console.warn('electronAPI not yet available, listener registration deferred');
      return;
    }

    // Register NormalizedMessage event listener
    window.electronAPI.onAIMessage((_event, message: NormalizedMessage) => {
      console.log('[AIClient] Received message:', message.kind, 'sessionId:', message.sessionId);

      // Try to find callbacks by sessionId first
      let callbacks = message.sessionId ? this.activeCallbacks.get(message.sessionId) : null;

      // If not found, try to find by mapping
      if (!callbacks && message.sessionId) {
        for (const [reqId, sessId] of this.requestIdToSessionId.entries()) {
          if (sessId === message.sessionId) {
            callbacks = this.activeCallbacks.get(reqId);
            if (callbacks) {
              console.log(`[AIClient] Found callbacks via mapping: requestId=${reqId} -> sessionId=${sessId}`);
              break;
            }
          }
        }
      }

      // If still not found, try all active callbacks (for initial messages before sessionId is known)
      if (!callbacks) {
        const allCallbackEntries = Array.from(this.activeCallbacks.entries());
        if (allCallbackEntries.length === 1) {
          // Only one active request, use it
          callbacks = allCallbackEntries[0][1];
          console.log(`[AIClient] Using single active callback for requestId: ${allCallbackEntries[0][0]}`);
        }
      }

      if (!callbacks) {
        console.warn(`[AIClient] No callbacks found for session: ${message.sessionId}`);
        console.warn(`[AIClient] Active callbacks:`, Array.from(this.activeCallbacks.keys()));
        console.warn(`[AIClient] Session mappings:`, Array.from(this.requestIdToSessionId.entries()));
        return;
      }

      // Handle session_created - migrate callbacks from requestId to sessionId
      if (message.kind === 'session_created' && message.sessionId) {
        // Find the requestId that started this session
        for (const [reqId, callbacks_] of this.activeCallbacks.entries()) {
          if (callbacks_ === callbacks) {
            // Store mapping
            this.requestIdToSessionId.set(reqId, message.sessionId);
            console.log(`[AIClient] Mapped requestId=${reqId} to sessionId=${message.sessionId}`);
            break;
          }
        }
      }

      // Route message by kind
      switch (message.kind) {
        case 'complete':
          // Call onMessage first to handle the message
          callbacks.onMessage(message);
          // Then call onComplete to trigger cleanup and callbacks
          callbacks.onComplete();
          break;

        case 'error':
          callbacks.onMessage(message);
          callbacks.onError(message.error || 'Unknown error');
          break;

        case 'stream_delta':
        case 'stream_end':
        case 'text':
        case 'tool_use':
        case 'tool_result':
        case 'thinking':
        case 'status':
        case 'permission_request':
        case 'permission_cancelled':
        case 'session_created':
        case 'interactive_prompt':
          callbacks.onMessage(message);
          break;

        default:
          console.warn(`Unknown message kind: ${message.kind}`);
      }
    });

    this.isListenerRegistered = true;
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
    // Ensure the event listener is registered
    this.ensureListenerRegistered();

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
      const deleted = this.activeCallbacks.delete(requestId);
      return response.success;
    } catch (error) {
      console.error('Failed to cancel generation:', error);
      return false;
    }
  }

  /**
   * Abort active session
   */
  async abortSession(sessionId: string): Promise<boolean> {
    try {
      const response = await window.electronAPI.abortAISession(sessionId);
      return response.success ?? false;
    } catch (error) {
      console.error('Failed to abort session:', error);
      return false;
    }
  }

  /**
   * Check session status
   */
  async checkSessionStatus(sessionId: string): Promise<{
    isActive: boolean;
    pendingPermissions: any[];
  }> {
    try {
      const response = await window.electronAPI.checkSessionStatus(sessionId);
      if (response.success && response.data) {
        return response.data;
      }
      return { isActive: false, pendingPermissions: [] };
    } catch (error) {
      console.error('Failed to check session status:', error);
      return { isActive: false, pendingPermissions: [] };
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<string[]> {
    try {
      const response = await window.electronAPI.getActiveSessions();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Resolve permission request
   */
  async resolvePermission(
    requestId: string,
    decision: PermissionDecision
  ): Promise<boolean> {
    try {
      const response = await window.electronAPI.resolvePermission({
        requestId,
        decision,
      });
      return response.success ?? false;
    } catch (error) {
      console.error('Failed to resolve permission:', error);
      return false;
    }
  }

  /**
   * Get pending permissions
   */
  async getPendingPermissions(sessionId?: string): Promise<PendingPermissionRequest[]> {
    try {
      const response = await window.electronAPI.getPendingPermissions(sessionId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get pending permissions:', error);
      return [];
    }
  }

  /**
   * Reconnect session
   */
  async reconnectSession(sessionId: string): Promise<boolean> {
    try {
      const response = await window.electronAPI.reconnectSession(sessionId);
      return response.success ?? false;
    } catch (error) {
      console.error('Failed to reconnect session:', error);
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
