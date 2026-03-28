/**
 * useAIGeneration Hook
 *
 * React hook for AI skill generation with streaming support
 * Updated to use NormalizedMessage format
 */

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { aiClient } from '../services/aiClient';
import type {
  AIGenerationMode,
  AIGenerationRequest,
  NormalizedMessage,
  PendingPermissionRequest,
  PermissionDecision,
} from '../../shared/types';

import { generateMessageId } from '../../shared/types';

/**
 * AI Generation States
 */
export type AIGenerationState =
  | 'IDLE'
  | 'STREAMING'
  | 'WAITING_PERMISSION'
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
  sessionId: string | null;
  toolCalls: Array<{ name: string; input?: any; result?: any }>;
  pendingPermissions: PendingPermissionRequest[];
  exitCode?: number;
  aborted?: boolean;
}

/**
 * Action types
 */
type AIAction =
  | { type: 'START_GENERATION'; requestId: string }
  | { type: 'SESSION_CREATED'; sessionId: string }
  | { type: 'STREAM_DELTA'; content: string }
  | { type: 'STREAM_END' }
  | { type: 'TOOL_USE'; tool: { name: string; input?: any } }
  | { type: 'TOOL_RESULT'; toolId: string; result: any }
  | { type: 'PERMISSION_REQUEST'; request: PendingPermissionRequest }
  | { type: 'PERMISSION_CANCELLED'; requestId: string }
  | { type: 'COMPLETE'; exitCode?: number; aborted?: boolean }
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
  sessionId: null,
  toolCalls: [],
  pendingPermissions: [],
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
        toolCalls: [],
        pendingPermissions: [],
        exitCode: undefined,
        aborted: undefined,
      };

    case 'SESSION_CREATED':
      return {
        ...state,
        sessionId: action.sessionId,
      };

    case 'STREAM_DELTA':
      return {
        ...state,
        content: state.content + action.content,
      };

    case 'STREAM_END':
      return {
        ...state,
        // Content is finalized, keep as-is
      };

    case 'TOOL_USE':
      return {
        ...state,
        toolCalls: [...state.toolCalls, action.tool],
      };

    case 'TOOL_RESULT':
      return {
        ...state,
        toolCalls: state.toolCalls.map((t, index) => {
          // Match by index if no toolId, or by toolId if present
          const toolId = (t as any).toolId;
          if (toolId !== undefined) {
            return toolId === action.toolId
              ? { ...t, result: action.result }
              : t;
          }
          // Fallback to index matching
          return index === state.toolCalls.findIndex(tool =>
            (tool as any).toolId === action.toolId
          ) ? { ...t, result: action.result } : t;
        }),
      };

    case 'PERMISSION_REQUEST':
      return {
        ...state,
        status: 'WAITING_PERMISSION',
        pendingPermissions: [...state.pendingPermissions, action.request],
      };

    case 'PERMISSION_CANCELLED':
      const remainingPermissions = state.pendingPermissions.filter(
        (p) => p.requestId !== action.requestId
      );
      return {
        ...state,
        pendingPermissions: remainingPermissions,
        // If no more pending permissions, go back to streaming
        status: remainingPermissions.length === 0 && state.status === 'WAITING_PERMISSION'
          ? 'STREAMING'
          : state.status,
      };

    case 'COMPLETE':
      return {
        ...state,
        status: 'COMPLETE',
        exitCode: action.exitCode,
        aborted: action.aborted,
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
 * Hook options
 */
interface UseAIGenerationOptions {
  onComplete?: (content: string, toolCalls: AIState['toolCalls']) => void;
  onError?: (error: string) => void;
  onPermissionRequest?: (request: PendingPermissionRequest, resolve: (decision: PermissionDecision) => Promise<void>) => Promise<void>;
  onSessionCreated?: (sessionId: string) => void;
}

/**
 * Hook return type
 */
interface UseAIGenerationReturn {
  status: AIGenerationState;
  content: string;
  error: string | null;
  toolCalls: Array<{ name: string; input?: any; result?: any }>;
  pendingPermissions: PendingPermissionRequest[];
  sessionId: string | null;
  isStreaming: boolean;
  isComplete: boolean;
  isIdle: boolean;
  isWaitingPermission: boolean;
  generate: (prompt: string, mode: AIGenerationMode, context?: AIGenerationRequest['skillContext']) => Promise<void>;
  stop: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  resolvePermission: (requestId: string, decision: PermissionDecision) => Promise<void>;
  abort: () => Promise<void>;
}

/**
 * Hook implementation
 */
export function useAIGeneration(
  options: UseAIGenerationOptions = {}
): UseAIGenerationReturn {
  const [state, dispatch] = useReducer(aiReducer, initialState);
  const lastRequestRef = useRef<{
    prompt: string;
    mode: AIGenerationMode;
    context?: AIGenerationRequest['skillContext'];
  } | null>(null);

  // Use refs to track latest values for synchronous access in onComplete callback
  // These are updated synchronously via our custom dispatch wrapper
  const toolCallsRef = useRef<AIState['toolCalls']>([]);
  const contentRef = useRef<string>('');

  // Custom dispatch that updates refs synchronously
  const dispatchWithRefUpdate = useCallback((action: AIAction) => {
    // Update refs BEFORE dispatching so they're immediately available
    switch (action.type) {
      case 'START_GENERATION':
      case 'RESET':
        toolCallsRef.current = [];
        contentRef.current = '';
        break;
      case 'STREAM_DELTA':
        contentRef.current = contentRef.current + action.content;
        break;
      case 'TOOL_USE':
        toolCallsRef.current = [...toolCallsRef.current, action.tool];
        break;
    }
    dispatch(action);
  }, []);

  /**
   * Handle NormalizedMessage from AI service
   */
  const handleMessage = useCallback((message: NormalizedMessage) => {
    switch (message.kind) {
      case 'session_created':
        dispatchWithRefUpdate({ type: 'SESSION_CREATED', sessionId: message.sessionId });
        options.onSessionCreated?.(message.sessionId);
        break;

      case 'stream_delta':
        if (message.content) {
          dispatchWithRefUpdate({ type: 'STREAM_DELTA', content: message.content });
        }
        break;

      case 'stream_end':
        dispatchWithRefUpdate({ type: 'STREAM_END' });
        break;

      case 'text':
        if (message.content) {
          dispatchWithRefUpdate({ type: 'STREAM_DELTA', content: message.content });
        }
        break;

      case 'tool_use':
        if (message.toolName && message.toolInput) {
          dispatchWithRefUpdate({
            type: 'TOOL_USE',
            tool: {
              name: message.toolName,
              input: message.toolInput,
            },
          });
        }
        break;

      case 'tool_result':
        if (message.toolId && message.toolResult !== undefined) {
          dispatchWithRefUpdate({
            type: 'TOOL_RESULT',
            toolId: message.toolId,
            result: message.toolResult,
          });
        }
        break;

      case 'permission_request':
        if (message.requestId && message.toolName) {
          // Construct PendingPermissionRequest from NormalizedMessage fields
          const permissionRequest: PendingPermissionRequest = {
            requestId: message.requestId,
            toolName: message.toolName,
            input: message.toolInput,
            context: message.context,
            sessionId: message.sessionId,
            receivedAt: new Date(),
          };
          dispatchWithRefUpdate({
            type: 'PERMISSION_REQUEST',
            request: permissionRequest,
          });
        }
        break;

      case 'permission_cancelled':
        if (message.requestId) {
          dispatchWithRefUpdate({
            type: 'PERMISSION_CANCELLED',
            requestId: message.requestId,
          });
        }
        break;

      case 'complete':
        dispatchWithRefUpdate({
          type: 'COMPLETE',
          exitCode: message.exitCode,
          aborted: message.aborted,
        });
        break;

      case 'error':
        dispatchWithRefUpdate({
          type: 'ERROR',
          error: message.error || 'Unknown error',
        });
        options.onError?.(message.error || 'Unknown error');
        break;

      case 'status':
      case 'thinking':
      case 'interactive_prompt':
        // These are informational, could be logged or handled specially
        break;

      default:
        console.warn('Unknown message kind:', message);
    }
  }, [options]);

  /**
   * Generate skill content
   */
  const generate = useCallback(async (
    prompt: string,
    mode: AIGenerationMode,
    context?: AIGenerationRequest['skillContext']
  ) => {
    const requestId = generateMessageId();

    // Store for retry
    lastRequestRef.current = { prompt, mode, context };

    // Start generation
    dispatchWithRefUpdate({ type: 'START_GENERATION', requestId });

    const request: AIGenerationRequest = {
      id: requestId, // 将requestId设置为request.id，以便后端正确关联
      prompt,
      mode,
      skillContext: context,
    };

    try {
      await aiClient.generateStream(requestId, request, {
        onMessage: handleMessage,
        onComplete: () => {
          // Call options.onComplete FIRST to set up any refs (like createdSkillNameRef)
          // BEFORE dispatching COMPLETE which triggers the isComplete effect
          // Use the mutable variables that are updated synchronously in the reducer
          options.onComplete?.(contentRef.current, toolCallsRef.current);
          dispatchWithRefUpdate({ type: 'COMPLETE' });
        },
        onError: (error) => {
          dispatchWithRefUpdate({ type: 'ERROR', error });
          options.onError?.(error);
        },
        onPermissionRequest: (request) => {
          dispatchWithRefUpdate({ type: 'PERMISSION_REQUEST', request: request });
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatchWithRefUpdate({ type: 'ERROR', error: errorMessage });
      options.onError?.(errorMessage);
    }
  }, [handleMessage, options, state.content, state.toolCalls]);

  /**
   * Stop/cancel generation
   */
  const stop = useCallback(async () => {
    if (state.requestId) {
      await aiClient.cancelGeneration(state.requestId);
      dispatchWithRefUpdate({ type: 'COMPLETE', aborted: true });
    }
  }, [state.requestId]);

  /**
   * Retry last generation
   */
  const retry = useCallback(async () => {
    if (lastRequestRef.current) {
      const { prompt, mode, context } = lastRequestRef.current;
      await generate(prompt, mode, context);
    }
  }, [generate]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    dispatchWithRefUpdate({ type: 'RESET' });
    lastRequestRef.current = null;
  }, []);

  /**
   * Resolve permission request
   */
  const resolvePermission = useCallback(async (
    requestId: string,
    decision: PermissionDecision
  ) => {
    const success = await aiClient.resolvePermission(requestId, decision);

    if (success) {
      dispatchWithRefUpdate({ type: 'PERMISSION_CANCELLED', requestId });
    }
  }, []);

  /**
   * Abort session
   */
  const abort = useCallback(async () => {
    if (state.sessionId) {
      await aiClient.abortSession(state.sessionId);
      dispatchWithRefUpdate({ type: 'COMPLETE', aborted: true });
    }
  }, [state.sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.requestId) {
        aiClient.cancelGeneration(state.requestId).catch(console.error);
      }
    };
  }, [state.requestId]);

  return {
    status: state.status,
    content: state.content,
    error: state.error,
    toolCalls: state.toolCalls,
    pendingPermissions: state.pendingPermissions,
    sessionId: state.sessionId,
    isStreaming: state.status === 'STREAMING',
    isComplete: state.status === 'COMPLETE',
    isIdle: state.status === 'IDLE',
    isWaitingPermission: state.status === 'WAITING_PERMISSION',
    generate,
    stop,
    retry,
    reset,
    resolvePermission,
    abort,
  };
}

export default useAIGeneration;
