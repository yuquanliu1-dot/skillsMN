/**
 * AI Configuration Service
 *
 * Manages AI-specific configuration with encrypted API key storage
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import { encryptAPIKey, decryptAPIKey } from '../utils/encryptionUtil';
import type { AIConfiguration, AIProvider, AIModel } from '../../shared/types';

const AI_CONFIG_FILE = 'ai-config.json';

/**
 * AI Configuration Service
 */
export class AIConfigService {
  private static configPath: string;
  private static cachedConfig: AIConfiguration | null = null;

  /**
   * Initialize the AI configuration service
   * Sets up the configuration file path in the user data directory
   * Must be called before using any other methods
   */
  static initialize(): void {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, AI_CONFIG_FILE);
    logger.info(`AI config path: ${this.configPath}`, 'AIConfigService');
  }

  /**
   * Get the default AI configuration with sensible defaults
   * @returns Default AIConfiguration object with Anthropic provider, Claude 3 Sonnet model, and recommended settings
   * @example
   * const defaultConfig = AIConfigService.getDefaultConfig();
   * // Returns: { provider: 'anthropic', model: 'claude-3-sonnet-20240229', ... }
   */
  static getDefaultConfig(): AIConfiguration {
    return {
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      streamingEnabled: true,
      timeout: 30000,
      maxRetries: 2,
    };
  }

  /**
   * Load AI configuration from disk, decrypting the API key
   * Returns cached configuration if available, otherwise loads from file
   * Creates default configuration if file doesn't exist
   * @returns Promise resolving to the AI configuration with decrypted API key
   * @throws Error if configuration file is corrupted (falls back to defaults)
   * @example
   * const config = await AIConfigService.loadConfig();
   * console.log(config.apiKey); // Decrypted API key
   */
  static async loadConfig(): Promise<AIConfiguration> {
    try {
      // Return cached config if available
      if (this.cachedConfig) {
        return this.cachedConfig;
      }

      // Check if config file exists
      if (!(await fs.pathExists(this.configPath))) {
        logger.info('AI config not found, creating default', 'AIConfigService');
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }

      // Load from file
      const configData = await fs.readJson(this.configPath);

      // Decrypt API key
      if (configData.apiKey) {
        try {
          configData.apiKey = decryptAPIKey(configData.apiKey);
        } catch (error) {
          logger.error('Failed to decrypt API key', 'AIConfigService', error);
          configData.apiKey = '';
        }
      }

      // Validate and merge with defaults
      const config: AIConfiguration = {
        ...this.getDefaultConfig(),
        ...configData,
      };

      // Cache config
      this.cachedConfig = config;

      logger.info('AI configuration loaded', 'AIConfigService');
      return config;
    } catch (error) {
      logger.error('Failed to load AI config', 'AIConfigService', error);
      const defaultConfig = this.getDefaultConfig();
      this.cachedConfig = defaultConfig;
      return defaultConfig;
    }
  }

  /**
   * Save AI configuration to disk, encrypting the API key
   * Validates configuration before saving and updates the cache
   * @param config - AI configuration to save (API key will be encrypted)
   * @throws Error if configuration is invalid or save fails
   * @example
   * await AIConfigService.saveConfig({
   *   provider: 'anthropic',
   *   apiKey: 'sk-ant-...',
   *   model: 'claude-3-sonnet-20240229',
   *   streamingEnabled: true,
   *   timeout: 30000,
   *   maxRetries: 2
   * });
   */
  static async saveConfig(config: AIConfiguration): Promise<void> {
    try {
      // Validate
      this.validateConfig(config);

      // Encrypt API key
      const configToSave = { ...config };
      if (configToSave.apiKey) {
        configToSave.apiKey = encryptAPIKey(configToSave.apiKey);
      }

      // Save to file
      await fs.writeJson(this.configPath, configToSave, { spaces: 2 });

      // Update cache with decrypted key
      this.cachedConfig = config;

      logger.info('AI configuration saved', 'AIConfigService');
    } catch (error) {
      logger.error('Failed to save AI config', 'AIConfigService', error);
      throw new Error('Failed to save AI configuration');
    }
  }

  /**
   * Validate configuration
   */
  private static validateConfig(config: AIConfiguration): void {
    // Validate provider
    const validProviders: AIProvider[] = ['anthropic'];
    if (!validProviders.includes(config.provider)) {
      throw new Error(`Invalid AI provider: ${config.provider}`);
    }

    // Validate API key (can be empty for initial setup)
    if (config.apiKey && typeof config.apiKey !== 'string') {
      throw new Error('API key must be a string');
    }

    // Validate model
    const validModels: AIModel[] = [
      'glm-5',
      'glm-4',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];
    if (!validModels.includes(config.model)) {
      throw new Error(`Invalid AI model: ${config.model}`);
    }

    // Validate timeout (5s - 60s)
    if (config.timeout < 5000 || config.timeout > 60000) {
      throw new Error('Timeout must be between 5000ms and 60000ms');
    }

    // Validate max retries
    if (config.maxRetries < 0 || config.maxRetries > 5) {
      throw new Error('Max retries must be between 0 and 5');
    }
  }

  /**
   * Clear the cached configuration
   * Forces next loadConfig() call to read from disk
   * Useful when configuration may have been updated externally
   * @example
   * AIConfigService.clearCache();
   * const freshConfig = await AIConfigService.loadConfig(); // Will read from disk
   */
  static clearCache(): void {
    this.cachedConfig = null;
  }
}
