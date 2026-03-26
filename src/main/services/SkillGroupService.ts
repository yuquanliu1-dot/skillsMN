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
  createGroup(data: Omit<SkillGroup, 'id' | 'skills' | 'createdAt' | 'updatedAt'>): IPCResponse<SkillGroup> {
    try {
      const now = new Date().toISOString();
      const group: SkillGroup = {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || '📁',
        skills: [],
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
   * Add skill to group
   */
  addSkillToGroup(groupId: string, skillName: string): IPCResponse<SkillGroup> {
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

      if (group.skills.includes(skillName)) {
        return {
          success: false,
          error: {
            code: 'SKILL_ALREADY_IN_GROUP',
            message: 'Skill is already in this group',
          },
        };
      }

      // Remove skill from other groups first
      this.removeSkillFromAllGroups(skillName);

      group.skills.push(skillName);
      group.updatedAt = new Date().toISOString();

      logger.info('Skill added to group', 'SkillGroupService', { groupId, skillName });

      return { success: true, data: group };
    } catch (error) {
      logger.error('Failed to add skill to group', 'SkillGroupService', { error, groupId, skillName });
      return {
        success: false,
        error: {
          code: 'ADD_SKILL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add skill to group',
        },
      };
    }
  }

  /**
   * Remove skill from group
   */
  removeSkillFromGroup(groupId: string, skillName: string): IPCResponse<SkillGroup> {
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

      const skillIndex = group.skills.indexOf(skillName);
      if (skillIndex === -1) {
        return {
          success: false,
          error: {
            code: 'SKILL_NOT_IN_GROUP',
            message: 'Skill is not in this group',
          },
        };
      }

      group.skills.splice(skillIndex, 1);
      group.updatedAt = new Date().toISOString();

      logger.info('Skill removed from group', 'SkillGroupService', { groupId, skillName });

      return { success: true, data: group };
    } catch (error) {
      logger.error('Failed to remove skill from group', 'SkillGroupService', { error, groupId, skillName });
      return {
        success: false,
        error: {
          code: 'REMOVE_SKILL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove skill from group',
        },
      };
    }
  }

  /**
   * Remove skill from all groups
   */
  removeSkillFromAllGroups(skillName: string): void {
    for (const group of this.config.groups) {
      const index = group.skills.indexOf(skillName);
      if (index !== -1) {
        group.skills.splice(index, 1);
        group.updatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Get group for a skill
   */
  getGroupForSkill(skillName: string): SkillGroup | undefined {
    return this.config.groups.find(g => g.skills.includes(skillName));
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
