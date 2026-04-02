/**
 * Skill Group Service
 *
 * Manages skill groups for organizing skills.
 * Supports system default groups (based on DevOps phases) and custom user groups.
 */

import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { logger } from '../utils/Logger';
import {
  SkillGroup,
  SkillGroupsConfig,
  DefaultGroupsConfig,
  DefaultGroupDefinition,
  IPCResponse,
} from '../../shared/types';

// Default groups configuration bundled with the app
const DEFAULT_GROUPS_FILE = 'defaultSkillGroups.json';

export class SkillGroupService {
  private config: SkillGroupsConfig;
  private defaultGroupsConfig: DefaultGroupsConfig | null = null;

  constructor(initialConfig?: SkillGroupsConfig) {
    this.config = initialConfig || {
      version: 1,
      groups: [],
      defaultGroupsInitialized: false,
    };
    this.loadDefaultGroupsConfig();
  }

  /**
   * Load default groups configuration from bundled JSON file
   */
  private loadDefaultGroupsConfig(): void {
    try {
      // Try to load from bundled resources
      const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, 'data', DEFAULT_GROUPS_FILE)
        : path.join(__dirname, '../data', DEFAULT_GROUPS_FILE);

      if (fs.existsSync(resourcesPath)) {
        const content = fs.readFileSync(resourcesPath, 'utf-8');
        this.defaultGroupsConfig = JSON.parse(content);
        logger.info('Loaded default groups config', 'SkillGroupService', {
          groupCount: this.defaultGroupsConfig?.groups.length || 0,
        });
      } else {
        logger.warn('Default groups config file not found', 'SkillGroupService', {
          path: resourcesPath,
        });
      }
    } catch (error) {
      logger.error('Failed to load default groups config', 'SkillGroupService', { error });
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
      enabled: def.enabled,
      isDefault: true,
      order: def.order,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Initialize default groups if not already done
   * This should be called when the config is first loaded
   * @param t - Translation function for localization
   */
  initializeDefaultGroups(t?: (key: string) => string): boolean {
    // Check if default groups have already been initialized
    if (this.config.defaultGroupsInitialized) {
      return false;
    }

    // Check if there are any existing default groups
    const existingDefaultIds = new Set(
      this.config.groups.filter((g) => g.isDefault).map((g) => g.id)
    );

    if (!this.defaultGroupsConfig) {
      return false;
    }

    // Add default groups that don't exist yet
    const newGroups: SkillGroup[] = [];
    for (const def of this.defaultGroupsConfig.groups) {
      if (!existingDefaultIds.has(def.id)) {
        newGroups.push(this.definitionToGroup(def, t));
      }
    }

    if (newGroups.length > 0) {
      // Add new default groups and sort by order
      this.config.groups = [...this.config.groups, ...newGroups].sort(
        (a, b) => (a.order || 999) - (b.order || 999)
      );
      this.config.defaultGroupsInitialized = true;

      logger.info('Initialized default groups', 'SkillGroupService', {
        count: newGroups.length,
      });

      return true;
    }

    this.config.defaultGroupsInitialized = true;
    return false;
  }

  /**
   * Reset to default groups (preserves custom groups)
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

      // Keep only custom groups
      const customGroups = this.config.groups.filter((g) => !g.isDefault);

      // Add fresh default groups
      const defaultGroups = this.defaultGroupsConfig.groups.map((def) =>
        this.definitionToGroup(def, t)
      );

      // Merge and sort by order
      this.config.groups = [...defaultGroups, ...customGroups].sort(
        (a, b) => (a.order || 999) - (b.order || 999)
      );

      logger.info('Reset to default groups', 'SkillGroupService', {
        defaultCount: defaultGroups.length,
        customCount: customGroups.length,
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
   * Get current groups configuration
   */
  getConfig(): SkillGroupsConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: SkillGroupsConfig): void {
    this.config = config;
  }

  /**
   * Get all groups (sorted by order)
   */
  getGroups(): SkillGroup[] {
    return [...this.config.groups].sort(
      (a, b) => (a.order || 999) - (b.order || 999)
    );
  }

  /**
   * Get only default groups
   */
  getDefaultGroupsList(): SkillGroup[] {
    return this.config.groups.filter((g) => g.isDefault);
  }

  /**
   * Get only custom groups
   */
  getCustomGroups(): SkillGroup[] {
    return this.config.groups.filter((g) => !g.isDefault);
  }

  /**
   * Get a group by ID
   */
  getGroup(id: string): SkillGroup | undefined {
    return this.config.groups.find((g) => g.id === id);
  }

