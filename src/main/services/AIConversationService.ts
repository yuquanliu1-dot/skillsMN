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
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.promises.access(this.conversationsDir).catch(() => null);
      await fs.promises.mkdir(this.conversationsDir, { recursive: true });
      logger.info(`Created conversations directory: ${this.conversationsDir}`, 'AIConversationService');
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
    await this.ensureInitialized();

    const filePath = this.getConversationPath(conversation.id);

    try {
      // Update the updatedAt timestamp
      const updatedConversation: AIConversation = {
        ...conversation,
        updatedAt: new Date().toISOString(),
      };

      await fs.promises.writeFile(filePath, JSON.stringify(updatedConversation, null, 2), 'utf-8');
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
    await this.ensureInitialized();

    try {
      const files = (await fs.promises.readdir(this.conversationsDir))
        .filter(file => file.endsWith('.json'));

      const conversations: AIConversation[] = [];

      // Read all files in parallel
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const filePath = path.join(this.conversationsDir, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          return JSON.parse(content) as AIConversation;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          conversations.push(result.value);
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
    await this.ensureInitialized();

    const filePath = this.getConversationPath(conversationId);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as AIConversation;
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.ensureInitialized();

    const filePath = this.getConversationPath(conversationId);

    try {
      await fs.promises.unlink(filePath);
      logger.info(`Deleted conversation: ${conversationId}`, 'AIConversationService');
    } catch (error) {
      // File may not exist, that's fine
    }
  }

  /**
   * Clean up old conversations if we exceed the limit
   */
  private async cleanupOldConversations(): Promise<void> {
    try {
      const files = (await fs.promises.readdir(this.conversationsDir))
        .filter(file => file.endsWith('.json'));

      if (files.length <= MAX_CONVERSATIONS) {
        return;
      }

      // Get file stats to determine age (parallel)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.conversationsDir, file);
          const stat = await fs.promises.stat(filePath);
          return { file, mtime: stat.mtime };
        })
      );

      // Sort by modification time, oldest first
      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest files to get under the limit (parallel)
      const toDelete = fileStats.slice(0, files.length - MAX_CONVERSATIONS);
      await Promise.all(
        toDelete.map(async ({ file }) => {
          const filePath = path.join(this.conversationsDir, file);
          await fs.promises.unlink(filePath);
          logger.info(`Cleaned up old conversation: ${file}`, 'AIConversationService');
        })
      );
    } catch (error) {
      logger.error(`Failed to cleanup conversations: ${error}`, 'AIConversationService');
    }
  }
}

// Export singleton instance
export const aiConversationService = new AIConversationService();
