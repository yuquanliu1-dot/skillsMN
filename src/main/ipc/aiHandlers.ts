/**
 * AI IPC Handlers
 *
 * IPC handlers for AI-powered skill generation
 * Supports NormalizedMessage format, permission management, and session control
 */

import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { AIService } from '../services/AIService';
import { IPC_CHANNELS } from '../../shared/constants';
import { getConfigService } from './configHandlers';
import type { AIGenerationRequest } from '../models/AIGenerationRequest';
import type { AIConfigSection, NormalizedMessage, PermissionDecision } from '../../shared/types';

/**
 * Register AI IPC handlers
 */
export function registerAIHandlers(): void {
  // Handler for ai:generate - uses NormalizedMessage format
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE,
    async (event, { requestId, request }: { requestId: string; request: AIGenerationRequest }) => {
      try {
        logger.debug('Starting AI generation', 'AIHandlers', { requestId });

        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
          throw new Error('Window not found');
        }

        const configService = getConfigService();
        if (!configService) {
          throw new Error('Configuration service not initialized');
        }

        // Ensure AI service is initialized
        if (!AIService.isInitialized()) {
          logger.info('AI service not initialized, loading config...', 'AIHandlers');
          const config = await configService.loadAIConfig();

          if (!config.apiKey) {
            throw new Error('API key not configured. Please configure your API key in Settings.');
          }

          await AIService.initialize(config);
          logger.info('AI service initialized successfully', 'AIHandlers');
        }

        // Start streaming generation with main window reference
        const stream = AIService.generateStream(requestId, request, win);

        // Process stream and send NormalizedMessages to renderer
        for await (const message of stream) {
          // Send message to renderer via ai:message channel
          win.webContents.send('ai:message', message);

          // If error or complete, stop processing
          if (message.kind === 'error' || message.kind === 'complete') {
            break;
          }

          // Small delay to avoid overwhelming the renderer
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to generate AI content', 'AIHandlers', error);
        return { success: false, error: { code: 'AI_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:cancel
  ipcMain.handle(
    IPC_CHANNELS.AI_CANCEL,
    async (_event, { requestId }: { requestId: string }) => {
      try {
        logger.debug('Cancelling AI generation', 'AIHandlers', { requestId });

        const cancelled = await AIService.cancelGeneration(requestId);

        return { success: cancelled };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to cancel AI generation', 'AIHandlers', error);
        return { success: false, error: { code: 'CANCEL_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:abort-session
  ipcMain.handle(
    'ai:abort-session',
    async (_event, { sessionId }: { sessionId: string }) => {
      try {
        logger.debug('Aborting AI session', 'AIHandlers', { sessionId });

        const aborted = await AIService.abortSession(sessionId);

        return { success: aborted };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to abort AI session', 'AIHandlers', error);
        return { success: false, error: { code: 'ABORT_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:check-session-status
  ipcMain.handle(
    'ai:check-session-status',
    async (_event, { sessionId }: { sessionId: string }) => {
      try {
        const isActive = AIService.isSessionActive(sessionId);
        const pendingPermissions = AIService.getPendingPermissions(sessionId);

        return {
          success: true,
          data: {
            isActive,
            pendingPermissions,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to check session status', 'AIHandlers', error);
        return { success: false, error: { code: 'STATUS_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:get-active-sessions
  ipcMain.handle(
    'ai:get-active-sessions',
    async () => {
      try {
        const sessions = AIService.getActiveSessions();
        return { success: true, data: { sessions } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to get active sessions', 'AIHandlers', error);
        return { success: false, error: { code: 'SESSIONS_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:resolve-permission
  ipcMain.handle(
    'ai:resolve-permission',
    async (
      _event,
      { requestId, decision }: { requestId: string; decision: PermissionDecision }
    ) => {
      try {
        logger.debug('Resolving permission request', 'AIHandlers', { requestId, allow: decision.allow });

        const resolved = AIService.resolvePermission(requestId, decision);

        return { success: resolved };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to resolve permission', 'AIHandlers', error);
        return { success: false, error: { code: 'PERMISSION_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:get-pending-permissions
  ipcMain.handle(
    'ai:get-pending-permissions',
    async (_event, { sessionId }: { sessionId?: string }) => {
      try {
        // Get all pending permissions, optionally filtered by session
        const allPending: Array<{
          requestId: string;
          toolName: string;
          input: any;
          sessionId?: string;
          receivedAt: Date;
        }> = [];

        // If sessionId provided, get pending for that session
        // Otherwise, return all pending (for display in UI)
        // This is handled internally by AIService

        return { success: true, data: { pending: allPending } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to get pending permissions', 'AIHandlers', error);
        return { success: false, error: { code: 'PERMISSION_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:reconnect-session
  ipcMain.handle(
    'ai:reconnect-session',
    async (event, { sessionId }: { sessionId: string }) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
          throw new Error('Window not found');
        }

        const reconnected = AIService.reconnectSession(sessionId, win);

        return { success: reconnected };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to reconnect session', 'AIHandlers', error);
        return { success: false, error: { code: 'RECONNECT_ERROR', message: errorMessage } };
      }
    }
  );

  logger.info('AI IPC handlers registered', 'AIHandlers');
}

/**
 * Register config:test-ai handler
 */
export function registerAITestHandler(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_TEST_AI, async () => {
    try {
      logger.debug('Testing AI connection', 'AIHandlers');

      const result = await AIService.testConnection();

      return { success: result.success, error: result.error ? { code: 'CONNECTION_ERROR', message: result.error } : undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to test AI connection', 'AIHandlers', error);
      return { success: false, error: { code: 'TEST_ERROR', message: errorMessage } };
    }
  });

  logger.info('AI test handler registered', 'AIHandlers');
}

/**
 * Register AI Configuration handlers (T015)
 */
export function registerAIConfigHandlers(): void {
  // Handler for ai:config:get
  ipcMain.handle(IPC_CHANNELS.AI_CONFIG_GET, async () => {
    try {
      logger.debug('Loading AI configuration', 'AIHandlers');

      const configService = getConfigService();
      if (!configService) {
        throw new Error('Configuration service not initialized');
      }

      const config = await configService.loadAIConfig();

      return { success: true, data: config };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load AI configuration', 'AIHandlers', error);
      return { success: false, error: { code: 'CONFIG_LOAD_ERROR', message: errorMessage } };
    }
  });

  // Handler for ai:config:save
  ipcMain.handle(
    IPC_CHANNELS.AI_CONFIG_SAVE,
    async (_event, { config }: { config: AIConfigSection }) => {
      try {
        logger.debug('Saving AI configuration', 'AIHandlers');

        const configService = getConfigService();
        if (!configService) {
          throw new Error('Configuration service not initialized');
        }

        await configService.saveAIConfig(config);

        // Re-initialize AI service with new config
        await AIService.initialize(config);

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to save AI configuration', 'AIHandlers', error);
        return { success: false, error: { code: 'CONFIG_SAVE_ERROR', message: errorMessage } };
      }
    }
  );

  // Handler for ai:config:test
  ipcMain.handle(
    IPC_CHANNELS.AI_CONFIG_TEST,
    async (_event, { config }: { config?: AIConfigSection } = {}) => {
      try {
        logger.debug('Testing AI configuration', 'AIHandlers');

        const configService = getConfigService();
        if (!configService) {
          throw new Error('Configuration service not initialized');
        }

        // Use provided config or load from storage
        const testConfig = config || await configService.loadAIConfig();

        // Validate that we have a config with an API key
        if (!testConfig || !testConfig.apiKey) {
          return {
            success: false,
            error: { code: 'CONFIG_MISSING', message: 'No API key configured. Please save your API key first.' }
          };
        }

        // Store original config for restoration
        const originalConfig = await configService.loadAIConfig().catch(() => null);

        try {
          await AIService.initialize(testConfig);
          const result = await AIService.testConnection();

          return {
            success: result.success,
            error: result.error ? { code: 'CONNECTION_ERROR', message: result.error } : undefined,
            latency: result.latency
          };
        } finally {
          // Restore original config if it existed and had an API key
          if (originalConfig && originalConfig.apiKey) {
            await AIService.initialize(originalConfig).catch(err => {
              logger.error('Failed to restore original config', 'AIHandlers', err);
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to test AI configuration', 'AIHandlers', error);
        return { success: false, error: { code: 'CONFIG_TEST_ERROR', message: errorMessage } };
      }
    }
  );

  logger.info('AI configuration handlers registered', 'AIHandlers');
}

/**
 * Register all AI handlers
 */
export function registerAllAIHandlers(): void {
  registerAIHandlers();
  registerAITestHandler();
  registerAIConfigHandlers();
}
