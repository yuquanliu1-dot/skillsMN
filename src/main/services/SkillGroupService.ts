/**
 * Skill Group Service
 *
 * Manages skill groups for organizing skills.
 * Supports system default groups (based on DevOps phases) and custom user groups.
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import {
  SkillGroup,
  CustomGroupsConfig,
  DefaultGroupsConfig,
  DefaultGroupDefinition,
  IPCResponse,
} from '../../shared/types';

// Path to default groups configuration (bundled with app)
// In development: navigate from dist/src/main/services/ to project root app/resources
// In production: use relative path from app.asar to resources
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEFAULT_GROUPS_PATH = isDev
  ? path.join(__dirname, '../../../../app/resources/default-groups.json')
  : path.join(process.resourcesPath, 'app/resources/default-groups.json');

// Path to custom groups configuration (user data directory)
const CUSTOM_GROUPS_PATH = path.join(app.getPath('userData'), 'custom-groups.json');

export class SkillGroupService {
  private customConfig: CustomGroupsConfig;
  private defaultGroupsConfig: DefaultGroupsConfig | null = null;

  constructor(initialCustomConfig?: CustomGroupsConfig) {
    this.customConfig = initialCustomConfig || {
      version: 1,
      groups: [],
    };
    // Load default groups from bundled JSON file
    this.loadDefaultGroupsConfig();
  }

  /**
   * Load default groups configuration from bundled JSON file
   */
  private loadDefaultGroupsConfig(): void {
    try {
      logger.info('Looking for default groups config', 'SkillGroupService', {
        path: DEFAULT_GROUPS_PATH,
        isDev: process.env.NODE_ENV === 'development' || !app.isPackaged,
        dirname: __dirname,
      });

      if (fs.existsSync(DEFAULT_GROUPS_PATH)) {
        const content = fs.readFileSync(DEFAULT_GROUPS_PATH, 'utf8');
        this.defaultGroupsConfig = JSON.parse(content);
        logger.info('Loaded default groups config', 'SkillGroupService', {
          groupCount: this.defaultGroupsConfig?.groups.length || 0,
        });
      } else {
        logger.warn('Default groups config file not found', 'SkillGroupService', {
          path: DEFAULT_GROUPS_PATH,
        });
      }
    } catch (error) {
      logger.error('Failed to load default groups config', 'SkillGroupService', { error });
    }
  }

  /**
   * Load custom groups configuration from user data directory
   */
  static loadCustomGroupsConfig(): CustomGroupsConfig {
    try {
      if (fs.existsSync(CUSTOM_GROUPS_PATH)) {
        const content = fs.readFileSync(CUSTOM_GROUPS_PATH, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.error('Failed to load custom groups config', 'SkillGroupService', { error });
    }
    // Return empty config if file doesn't exist or error occurs
    return {
      version: 1,
      groups: [],
    };
  }

  /**
   * Save custom groups configuration to user data directory
   */
  private saveCustomGroupsConfig(): boolean {
    try {
      const dir = path.dirname(CUSTOM_GROUPS_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CUSTOM_GROUPS_PATH, JSON.stringify(this.customConfig, null, 2));
      logger.info('Saved custom groups config', 'SkillGroupService', {
        groupCount: this.customConfig.groups.length,
      });
      return true;
    } catch (error) {
      logger.error('Failed to save custom groups config', 'SkillGroupService', { error });
      return false;
    }
  }

  /**
   * Get default groups with localized names and descriptions
   * @param t - Translation function from i18next
   */
  getDefaultGroups(t?: (key: string) => string): SkillGroup[] {
    if (!this.defaultGroupsConfig) {
      return [];
    }

    return this.defaultGroupsConfig.groups.map((def) => this.definitionToGroup(def, t));
  }

  /**
   * Convert a default group definition to a SkillGroup
   */
  private definitionToGroup(
    def: DefaultGroupDefinition,
    t?: (key: string) => string
  ): SkillGroup {
    const now = new Date().toISOString();
    return {
      id: def.id,
      name: t ? t(def.nameKey) : def.nameKey,
      description: t ? t(def.descriptionKey) : def.descriptionKey,
      color: def.color,
      icon: def.icon,
      tags: def.tags || [],
      keywords: def.keywords || [],
      enabled: def.enabled,
      isDefault: true,
      order: def.order,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Initialize default groups - no longer needed, kept for compatibility
   */
  initializeDefaultGroups(_t?: (key: string) => string): boolean {
    // Default groups are now loaded from JSON file
    return false;
  }

  /**
   * Reset to default groups (clears all custom overrides)
   * @param t - Translation function for localization
   */
  resetToDefaultGroups(t?: (key: string) => string): IPCResponse<SkillGroup[]> {
    try {
      if (!this.defaultGroupsConfig) {
        return {
          success: false,
          error: {
            code: 'NO_DEFAULT_CONFIG',
            message: 'Default groups configuration not available',
          },
        };
      }

      // Clear all custom groups
      this.customConfig.groups = [];
      this.saveCustomGroupsConfig();

      // Return default groups
      const defaultGroups = this.defaultGroupsConfig.groups.map((def) =>
        this.definitionToGroup(def, t)
      );

      logger.info('Reset to default groups', 'SkillGroupService', {
        defaultCount: defaultGroups.length,
      });

      return { success: true, data: defaultGroups };
    } catch (error) {
      logger.error('Failed to reset default groups', 'SkillGroupService', { error });
      return {
        success: false,
        error: {
          code: 'RESET_DEFAULTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reset default groups',
        },
      };
    }
  }

  /**
   * Get custom groups configuration
   */
  getCustomConfig(): CustomGroupsConfig {
    return this.customConfig;
  }

  /**
   * Update custom groups configuration
   */
  updateCustomConfig(config: CustomGroupsConfig): void {
    this.customConfig = config;
  }

  /**
   * Get all groups (default + custom, merged and sorted)
   * Custom groups override default groups by ID
   */
  getGroups(t?: (key: string) => string): SkillGroup[] {
    const groupsMap = new Map<string, SkillGroup>();

    // Add default groups first
    if (this.defaultGroupsConfig) {
      for (const def of this.defaultGroupsConfig.groups) {
        const group = this.definitionToGroup(def, t);
        groupsMap.set(group.id, group);
      }
    }

    // Override with custom groups
    for (const customGroup of this.customConfig.groups) {
      groupsMap.set(customGroup.id, customGroup);
    }

    // Convert to array and sort by order
    return Array.from(groupsMap.values()).sort(
      (a, b) => (a.order || 999) - (b.order || 999)
    );
  }

  /**
   * Get only default groups (not overridden by custom)
   */
  getDefaultGroupsList(t?: (key: string) => string): SkillGroup[] {
    const customIds = new Set(this.customConfig.groups.map(g => g.id));

    if (!this.defaultGroupsConfig) {
      return [];
    }

    return this.defaultGroupsConfig.groups
      .filter(def => !customIds.has(def.id))
      .map(def => this.definitionToGroup(def, t))
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Get only custom groups
   */
  getCustomGroups(): SkillGroup[] {
    return [...this.customConfig.groups].sort(
      (a, b) => (a.order || 999) - (b.order || 999)
    );
  }

  /**
   * Get a group by ID (from both default and custom)
   */
  getGroup(id: string, t?: (key: string) => string): SkillGroup | undefined {
    // First check custom groups
    const customGroup = this.customConfig.groups.find((g) => g.id === id);
    if (customGroup) {
      return customGroup;
    }

    // Then check default groups
    if (this.defaultGroupsConfig) {
      const def = this.defaultGroupsConfig.groups.find((g) => g.id === id);
      if (def) {
        return this.definitionToGroup(def, t);
      }
    }

    return undefined;
  }

  /**
   * Create a new custom group
   */
  createGroup(
    data: Omit<SkillGroup, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'isDefault'>
  ): IPCResponse<SkillGroup> {
    try {
      const now = new Date().toISOString();
      const allGroups = this.getGroups();
      const maxOrder = Math.max(0, ...allGroups.map((g) => g.order || 0));
      const group: SkillGroup = {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || 'folder',
        tags: [],
        keywords: data.keywords || [],
        enabled: data.enabled ?? true,
        isDefault: false,
        order: data.order ?? maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      this.customConfig.groups.push(group);
      this.saveCustomGroupsConfig();

      logger.info('Skill group created', 'SkillGroupService', {
        groupId: group.id,
        name: group.name,
      });

      return { success: true, data: group };
    } catch (error) {
      logger.error('Failed to create skill group', 'SkillGroupService', { error });
      return {
        success: false,
        error: {
          code: 'CREATE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create group',
        },
      };
    }
  }

  /**
   * Update a group (works for both default and custom groups)
   * For default groups, saves override to customConfig
   */
  updateGroup(
    id: string,
    data: Partial<Omit<SkillGroup, 'id' | 'createdAt' | 'isDefault'>>
  ): IPCResponse<SkillGroup> {
    try {
      // Check if group exists in custom config
      const customIndex = this.customConfig.groups.findIndex((g) => g.id === id);

      if (customIndex !== -1) {
        // Update existing custom group
        const existingGroup = this.customConfig.groups[customIndex];
        const updatedGroup: SkillGroup = {
          ...existingGroup,
          ...data,
          id, // Ensure ID doesn't change
          isDefault: existingGroup.isDefault, // Preserve isDefault flag
          createdAt: existingGroup.createdAt, // Ensure createdAt doesn't change
          updatedAt: new Date().toISOString(),
        };

        this.customConfig.groups[customIndex] = updatedGroup;
        this.saveCustomGroupsConfig();

        logger.info('Custom skill group updated', 'SkillGroupService', { groupId: id });
        return { success: true, data: updatedGroup };
      }

      // Check if it's a default group
      const allGroups = this.getGroups();
      const existingGroup = allGroups.find((g) => g.id === id);

      if (!existingGroup) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      // Create override for default group
      const updatedGroup: SkillGroup = {
        ...existingGroup,
        ...data,
        id, // Ensure ID doesn't change
        isDefault: existingGroup.isDefault, // Preserve isDefault flag
        createdAt: existingGroup.createdAt, // Preserve original createdAt
        updatedAt: new Date().toISOString(),
      };

      this.customConfig.groups.push(updatedGroup);
      this.saveCustomGroupsConfig();

      logger.info('Default group overridden', 'SkillGroupService', { groupId: id });
      return { success: true, data: updatedGroup };
    } catch (error) {
      logger.error('Failed to update skill group', 'SkillGroupService', {
        error,
        groupId: id,
      });
      return {
        success: false,
        error: {
          code: 'UPDATE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update group',
        },
      };
    }
  }

  /**
   * Delete a group (works for both default and custom groups)
   * For default groups, creates a "deleted" override in customConfig
   */
  deleteGroup(id: string): IPCResponse<void> {
    try {
      // First check if it's in custom config
      const customIndex = this.customConfig.groups.findIndex((g) => g.id === id);

      if (customIndex !== -1) {
        // Remove from custom config
        const group = this.customConfig.groups[customIndex];
        this.customConfig.groups.splice(customIndex, 1);
        this.saveCustomGroupsConfig();

        logger.info('Custom group deleted', 'SkillGroupService', {
          groupId: id,
          wasDefault: group.isDefault,
        });

        return { success: true };
      }

      // Check if it's a default group
      if (this.defaultGroupsConfig) {
        const def = this.defaultGroupsConfig.groups.find((g) => g.id === id);
        if (def) {
          // Create a disabled override to "delete" the default group
          const now = new Date().toISOString();
          const deletedGroup: SkillGroup = {
            id: def.id,
            name: def.nameKey, // Will be translated later
            description: def.descriptionKey,
            color: def.color,
            icon: def.icon,
            tags: def.tags || [],
            keywords: def.keywords || [],
            enabled: false, // Disable to effectively delete
            isDefault: true,
            order: def.order,
            createdAt: now,
            updatedAt: now,
          };

          this.customConfig.groups.push(deletedGroup);
          this.saveCustomGroupsConfig();

          logger.info('Default group disabled (deleted)', 'SkillGroupService', {
            groupId: id,
          });

          return { success: true };
        }
      }

      return {
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found',
        },
      };
    } catch (error) {
      logger.error('Failed to delete skill group', 'SkillGroupService', {
        error,
        groupId: id,
      });
      return {
        success: false,
        error: {
          code: 'DELETE_GROUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete group',
        },
      };
    }
  }

  /**
   * Reorder groups
   */
  reorderGroups(groupIds: string[]): IPCResponse<void> {
    try {
      const allGroups = this.getGroups();

      for (let i = 0; i < groupIds.length; i++) {
        const groupId = groupIds[i];
        const group = allGroups.find((g) => g.id === groupId);
        if (group) {
          // Update order via updateGroup to handle overrides
          this.updateGroup(groupId, { order: i + 1 });
        }
      }

      logger.info('Skill groups reordered', 'SkillGroupService');

      return { success: true };
    } catch (error) {
      logger.error('Failed to reorder skill groups', 'SkillGroupService', { error });
      return {
        success: false,
        error: {
          code: 'REORDER_GROUPS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reorder groups',
        },
      };
    }
  }

  /**
   * Update keywords for a group
   */
  updateGroupKeywords(
    groupId: string,
    keywords: string[]
  ): IPCResponse<SkillGroup> {
    try {
      // Filter out empty keywords and trim whitespace
      const cleanedKeywords = keywords
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Use updateGroup to handle overrides
      const result = this.updateGroup(groupId, { keywords: cleanedKeywords });

      if (result.success) {
        logger.info('Group keywords updated', 'SkillGroupService', {
          groupId,
          keywordCount: cleanedKeywords.length,
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to update group keywords', 'SkillGroupService', {
        error,
        groupId
      });
      return {
        success: false,
        error: {
          code: 'UPDATE_KEYWORDS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update group keywords',
        },
      };
    }
  }
}
