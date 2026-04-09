/**
 * Configuration Service
 *
 * Manages unified application configuration persistence
 * Stores config in userData directory (persists across reinstallations)
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler, ConfigurationError } from '../utils/ErrorHandler';
import {
  AppConfiguration,
  BaseConfiguration,
  AIConfigSection,
  PrivateRepoConfigSection,
  PrivateRepo,
  AIProvider,
  SkillGroupsConfig,
} from '../../shared/types';
import { ConfigurationModel } from '../models/Configuration';
import { CONFIG_FILE_NAME, CONFIG_VERSION } from '../../shared/constants';
import { encryptAPIKey, decryptAPIKey } from '../utils/encryptionUtil';

/**
 * Get default AI configuration
 */
function getDefaultAIConfig(): AIConfigSection {
  return {
    provider: 'anthropic',
    apiKey: '',
    model: '',
    streamingEnabled: true,
    timeout: 30000,
    maxRetries: 2,
  };
}

/**
 * Get default private repos configuration
 */
function getDefaultPrivateReposConfig(): PrivateRepoConfigSection {
  return {
    version: 1,
    repositories: [],
  };
}

/**
 * Get default skill groups configuration
 */
function getDefaultSkillGroupsConfig(): SkillGroupsConfig {
  return {
    version: 1,
    groups: [],
    defaultGroupsInitialized: false,
  };
}

/**
 * Get default unified configuration
 */
function createDefaultConfig(): AppConfiguration {
  const baseConfig = ConfigurationModel.createDefault();
  return {
    ...baseConfig,
    version: CONFIG_VERSION,
    ai: getDefaultAIConfig(),
    privateRepos: getDefaultPrivateReposConfig(),
    skillGroups: getDefaultSkillGroupsConfig(),
  };
}

export class ConfigService {
  private configPath: string;
  private config: AppConfiguration | null = null;
  private legacyConfigPath: string | null = null;

  constructor() {
    // Store config in userData directory (persists across app reinstallations)
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);

