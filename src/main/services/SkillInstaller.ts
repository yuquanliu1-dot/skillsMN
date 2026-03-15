/**
 * Skill Installer Service
 *
 * Handles installation of skills from the registry by cloning GitHub repositories
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { gitOperations, CloneResult } from '../utils/gitOperations';
import { SkillDiscovery } from '../utils/skillDiscovery';
import { createRegistrySource, SkillSource } from '../models/SkillSource';
import { logger } from '../utils/Logger';
import type { InstallFromRegistryRequest, InstallProgressEvent, RegistryErrorCode } from '../../shared/types';

export class SkillInstaller {
  /**
   * Install a skill from the registry
   *
   * @param request - Installation request with source, skillId, targetToolId
   * @param targetDirectory - Target directory to install the skill
   * @param onProgress - Optional progress callback
   * @returns Installation result with skill path and error details
   */
  async installFromRegistry(
    request: InstallFromRegistryRequest,
    targetDirectory: string,
    onProgress?: (event: InstallProgressEvent) => void
  ): Promise<{
    success: boolean;
    skillPath?: string;
    error?: string;
    errorCode?: RegistryErrorCode;
  }> {
    const tempRoot = path.join(os.tmpdir(), `skillsMN-${uuidv4()}`);
    const installContext = {
      source: request.source,
      skillId: request.skillId,
      targetToolId: request.targetToolId,
      targetDirectory,
      tempRoot,
      startTime: new Date().toISOString()
    };

    logger.info('Repository cloned successfully', 'SkillInstaller', installContext);

    logger.info('Starting skill installation', 'SkillInstaller', installContext);

    try {
      // Stage 1: Cloning repository
      onProgress?.({
        stage: 'cloning',
        message: `Cloning repository from ${request.source}...`,
        progress: 10
      });

      const cloneResult = await gitOperations.shallowClone(
        request.source,
        tempRoot,
        (message) => {
          logger.debug(`Clone progress: ${message}`, 'SkillInstaller');
        }
      );

      if (!cloneResult.success) {
        logger.error('Repository clone failed', 'SkillInstaller', {
          errorCode: cloneResult.errorCode,
          error: cloneResult.error,
          ...installContext
        });

        throw Object.assign(new Error(cloneResult.error || 'Failed to clone repository'), {
          code: cloneResult.errorCode || 'REGISTRY_GIT_ERROR'
        });
      }

      logger.info('Repository cloned successfully', 'SkillInstaller', {
        commitHash: cloneResult.commitHash,
        ...installContext
      });

      // Stage 2: Discovering skill directory
      onProgress?.({
        stage: 'discovering',
        message: 'Finding skill directory...',
        progress: 40
      });

      const skillDiscovery = new SkillDiscovery();
      const skillDir = await skillDiscovery.findSkillByName(
        tempRoot,
        request.skillId,
        2
      );

      if (!skillDir) {
        logger.error('Skill not found in repository', 'SkillInstaller', {
          skillId: request.skillId,
          ...installContext
        });

        throw Object.assign(
          new Error(
            `Skill "${request.skillId}" not found in repository. ` +
            `Make sure the repository contains a skill with this ID.`
          ),
          { code: 'REGISTRY_SKILL_NOT_FOUND' }
        );
      }

      logger.info('Skill directory discovered', 'SkillInstaller', {
        skillDir,
        ...installContext
      });

      // Verify SKILL.md exists
      const skillMdPath = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        logger.error('Invalid skill structure - missing SKILL.md', 'SkillInstaller', {
          skillDir,
          skillMdPath,
          ...installContext
        });

        throw Object.assign(
          new Error(`Invalid skill structure: SKILL.md not found in ${skillDir}`),
          { code: 'REGISTRY_INVALID_SKILL' }
        );
      }

      // Stage 3: Copying to target directory
      onProgress?.({
        stage: 'copying',
        message: 'Copying skill to target directory...',
        progress: 60
      });

      // Slugify skill name for directory naming
      const slugifiedName = this.slugify(request.skillId);
      const targetPath = path.join(targetDirectory, slugifiedName);

      // Ensure target directory exists
      await fs.promises.mkdir(targetDirectory, { recursive: true });

      // Copy skill directory
      await this.copyDirectory(skillDir, targetPath);

      logger.info('Skill copied to target directory', 'SkillInstaller', {
        targetPath,
        ...installContext
      });

      // Stage 4: Writing metadata
      onProgress?.({
        stage: 'writing_metadata',
        message: 'Writing installation metadata...',
        progress: 80
      });

      // Create and write source metadata
      const sourceMetadata = createRegistrySource(
        request.source,
        request.skillId,
        cloneResult.commitHash
      );

      await skillDiscovery.writeSourceMetadata(
        targetPath,
        sourceMetadata,
        cloneResult.commitHash
      );

      logger.info('Source metadata written', 'SkillInstaller', {
        metadata: sourceMetadata,
        ...installContext
      });

      // Stage 5: Cleanup
      onProgress?.({
        stage: 'cleaning_up',
        message: 'Cleaning up temporary files...',
        progress: 90
      });

      // Clean up temporary directory
      await fs.promises.rm(tempRoot, { recursive: true, force: true });

      logger.info('Temporary directory cleaned up', 'SkillInstaller', { tempRoot });

      // Stage 6: Completed
      onProgress?.({
        stage: 'completed',
        message: 'Installation completed successfully!',
        progress: 100
      });

      const duration = Date.now() - new Date(installContext.startTime).getTime();
      logger.info('Skill installation completed', 'SkillInstaller', {
        skillPath: targetPath,
        duration: `${duration}ms`,
        ...installContext
      });

      return {
        success: true,
        skillPath: targetPath
      };

    } catch (error: any) {
      const errorCode = error.code || 'REGISTRY_INSTALLATION_FAILED';
      const errorMessage = error.message || 'Installation failed';

      logger.error('Skill installation failed', 'SkillInstaller', {
        error: errorMessage,
        errorCode,
        stack: error.stack,
        ...installContext
      });

      // Clean up temporary directory on error
      try {
        if (fs.existsSync(tempRoot)) {
          await fs.promises.rm(tempRoot, { recursive: true, force: true });
          logger.info('Cleaned up temporary directory after failure', 'SkillInstaller', { tempRoot });
        }
      } catch (cleanupError: any) {
        logger.error('Failed to clean up temporary directory', 'SkillInstaller', {
          cleanupError: cleanupError.message,
          tempRoot
        });
      }

      onProgress?.({
        stage: 'failed',
        message: errorMessage,
        progress: 0
      });

      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode as RegistryErrorCode
      };
    }
  }

  /**
   * Slugify a string for use as a directory name
   *
   * @param text - Text to slugify
   * @returns Slugified string
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Copy directory recursively
   *
   * @param src - Source directory
   * @param dest - Destination directory
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });

    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}
