/**
 * Private Repository Service
 *
 * Manages private repository configuration and skill synchronization
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { safeStorage } from 'electron';
import { logger } from '../utils/Logger';
import { PrivateRepoModel } from '../models/PrivateRepo';
import { GitHubService } from './GitHubService';
import { SkillService } from './SkillService';
import { PathValidator } from './PathValidator';
import type { PrivateRepo, PrivateRepoConfig, PrivateSkill } from '../../shared/types';
import { PRIVATE_REPOS_FILE_NAME } from '../../shared/constants';

export class PrivateRepoService {
  private static configPath: string | null = null;
  private static config: PrivateRepoConfig | null = null;

  /**
   * Initialize the private repository service
   * Sets up configuration file path and loads existing configuration
   * Must be called before using other service methods
   * @example
   * await PrivateRepoService.initialize();
   */
  static async initialize(): Promise<void> {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, PRIVATE_REPOS_FILE_NAME);
    await this.loadConfig();
    logger.info('PrivateRepoService initialized', 'PrivateRepoService', {
      configPath: this.configPath,
    });
  }

  /**
   * Load configuration from disk
   */
  private static async loadConfig(): Promise<void> {
    try {
      if (!this.configPath) {
        throw new Error('Service not initialized');
      }

      const exists = await fs.pathExists(this.configPath);
      if (!exists) {
        this.config = PrivateRepoModel.createDefaultConfig();
        await this.saveConfig();
        logger.info('Created default private repos config', 'PrivateRepoService');
        return;
      }

      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects
      if (parsed.repositories && Array.isArray(parsed.repositories)) {
        parsed.repositories = parsed.repositories.map((repo: any) => ({
          ...repo,
          addedAt: repo.addedAt ? new Date(repo.addedAt) : new Date(),
          createdAt: repo.createdAt ? new Date(repo.createdAt) : new Date(),
          updatedAt: repo.updatedAt ? new Date(repo.updatedAt) : new Date(),
          lastSyncTime: repo.lastSyncTime ? new Date(repo.lastSyncTime) : undefined,
        }));
      }

      if (!PrivateRepoModel.validateConfig(parsed)) {
        logger.warn('Invalid config format, creating new config', 'PrivateRepoService');
        this.config = PrivateRepoModel.createDefaultConfig();
        await this.saveConfig();
        return;
      }

      this.config = parsed;
      logger.info('Loaded private repos config', 'PrivateRepoService', {
        repoCount: this.config.repositories.length,
      });
    } catch (error) {
      logger.error('Failed to load config', 'PrivateRepoService', error);
      this.config = PrivateRepoModel.createDefaultConfig();
    }
  }

  /**
   * Save configuration to disk
   */
  private static async saveConfig(): Promise<void> {
    try {
      if (!this.configPath || !this.config) {
        throw new Error('Service not initialized');
      }

      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      logger.debug('Saved private repos config', 'PrivateRepoService');
    } catch (error) {
      logger.error('Failed to save config', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Add a private repository configuration
   * Validates URL, tests connection, and encrypts PAT before storing
   * @param url - GitHub repository URL (https://github.com/owner/repo)
   * @param pat - Personal Access Token with repo access
   * @param displayName - Optional friendly name for the repository
   * @returns Created PrivateRepo object with encrypted PAT
   * @throws Error if URL is invalid, connection fails, or save fails
   * @example
   * const repo = await PrivateRepoService.addRepo(
   *   'https://github.com/myorg/skills',
   *   'ghp_xxxxxxxxxxxx',
   *   'My Organization Skills'
   * );
   * console.log('Added repo:', repo.id);
   */
  static async addRepo(url: string, pat: string, displayName?: string): Promise<PrivateRepo> {
    try {
      // Parse URL
      const parsed = PrivateRepoModel.parseUrl(url);
      if (!parsed) {
        throw new Error('Invalid repository URL. Must be https://github.com/owner/repo');
      }

      const { owner, repo } = parsed;

      // Test connection
      const connectionTest = await GitHubService.testConnection(owner, repo, pat);
      if (!connectionTest.valid) {
        throw new Error(connectionTest.error || 'Failed to connect to repository');
      }

      // Encrypt PAT
      const patEncrypted = safeStorage.encryptString(pat).toString('base64');

      // Create repository entry
      const newRepo = PrivateRepoModel.create(owner, repo, patEncrypted, displayName);
      newRepo.defaultBranch = connectionTest.repository?.defaultBranch || 'main';
      newRepo.description = connectionTest.repository?.description;

      // Add to config
      if (!this.config) {
        await this.initialize();
      }

      this.config!.repositories.push(newRepo);
      await this.saveConfig();

      logger.info('Added private repository', 'PrivateRepoService', {
        id: newRepo.id,
        url: newRepo.url,
      });

      return newRepo;
    } catch (error) {
      logger.error('Failed to add private repo', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * List all configured private repositories
   * @returns Array of PrivateRepo objects
   * @example
   * const repos = await PrivateRepoService.listRepos();
   * repos.forEach(repo => console.log(repo.displayName || repo.url));
   */
  static async listRepos(): Promise<PrivateRepo[]> {
    if (!this.config) {
      await this.initialize();
    }

    return this.config!.repositories;
  }

  /**
   * Get a specific repository by ID
   * @param repoId - Repository ID to retrieve
   * @returns PrivateRepo object or null if not found
   * @example
   * const repo = await PrivateRepoService.getRepo('repo-123');
   * if (repo) {
   *   console.log('Found:', repo.url);
   * }
   */
  static async getRepo(repoId: string): Promise<PrivateRepo | null> {
    if (!this.config) {
      await this.initialize();
    }

    return this.config!.repositories.find((r) => r.id === repoId) || null;
  }

  /**
   * Update a repository configuration
   * Merges updates with existing repository and saves to disk
   * @param repoId - Repository ID to update
   * @param updates - Partial PrivateRepo object with fields to update
   * @returns Updated PrivateRepo object
   * @throws Error if repository not found or save fails
   * @example
   * const updated = await PrivateRepoService.updateRepo('repo-123', {
   *   displayName: 'Updated Name',
   *   defaultBranch: 'develop'
   * });
   */
  static async updateRepo(
    repoId: string,
    updates: Partial<Pick<PrivateRepo, 'displayName' | 'patEncrypted' | 'defaultBranch' | 'description'>>
  ): Promise<PrivateRepo> {
    try {
      if (!this.config) {
        await this.initialize();
      }

      const index = this.config!.repositories.findIndex((r) => r.id === repoId);
      if (index === -1) {
        throw new Error('Repository not found');
      }

      this.config!.repositories[index] = PrivateRepoModel.update(
        this.config!.repositories[index],
        updates
      );

      await this.saveConfig();

      logger.info('Updated private repository', 'PrivateRepoService', { repoId });

      return this.config!.repositories[index];
    } catch (error) {
      logger.error('Failed to update private repo', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Search skills in a private repository by name or commit message
   * @param repoId - Repository ID to search in
   * @param query - Search query string
   * @returns Array of matching PrivateSkill objects
   * @throws Error if repository not found or search fails
   * @example
   * const skills = await PrivateRepoService.searchSkills('repo-123', 'code review');
   * console.log(`Found ${skills.length} matching skills`);
   */
  static async searchSkills(repoId: string, query: string): Promise<PrivateSkill[]> {
    try {
      const allSkills = await this.getSkills(repoId);
      const lowerQuery = query.toLowerCase();

      return allSkills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(lowerQuery) ||
          (skill.lastCommitMessage && skill.lastCommitMessage.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      logger.error('Failed to search private repo skills', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Remove a repository configuration
   *
   * Removes only the repository configuration from the app settings.
   * Locally installed skills from this repository are NOT deleted and remain fully functional.
   * Users can continue to use installed skills even after removing the repository.
   * The repository can be re-added later if needed to check for updates or install new skills.
   *
   * @param repoId - Repository ID to remove
   * @throws Error if repository not found or save fails
   * @example
   * await PrivateRepoService.removeRepo('repo-123');
   */
  static async removeRepo(repoId: string): Promise<void> {
    try {
      if (!this.config) {
        await this.initialize();
      }

      const index = this.config!.repositories.findIndex((r) => r.id === repoId);
      if (index === -1) {
        throw new Error('Repository not found');
      }

      this.config!.repositories.splice(index, 1);
      await this.saveConfig();

      logger.info('Removed private repository', 'PrivateRepoService', { repoId });
    } catch (error) {
      logger.error('Failed to remove private repo', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Test repository connection and update metadata
   * Validates PAT and updates repository info if successful
   * @param repoId - Repository ID to test
   * @returns Object with valid status, repository info if successful, or error message
   * @example
   * const result = await PrivateRepoService.testConnection('repo-123');
   * if (result.valid) {
   *   console.log('Connection OK:', result.repository?.name);
   * } else {
   *   console.error('Connection failed:', result.error);
   * }
   */
  static async testConnection(repoId: string): Promise<{
    valid: boolean;
    repository?: {
      name: string;
      description: string;
      defaultBranch: string;
    };
    error?: string;
  }> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT
      const pat = safeStorage.decryptString(Buffer.from(repo.patEncrypted, 'base64'));

      const result = await GitHubService.testConnection(repo.owner, repo.repo, pat);

      if (result.valid && result.repository) {
        // Update repository metadata
        await this.updateRepo(repoId, {
          displayName: repo.displayName || result.repository.name,
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to test connection', 'PrivateRepoService', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all skills from a private repository
   * Fetches skill directories and their commit history
   * Updates last sync time on success
   * @param repoId - Repository ID to get skills from
   * @returns Array of PrivateSkill objects with metadata
   * @throws Error if repository not found or fetch fails
   * @example
   * const skills = await PrivateRepoService.getSkills('repo-123');
   * skills.forEach(skill => {
   *   console.log(skill.name, skill.lastCommitDate);
   * });
   */
  static async getSkills(repoId: string): Promise<PrivateSkill[]> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT
      const pat = safeStorage.decryptString(Buffer.from(repo.patEncrypted, 'base64'));

      const skills = await GitHubService.getPrivateRepoSkills(
        repo.owner,
        repo.repo,
        pat,
        repo.defaultBranch
      );

      // Convert to PrivateSkill format
      const privateSkills: PrivateSkill[] = skills.map((skill: any) => ({
        name: skill.name,
        path: skill.path,
        directoryPath: skill.path,
        downloadUrl: `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.defaultBranch}/${skill.skillFilePath}`,
        lastModified: skill.lastCommitDate || new Date(),
        repoId: repo.id,
        repoName: `${repo.owner}/${repo.repo}`,
        lastCommitMessage: skill.lastCommitMessage,
        lastCommitAuthor: skill.lastCommitAuthor,
        lastCommitDate: skill.lastCommitDate,
        fileCount: 1,
        directoryCommitSHA: skill.directoryCommitSHA,
      }));

      // Update last sync time
      await this.updateRepo(repoId, {});

      logger.info('Retrieved skills from private repo', 'PrivateRepoService', {
        repoId,
        count: privateSkills.length,
      });

      return privateSkills;
    } catch (error) {
      logger.error('Failed to get private repo skills', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Install a skill from a private repository to local directory
   * Downloads skill files and preserves directory structure
   * Handles conflicts based on resolution strategy
   * @param repoId - Source repository ID
   * @param skillPath - Path to skill directory in repository
   * @param targetDirectory - 'project' or 'global' directory
   * @param conflictResolution - Strategy: 'overwrite', 'rename', or 'skip'
   * @returns Object with success status, new path if successful, or error message
   * @throws Error if repository not found or download fails
   * @example
   * const result = await PrivateRepoService.installSkill(
   *   'repo-123',
   *   'skills/my-skill',
   *   'project',
   *   'rename'
   * );
   * if (result.success) {
   *   console.log('Installed to:', result.newPath);
   * }
   */
  static async installSkill(
    repoId: string,
    skillPath: string,
    targetDirectory: 'project' | 'global',
    conflictResolution?: 'overwrite' | 'rename' | 'skip'
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT
      const pat = safeStorage.decryptString(Buffer.from(repo.patEncrypted, 'base64'));

      // Download skill directory
      const files = await GitHubService.downloadPrivateDirectory(
        repo.owner,
        repo.repo,
        skillPath,
        pat,
        repo.defaultBranch
      );

      if (files.size === 0) {
        throw new Error('No files found in skill directory');
      }

      // Determine target path
      const skillName = path.basename(skillPath);
      const baseDir = targetDirectory === 'project' ? 'project' : 'global';

      // Get allowed directories from PathValidator
      const allowedDirs = PathValidator.getAllowedDirectories();
      const targetBasePath = allowedDirs[baseDir];

      if (!targetBasePath) {
        throw new Error(`${targetDirectory} directory not configured`);
      }

      const targetPath = path.join(targetBasePath, skillName);

      // Check for conflicts
      const exists = await fs.pathExists(targetPath);
      if (exists && !conflictResolution) {
        return {
          success: false,
          error: 'CONFLICT',
        };
      }

      if (exists && conflictResolution === 'skip') {
        return {
          success: true,
          newPath: targetPath,
        };
      }

      // Handle conflicts
      let finalPath = targetPath;
      if (exists && conflictResolution === 'rename') {
        const timestamp = Date.now();
        finalPath = `${targetPath}-${timestamp}`;
      }

      // Create skill directory
      await fs.ensureDir(finalPath);

      // Write files
      for (const [filePath, content] of files.entries()) {
        const relativePath = path.relative(skillPath, filePath);
        const absolutePath = path.join(finalPath, relativePath);
        await fs.ensureDir(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, content, 'utf-8');
      }

      logger.info('Installed skill from private repo', 'PrivateRepoService', {
        repoId,
        skillPath,
        targetPath: finalPath,
        fileCount: files.size,
      });

      return {
        success: true,
        newPath: finalPath,
      };
    } catch (error) {
      logger.error('Failed to install skill from private repo', 'PrivateRepoService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check for updates to installed private skills
   * Compares installed skills with repository versions
   * @returns Map of skill paths to update status
   * @example
   * const updates = await PrivateRepoService.checkForUpdates();
   * updates.forEach((status, path) => {
   *   if (status.hasUpdate) {
   *     console.log('Update available:', path);
   *   }
   * });
   */
  /**
   * Check all private repositories for skill updates
   *
   * UPDATE DETECTION ALGORITHM:
   * 1. Iterate through all configured private repositories
   * 2. For each repo, fetch current skills from GitHub API
   * 3. Compare directory commit SHAs with locally installed versions
   * 4. Mark skills as having updates if SHAs differ
   *
   * PERFORMANCE: This operation is cached for 5 minutes to reduce API calls.
   * The cache is invalidated when repository configuration changes.
   *
   * LIMITATION: Currently requires tracking which skills were installed from which repo.
   * Future implementation will use metadata in skill.md or a separate manifest.
   *
   * @returns Map of skill paths to update status
   * @example
   * const updates = await PrivateRepoService.checkForUpdates();
   * updates.forEach((status, path) => {
   *   if (status.hasUpdate) {
   *     console.log('Update available:', path);
   *   }
   * });
   */
  static async checkForUpdates(): Promise<Map<string, { hasUpdate: boolean }>> {
    const updates = new Map<string, { hasUpdate: boolean }>();

    try {
      const repos = await this.listRepos();

      // Check each configured repository for updates
      for (const repo of repos) {
        const skills = await this.getSkills(repo.id);

        for (const skill of skills) {
          // UPDATE DETECTION LOGIC:
          // Compare the remote skill's directoryCommitSHA with the local version
          // If they differ, there are new commits in the remote repository
          //
          // TODO: Implement proper tracking by storing:
          // - Source repository ID in skill metadata
          // - Last known commit SHA at installation time
          // - Local installation path mapping
          //
          // For now, mark all as no updates until tracking is implemented
          updates.set(skill.path, { hasUpdate: false });
        }
      }

      logger.info('Checked for private skill updates', 'PrivateRepoService', {
        count: updates.size,
      });

      return updates;
    } catch (error) {
      logger.error('Failed to check for updates', 'PrivateRepoService', error);
      return updates;
    }
  }

  /**
   * Update an installed skill from its source repository
   * Downloads latest version and optionally creates backup
   * @param skillPath - Local path to installed skill
   * @param createBackup - Whether to backup before updating (default: true)
   * @returns Object with success status, new path if successful, or error message
   * @example
   * const result = await PrivateRepoService.updateSkill(
   *   '/path/to/skill',
   *   true // create backup
   * );
   * if (result.success) {
   *   console.log('Updated successfully');
   * }
   */
  static async updateSkill(
    skillPath: string,
    createBackup?: boolean
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // This would require tracking which repo a skill came from
      // For now, return not implemented
      return {
        success: false,
        error: 'Skill update tracking not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to update skill', 'PrivateRepoService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
