/**
 * Configuration Service
 *
 * Manages application configuration persistence
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler, ConfigurationError } from '../utils/ErrorHandler';
import { Configuration } from '../../shared/types';
import { ConfigurationModel } from '../models/Configuration';
import { CONFIG_FILE_NAME } from '../../shared/constants';

export class ConfigService {
  private configPath: string;
  private config: Configuration | null = null;

  constructor() {
    // Get user data directory for configuration storage
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);
    logger.info(`Configuration path: ${this.configPath}`, 'ConfigService');
  }

  /**
   * Load configuration from disk
   */
  async load(): Promise<Configuration> {
    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        logger.info('No configuration file found, creating default', 'ConfigService');
        const defaultConfig = ConfigurationModel.createDefault();
        this.config = defaultConfig; // Set cached config before saving to prevent recursion
        await fs.promises.writeFile(
          this.configPath,
          JSON.stringify(defaultConfig, null, 2),
          'utf-8'
        );
        return defaultConfig;
      }

      // Read and parse config file
      const content = await fs.promises.readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(content);

      // Validate and merge with defaults
      const validatedConfig = ConfigurationModel.validate(rawConfig);
      this.config = validatedConfig;

      logger.info('Configuration loaded successfully', 'ConfigService', {
        hasProjectDirectory: validatedConfig.projectDirectory !== null,
      });

      return validatedConfig;
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.load');

      // If config file is corrupted, return defaults
      logger.warn('Configuration file corrupted, returning defaults', 'ConfigService');
      const defaultConfig = ConfigurationModel.createDefault();
      this.config = defaultConfig;
      return defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  async save(updates: Partial<Configuration>): Promise<Configuration> {
    try {
      // Load existing config or create default
      const existing = this.config ?? (await this.load());

      // Merge updates with existing
      const merged = ConfigurationModel.merge(existing, updates);

      // Validate merged config
      const validated = ConfigurationModel.validate(merged);

      // Write to disk atomically
      const content = JSON.stringify(validated, null, 2);
      await fs.promises.writeFile(this.configPath, content, 'utf-8');

      // Update cached config
      this.config = validated;

      logger.info('Configuration saved successfully', 'ConfigService', {
        hasProjectDirectory: validated.projectDirectory !== null,
      });

      return validated;
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.save');
      throw new ConfigurationError(
        'Failed to save configuration',
        'config'
      );
    }
  }

  /**
   * Get current configuration (cached)
   */
  getCurrent(): Configuration | null {
    return this.config;
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<Configuration> {
    try {
      const defaultConfig = ConfigurationModel.createDefault();
      await this.save(defaultConfig);
      logger.info('Configuration reset to defaults', 'ConfigService');
      return defaultConfig;
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.reset');
      throw new ConfigurationError(
        'Failed to reset configuration',
        'config'
      );
    }
  }

  /**
   * Check if configuration is complete (has project directory)
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.load();
    return ConfigurationModel.isComplete(config);
  }
}