  /**
   * Create a new custom group
   */
  createGroup(
    data: Omit<SkillGroup, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'isDefault'>
  ): IPCResponse<SkillGroup> {
    try {
      const now = new Date().toISOString();
      const maxOrder = Math.max(0, ...this.config.groups.map((g) => g.order || 0));
      const group: SkillGroup = {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || '📁',
        tags: [],
        enabled: data.enabled ?? true,
        isDefault: false,
        order: data.order ?? maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      this.config.groups.push(group);
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
   */
  updateGroup(
    id: string,
    data: Partial<Omit<SkillGroup, 'id' | 'createdAt' | 'isDefault'>>
  ): IPCResponse<SkillGroup> {
    try {
      const index = this.config.groups.findIndex((g) => g.id === id);
      if (index === -1) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      const existingGroup = this.config.groups[index];
      const updatedGroup: SkillGroup = {
        ...existingGroup,
        ...data,
        id, // Ensure ID doesn't change
        isDefault: existingGroup.isDefault, // Preserve isDefault flag
        createdAt: existingGroup.createdAt, // Ensure createdAt doesn't change
        updatedAt: new Date().toISOString(),
      };

      this.config.groups[index] = updatedGroup;
      logger.info('Skill group updated', 'SkillGroupService', { groupId: id });

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
   * Delete a group (allowed for both default and custom groups)
   */
  deleteGroup(id: string): IPCResponse<void> {
    try {
      const index = this.config.groups.findIndex((g) => g.id === id);
      if (index === -1) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      const group = this.config.groups[index];
      this.config.groups.splice(index, 1);

      logger.info('Skill group deleted', 'SkillGroupService', {
        groupId: id,
        wasDefault: group.isDefault,
      });

      return { success: true };
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
   * Add tag to group
   */
  addTagToGroup(groupId: string, tag: string): IPCResponse<SkillGroup> {
    try {
      const group = this.config.groups.find((g) => g.id === groupId);
      if (!group) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      if (group.tags.includes(tag)) {
        return {
          success: false,
          error: {
            code: 'TAG_ALREADY_IN_GROUP',
            message: 'Tag is already in this group',
          },
        };
      }

      // Remove tag from other groups first (a tag can only belong to one group)
      this.removeTagFromAllGroups(tag);

      group.tags.push(tag);
      group.updatedAt = new Date().toISOString();

      logger.info('Tag added to group', 'SkillGroupService', { groupId, tag });

      return { success: true, data: group };
    } catch (error) {
      logger.error('Failed to add tag to group', 'SkillGroupService', {
        error,
        groupId,
        tag,
      });
      return {
        success: false,
        error: {
          code: 'ADD_TAG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add tag to group',
        },
      };
    }
  }

  /**
   * Remove tag from group
   */
  removeTagFromGroup(groupId: string, tag: string): IPCResponse<SkillGroup> {
    try {
      const group = this.config.groups.find((g) => g.id === groupId);
      if (!group) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      const tagIndex = group.tags.indexOf(tag);
      if (tagIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TAG_NOT_IN_GROUP',
            message: 'Tag is not in this group',
          },
        };
      }

      group.tags.splice(tagIndex, 1);
      group.updatedAt = new Date().toISOString();

      logger.info('Tag removed from group', 'SkillGroupService', { groupId, tag });

      return { success: true, data: group };
    } catch (error) {
      logger.error('Failed to remove tag from group', 'SkillGroupService', {
        error,
        groupId,
        tag,
      });
      return {
        success: false,
        error: {
          code: 'REMOVE_TAG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove tag from group',
        },
      };
    }
  }

  /**
   * Remove tag from all groups
   */
  removeTagFromAllGroups(tag: string): void {
    for (const group of this.config.groups) {
      const index = group.tags.indexOf(tag);
      if (index !== -1) {
        group.tags.splice(index, 1);
        group.updatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Get group for a tag
   */
  getGroupForTag(tag: string): SkillGroup | undefined {
    return this.config.groups.find((g) => g.tags.includes(tag));
  }

  /**
   * Reorder groups
   */
  reorderGroups(groupIds: string[]): IPCResponse<void> {
    try {
      const reorderedGroups: SkillGroup[] = [];
      for (let i = 0; i < groupIds.length; i++) {
        const group = this.config.groups.find((g) => g.id === groupIds[i]);
        if (group) {
          group.order = i + 1;
          group.updatedAt = new Date().toISOString();
          reorderedGroups.push(group);
        }
      }

      // Add any groups that weren't in the reorder list
      for (const group of this.config.groups) {
        if (!reorderedGroups.find((g) => g.id === group.id)) {
          reorderedGroups.push(group);
        }
      }

      this.config.groups = reorderedGroups;
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
}
