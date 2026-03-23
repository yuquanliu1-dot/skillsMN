/**
 * AI Conversation IPC Handlers
 *
 * Handlers for AI conversation history operations
 */

import { ipcMain } from 'electron';
import { aiConversationService } from '../services/AIConversationService';
import { logger } from '../utils/Logger';
import { AIConversation } from '../../shared/types';

/**
 * Register AI conversation IPC handlers
 */
export function registerAIConversationHandlers(): void {
  /**
   * Save an AI conversation
   */
  ipcMain.handle('ai-conversation:save', async (_event, conversation: AIConversation) => {
    try {
      logger.info(`Saving AI conversation: ${conversation.id}`, 'AIConversationHandlers');
      const saved = await aiConversationService.saveConversation(conversation);
      return { success: true, data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save conversation';
      logger.error(`Failed to save conversation: ${message}`, 'AIConversationHandlers');
      return { success: false, error: { code: 'SAVE_ERROR', message } };
    }
  });

  /**
   * Load all AI conversations
   */
  ipcMain.handle('ai-conversation:load-all', async () => {
    try {
      const conversations = await aiConversationService.loadConversations();
      return { success: true, data: conversations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      logger.error(`Failed to load conversations: ${message}`, 'AIConversationHandlers');
      return { success: false, error: { code: 'LOAD_ERROR', message } };
    }
  });

  /**
   * Get a specific AI conversation
   */
  ipcMain.handle('ai-conversation:get', async (_event, conversationId: string) => {
    try {
      const conversation = await aiConversationService.getConversation(conversationId);
      return { success: true, data: conversation };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversation';
      logger.error(`Failed to get conversation: ${message}`, 'AIConversationHandlers');
      return { success: false, error: { code: 'GET_ERROR', message } };
    }
  });

  /**
   * Delete an AI conversation
   */
  ipcMain.handle('ai-conversation:delete', async (_event, conversationId: string) => {
    try {
      await aiConversationService.deleteConversation(conversationId);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete conversation';
      logger.error(`Failed to delete conversation: ${message}`, 'AIConversationHandlers');
      return { success: false, error: { code: 'DELETE_ERROR', message } };
    }
  });

  logger.info('AI conversation handlers registered', 'AIConversationHandlers');
}
