/**
 * Skill IPC Handlers
 *
 * IPC handlers for skill operations
 */

import { ipcMain } from 'electron';
import { logger } from '../utils/Logger';
import {
  ErrorHandler,
  FileNotFoundError,
  PermissionError,
  PathTraversalError,
  YAMLParseError,
  ConfigurationError,
  SkillExistsError
} from '../utils/ErrorHandler';
import { SkillService } from '../services/SkillService';
import { PathValidator } from '../services/PathValidator';
import { IPC_CHANNELS } from '../../shared/constants';
import { IPCResponse, IPCError, Skill, Configuration, SkillFileTreeNode, SkillFileContent } from '../../shared/types';
import { getFileWatcher } from '../index';
import { getConfigService } from './configHandlers';

import { SymlinkService } from '../services/SymlinkService';
let skillService: SkillService | null = null;

/**
 * Convert error to IPCError format
 */
function toIPCError(error: unknown): IPCError {
  const message = ErrorHandler.format(error);
  let code = 'UNKNOWN_ERROR';

  if (error instanceof FileNotFoundError) {
    code = 'FILE_NOT_FOUND';
  } else if (error instanceof PermissionError) {
    code = 'PERMISSION_DENIED';
  } else if (error instanceof PathTraversalError) {
    code = 'PATH_TRAVERSAL';
  } else if (error instanceof YAMLParseError) {
    code = 'YAML_PARSE_ERROR';
  } else if (error instanceof ConfigurationError) {
    code = 'CONFIGURATION_ERROR';
  } else if (error instanceof SkillExistsError) {
    code = 'SKILL_EXISTS';
  } else if (error instanceof Error) {
    code = 'GENERAL_ERROR';
  }

  return { code, message };
}

 /**
 * Initialize skill service and register IPC handlers
 */
export function registerSkillHandlers(pathValidator: PathValidator, symlinkService: SymlinkService): void {
  // Initialize skill service
  skillService = new SkillService(pathValidator, symlinkService);
  logger.info('Skill service initialized', 'SkillHandlers');

  // Handler for skill:list
  ipcMain.handle(
    IPC_CHANNELS.SKILL_LIST,
    async (_event, { config }: { config?: Configuration }): Promise<IPCResponse<Skill[]>> => {
      try {
        logger.debug('Listing all skills', 'SkillHandlers');
        // Load config if not provided
        const skillConfig = config || (await getConfigService()?.load()) as Configuration;
        if (!skillConfig) {
          throw new ConfigurationError('Configuration not available');
        }
        const skills = await skillService!.listAllSkills(skillConfig);
        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to list skills', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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
        logger.error('Failed to get skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:create
  ipcMain.handle(
    IPC_CHANNELS.SKILL_CREATE,
    async (
      _event,
      { name, directory }: { name: string; directory?: 'project' | 'global' | 'application' }
    ): Promise<IPCResponse<Skill>> => {
      try {
        logger.debug(`Creating skill: ${name}`, 'SkillHandlers');
        // Skills are always created in the centralized application directory
        // The directory parameter is ignored but kept for backward compatibility
        const skill = await skillService!.createSkill(name, 'application');
        logger.info(`Skill created: ${name}`, 'SkillHandlers');
        return { success: true, data: skill };
      } catch (error) {
        logger.error('Failed to create skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:copy
  ipcMain.handle(
    IPC_CHANNELS.SKILL_COPY,
    async (
      _event,
      { sourcePath, newName }: { sourcePath: string; newName: string }
    ): Promise<IPCResponse<Skill>> => {
      try {
        logger.debug(`Copying skill: ${sourcePath} to ${newName}`, 'SkillHandlers');
        const skill = await skillService!.copySkill(sourcePath, newName);
        logger.info(`Skill copied: ${newName}`, 'SkillHandlers');
        return { success: true, data: skill };
      } catch (error) {
        logger.error('Failed to copy skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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
        logger.error('Failed to update skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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
        logger.error('Failed to delete skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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
        logger.error('Failed to open folder', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:check-updates
  ipcMain.handle(
    IPC_CHANNELS.SKILL_CHECK_UPDATES,
    async (_event, { skills }: { skills: Skill[] }): Promise<IPCResponse<Map<string, { hasUpdate: boolean; remoteSHA?: string }>>> => {
      try {
        logger.debug('Checking for skill updates', 'SkillHandlers');
        const updates = await skillService!.checkForUpdates(skills);

        // Convert Map to plain object for IPC serialization
        const updatesObject: Record<string, { hasUpdate: boolean; remoteSHA?: string }> = {};
        updates.forEach((value, key) => {
          updatesObject[key] = value;
        });

        logger.info(`Update check completed: ${updates.size} skills checked`, 'SkillHandlers');
        return { success: true, data: updatesObject as any };
      } catch (error) {
        logger.error('Failed to check for updates', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:update-skill
  ipcMain.handle(
    IPC_CHANNELS.SKILL_UPDATE_SKILL,
    async (_event, { skillPath, createBackup }: { skillPath: string; createBackup: boolean }): Promise<IPCResponse<{ newPath: string }>> => {
      try {
        logger.debug(`Updating skill: ${skillPath}`, 'SkillHandlers');

        // Get skill to determine source type
        const skillData = await skillService!.getSkill(skillPath);
        const skill = skillData.metadata;

        if (!skill.sourceMetadata) {
          throw new Error('Skill was not installed from a remote source');
        }

        // Update based on source type
        if (skill.sourceMetadata.type === 'registry') {
          // TODO: Implement registry skill update
          throw new Error('Registry skill updates not yet implemented');
        } else if (skill.sourceMetadata.type === 'private-repo') {
          const result = await skillService!.updatePrivateSkill(skillPath, createBackup);
          if (!result.success) {
            throw new Error(result.error || 'Update failed');
          }
          return { success: true, data: { newPath: result.newPath || skillPath } };
        } else {
          throw new Error('Cannot update locally created skills');
        }
      } catch (error) {
        logger.error('Failed to update skill', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:file-tree
  ipcMain.handle(
    IPC_CHANNELS.SKILL_FILE_TREE,
    async (_event, { skillPath }: { skillPath: string }): Promise<IPCResponse<SkillFileTreeNode>> => {
      try {
        logger.debug(`Getting file tree: ${skillPath}`, 'SkillHandlers');
        const tree = await skillService!.getSkillFileTree(skillPath);
        return { success: true, data: tree };
      } catch (error) {
        logger.error('Failed to get file tree', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
      }
    }
  );

  // Handler for skill:file-read
  ipcMain.handle(
    IPC_CHANNELS.SKILL_FILE_READ,
    async (_event, { filePath }: { filePath: string }): Promise<IPCResponse<SkillFileContent>> => {
      try {
        logger.debug(`Reading skill file: ${filePath}`, 'SkillHandlers');
        const result = await skillService!.readSkillFile(filePath);
        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to read skill file', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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

        // Get the application directory from path validator
        const appDir = pathValidator.getApplicationDirectory();
        if (!appDir) {
          throw new Error('Application skills directory not configured');
        }

        await fileWatcher.start(appDir);

        logger.info('File system watcher started', 'SkillHandlers', { appDir });
        return { success: true };
      } catch (error) {
        logger.error('Failed to start file watcher', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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

        await fileWatcher.stop();

        logger.info('File system watcher stopped', 'SkillHandlers');
        return { success: true };
      } catch (error) {
        logger.error('Failed to stop file watcher', 'SkillHandlers', error);
        return { success: false, error: toIPCError(error) };
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
