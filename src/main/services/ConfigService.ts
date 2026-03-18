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
import { Configuration, PrivateRepo, PrivateRepoConfig } from '../../shared/types';
import { ConfigurationModel } from '../models/Configuration';
import { CONFIG_FILE_NAME, PRIVATE_REPOS_FILE_NAME } from '../../shared/constants';

export class ConfigService {
  private configPath: string;
  private privateReposPath: string;
  private config: Configuration | null = null;
  private privateRepos: PrivateRepoConfig | null = null;

  constructor() {
    // Get user data directory for configuration storage
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);
    this.privateReposPath = path.join(userDataPath, PRIVATE_REPOS_FILE_NAME);
    logger.info(`Configuration path: ${this.configPath}`, 'ConfigService');
  }

  /**
   * Load configuration from disk
   * Creates default configuration if file doesn't exist
   * Auto-migrates projectDirectory to projectDirectories if needed
   * @returns Loaded or default Configuration object
   * @throws ConfigurationError if file read fails (returns defaults on corruption)
   * @example
   * const config = await configService.load();
   * console.log(config.projectDirectories);
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

      // Check if we need to migrate old projectDirectory to new projectDirectories
      const needsMigration = rawConfig.projectDirectory &&
                             !rawConfig.projectDirectories &&
                             validatedConfig.projectDirectories.length > 0;

      if (needsMigration) {
        logger.info('Migrating projectDirectory to projectDirectories', 'ConfigService', {
          oldDirectory: rawConfig.projectDirectory,
          newDirectories: validatedConfig.projectDirectories,
        });

        // Save migrated config immediately
        await fs.promises.writeFile(
          this.configPath,
          JSON.stringify(validatedConfig, null, 2),
          'utf-8'
        );
      }

      this.config = validatedConfig;

      logger.info('Configuration loaded successfully', 'ConfigService', {
        projectDirectoryCount: validatedConfig.projectDirectories.length,
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
   * Merges updates with existing configuration and validates before saving
   * @param updates - Partial configuration object with fields to update
   * @returns Updated and validated Configuration object
   * @throws ConfigurationError if validation fails or save operation fails
   * @example
   * const updated = await configService.save({
   *   projectDirectory: '/path/to/project'
   * });
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
        projectDirectoryCount: validated.projectDirectories.length,
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
   * Get current configuration from cache (synchronous)
   * Returns null if configuration hasn't been loaded yet
   * @returns Cached Configuration object or null
   * @example
   * const config = configService.getCurrent();
   * if (config) {
   *   console.log(config.projectDirectory);
   * }
   */
  getCurrent(): Configuration | null {
    return this.config;
  }

  /**
   * Reset configuration to default values
   * Overwrites existing configuration with defaults
   * @returns Default Configuration object
   * @throws ConfigurationError if save operation fails
   * @example
   * const defaultConfig = await configService.reset();
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
   * Check if configuration is complete (has project directory set)
   * @returns True if project directory is configured, false otherwise
   * @example
   * if (await configService.isConfigured()) {
   *   // App is ready to use
   * } else {
   *   // Show setup dialog
   * }
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.load();
    return ConfigurationModel.isComplete(config);
  }

  /**
   * Load private repositories configuration from disk
   * Creates default configuration if file doesn't exist
   * @returns PrivateRepoConfig object with repositories array
   * @example
   * const privateConfig = await configService.loadPrivateRepos();
   * console.log(`${privateConfig.repositories.length} private repos configured`);
   */
  async loadPrivateRepos(): Promise<PrivateRepoConfig> {
    try {
      if (!fs.existsSync(this.privateReposPath)) {
        logger.info('No private repos file found, creating default', 'ConfigService');
        const defaultConfig = { version: 1, repositories: [] };
        await fs.promises.writeFile(
          this.privateReposPath,
          JSON.stringify(defaultConfig, null, 2),
          'utf-8'
        );
        return defaultConfig;
      }

      const content = await fs.promises.readFile(this.privateReposPath, 'utf-8');
      const config = JSON.parse(content);

      logger.debug('Private repos loaded', 'ConfigService', {
        repoCount: config.repositories?.length || 0,
      });

      return config;
    } catch (error) {
    ErrorHandler.log(error, 'ConfigService.loadPrivateRepos');
    return { version: 1, repositories: [] };
  }
}

  /**
   * Save private repositories configuration to disk
   * @param config - PrivateRepoConfig object to save
   * @throws ConfigurationError if save operation fails
   * @example
   * await configService.savePrivateRepos({
   *   version: 1,
   *   repositories: [repo1, repo2]
   * });
   */
  async savePrivateRepos(config: PrivateRepoConfig): Promise<void> {
    try {
    await fs.promises.writeFile(
      this.privateReposPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
    this.privateRepos = config;
    logger.debug('Private repos saved', 'ConfigService');
    } catch (error) {
      ErrorHandler.log(error, 'ConfigService.savePrivateRepos');
      throw new ConfigurationError('Failed to save private repos', 'private-repos');
    }
  }

  /**
   * Add a private repository configuration
   * Checks for duplicate URLs before adding
   * @param repo - PrivateRepo object to add
   * @throws Error if repository with same URL already exists
   * @example
   * await configService.addPrivateRepo({
   *   id: 'repo-1',
   *   url: 'https://github.com/owner/repo',
   *   owner: 'owner',
   *   repo: 'repo',
   *   patEncrypted: '...',
   *   createdAt: new Date(),
   *   updatedAt: new Date()
   * });
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
   * Merges updates with existing repository and validates for duplicate URLs
   * @param repoId - ID of repository to update
   * @param updates - Partial PrivateRepo object with fields to update
   * @throws Error if repository not found or URL conflicts with another repository
   * @example
   * await configService.updatePrivateRepo('repo-1', {
   *   displayName: 'My Updated Repo',
   *   defaultBranch: 'develop'
   * });
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
   * @param repoId - ID of repository to remove
   * @throws Error if repository not found
   * @example
   * await configService.removePrivateRepo('repo-1');
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
   * @param repoId - ID of repository to retrieve
   * @returns PrivateRepo object or null if not found
   * @example
   * const repo = await configService.getPrivateRepo('repo-1');
   * if (repo) {
   *   console.log(repo.url);
   * }
   */
  async getPrivateRepo(repoId: string): Promise<PrivateRepo | null> {
    const config = await this.loadPrivateRepos();
    return config.repositories.find(r => r.id === repoId) || null;
  }

  /**
   * List all configured private repositories
   * @returns Array of PrivateRepo objects
   * @example
   * const repos = await configService.listPrivateRepos();
   * repos.forEach(repo => console.log(repo.displayName));
   */
  async listPrivateRepos(): Promise<PrivateRepo[]> {
    const config = await this.loadPrivateRepos();
    return config.repositories;
  }
}