    // Also track legacy config path for migration
    if (app.isPackaged) {
      this.legacyConfigPath = path.join(path.dirname(app.getPath('exe')), CONFIG_FILE_NAME);
    } else {
      // In development, legacy config is in project root
      let appPath: string;
      let currentDir = __dirname;
      for (let i = 0; i < 10; i++) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          appPath = currentDir;
          break;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          appPath = process.cwd();
          break;
        }
        currentDir = parentDir;
      }
      if (!appPath!) {
        appPath = process.cwd();
      }
      this.legacyConfigPath = path.join(appPath, CONFIG_FILE_NAME);
    }

    logger.info(`Configuration path: ${this.configPath}`, 'ConfigService');
    logger.info(`Legacy configuration path: ${this.legacyConfigPath}`, 'ConfigService');

    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Migrate config from legacy location if needed
    this.migrateFromLegacy();
  }

  /**
   * Migrate configuration from legacy location to userData directory
   */
  private migrateFromLegacy(): void {
    if (!this.legacyConfigPath || !fs.existsSync(this.legacyConfigPath)) {
      return; // No legacy config to migrate
    }

    // Check if new config already exists
    if (fs.existsSync(this.configPath)) {
      logger.info('Both legacy and new config exist, keeping new config', 'ConfigService');
      return;
    }

    try {
      // Copy legacy config to new location
      const legacyConfig = fs.readFileSync(this.legacyConfigPath, 'utf-8');
      fs.writeFileSync(this.configPath, legacyConfig, 'utf-8');
      logger.info('Migrated configuration from legacy location to userData directory', 'ConfigService', {
        from: this.legacyConfigPath,
        to: this.configPath,
      });
    } catch (error) {
      logger.warn('Failed to migrate legacy configuration, will create new config', 'ConfigService', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Load configuration from disk
   * Creates default configuration if file doesn't exist
   * @returns Loaded or default AppConfiguration object
   */
  async load(): Promise<AppConfiguration> {
    try {
      // Check if config file exists
      if (fs.existsSync(this.configPath)) {
        const content = await fs.promises.readFile(this.configPath, 'utf-8');
        const rawConfig = JSON.parse(content);

        // Validate and merge with defaults
        const validatedConfig = this.validateAndMerge(rawConfig);
        this.config = validatedConfig;

        logger.info('Configuration loaded successfully', 'ConfigService', {
          projectDirectoryCount: validatedConfig.projectDirectories.length,
        });

        return validatedConfig;
      }

      // Create new default config
      logger.info('Creating default configuration', 'ConfigService');
      const defaultConfig = createDefaultConfig();
      this.config = defaultConfig;
      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(defaultConfig, null, 2),
        'utf-8'
      );
      return defaultConfig;

    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.load');

      // If config file is corrupted or can't be read, return defaults
      // BUT do NOT cache them to prevent overwriting real config on next save
      logger.warn('Configuration file load failed, returning defaults (not cached)', 'ConfigService', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const defaultConfig = createDefaultConfig();
      // Don't cache defaults on error - this prevents save() from overwriting real config
      // this.config = defaultConfig; // REMOVED
      return defaultConfig;
    }
  }

  /**
   * Validate and merge configuration with defaults
   */
  private validateAndMerge(rawConfig: any): AppConfiguration {
    const defaults = createDefaultConfig();

    // Validate base config using existing model
    const validatedBase = ConfigurationModel.validate(rawConfig);

    // Validate AI config
    const aiConfig: AIConfigSection = {
      provider: rawConfig.ai?.provider || defaults.ai.provider,
      apiKey: rawConfig.ai?.apiKey || '',
      model: rawConfig.ai?.model || defaults.ai.model,
      streamingEnabled: rawConfig.ai?.streamingEnabled ?? defaults.ai.streamingEnabled,
      timeout: rawConfig.ai?.timeout || defaults.ai.timeout,
      maxRetries: rawConfig.ai?.maxRetries ?? defaults.ai.maxRetries,
      baseUrl: rawConfig.ai?.baseUrl,
    };

    // Decrypt API key if present
    if (aiConfig.apiKey) {
      try {
        aiConfig.apiKey = decryptAPIKey(aiConfig.apiKey);
      } catch {
        // Key might not be encrypted, use as-is
      }
    }

    // Validate private repos
    const privateReposConfig: PrivateRepoConfigSection = {
      version: rawConfig.privateRepos?.version || 1,
      repositories: rawConfig.privateRepos?.repositories || [],
    };

    // Validate skill groups
    const skillGroupsConfig: SkillGroupsConfig | undefined = rawConfig.skillGroups || undefined;

    // Validate proxy config (handle both old and new format)
    let proxyConfig: import('../../shared/types').ProxyConfig | undefined;
    if (rawConfig.proxy) {
      // Check if new format
      if (rawConfig.proxy.enabled !== undefined) {
        proxyConfig = {
          enabled: rawConfig.proxy.enabled,
          type: rawConfig.proxy.type || 'system',
          customUrl: rawConfig.proxy.customUrl,
        };
      } else {
        // Migrate old format to new
        proxyConfig = {
          enabled: !!(rawConfig.proxy.useSystemProxy || rawConfig.proxy.customProxyUrl),
          type: rawConfig.proxy.customProxyUrl ? 'custom' : 'system',
          customUrl: rawConfig.proxy.customProxyUrl || undefined,
        };
      }
    }

    return {
      ...validatedBase,
      version: rawConfig.version || CONFIG_VERSION,
      ai: aiConfig,
      privateRepos: privateReposConfig,
      skillGroups: skillGroupsConfig,
      proxy: proxyConfig,
    };
  }

  /**
   * Save configuration to disk
   * Merges updates with existing configuration and validates before saving
   */
  async save(updates: Partial<BaseConfiguration> & { skillGroups?: SkillGroupsConfig; proxy?: import('../../shared/types').ProxyConfig }): Promise<AppConfiguration> {
    try {
      // Always load from disk to ensure we have the latest config
      // This prevents losing data if this.config was cleared or corrupted
      const existing = await this.load();

      // Merge updates with existing
      const merged = ConfigurationModel.merge(existing, updates);

      // Validate merged config
      const validated = ConfigurationModel.validate(merged);

      // Build new config preserving AI, private repos, skill groups, and proxy
      // Use existing (from disk) instead of this.config to avoid losing data
      const newConfig: AppConfiguration = {
        ...validated,
        version: existing.version || CONFIG_VERSION,
        ai: existing.ai || getDefaultAIConfig(),
        privateRepos: existing.privateRepos || getDefaultPrivateReposConfig(),
        skillGroups: updates.skillGroups !== undefined ? updates.skillGroups : existing.skillGroups,
        proxy: updates.proxy !== undefined ? updates.proxy : existing.proxy,
      };

      // Safeguard: Detect potential data loss
      // If existing had project directories but new config doesn't, and the update
      // didn't explicitly clear them, something went wrong
      if (
        existing.projectDirectories.length > 0 &&
        newConfig.projectDirectories.length === 0 &&
        updates.projectDirectories === undefined
      ) {
        logger.error('Prevented potential config data loss - existing project directories would be lost', 'ConfigService', {
          existingDirectories: existing.projectDirectories,
        });
        throw new ConfigurationError(
          'Configuration save aborted: would lose existing project directories',
          'config'
        );
      }

      // Write to disk (encrypt API key before saving)
      const configToSave = {
        ...newConfig,
        ai: {
          ...newConfig.ai,
          apiKey: newConfig.ai.apiKey ? encryptAPIKey(newConfig.ai.apiKey) : '',
        },
      };

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );

      // Update cached config (with decrypted key)
      this.config = newConfig;

      logger.info('Configuration saved successfully', 'ConfigService', {
        projectDirectoryCount: validated.projectDirectories.length,
      });

      return newConfig;
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.save');
      throw new ConfigurationError(
        'Failed to save configuration',
        'config'
      );
    }
  }

  /**
   * Get current configuration from cache (synchronous)
   */
  getCurrent(): AppConfiguration | null {
    return this.config;
  }

  /**
   * Reset configuration to default values
   */
  async reset(): Promise<AppConfiguration> {
    try {
      const defaultConfig = createDefaultConfig();
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
   * Check if configuration is complete (has project directory set)
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.load();
    return ConfigurationModel.isComplete(config);
  }

  // ============================================================================
  // AI Configuration Methods
  // ============================================================================

  /**
   * Load AI configuration
   */
  async loadAIConfig(): Promise<AIConfigSection> {
    const config = await this.load();
    return config.ai;
  }

  /**
   * Save AI configuration
   */
  async saveAIConfig(aiConfig: AIConfigSection): Promise<void> {
    try {
      // Validate AI config
      this.validateAIConfig(aiConfig);

      // Load full config
      const config = await this.load();

      // Update AI section
      config.ai = aiConfig;

      // Save (encrypt API key)
      const configToSave = {
        ...config,
        ai: {
          ...config.ai,
          apiKey: config.ai.apiKey ? encryptAPIKey(config.ai.apiKey) : '',
        },
      };

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );

      // Update cache
      this.config = config;

      logger.info('AI configuration saved', 'ConfigService');
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.saveAIConfig');
      throw new ConfigurationError('Failed to save AI configuration', 'ai-config');
    }
  }

  /**
   * Validate AI configuration
   */
  private validateAIConfig(config: AIConfigSection): void {
    const validProviders: AIProvider[] = ['anthropic'];
    if (!validProviders.includes(config.provider)) {
      throw new Error(`Invalid AI provider: ${config.provider}`);
    }

    if (config.apiKey && typeof config.apiKey !== 'string') {
      throw new Error('API key must be a string');
    }

    if (!config.model || typeof config.model !== 'string') {
      throw new Error('Model must be a non-empty string');
    }

    if (config.timeout < 5000 || config.timeout > 60000) {
      throw new Error('Timeout must be between 5000ms and 60000ms');
    }

    if (config.maxRetries < 0 || config.maxRetries > 5) {
      throw new Error('Max retries must be between 0 and 5');
    }
  }

  // ============================================================================
  // Private Repository Methods
  // ============================================================================

  /**
   * Load private repositories configuration
   */
  async loadPrivateRepos(): Promise<PrivateRepoConfigSection> {
    const config = await this.load();
    return config.privateRepos;
  }

  /**
   * Save private repositories configuration
   */
  async savePrivateRepos(privateRepos: PrivateRepoConfigSection): Promise<void> {
    try {
      const config = await this.load();
      config.privateRepos = privateRepos;

      // Save (encrypt API key in AI section)
      const configToSave = {
        ...config,
        ai: {
          ...config.ai,
          apiKey: config.ai.apiKey ? encryptAPIKey(config.ai.apiKey) : '',
        },
      };

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );

      this.config = config;
      logger.debug('Private repos saved', 'ConfigService');
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.savePrivateRepos');
      throw new ConfigurationError('Failed to save private repos', 'private-repos');
    }
  }

  /**
   * Add a private repository configuration
   */
  async addPrivateRepo(repo: PrivateRepo): Promise<void> {
    const config = await this.loadPrivateRepos();

    // Check for duplicate URL
    const existingWithUrl = config.repositories.find(r => r.url === repo.url);
    if (existingWithUrl) {
      throw new Error(`Repository with URL ${repo.url} already exists`);
    }

    config.repositories.push(repo);
    await this.savePrivateRepos(config);

    logger.info('Private repository added', 'ConfigService', {
      id: repo.id,
      url: repo.url,
    });
  }

  /**
   * Update a private repository configuration
   */
  async updatePrivateRepo(
    repoId: string,
    updates: Partial<PrivateRepo>
  ): Promise<void> {
    const config = await this.loadPrivateRepos();
    const index = config.repositories.findIndex(r => r.id === repoId);

    if (index === -1) {
      throw new Error(`Repository with ID ${repoId} not found`);
    }

    // If updating URL, check for duplicates
    if (updates.url && updates.url !== config.repositories[index].url) {
      const existingWithUrl = config.repositories.find(
        r => r.id !== repoId && r.url === updates.url
      );
      if (existingWithUrl) {
        throw new Error(`Repository with URL ${updates.url} already exists`);
      }
    }

    config.repositories[index] = {
      ...config.repositories[index],
      ...updates,
      updatedAt: new Date(),
    };

    await this.savePrivateRepos(config);

    logger.info('Private repository updated', 'ConfigService', {
      id: repoId,
      updatedFields: Object.keys(updates),
    });
  }

  /**
   * Remove a private repository configuration
   */
  async removePrivateRepo(repoId: string): Promise<void> {
    const config = await this.loadPrivateRepos();
    const index = config.repositories.findIndex(r => r.id === repoId);

    if (index === -1) {
      throw new Error(`Repository with ID ${repoId} not found`);
    }

    config.repositories.splice(index, 1);
    await this.savePrivateRepos(config);

    logger.info('Private repository removed', 'ConfigService', { id: repoId });
  }

  /**
   * Get a specific private repository by ID
   */
  async getPrivateRepo(repoId: string): Promise<PrivateRepo | null> {
    const config = await this.loadPrivateRepos();
    return config.repositories.find(r => r.id === repoId) || null;
  }

  /**
   * List all configured private repositories
   */
  async listPrivateRepos(): Promise<PrivateRepo[]> {
    const config = await this.loadPrivateRepos();
    return config.repositories;
  }

  // ============================================================================
  // Skill Groups Methods
  // ============================================================================

  /**
   * Load skill groups configuration
   */
  async loadSkillGroups(): Promise<SkillGroupsConfig | undefined> {
    const config = await this.load();
    return config.skillGroups;
  }

  /**
   * Save skill groups configuration
   */
  async saveSkillGroups(skillGroups: SkillGroupsConfig): Promise<void> {
    try {
      const config = await this.load();
      config.skillGroups = skillGroups;

      // Save (encrypt API key in AI section)
      const configToSave = {
        ...config,
        ai: {
          ...config.ai,
          apiKey: config.ai.apiKey ? encryptAPIKey(config.ai.apiKey) : '',
        },
      };

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );

      this.config = config;
      logger.debug('Skill groups saved', 'ConfigService');
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.saveSkillGroups');
      throw new ConfigurationError('Failed to save skill groups', 'skill-groups');
    }
  }

  // ============================================================================
  // Proxy Configuration Methods
  // ============================================================================

  /**
   * Load proxy configuration
   */
  async loadProxyConfig(): Promise<import('../../shared/types').ProxyConfig | undefined> {
    const config = await this.load();
    return config.proxy;
  }

  /**
   * Save proxy configuration
   */
  async saveProxyConfig(proxyConfig: import('../../shared/types').ProxyConfig): Promise<void> {
    try {
      const config = await this.load();
      config.proxy = proxyConfig;

      // Save (encrypt API key in AI section)
      const configToSave = {
        ...config,
        ai: {
          ...config.ai,
          apiKey: config.ai.apiKey ? encryptAPIKey(config.ai.apiKey) : '',
        },
      };

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf-8'
      );

      this.config = config;
      logger.info('Proxy configuration saved', 'ConfigService');
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.saveProxyConfig');
      throw new ConfigurationError('Failed to save proxy configuration', 'proxy-config');
    }
  }
}
