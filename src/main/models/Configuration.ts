/**
 * Configuration Model
 *
 * User preferences and application settings
 */

import {
  Configuration,
  InstallDirectory,
  EditorMode,
} from '../../shared/types';
import {
  DEFAULT_INSTALL_DIRECTORY,
  DEFAULT_EDITOR_MODE,
  DEFAULT_AUTO_REFRESH,
} from '../../shared/constants';

export class ConfigurationModel {
  /**
   * Create default configuration
   */
  static createDefault(): Configuration {
    return {
      projectDirectory: null,
      defaultInstallDirectory: DEFAULT_INSTALL_DIRECTORY,
      editorDefaultMode: DEFAULT_EDITOR_MODE,
      autoRefresh: DEFAULT_AUTO_REFRESH,
    };
  }

  /**
   * Validate configuration
   */
  static validate(config: Partial<Configuration>): Configuration {
    // Validate projectDirectory
    if (config.projectDirectory !== null && config.projectDirectory !== undefined) {
      if (typeof config.projectDirectory !== 'string') {
        throw new Error('Project directory must be a string or null');
      }
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

    // Return validated config with defaults
    return {
      projectDirectory: config.projectDirectory ?? null,
      defaultInstallDirectory: config.defaultInstallDirectory ?? DEFAULT_INSTALL_DIRECTORY,
      editorDefaultMode: config.editorDefaultMode ?? DEFAULT_EDITOR_MODE,
      autoRefresh: config.autoRefresh ?? DEFAULT_AUTO_REFRESH,
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
      defaultInstallDirectory:
        updates.defaultInstallDirectory ?? existing.defaultInstallDirectory,
      editorDefaultMode: updates.editorDefaultMode ?? existing.editorDefaultMode,
      autoRefresh: updates.autoRefresh ?? existing.autoRefresh,
    };
  }

  /**
   * Check if configuration is complete (has project directory)
   */
  static isComplete(config: Configuration): boolean {
    return config.projectDirectory !== null;
  }
}
