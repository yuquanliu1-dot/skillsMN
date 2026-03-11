/**
 * useAIGeneration Hook
 *
 * React hook for AI skill generation with streaming support
 */

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { aiClient } from '../services/aiClient';
import type { AIGenerationMode, AIGenerationRequest } from '../../shared/types';

/**
 * AI Generation States
 */
export type AIGenerationState =
  | 'IDLE'
  | 'STREAMING'
  | 'COMPLETE'
  | 'ERROR';

/**
 * Hook state
 */
interface AIState {
  status: AIGenerationState;
  content: string;
  error: string | null;
  requestId: string | null;
}

/**
 * Action types
 */
type AIAction =
  | { type: 'START_GENERATION'; requestId: string }
  | { type: 'CHUNK'; chunk: string }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

/**
 * Initial state
 */
const initialState: AIState = {
  status: 'IDLE',
  content: '',
  error: null,
  requestId: null,
};

/**
 * Reducer
 */
function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        status: 'STREAMING',
        content: '',
        error: null,
        requestId: action.requestId,
      };

    case 'CHUNK':
      return {
        ...state,
        content: state.content + action.chunk,
      };

    case 'COMPLETE':
      return {
        ...state,
        status: 'COMPLETE',
      };

    case 'ERROR':
      return {
        ...state,
        status: 'ERROR',
        error: action.error,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * Generate UUID
 */
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Hook options
 */
interface UseAIGenerationOptions {
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook return type
 */
interface UseAIGenerationReturn {
  status: AIGenerationState;
  content: string;
  error: string | null;
  isStreaming: boolean;
  isComplete: boolean;
  isIdle: boolean;
  generate: (prompt: string, mode: AIGenerationMode, context?: AIGenerationRequest['skillContext']) => Promise<void>;
  stop: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

/**
 * useAIGeneration Hook
 */
export function useAIGeneration(options?: UseAIGenerationOptions): UseAIGenerationReturn {
  const [state, dispatch] = useReducer(aiReducer, initialState);
  const lastRequestRef = useRef<AIGenerationRequest | null>(null);

  /**
   * Generate skill content
   */
  const generate = useCallback(
    async (
      prompt: string,
      mode: AIGenerationMode,
      skillContext?: AIGenerationRequest['skillContext']
    ) => {
      const requestId = generateRequestId();

      const request: AIGenerationRequest = {
        id: requestId,
        prompt,
        mode,
        skillContext,
        timestamp: new Date(),
      };

      // Store for retry
      lastRequestRef.current = request;

      // Start generation
      dispatch({ type: 'START_GENERATION', requestId });

      await aiClient.generateStream(requestId, request, {
        onChunk: (chunk) => {
          dispatch({ type: 'CHUNK', chunk });
        },
        onComplete: () => {
          dispatch({ type: 'COMPLETE' });
          if (options?.onComplete) {
            // Get current content from state (will be updated)
            options.onComplete(state.content);
          }
        },
        onError: (error) => {
          dispatch({ type: 'ERROR', error });
          if (options?.onError) {
            options.onError(error);
          }
        },
      });
    },
    [options, state.content]
  );

  /**
   * Stop generation
   */
  const stop = useCallback(async () => {
    if (state.requestId) {
      await aiClient.cancelGeneration(state.requestId);
      dispatch({ type: 'COMPLETE' }); // Preserve partial content
    }
  }, [state.requestId]);

  /**
   * Retry last generation
   */
  const retry = useCallback(async () => {
    if (lastRequestRef.current) {
      const { prompt, mode, skillContext } = lastRequestRef.current;
      await generate(prompt, mode, skillContext);
    }
  }, [generate]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.requestId && state.status === 'STREAMING') {
        aiClient.cancelGeneration(state.requestId);
      }
    };
  }, [state.requestId, state.status]);

  return {
    status: state.status,
    content: state.content,
    error: state.error,
    isStreaming: state.status === 'STREAMING',
    isComplete: state.status === 'COMPLETE',
    isIdle: state.status === 'IDLE',
    generate,
    stop,
    retry,
    reset,
  };
}
