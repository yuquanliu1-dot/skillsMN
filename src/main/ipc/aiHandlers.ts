/**
 * AI IPC Handlers
 *
 * IPC handlers for AI-powered skill generation
 */

import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { AIService } from '../services/AIService';
import { IPC_CHANNELS } from '../../shared/constants';
import type { AIGenerationRequest } from '../models/AIGenerationRequest';

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

        // Start streaming generation
        const stream = AIService.generateStream(requestId, request);

        // Process stream and send chunks to renderer
        for await (const chunk of stream) {
          // Send chunk to renderer
          win.webContents.send(IPC_CHANNELS.AI_CHUNK, {
            type: 'ai:chunk',
            chunk: chunk.text,
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
