/**
 * Configuration Model
 *
 * User preferences and application settings
 */

import {
  BaseConfiguration,
  InstallDirectory,
  SkillEditorConfig,
} from '../../shared/types';
import {
  DEFAULT_INSTALL_DIRECTORY,
  DEFAULT_AUTO_REFRESH,
} from '../../shared/constants';
import * as path from 'path';

/**
 * Default skill editor configuration
 */
const DEFAULT_SKILL_EDITOR_CONFIG: SkillEditorConfig = {
  fontSize: 14,
  theme: 'light',
  autoSaveEnabled: true,
  autoSaveDelay: 2000,
  showMinimap: false,
  lineNumbers: 'on',
  fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  tabSize: 2,
  wordWrap: true,
};

export class ConfigurationModel {
  /**
   * Create default configuration
   */
  static createDefault(): BaseConfiguration {
    return {
      projectDirectories: [],
      defaultInstallDirectory: DEFAULT_INSTALL_DIRECTORY,
      autoRefresh: DEFAULT_AUTO_REFRESH,
      skillEditor: DEFAULT_SKILL_EDITOR_CONFIG,
    };
  }

  /**
   * Validate configuration
   */
  static validate(config: Partial<BaseConfiguration>): BaseConfiguration {
    // Validate projectDirectories array
    if (config.projectDirectories !== undefined) {
      if (!Array.isArray(config.projectDirectories)) {
        throw new Error('Project directories must be an array');
      }

      // Normalize and validate each directory path
      config.projectDirectories = config.projectDirectories
        .filter(dir => typeof dir === 'string')
        .map(dir => path.normalize(dir));

      // Deduplicate entries
      config.projectDirectories = [...new Set(config.projectDirectories)];
    }

    // Validate defaultInstallDirectory
    const validInstallDirs: InstallDirectory[] = ['project', 'global'];
    if (
      config.defaultInstallDirectory &&
      !validInstallDirs.includes(config.defaultInstallDirectory)
    ) {
      throw new Error('Default install directory must be "project" or "global"');
    }

    // Validate autoRefresh
    if (
      config.autoRefresh !== undefined &&
      typeof config.autoRefresh !== 'boolean'
    ) {
      throw new Error('Auto-refresh must be a boolean');
    }

    // Validate skillEditor config if provided
    if (config.skillEditor) {
      config.skillEditor = this.validateSkillEditorConfig(config.skillEditor);
    }

    // Return validated config with defaults
    return {
      projectDirectories: config.projectDirectories ?? [],
      defaultInstallDirectory: config.defaultInstallDirectory ?? DEFAULT_INSTALL_DIRECTORY,
      autoRefresh: config.autoRefresh ?? DEFAULT_AUTO_REFRESH,
      skillEditor: config.skillEditor ?? DEFAULT_SKILL_EDITOR_CONFIG,
      applicationSkillsDirectory: config.applicationSkillsDirectory,
      migrationCompleted: config.migrationCompleted,
      migrationPreferenceAsked: config.migrationPreferenceAsked,
      setupCompleted: config.setupCompleted,
    };
  }

  /**
   * Validate skill editor configuration
   */
  private static validateSkillEditorConfig(config: Partial<SkillEditorConfig>): SkillEditorConfig {
    return {
      fontSize: Math.max(10, Math.min(24, config.fontSize ?? 14)),
      theme: config.theme ?? 'light',
      autoSaveEnabled: config.autoSaveEnabled ?? true,
      autoSaveDelay: Math.max(500, Math.min(10000, config.autoSaveDelay ?? 2000)),
      showMinimap: config.showMinimap ?? false,
      lineNumbers: config.lineNumbers ?? 'on',
      fontFamily: config.fontFamily ?? "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      tabSize: Math.max(2, Math.min(8, config.tabSize ?? 2)),
      wordWrap: config.wordWrap ?? true,
    };
  }

  /**
   * Merge partial configuration with existing configuration
   */
  static merge(
    existing: BaseConfiguration,
    updates: Partial<BaseConfiguration>
  ): BaseConfiguration {
    return {
      projectDirectories: updates.projectDirectories ?? existing.projectDirectories,
      defaultInstallDirectory:
        updates.defaultInstallDirectory ?? existing.defaultInstallDirectory,
      autoRefresh: updates.autoRefresh ?? existing.autoRefresh,
      skillEditor: updates.skillEditor ?? existing.skillEditor ?? DEFAULT_SKILL_EDITOR_CONFIG,
      applicationSkillsDirectory: updates.applicationSkillsDirectory ?? existing.applicationSkillsDirectory,
      migrationCompleted: updates.migrationCompleted ?? existing.migrationCompleted,
      migrationPreferenceAsked: updates.migrationPreferenceAsked ?? existing.migrationPreferenceAsked,
      setupCompleted: updates.setupCompleted ?? existing.setupCompleted,
    };
  }

  /**
   * Check if configuration is complete (setup wizard has been completed)
   */
  static isComplete(config: BaseConfiguration): boolean {
    return config.setupCompleted === true;
  }
}
