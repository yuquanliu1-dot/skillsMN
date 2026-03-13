/**
 * AI IPC Handlers
 *
 * IPC handlers for AI-powered skill generation
 */

import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { AIService } from '../services/AIService';
import { AIConfigService } from '../services/AIConfigService';
import { IPC_CHANNELS } from '../../shared/constants';
import type { AIGenerationRequest } from '../models/AIGenerationRequest';
import type { AIConfiguration } from '../../shared/types';

/**
 * Register AI IPC handlers
 */
export function registerAIHandlers(): void {
  // Handler for ai:generate
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE,
    async (event, { requestId, request }: { requestId: string; request: AIGenerationRequest }) => {
      try {
        logger.debug('Starting AI generation', 'AIHandlers', { requestId });

        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
          throw new Error('Window not found');
        }

        // Ensure AI service is initialized
        if (!AIService.isInitialized()) {
          logger.info('AI service not initialized, loading config...', 'AIHandlers');
          const config = await AIConfigService.loadConfig();

          if (!config.apiKey) {
            throw new Error('API key not configured. Please configure your API key in Settings.');
          }

          await AIService.initialize(config);
          logger.info('AI service initialized successfully', 'AIHandlers');
        }

        // Start streaming generation
        const stream = AIService.generateStream(requestId, request);

        // Process stream and send chunks to renderer
        for await (const chunk of stream) {
          // Send chunk to renderer
          win.webContents.send(IPC_CHANNELS.AI_CHUNK, {
            requestId,
            type: chunk.type,  // 'text' or 'tool_use'
            text: chunk.text,
            tool: chunk.tool,
            isComplete: chunk.isComplete,
            error: chunk.error,
          });

          // If error or complete, stop processing
          if (chunk.error || chunk.isComplete) {
            break;
          }

          // Add small delay to simulate 200ms chunk delivery
          await new Promise(resolve => setTimeout(resolve, 200));
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

        const cancelled = AIService.cancelGeneration(requestId);

        return { success: cancelled };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to cancel AI generation', 'AIHandlers', error);
        return { success: false, error: { code: 'CANCEL_ERROR', message: errorMessage } };
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

      const config = await AIConfigService.loadConfig();

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
    async (_event, { config }: { config: AIConfiguration }) => {
      try {
        logger.debug('Saving AI configuration', 'AIHandlers');

        await AIConfigService.saveConfig(config);

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
    async (_event, { config }: { config?: AIConfiguration } = {}) => {
      try {
        logger.debug('Testing AI configuration', 'AIHandlers');

        // Use provided config or load from storage
        const testConfig = config || await AIConfigService.loadConfig();

        // Validate that we have a config with an API key
        if (!testConfig || !testConfig.apiKey) {
          return {
            success: false,
            error: { code: 'CONFIG_MISSING', message: 'No API key configured. Please save your API key first.' }
          };
        }

        // Store original config for restoration
        const originalConfig = await AIConfigService.loadConfig().catch(() => null);

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
