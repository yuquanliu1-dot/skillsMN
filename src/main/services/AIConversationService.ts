/**
 * AI Conversation Service
 *
 * Manages persistent storage of AI conversation history
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import { AIConversation } from '../../shared/types';

const CONVERSATIONS_DIR = 'ai-conversations';
const MAX_CONVERSATIONS = 100; // Limit to prevent unbounded growth

export class AIConversationService {
  private conversationsDir: string;
  private initialized = false;

  constructor() {
    // Store conversations in userData directory
    const userDataPath = app.getPath('userData');
    this.conversationsDir = path.join(userDataPath, CONVERSATIONS_DIR);
  }

  /**
   * Initialize the service, creating the conversations directory if needed
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(this.conversationsDir)) {
        fs.mkdirSync(this.conversationsDir, { recursive: true });
        logger.info(`Created conversations directory: ${this.conversationsDir}`, 'AIConversationService');
      }
      this.initialized = true;
    } catch (error) {
      logger.error(`Failed to initialize conversations directory: ${error}`, 'AIConversationService');
      throw error;
    }
  }

  /**
   * Get the file path for a conversation
   */
  private getConversationPath(conversationId: string): string {
    return path.join(this.conversationsDir, `${conversationId}.json`);
  }

  /**
   * Save a conversation
   */
  async saveConversation(conversation: AIConversation): Promise<AIConversation> {
    this.ensureInitialized();

    const filePath = this.getConversationPath(conversation.id);

    try {
      // Update the updatedAt timestamp
      const updatedConversation: AIConversation = {
        ...conversation,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(updatedConversation, null, 2), 'utf-8');
      logger.info(`Saved conversation: ${conversation.id}`, 'AIConversationService');

      // Clean up old conversations if we exceed the limit
      this.cleanupOldConversations();

      return updatedConversation;
    } catch (error) {
      logger.error(`Failed to save conversation: ${error}`, 'AIConversationService');
      throw error;
    }
  }

  /**
   * Load all conversations, sorted by updatedAt (most recent first)
   */
  async loadConversations(): Promise<AIConversation[]> {
    this.ensureInitialized();

    try {
      const files = fs.readdirSync(this.conversationsDir)
        .filter(file => file.endsWith('.json'));

      const conversations: AIConversation[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(this.conversationsDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const conversation = JSON.parse(content) as AIConversation;
          conversations.push(conversation);
        } catch (error) {
          logger.warn(`Failed to load conversation ${file}: ${error}`, 'AIConversationService');
        }
      }

      // Sort by updatedAt, most recent first
      conversations.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      logger.info(`Loaded ${conversations.length} conversations`, 'AIConversationService');
      return conversations;
    } catch (error) {
      logger.error(`Failed to load conversations: ${error}`, 'AIConversationService');
      return [];
    }
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<AIConversation | null> {
    this.ensureInitialized();

    const filePath = this.getConversationPath(conversationId);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as AIConversation;
    } catch (error) {
      logger.error(`Failed to get conversation ${conversationId}: ${error}`, 'AIConversationService');
      return null;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getConversationPath(conversationId);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted conversation: ${conversationId}`, 'AIConversationService');
      }
    } catch (error) {
      logger.error(`Failed to delete conversation ${conversationId}: ${error}`, 'AIConversationService');
      throw error;
    }
  }

  /**
   * Clean up old conversations if we exceed the limit
   */
  private async cleanupOldConversations(): Promise<void> {
    try {
      const files = fs.readdirSync(this.conversationsDir)
        .filter(file => file.endsWith('.json'));

      if (files.length <= MAX_CONVERSATIONS) {
        return;
      }

      // Get file stats to determine age
      const fileStats = files.map(file => {
        const filePath = path.join(this.conversationsDir, file);
        const stat = fs.statSync(filePath);
        return { file, mtime: stat.mtime };
      });

      // Sort by modification time, oldest first
      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest files to get under the limit
      const toDelete = fileStats.slice(0, files.length - MAX_CONVERSATIONS);

      for (const { file } of toDelete) {
        const filePath = path.join(this.conversationsDir, file);
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old conversation: ${file}`, 'AIConversationService');
      }
    } catch (error) {
      logger.error(`Failed to cleanup conversations: ${error}`, 'AIConversationService');
    }
  }
}

// Export singleton instance
export const aiConversationService = new AIConversationService();
