/**
 * Configuration service - manages application settings
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';
import { Configuration } from '../models/Configuration';
import { AppError } from '../utils/ErrorHandler';
import { logger } from '../utils/Logger';
import { PathValidator } from './PathValidator';

/**
 * Configuration service with persistence and validation
 */
export class ConfigService {
  private configPath: string;
  private config: Configuration | null = null;
  private pathValidator: PathValidator;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(app.getPath('userData'), 'config.json');
    this.pathValidator = new PathValidator([]);
  }

  /**
   * Load configuration from disk
   */
  public load(): Configuration {
    const startTime = Date.now();

    try {
      // If config file exists, load it
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf8');
        const data = JSON.parse(content);

        // Validate loaded data
        const validation = this.validateConfig(data);
        if (!validation.isValid) {
          logger.warn('ConfigService', 'Invalid config found, using defaults', {
            errors: validation.errors,
          });
          return this.getDefaultConfig();
        }

        this.config = new Configuration(data);
        logger.info('ConfigService', 'Configuration loaded', {
          duration: Date.now() - startTime,
        });

        return this.config;
      }

      // Create default config if file doesn't exist
      logger.info('ConfigService', 'Creating default configuration');
      this.config = this.getDefaultConfig();
      this.save(this.config);

      return this.config;
    } catch (error) {
      logger.error('ConfigService', 'Failed to load configuration', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return default config on error
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Save configuration to disk
   */
  public save(config: Configuration): void {
    const startTime = Date.now();

    try {
      // Validate config before saving
      const validation = config.validate();
      if (!validation.isValid) {
        throw new AppError(
          'EINVAL',
          'Invalid configuration',
          'Configuration validation failed',
          `Fix the following issues: ${validation.errors.join(', ')}`
        );
      }

      // Ensure parent directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write atomically (write to temp, then rename)
      const tempPath = `${this.configPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf8');
      fs.renameSync(tempPath, this.configPath);

      this.config = config;

      logger.info('ConfigService', 'Configuration saved', {
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('ConfigService', 'Failed to save configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  public get(): Configuration {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Update specific configuration fields
   */
  public set(updates: Partial<Configuration>): Configuration {
    const current = this.get();

    // Create updated config
    const updated = new Configuration({
      projectSkillDir: updates.projectSkillDir ?? current.projectSkillDir,
      globalSkillDir: updates.globalSkillDir ?? current.globalSkillDir,
      defaultInstallTarget: updates.defaultInstallTarget ?? current.defaultInstallTarget,
      editorDefaultMode: updates.editorDefaultMode ?? current.editorDefaultMode,
      autoRefresh: updates.autoRefresh ?? current.autoRefresh,
    });

    // Validate updates
    const validation = updated.validate();
    if (!validation.isValid) {
      throw new AppError(
        'EINVAL',
        'Invalid configuration update',
        'Configuration update validation failed',
        `Fix the following issues: ${validation.errors.join(', ')}`
      );
    }

    // Save and return
    this.save(updated);
    return updated;
  }

  /**
   * Validate a project directory
   */
  public validateProjectDirectory(dirPath: string): {
    isValid: boolean;
    hasClaudeFolder: boolean;
    skillsDir: string | null;
    errors: string[];
  } {
    const errors: string[] = [];
    let hasClaudeFolder = false;
    let skillsDir: string | null = null;

    try {
      // Check if directory exists
      if (!fs.existsSync(dirPath)) {
        errors.push(`Directory "${dirPath}" does not exist. Please select an existing directory or create it first.`);
        return { isValid: false, hasClaudeFolder, skillsDir, errors };
      }

      // Check if it's a directory
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        errors.push('Path is not a directory. Please select a directory, not a file.');
        return { isValid: false, hasClaudeFolder, skillsDir, errors };
      }

      // Check for .claude folder
      const claudePath = path.join(dirPath, '.claude');
      hasClaudeFolder = fs.existsSync(claudePath);

      if (!hasClaudeFolder) {
        errors.push(
          'No .claude folder found. This doesn\'t appear to be a Claude project directory. ' +
            'Select a Claude project directory or initialize Claude Code in this directory first.'
        );
      } else {
        // Check/create skills directory
        skillsDir = path.join(claudePath, 'skills');
        if (!fs.existsSync(skillsDir)) {
          // Auto-create skills directory
          fs.mkdirSync(skillsDir, { recursive: true });
          logger.info('ConfigService', 'Created skills directory', { path: skillsDir });
        }
      }

      return {
        isValid: hasClaudeFolder,
        hasClaudeFolder,
        skillsDir,
        errors,
      };
    } catch (error) {
      errors.push(
        `Failed to validate directory: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          'Check permissions or try a different directory.'
      );
      return { isValid: false, hasClaudeFolder, skillsDir, errors };
    }
  }

  /**
   * Validate configuration object
   */
  private validateConfig(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('Configuration must be an object');
      return { isValid: false, errors };
    }

    if (data.projectSkillDir && typeof data.projectSkillDir !== 'string') {
      errors.push('projectSkillDir must be a string');
    }

    if (data.globalSkillDir && typeof data.globalSkillDir !== 'string') {
      errors.push('globalSkillDir must be a string');
    }

    if (
      data.defaultInstallTarget &&
      data.defaultInstallTarget !== 'project' &&
      data.defaultInstallTarget !== 'global'
    ) {
      errors.push('defaultInstallTarget must be "project" or "global"');
    }

    if (
      data.editorDefaultMode &&
      data.editorDefaultMode !== 'edit' &&
      data.editorDefaultMode !== 'preview'
    ) {
      errors.push('editorDefaultMode must be "edit" or "preview"');
    }

    if (data.autoRefresh !== undefined && typeof data.autoRefresh !== 'boolean') {
      errors.push('autoRefresh must be a boolean');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): Configuration {
    const globalSkillDir = path.join(os.homedir(), '.claude', 'skills');

    return new Configuration({
      projectSkillDir: '',
      globalSkillDir,
      defaultInstallTarget: 'project',
      editorDefaultMode: 'edit',
      autoRefresh: true,
    });
  }
}
