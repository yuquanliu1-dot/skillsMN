/**
 * Skill IPC Handlers
 *
 * IPC handlers for skill operations
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SkillService } from '../services/SkillService';
import { PathValidator } from '../services/PathValidator';
import { SkillDirectoryModel } from '../models/SkillDirectory';
import { getConfigService } from './configHandlers';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, Skill, Configuration } from '../../shared/types';
import { getFileWatcher } from '../index';

let skillService: SkillService | null = null;

/**
 * Initialize skill service and register IPC handlers
 */
export function registerSkillHandlers(pathValidator: PathValidator): void {
  // Initialize skill service
  skillService = new SkillService(pathValidator);
  logger.info('Skill service initialized', 'SkillHandlers');

  // Handler for skill:list
  ipcMain.handle(
    IPC_CHANNELS.SKILL_LIST,
    async (_event, { config }: { config: Configuration }): Promise<IPCResponse<Skill[]>> => {
      try {
        logger.debug('Listing all skills', 'SkillHandlers');
        const skills = await skillService!.listAllSkills(config);
        return { success: true, data: skills };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to list skills', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for skill:get
  ipcMain.handle(
    IPC_CHANNELS.SKILL_GET,
    async (_event, { path }: { path: string }): Promise<IPCResponse<{ metadata: Skill; content: string }>> => {
      try {
        logger.debug(`Getting skill: ${path}`, 'SkillHandlers');
        const skill = await skillService!.getSkill(path);
        return { success: true, data: skill };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to get skill', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for skill:create
  ipcMain.handle(
    IPC_CHANNELS.SKILL_CREATE,
    async (
      _event,
      { name, directory }: { name: string; directory: 'project' | 'global' }
    ): Promise<IPCResponse<Skill>> => {
      try {
        logger.debug(`Creating skill: ${name}`, 'SkillHandlers', { directory });
        const skill = await skillService!.createSkill(name, directory);
        logger.info(`Skill created: ${name}`, 'SkillHandlers');
        return { success: true, data: skill };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to create skill', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for skill:update
  ipcMain.handle(
    IPC_CHANNELS.SKILL_UPDATE,
    async (
      _event,
      { path, content, expectedLastModified }: { path: string; content: string; expectedLastModified?: number }
    ): Promise<IPCResponse<Skill>> => {
      try {
        logger.debug(`Updating skill: ${path}`, 'SkillHandlers');
        const skill = await skillService!.updateSkill(path, content, expectedLastModified);
        logger.info(`Skill updated: ${skill.name}`, 'SkillHandlers');
        return { success: true, data: skill };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to update skill', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for skill:delete
  ipcMain.handle(
    IPC_CHANNELS.SKILL_DELETE,
    async (_event, { path }: { path: string }): Promise<IPCResponse<void>> => {
      try {
        logger.debug(`Deleting skill: ${path}`, 'SkillHandlers');
        await skillService!.deleteSkill(path);
        logger.info(`Skill deleted: ${path}`, 'SkillHandlers');
        return { success: true };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to delete skill', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for skill:open-folder
  ipcMain.handle(
    IPC_CHANNELS.SKILL_OPEN_FOLDER,
    async (_event, { path }: { path: string }): Promise<IPCResponse<void>> => {
      try {
        logger.debug(`Opening folder: ${path}`, 'SkillHandlers');
        await skillService!.openFolder(path);
        return { success: true };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to open folder', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for fs:watch-start
  ipcMain.handle(
    IPC_CHANNELS.FS_WATCH_START,
    async (): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Starting file system watcher', 'SkillHandlers');

        const fileWatcher = getFileWatcher();
        if (!fileWatcher) {
          throw new Error('File watcher not initialized');
        }

        // Get current configuration
        const configService = getConfigService();
        if (!configService) {
          throw new Error('ConfigService not initialized');
        }

        const config = await configService.load();

        const globalDir = SkillDirectoryModel.getGlobalDirectory();
        const projectSkillsDir = config.projectDirectory
          ? SkillDirectoryModel.getProjectDirectory(config.projectDirectory)
          : null;
        fileWatcher.start(projectSkillsDir, globalDir);

        logger.info('File system watcher started', 'SkillHandlers');
        return { success: true };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to start file watcher', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  // Handler for fs:watch-stop
  ipcMain.handle(
    IPC_CHANNELS.FS_WATCH_STOP,
    async (): Promise<IPCResponse<void>> => {
      try {
        logger.debug('Stopping file system watcher', 'SkillHandlers');

        const fileWatcher = getFileWatcher();
        if (!fileWatcher) {
          throw new Error('File watcher not initialized');
        }

        fileWatcher.stop();

        logger.info('File system watcher stopped', 'SkillHandlers');
        return { success: true };
      } catch (error) {
        const message = ErrorHandler.format(error);
        logger.error('Failed to stop file watcher', 'SkillHandlers', error);
        return { success: false, error: message };
      }
    }
  );

  logger.info('Skill IPC handlers registered', 'SkillHandlers');
}

/**
 * Get skill service instance
 */
export function getSkillService(): SkillService | null {
  return skillService;
}
