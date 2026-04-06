/**
 * Import IPC Handlers
 *
 * Handles IPC communication for skill import operations
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { ImportService } from '../services/ImportService';
import { SkillService } from '../services/SkillService';
import { getConfigService } from './configHandlers';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  DetectedSkill,
  ImportOptions,
  ImportProgress,
  ImportResult,
  UrlScanResult,
} from '../../shared/types';
import { logger } from '../utils/Logger';

let importService: ImportService | null = null;

/**
 * Initialize import service
 */
export function initImportService(skillService: SkillService): void {
  importService = new ImportService(skillService);
  logger.info('ImportService initialized', 'ImportHandlers');
}

/**
 * Register import IPC handlers
 */
export function registerImportHandlers(mainWindow: BrowserWindow | null): void {
  // Scan local directory for skills
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_SCAN_DIRECTORY,
    async (event, { dirPath }: { dirPath: string }): Promise<{ success: boolean; data?: DetectedSkill[]; error?: string }> => {
      try {
        if (!importService) {
          throw new Error('ImportService not initialized');
        }

        const configService = getConfigService();
        const config = await configService?.load();
        const appDir = importService.getApplicationSkillsDirectory(config!);

        const skills = await importService.scanLocalDirectory(dirPath, appDir);

        return { success: true, data: skills };
      } catch (error) {
        logger.error('Failed to scan directory', 'ImportHandlers', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Scan URL for skills
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_SCAN_URL,
    async (event, { url, pat }: { url: string; pat?: string }): Promise<UrlScanResult> => {
      try {
        if (!importService) {
          throw new Error('ImportService not initialized');
        }

        const result = await importService.scanUrlForSkills(url, pat);
        return result;
      } catch (error) {
        logger.error('Failed to scan URL', 'ImportHandlers', error);
        return {
          success: false,
          provider: 'github',
          owner: '',
          repo: '',
          skills: [],
          isPrivate: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Import local skills
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_LOCAL_SKILLS,
    async (
      event,
      { skills, options }: { skills: DetectedSkill[]; options: ImportOptions }
    ): Promise<{ success: boolean; data?: ImportResult; error?: string }> => {
      try {
        if (!importService) {
          throw new Error('ImportService not initialized');
        }

        const configService = getConfigService();
        const config = await configService?.load();
        const appDir = importService.getApplicationSkillsDirectory(config!);

        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await importService.importLocalSkills(skills, appDir, options, senderWindow);

        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to import local skills', 'ImportHandlers', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Import skills from URL
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_URL_SKILLS,
    async (
      event,
      {
        url,
        skillPaths,
        pat,
        options,
      }: {
        url: string;
        skillPaths: string[];
        pat?: string;
        options: ImportOptions;
      }
    ): Promise<{ success: boolean; data?: ImportResult; error?: string }> => {
      try {
        if (!importService) {
          throw new Error('ImportService not initialized');
        }

        const configService = getConfigService();
        const config = await configService?.load();
        const appDir = importService.getApplicationSkillsDirectory(config!);

        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await importService.importSkillsFromUrl(
          url,
          skillPaths,
          pat,
          appDir,
          options,
          senderWindow
        );

        return { success: true, data: result };
      } catch (error) {
        logger.error('Failed to import skills from URL', 'ImportHandlers', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  logger.info('Import IPC handlers registered', 'ImportHandlers');
}

/**
 * Remove import IPC handlers
 */
export function removeImportHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_SCAN_DIRECTORY);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_SCAN_URL);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_LOCAL_SKILLS);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_URL_SKILLS);
  logger.info('Import IPC handlers removed', 'ImportHandlers');
}
