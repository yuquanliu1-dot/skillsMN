/**
 * Skill Group Service
 *
 * Manages skill groups for organizing skills
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/Logger';
import { SkillGroup, SkillGroupsConfig, IPCResponse } from '../../shared/types';

export class SkillGroupService {
  private config: SkillGroupsConfig;

  constructor(initialConfig?: SkillGroupsConfig) {
    this.config = initialConfig || {
      version: 1,
      groups: [],
    };
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
   * Get all groups
   */
  getGroups(): SkillGroup[] {
    return this.config.groups;
  }

  /**
   * Get a group by ID
   */
  getGroup(id: string): SkillGroup | undefined {
    return this.config.groups.find(g => g.id === id);
  }

  /**
   * Create a new group
   */
  createGroup(data: Omit<SkillGroup, 'id' | 'tags' | 'createdAt' | 'updatedAt'>): IPCResponse<SkillGroup> {
    try {
      const now = new Date().toISOString();
      const group: SkillGroup = {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || '📁',
        tags: [],
        createdAt: now,
        updatedAt: now,
      };

      this.config.groups.push(group);
      logger.info('Skill group created', 'SkillGroupService', { groupId: group.id, name: group.name });

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
   * Update a group
   */
  updateGroup(id: string, data: Partial<Omit<SkillGroup, 'id' | 'createdAt'>>): IPCResponse<SkillGroup> {
    try {
      const index = this.config.groups.findIndex(g => g.id === id);
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
        createdAt: existingGroup.createdAt, // Ensure createdAt doesn't change
        updatedAt: new Date().toISOString(),
      };

      this.config.groups[index] = updatedGroup;
      logger.info('Skill group updated', 'SkillGroupService', { groupId: id });

      return { success: true, data: updatedGroup };
    } catch (error) {
      logger.error('Failed to update skill group', 'SkillGroupService', { error, groupId: id });
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
   * Delete a group
   */
  deleteGroup(id: string): IPCResponse<void> {
    try {
      const index = this.config.groups.findIndex(g => g.id === id);
      if (index === -1) {
        return {
          success: false,
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Group not found',
          },
        };
      }

      this.config.groups.splice(index, 1);
      logger.info('Skill group deleted', 'SkillGroupService', { groupId: id });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete skill group', 'SkillGroupService', { error, groupId: id });
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
      const group = this.config.groups.find(g => g.id === groupId);
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
      logger.error('Failed to add tag to group', 'SkillGroupService', { error, groupId, tag });
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
      const group = this.config.groups.find(g => g.id === groupId);
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
      logger.error('Failed to remove tag from group', 'SkillGroupService', { error, groupId, tag });
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
    return this.config.groups.find(g => g.tags.includes(tag));
  }

  /**
   * Reorder groups
   */
  reorderGroups(groupIds: string[]): IPCResponse<void> {
    try {
      const reorderedGroups: SkillGroup[] = [];
      for (const id of groupIds) {
        const group = this.config.groups.find(g => g.id === id);
        if (group) {
          reorderedGroups.push(group);
        }
      }

      // Add any groups that weren't in the reorder list
      for (const group of this.config.groups) {
        if (!reorderedGroups.find(g => g.id === group.id)) {
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
