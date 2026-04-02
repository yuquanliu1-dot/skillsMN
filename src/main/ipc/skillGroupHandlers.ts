/**
 * Skill Group IPC Handlers
 *
 * IPC handlers for skill group operations
 */

import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SkillGroupService } from '../services/SkillGroupService';
import { IPC_CHANNELS } from '../../shared/constants';
import { SkillGroup, SkillGroupsConfig, IPCResponse, IPCError } from '../../shared/types';

let skillGroupService: SkillGroupService | null = null;
let configService: {
  load: () => Promise<any>;
  save: (config: any) => Promise<any>;
  saveSkillGroups: (skillGroups: SkillGroupsConfig) => Promise<void>;
} | null = null;

/**
 * Send skills:refresh event to all renderer windows
 */
function notifySkillsRefresh(): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(IPC_CHANNELS.SKILLS_REFRESH);
  }
  logger.debug('Sent skills:refresh event to all windows', 'SkillGroupHandlers');
}

/**
 * Convert error to IPCError format
 */
function toIPCError(error: unknown): IPCError {
  const message = ErrorHandler.format(error);
  let code = 'UNKNOWN_ERROR';

  if (error instanceof Error) {
    code = 'GENERAL_ERROR';
  }

  return { code, message };
}

/**
 * Set config service reference
 */
export function setConfigService(service: {
  load: () => Promise<any>;
  save: (config: any) => Promise<any>;
  saveSkillGroups: (skillGroups: SkillGroupsConfig) => Promise<void>;
}): void {
  configService = service;
}

/**
 * Initialize skill group service and register IPC handlers
 */
export function registerSkillGroupHandlers(): void {
  // Initialize skill group service
  skillGroupService = new SkillGroupService();
  logger.info('Skill group service initialized', 'SkillGroupHandlers');

  // Handler for skill-group:list
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_LIST,
    async (): Promise<IPCResponse<SkillGroup[]>> => {
      try {
        logger.debug('Listing skill groups', 'SkillGroupHandlers');
        await loadConfigIntoService();
        const groups = skillGroupService!.getGroups();
        return { success: true, data: groups };
      } catch (error) {
        logger.error('Failed to list skill groups', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:get
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_GET,
    async (_event, { id }: { id: string }): Promise<IPCResponse<SkillGroup>> => {
      try {
        logger.debug('Getting skill group', 'SkillGroupHandlers', { id });
        await loadConfigIntoService();
        const group = skillGroupService!.getGroup(id);
        if (!group) {
          return {
            success: false,
            error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' },
          };
        }
        return { success: true, data: group };
      } catch (error) {
        logger.error('Failed to get skill group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:create
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_CREATE,
    async (_event, { data }: { data: Omit<SkillGroup, 'id' | 'skills' | 'createdAt' | 'updatedAt'> }): Promise<IPCResponse<SkillGroup>> => {
      try {
        logger.debug('Creating skill group', 'SkillGroupHandlers', { name: data.name });
        await loadConfigIntoService();
        const result = skillGroupService!.createGroup(data);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to create skill group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:update
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_UPDATE,
    async (_event, { id, data }: { id: string; data: Partial<Omit<SkillGroup, 'id' | 'createdAt'>> }): Promise<IPCResponse<SkillGroup>> => {
      try {
        logger.debug('Updating skill group', 'SkillGroupHandlers', { id });
        await loadConfigIntoService();
        const result = skillGroupService!.updateGroup(id, data);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to update skill group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:delete
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_DELETE,
    async (_event, { id }: { id: string }): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Deleting skill group', 'SkillGroupHandlers', { id });
        await loadConfigIntoService();
        const result = skillGroupService!.deleteGroup(id);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to delete skill group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:add-tag
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_ADD_TAG,
    async (_event, { groupId, tag }: { groupId: string; tag: string }): Promise<IPCResponse<SkillGroup>> => {
      try {
        logger.debug('Adding tag to group', 'SkillGroupHandlers', { groupId, tag });
        await loadConfigIntoService();
        const result = skillGroupService!.addTagToGroup(groupId, tag);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to add tag to group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:remove-tag
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_REMOVE_TAG,
    async (_event, { groupId, tag }: { groupId: string; tag: string }): Promise<IPCResponse<SkillGroup>> => {
      try {
        logger.debug('Removing tag from group', 'SkillGroupHandlers', { groupId, tag });
        await loadConfigIntoService();
        const result = skillGroupService!.removeTagFromGroup(groupId, tag);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to remove tag from group', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:reorder
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_REORDER,
    async (_event, { groupIds }: { groupIds: string[] }): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Reordering skill groups', 'SkillGroupHandlers', { count: groupIds.length });
        await loadConfigIntoService();
        const result = skillGroupService!.reorderGroups(groupIds);
        if (result.success) {
          await saveConfigFromService();
          // Notify all windows to refresh skills/groups
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to reorder skill groups', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:init-defaults
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_INIT_DEFAULTS,
    async (): Promise<IPCResponse<{ initialized: boolean; groups: SkillGroup[] }>> => {
      try {
        logger.debug('Initializing default skill groups', 'SkillGroupHandlers');
        await loadConfigIntoService();
        const initialized = skillGroupService!.initializeDefaultGroups();
        if (initialized) {
          await saveConfigFromService();
          notifySkillsRefresh();
        }
        const groups = skillGroupService!.getGroups();
        return { success: true, data: { initialized, groups } };
      } catch (error) {
        logger.error('Failed to initialize default skill groups', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:reset-defaults
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_RESET_DEFAULTS,
    async (): Promise<IPCResponse<SkillGroup[]>> => {
      try {
        logger.debug('Resetting to default skill groups', 'SkillGroupHandlers');
        await loadConfigIntoService();
        const result = skillGroupService!.resetToDefaultGroups();
        if (result.success) {
          await saveConfigFromService();
          notifySkillsRefresh();
        }
        return result;
      } catch (error) {
        logger.error('Failed to reset default skill groups', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill-group:get-defaults
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GROUP_GET_DEFAULTS,
    async (): Promise<IPCResponse<SkillGroup[]>> => {
      try {
        logger.debug('Getting default skill groups', 'SkillGroupHandlers');
        const defaultGroups = skillGroupService!.getDefaultGroupsList();
        return { success: true, data: defaultGroups };
      } catch (error) {
        logger.error('Failed to get default skill groups', 'SkillGroupHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  logger.info('Skill group IPC handlers registered', 'SkillGroupHandlers');
}

/**
 * Load config into service
 */
async function loadConfigIntoService(): Promise<void> {
  if (!configService) {
    logger.warn('Config service not set, using default config', 'SkillGroupHandlers');
    return;
  }

  const config = await configService.load();
  if (config.skillGroups) {
    skillGroupService!.updateConfig(config.skillGroups);
  }
}

/**
 * Save config from service
 */
async function saveConfigFromService(): Promise<void> {
  if (!configService) {
    logger.warn('Config service not set, cannot save', 'SkillGroupHandlers');
    return;
  }

  const groupsConfig = skillGroupService!.getConfig();
  await configService.saveSkillGroups(groupsConfig);
}

/**
 * Get skill group service instance
 */
export function getSkillGroupService(): SkillGroupService | null {
  return skillGroupService;
}
