/**
 * Setup Defaults Service
 *
 * Loads default configuration values for the setup wizard from JSON resource file
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/Logger';

/**
 * Repository default configuration
 */
export interface DefaultRepoConfig {
  provider: 'gitlab';
  instanceUrl: string;
  repositoryUrl?: string;
  description?: string;
}

/**
 * AI configuration defaults
 */
export interface DefaultAIConfig {
  provider: string;
  model: string;
  baseUrl: string;
  streamingEnabled: boolean;
  timeout: number;
  maxRetries: number;
}

/**
 * Setup defaults structure (simplified)
 */
export interface SetupDefaults {
  version: number;
  description: string;
  lastUpdated: string;
  repository: DefaultRepoConfig;
  ai: DefaultAIConfig;
}

export class SetupDefaultsService {
  private static defaults: SetupDefaults | null = null;

  /**
   * Load defaults from JSON file
   */
  static async loadDefaults(): Promise<SetupDefaults> {
    if (this.defaults) {
      return this.defaults;
    }

    try {
      // Try to load from app resources directory
      let defaultsPath: string;

      if (app.isPackaged) {
        // In production, load from app resources
        defaultsPath = path.join(process.resourcesPath, 'app', 'resources', 'setup-defaults.json');
      } else {
        // In development, __dirname is: dist/src/main/services
        // Need to go up 4 levels to project root, then to app/resources
        defaultsPath = path.join(__dirname, '../../../../app/resources/setup-defaults.json');
      }

      logger.info(`Loading setup defaults from: ${defaultsPath}`, 'SetupDefaultsService');

      const fileContent = fs.readFileSync(defaultsPath, 'utf-8');
      this.defaults = JSON.parse(fileContent) as SetupDefaults;

      logger.info('Setup defaults loaded successfully', 'SetupDefaultsService', {
        version: this.defaults.version,
        lastUpdated: this.defaults.lastUpdated,
        repositoryUrl: this.defaults.repository.repositoryUrl,
      });

      return this.defaults;
    } catch (error) {
      logger.error('Failed to load setup defaults, using fallback values', 'SetupDefaultsService', error);

      // Fallback defaults if file cannot be loaded
      this.defaults = this.getFallbackDefaults();
      logger.info('Using fallback defaults', 'SetupDefaultsService', {
        repositoryUrl: this.defaults.repository.repositoryUrl,
      });
      return this.defaults;
    }
  }

  /**
   * Get fallback defaults if JSON file cannot be loaded
   */
  private static getFallbackDefaults(): SetupDefaults {
    return {
      version: 1,
      description: 'Fallback default configuration',
      lastUpdated: new Date().toISOString().split('T')[0],
      repository: {
        provider: 'gitlab',
        instanceUrl: 'https://192.168.30.111:8090',
        repositoryUrl: 'https://192.168.30.111:8090/skills-docs/develop_skills',
        description: '信息通信研发中心',
      },
      ai: {
        provider: 'anthropic',
        model: 'GLM-4.7',
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        streamingEnabled: true,
        timeout: 30000,
        maxRetries: 2,
      },
    };
  }

  /**
   * Get default repository configuration
   */
  static async getRepoConfig(): Promise<DefaultRepoConfig> {
    const defaults = await this.loadDefaults();
    return defaults.repository;
  }

  /**
   * Get default AI configuration
   */
  static async getAIConfig(): Promise<DefaultAIConfig> {
    const defaults = await this.loadDefaults();
    return defaults.ai;
  }
}
