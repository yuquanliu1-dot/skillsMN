/**
 * Configuration Model
 *
 * User preferences and application settings
 */

import {
  Configuration,
  InstallDirectory,
  EditorMode,
  SkillEditorConfig,
} from '../../shared/types';
import {
  DEFAULT_INSTALL_DIRECTORY,
  DEFAULT_EDITOR_MODE,
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
  static createDefault(): Configuration {
    return {
      projectDirectory: null,
      projectDirectories: [],
      defaultInstallDirectory: DEFAULT_INSTALL_DIRECTORY,
      editorDefaultMode: DEFAULT_EDITOR_MODE,
      autoRefresh: DEFAULT_AUTO_REFRESH,
      skillEditor: DEFAULT_SKILL_EDITOR_CONFIG,
    };
  }

  /**
   * Validate configuration
   */
  static validate(config: Partial<Configuration>): Configuration {
    // Migrate projectDirectory to projectDirectories if needed
    if (config.projectDirectory && !config.projectDirectories) {
      config.projectDirectories = [config.projectDirectory];
    }

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

    // Validate projectDirectory (deprecated but still supported)
    if (config.projectDirectory !== null && config.projectDirectory !== undefined) {
      if (typeof config.projectDirectory !== 'string') {
        throw new Error('Project directory must be a string or null');
      }
      // Normalize path separators for cross-platform compatibility
      config.projectDirectory = path.normalize(config.projectDirectory);
      // Additional validation can be added here (e.g., check if directory exists)
    }

    // Validate defaultInstallDirectory
    const validInstallDirs: InstallDirectory[] = ['project', 'global'];
    if (
      config.defaultInstallDirectory &&
      !validInstallDirs.includes(config.defaultInstallDirectory)
    ) {
      throw new Error('Default install directory must be "project" or "global"');
    }

    // Validate editorDefaultMode
    const validEditorModes: EditorMode[] = ['edit', 'preview'];
    if (
      config.editorDefaultMode &&
      !validEditorModes.includes(config.editorDefaultMode)
    ) {
      throw new Error('Editor default mode must be "edit" or "preview"');
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
      projectDirectory: config.projectDirectory ?? null,
      projectDirectories: config.projectDirectories ?? [],
      defaultInstallDirectory: config.defaultInstallDirectory ?? DEFAULT_INSTALL_DIRECTORY,
      editorDefaultMode: config.editorDefaultMode ?? DEFAULT_EDITOR_MODE,
      autoRefresh: config.autoRefresh ?? DEFAULT_AUTO_REFRESH,
      skillEditor: config.skillEditor ?? DEFAULT_SKILL_EDITOR_CONFIG,
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
    existing: Configuration,
    updates: Partial<Configuration>
  ): Configuration {
    return {
      projectDirectory: updates.projectDirectory ?? existing.projectDirectory,
      projectDirectories: updates.projectDirectories ?? existing.projectDirectories,
      defaultInstallDirectory:
        updates.defaultInstallDirectory ?? existing.defaultInstallDirectory,
      editorDefaultMode: updates.editorDefaultMode ?? existing.editorDefaultMode,
      autoRefresh: updates.autoRefresh ?? existing.autoRefresh,
      skillEditor: updates.skillEditor ?? existing.skillEditor ?? DEFAULT_SKILL_EDITOR_CONFIG,
    };
  }

  /**
   * Check if configuration is complete (has at least one project directory)
   */
  static isComplete(config: Configuration): boolean {
    return config.projectDirectories.length > 0;
  }
}
