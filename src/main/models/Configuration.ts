/**
 * Application configuration model
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Configuration } from '../shared/types';

/**
 * Configuration with default values and validation
 */
export class Configuration {
  /**
   * Absolute path to project skills directory
   */
  public readonly projectSkillDir: string;

  /**
   * Absolute path to global skills directory
   */
  public readonly globalSkillDir: string;

  /**
   * Where new skills install by default
   */
  public readonly defaultInstallTarget: 'project' | 'global';

  /**
   * Default behavior when opening skills
   */
  public readonly editorDefaultMode: 'edit' | 'preview';

  /**
   * Whether to watch for file system changes
   */
  public readonly autoRefresh: boolean;

  constructor(data: {
    projectSkillDir: string;
    globalSkillDir?: string;
    defaultInstallTarget?: 'project' | 'global';
    editorDefaultMode?: 'edit' | 'preview';
    autoRefresh?: boolean;
  }) {
    this.projectSkillDir = data.projectSkillDir;
    this.globalSkillDir = data.globalSkillDir || this.getDefaultGlobalSkillDir();
    this.defaultInstallTarget = data.defaultInstallTarget ?? 'project';
    this.editorDefaultMode = data.editorDefaultMode ?? 'edit';
    this.autoRefresh = data.autoRefresh ?? true;
  }

  /**
   * Get default global skill directory
   */
  private getDefaultGlobalSkillDir(): string {
    const homeDir = os.homedir || os.userInfo;
    return path.join(homeDir, '.claude', 'skills');
  }

  /**
   * Validate configuration
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.projectSkillDir && typeof this.projectSkillDir !== 'string') {
      errors.push('Project skill directory must be a string (can be empty for initial setup)');
    }

    if (this.projectSkillDir && !path.isAbsolute(this.projectSkillDir)) {
      errors.push('Project skill directory must be an absolute path');
    }

    if (!this.globalSkillDir || typeof this.globalSkillDir !== 'string') {
      errors.push('Global skill directory must be a string');
    }

    if (!path.isAbsolute(this.globalSkillDir)) {
      errors.push('Global skill directory must be an absolute path');
    }

    if (this.defaultInstallTarget !== 'project' && this.defaultInstallTarget !== 'global') {
      errors.push('Default install target must be "project" or "global"');
    }

    if (this.editorDefaultMode !== 'edit' && this.editorDefaultMode !== 'preview') {
      errors.push('Editor default mode must be "edit" or "preview"');
    }

    if (typeof this.autoRefresh !== 'boolean') {
      errors.push('Auto refresh must be a boolean');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Create default configuration
   */
  public static createDefault(): Configuration {
    return new Configuration({
      projectSkillDir: '',
      globalSkillDir: '',
      defaultInstallTarget: 'project',
      editorDefaultMode: 'edit',
      autoRefresh: true,
    });
  }
}
