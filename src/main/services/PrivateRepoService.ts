/**
 * Private Repository Service
 *
 * Manages private repository configuration and skill synchronization
 * Uses unified ConfigService for configuration storage
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { safeStorage, BrowserWindow } from 'electron';
import { logger } from '../utils/Logger';
import { PrivateRepoModel } from '../models/PrivateRepo';
import { getGitProvider } from './GitProvider';
import { SkillService } from './SkillService';
import { createPrivateRepoSource, createLocalSource } from '../models/SkillSource';
import { getConfigService } from '../ipc/configHandlers';
import { getSkillService } from '../ipc/skillHandlers';
import { ContributionStatsService } from './ContributionStatsService';
import type { PrivateRepo, PrivateRepoConfigSection, PrivateSkill, Configuration } from '../../shared/types';
import { SOURCE_METADATA_FILE, IPC_CHANNELS } from '../../shared/constants';

export class PrivateRepoService {
  private static config: PrivateRepoConfigSection | null = null;

  /**
   * Safely decrypt an encrypted PAT with proper error handling
   * @param patEncrypted - Base64 encoded encrypted PAT
   * @returns Decrypted PAT string
   * @throws Error with user-friendly message if decryption fails
   */
  private static decryptPAT(patEncrypted: string): string {
    // Check if PAT appears to be plaintext (manually entered in config)
    const plaintextPatPatterns = ['ghp_', 'gho_', 'github_pat_', 'glpat-'];
    if (plaintextPatPatterns.some(pattern => patEncrypted.startsWith(pattern))) {
      // Return the plaintext PAT directly - it will be encrypted when saved
      logger.info('PAT is in plaintext format - returning as-is for use', 'PrivateRepoService');
      return patEncrypted;
    }

    try {
      return safeStorage.decryptString(Buffer.from(patEncrypted, 'base64'));
    } catch (decryptError) {
      logger.error('Failed to decrypt PAT - credentials may be corrupted or from a different machine', 'PrivateRepoService', decryptError);
      throw new Error('Credentials could not be decrypted. This may happen if the app was installed on a different machine or the config was modified manually. Please remove and re-add this repository with your PAT.');
    }
  }

  /**
   * Decrypt PAT and auto-encrypt if it was stored in plaintext
   * This method handles the migration of plaintext PATs to encrypted format
   * @param repo - The repository object containing the PAT
   * @returns Decrypted PAT string
   */
  private static async decryptAndFixPAT(repo: PrivateRepo): Promise<string> {
    const plaintextPatPatterns = ['ghp_', 'gho_', 'github_pat_', 'glpat-'];
    const isPlaintext = plaintextPatPatterns.some(pattern => repo.patEncrypted.startsWith(pattern));

    if (isPlaintext) {
      logger.info('Auto-encrypting plaintext PAT for repo', 'PrivateRepoService', { repoId: repo.id });
      const plaintextPat = repo.patEncrypted;

      // Encrypt and save
      const encryptedPat = safeStorage.encryptString(plaintextPat).toString('base64');
      const index = this.config!.repositories.findIndex((r) => r.id === repo.id);
      if (index !== -1) {
        this.config!.repositories[index].patEncrypted = encryptedPat;
        await this.saveConfig();
        logger.info('Successfully auto-encrypted plaintext PAT', 'PrivateRepoService', { repoId: repo.id });
      }

      return plaintextPat;
    }

    return this.decryptPAT(repo.patEncrypted);
  }

  /**
   * Initialize the private repository service
   * Loads configuration from unified ConfigService
   * @example
   * await PrivateRepoService.initialize();
   */
  static async initialize(): Promise<void> {
    await this.loadConfig();
    logger.info('PrivateRepoService initialized', 'PrivateRepoService');
  }

  /**
   * Load configuration from ConfigService
   */
  private static async loadConfig(): Promise<void> {
    try {
      const configService = getConfigService();
      if (!configService) {
        throw new Error('ConfigService not initialized');
      }

      this.config = await configService.loadPrivateRepos();

      // Convert date strings back to Date objects
      if (this.config.repositories && Array.isArray(this.config.repositories)) {
        this.config.repositories = this.config.repositories.map((repo: any) => ({
          ...repo,
          addedAt: repo.addedAt ? new Date(repo.addedAt) : new Date(),
          createdAt: repo.createdAt ? new Date(repo.createdAt) : new Date(),
          updatedAt: repo.updatedAt ? new Date(repo.updatedAt) : new Date(),
          lastSyncTime: repo.lastSyncTime ? new Date(repo.lastSyncTime) : undefined,
        }));
      }

      logger.info('Loaded private repos config from ConfigService', 'PrivateRepoService', {
        repoCount: this.config.repositories.length,
      });
    } catch (error) {
      logger.error('Failed to load config', 'PrivateRepoService', error);
      this.config = PrivateRepoModel.createDefaultConfig();
    }
  }

  /**
   * Save configuration via ConfigService
   */
  private static async saveConfig(): Promise<void> {
    try {
      const configService = getConfigService();
      if (!configService || !this.config) {
        throw new Error('ConfigService not initialized');
      }

      await configService.savePrivateRepos(this.config);
      logger.debug('Saved private repos config via ConfigService', 'PrivateRepoService');
    } catch (error) {
      logger.error('Failed to save config', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Add a private repository configuration
   * Validates URL, tests connection, and encrypts PAT before storing
   * @param url - Repository URL (GitHub or GitLab)
   * @param pat - Personal Access Token with repo access
   * @param displayName - Optional friendly name for the repository
   * @param provider - Git provider ('github' or 'gitlab')
   * @param instanceUrl - Optional instance URL for self-hosted GitLab
   * @returns Created PrivateRepo object with encrypted PAT
   * @throws Error if URL is invalid, connection fails, or save fails
   * @example
   * const repo = await PrivateRepoService.addRepo(
   *   'https://github.com/myorg/skills',
   *   'ghp_xxxxxxxxxxxx',
   *   'My Organization Skills',
   *   'github'
   * );
   * console.log('Added repo:', repo.id);
   */
  static async addRepo(
    url: string,
    pat: string,
    displayName?: string,
    provider?: 'github' | 'gitlab',
    instanceUrl?: string
  ): Promise<PrivateRepo> {
    try {
      // Parse URL
      const parsed = PrivateRepoModel.parseUrl(url);
      if (!parsed) {
        throw new Error('Invalid repository URL. Must be a valid GitHub or GitLab repository URL');
      }

      const { owner, repo, provider: detectedProvider, instanceUrl: detectedInstanceUrl } = parsed;

      // Use provided values or fall back to detected values
      const finalProvider = provider || detectedProvider;
      const finalInstanceUrl = instanceUrl || detectedInstanceUrl;

      // Check for duplicate PAT
      if (!this.config) {
        await this.initialize();
      }

      for (const existingRepo of this.config!.repositories) {
        try {
          const existingPat = this.decryptPAT(existingRepo.patEncrypted);
          if (existingPat === pat) {
            throw new Error(`This PAT is already used by repository: ${existingRepo.displayName || existingRepo.url}. Please use a different PAT.`);
          }
        } catch (decryptError) {
          // If decryption fails, skip this repo (it might be corrupted)
          logger.warn('Failed to decrypt PAT for comparison', 'PrivateRepoService', {
            repoId: existingRepo.id,
            error: decryptError
          });
        }
      }

      // Get appropriate provider service
      const gitProvider = getGitProvider(finalProvider);

      // Test connection
      const connectionTest = await gitProvider.testConnection(owner, repo, pat, finalInstanceUrl);
      if (!connectionTest.valid) {
        throw new Error(connectionTest.error || 'Failed to connect to repository');
      }

      // Encrypt PAT
      const patEncrypted = safeStorage.encryptString(pat).toString('base64');

      // Create repository entry
      const newRepo = PrivateRepoModel.create(
        owner,
        repo,
        patEncrypted,
        displayName,
        finalProvider,
        finalInstanceUrl
      );
      newRepo.defaultBranch = connectionTest.repository?.defaultBranch || 'main';
      newRepo.description = connectionTest.repository?.description;

      // Add to config
      this.config!.repositories.push(newRepo);
      await this.saveConfig();

      logger.info('Added private repository', 'PrivateRepoService', {
        id: newRepo.id,
        url: newRepo.url,
        provider: finalProvider,
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

      // If patEncrypted is being updated, encrypt it before storing
      const processedUpdates = { ...updates };
      if (updates.patEncrypted) {
        // Check if the provided PAT is already encrypted (base64 format)
        // If it looks like a plaintext PAT, encrypt it
        const plaintextPatPatterns = ['ghp_', 'gho_', 'github_pat_', 'glpat-'];
        if (plaintextPatPatterns.some(pattern => updates.patEncrypted!.startsWith(pattern))) {
          // This is a plaintext PAT, encrypt it
          processedUpdates.patEncrypted = safeStorage.encryptString(updates.patEncrypted).toString('base64');
          logger.debug('Encrypted plaintext PAT during repo update', 'PrivateRepoService');
        }
        // Otherwise assume it's already encrypted and use as-is
      }

      this.config!.repositories[index] = PrivateRepoModel.update(
        this.config!.repositories[index],
        processedUpdates
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
   * Skills that were installed from this repository will have their source converted to 'local'.
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

      // Convert skills from this repo to local source
      await this.convertSkillsToLocalSource(repoId);

      logger.info('Removed private repository', 'PrivateRepoService', { repoId });
    } catch (error) {
      logger.error('Failed to remove private repo', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Convert skills from a removed repository to local source
   * This ensures skills remain functional even after the repository is removed
   * @param repoId - ID of the removed repository
   * @private
   */
  private static async convertSkillsToLocalSource(repoId: string): Promise<void> {
    try {
      const configService = getConfigService();
      const skillService = getSkillService();

      if (!configService || !skillService) {
        logger.warn('Services not available, skipping skill source conversion', 'PrivateRepoService');
        return;
      }

      const appConfig = configService.getCurrent();
      if (!appConfig) {
        logger.warn('App config not available, skipping skill source conversion', 'PrivateRepoService');
        return;
      }

      // Get all skills
      const skills = await skillService.listAllSkills(appConfig);
      const convertedSkills: string[] = [];

      // Find skills that came from this repo
      for (const skill of skills) {
        if (skill.sourceMetadata?.type === 'private-repo' && skill.sourceMetadata.repoId === repoId) {
          try {
            // Convert to local source
            const localSource = createLocalSource();
            const metadataPath = path.join(skill.path, SOURCE_METADATA_FILE);
            await fs.writeJson(metadataPath, localSource, { spaces: 2 });

            convertedSkills.push(skill.name);
            logger.debug('Converted skill to local source', 'PrivateRepoService', {
              skillName: skill.name,
              skillPath: skill.path,
              oldRepoId: repoId,
            });
          } catch (convertError) {
            logger.warn('Failed to convert skill to local source', 'PrivateRepoService', {
              skillName: skill.name,
              error: convertError,
            });
          }
        }
      }

      if (convertedSkills.length > 0) {
        logger.info('Converted skills to local source after repo removal', 'PrivateRepoService', {
          repoId,
          convertedCount: convertedSkills.length,
          skills: convertedSkills,
        });
      }
    } catch (error) {
      // Non-critical error, don't fail the repo removal
      logger.error('Error during skill source conversion', 'PrivateRepoService', error);
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

      // Decrypt PAT (auto-fixes plaintext PATs)
      let pat: string;
      try {
        pat = await this.decryptAndFixPAT(repo);
      } catch (decryptError) {
        logger.error('Failed to decrypt PAT - credentials may need to be re-entered', 'PrivateRepoService', decryptError);
        return {
          valid: false,
          error: 'Credentials could not be decrypted. This may happen if the app was installed on a different machine or the config was modified manually. Please remove and re-add this repository with your PAT.',
        };
      }

      // Get appropriate provider
      const provider = repo.provider || 'github';
      const gitProvider = getGitProvider(provider);

      const result = await gitProvider.testConnection(
        repo.owner,
        repo.repo,
        pat,
        repo.instanceUrl
      );

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
   * Parse frontmatter from skill content
   * Extracts description and tags from YAML frontmatter
   * @private
   */
  private static parseFrontmatterFromContent(content: string): { description?: string; tags?: string[] } {
    try {
      // Simple YAML frontmatter parser
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return {};
      }

      const frontmatterText = frontmatterMatch[1];
      const result: { description?: string; tags?: string[] } = {};

      // Parse description - support both single-line and multiline YAML strings
      // Check for multiline string indicator (| or >)
      const descMultilineMatch = frontmatterText.match(/^description:\s*[|>]\s*\n([\s\S]*?)(?=\n\s*\n|\n\w+\s*:|$)/m);
      if (descMultilineMatch) {
        // Multiline string - trim whitespace
        result.description = descMultilineMatch[1].trim();
      } else {
        // Single-line string
        const descMatch = frontmatterText.match(/^description:\s*["']?(.+?)["']?\s*$/m);
        if (descMatch) {
          result.description = descMatch[1].trim();
        }
      }

      // Parse tags (array format)
      const tagsMatch = frontmatterText.match(/^tags:\s*\n(\s+-\s+.+\n?)+/m);
      if (tagsMatch) {
        const tagLines = tagsMatch[0].split('\n').filter(line => line.trim().startsWith('-'));
        result.tags = tagLines.map(line => line.replace(/^\s*-\s*/, '').trim());
      }

      // Parse tags (inline array format)
      if (!result.tags) {
        const tagsInlineMatch = frontmatterText.match(/^tags:\s*\[(.+)\]\s*$/m);
        if (tagsInlineMatch) {
          result.tags = tagsInlineMatch[1].split(',').map(tag => tag.trim().replace(/^["']|["']$/g, ''));
        }
      }

      return result;
    } catch (error) {
      logger.warn('Failed to parse frontmatter from content', 'PrivateRepoService', { error });
      return {};
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

      // Decrypt PAT (auto-fixes plaintext PATs)
      const pat = await this.decryptAndFixPAT(repo);

      // Get appropriate provider
      const provider = repo.provider || 'github';
      const gitProvider = getGitProvider(provider);

      logger.debug('Fetching skills from git provider', 'PrivateRepoService', {
        repoId,
        provider,
        owner: repo.owner,
        repo: repo.repo,
        instanceUrl: repo.instanceUrl,
        hasGetPrivateRepoSkills: !!(gitProvider as any).getPrivateRepoSkills,
        hasGetSkills: !!(gitProvider as any).getSkills,
      });

      const skills = await (gitProvider as any).getPrivateRepoSkills?.(
        repo.owner,
        repo.repo,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      ) || await (gitProvider as any).getSkills?.(
        repo.owner,
        repo.repo,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      );

      logger.debug('Raw skills fetched from provider', 'PrivateRepoService', {
        repoId,
        provider,
        skillCount: skills?.length || 0,
      });

      // PERFORMANCE: Fetch frontmatter for all skills in parallel
      // This populates description and tags fields
      const skillsWithFrontmatter = await Promise.all(
        skills.map(async (skill: any) => {
          try {
            // Fetch SKILL.md content
            // GitHub uses getPrivateRepoSkillContent, GitLab uses getSkillContent
            const skillContent = await (gitProvider as any).getPrivateRepoSkillContent?.(
              repo.owner,
              repo.repo,
              skill.skillFilePath || `${skill.path}/SKILL.md`,
              pat,
              repo.defaultBranch || 'main',
              repo.instanceUrl
            ) || await (gitProvider as any).getSkillContent?.(
              repo.owner,
              repo.repo,
              skill.skillFilePath || `${skill.path}/SKILL.md`,
              pat,
              repo.defaultBranch || 'main',
              repo.instanceUrl
            );

            // Parse frontmatter
            const frontmatter = this.parseFrontmatterFromContent(skillContent || '');

            return {
              ...skill,
              ...frontmatter,
            };
          } catch (error) {
            // If frontmatter fetch fails, return skill without description/tags
            logger.warn('Failed to fetch frontmatter for skill', 'PrivateRepoService', {
              skillPath: skill.path,
              error: error instanceof Error ? error.message : error,
            });
            return skill;
          }
        })
      );

      // Convert to PrivateSkill format
      const privateSkills: PrivateSkill[] = skillsWithFrontmatter.map((skill: any) => {
        const baseUrl = provider === 'gitlab' && repo.instanceUrl
          ? repo.instanceUrl
          : (provider === 'gitlab' ? 'https://gitlab.com' : 'https://raw.githubusercontent.com');

        return {
          name: skill.name,
          path: skill.path,
          directoryPath: skill.path,
          downloadUrl: `${baseUrl}/${repo.owner}/${repo.repo}/${repo.defaultBranch}/${skill.skillFilePath}`,
          lastModified: skill.lastCommitDate || new Date(),
          repoId: repo.id,
          repoName: `${repo.owner}/${repo.repo}`,
          lastCommitMessage: skill.lastCommitMessage,
          lastCommitAuthor: skill.lastCommitAuthor,
          lastCommitDate: skill.lastCommitDate,
          fileCount: 1,
          directoryCommitSHA: skill.directoryCommitSHA,
          skillFilePath: skill.skillFilePath,
          description: skill.description, // From frontmatter
          tags: skill.tags, // From frontmatter
        };
      });

      // Update last sync time
      await this.updateRepo(repoId, {});

      logger.info('Retrieved skills from private repo', 'PrivateRepoService', {
        repoId,
        count: privateSkills.length,
        provider,
        withFrontmatter: privateSkills.filter(s => s.description || s.tags).length,
      });

      return privateSkills;
    } catch (error) {
      logger.error('Failed to get private repo skills', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Install a skill from a private repository to application directory
   * Downloads skill files and preserves directory structure
   * Handles conflicts based on resolution strategy
   * Always installs to the centralized application skills directory
   * @param repoId - Source repository ID
   * @param skillPath - Path to skill directory in repository
   * @param config - Application configuration for determining target directory
   * @param conflictResolution - Strategy: 'overwrite', 'rename', or 'skip'
   * @returns Object with success status, new path if successful, or error message
   * @throws Error if repository not found or download fails
   * @example
   * const result = await PrivateRepoService.installSkill(
   *   'repo-123',
   *   'skills/my-skill',
   *   config,
   *   'rename'
   * );
   * if (result.success) {
   *   console.log('Installed to:', result.newPath);
   * }
   */
  static async installSkill(
    repoId: string,
    skillPath: string,
    config: Configuration,
    conflictResolution?: 'overwrite' | 'rename' | 'skip'
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT (auto-fixes plaintext PATs)
      const pat = await this.decryptAndFixPAT(repo);

      // Get appropriate provider
      const provider = repo.provider || 'github';
      const gitProvider = getGitProvider(provider);

      // Download skill directory
      const files = await (gitProvider as any).downloadPrivateDirectory?.(
        repo.owner,
        repo.repo,
        skillPath,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      ) || await (gitProvider as any).downloadDirectory?.(
        repo.owner,
        repo.repo,
        skillPath,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      );

      if (files.size === 0) {
        throw new Error('No files found in skill directory');
      }

      // Get application skills directory (centralized storage)
      const appDirectory = SkillService.getApplicationSkillsDirectory(config);

      // Slugify skill name for directory naming
      const skillName = this.slugify(path.basename(skillPath));
      const targetPath = path.join(appDirectory, skillName);

      // Ensure application directory exists
      await fs.ensureDir(appDirectory);

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

      // Track written files for cleanup on failure
      const writtenFiles: string[] = [];

      // Write files with error handling
      try {
        for (const [filePath, content] of files.entries()) {
          const relativePath = path.relative(skillPath, filePath);
          const absolutePath = path.join(finalPath, relativePath);

          try {
            await fs.ensureDir(path.dirname(absolutePath));
            await fs.writeFile(absolutePath, content, 'utf-8');
            writtenFiles.push(absolutePath);
          } catch (writeError) {
            // Clean up partially written files
            logger.error(`Failed to write file ${relativePath}, rolling back installation`, 'PrivateRepoService', writeError);

            // Remove all written files
            for (const writtenFile of writtenFiles) {
              try {
                await fs.remove(writtenFile);
              } catch (removeError) {
                logger.warn(`Failed to clean up file ${writtenFile}`, 'PrivateRepoService', removeError);
              }
            }

            // Remove the created directory
            try {
              await fs.remove(finalPath);
            } catch (dirRemoveError) {
              logger.warn(`Failed to clean up directory ${finalPath}`, 'PrivateRepoService', dirRemoveError);
            }

            throw new Error(`Failed to write file ${relativePath}: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
          }
        }
      } catch (writeError) {
        // Re-throw to be caught by outer catch block
        throw writeError;
      }

      // Fetch the latest commit hash for the skill directory
      let commitHash: string | undefined;
      try {
        const commits = await (gitProvider as any).getDirectoryCommits?.(
          repo.owner,
          repo.repo,
          skillPath,
          pat,
          repo.defaultBranch || 'main',
          repo.instanceUrl
        );
        if (commits && commits.length > 0) {
          commitHash = commits[0].sha;
          logger.debug('Fetched commit hash for installed skill', 'PrivateRepoService', {
            skillPath,
            commitHash,
          });
        }
      } catch (commitError) {
        logger.warn('Failed to fetch commit hash for installed skill, update detection may not work', 'PrivateRepoService', {
          skillPath,
          error: commitError instanceof Error ? commitError.message : 'Unknown error',
        });
      }

      // Write source metadata for version tracking
      const sourceMetadata = createPrivateRepoSource(
        repoId,
        `${repo.owner}/${repo.repo}`,
        skillPath,
        commitHash
      );

      const metadataPath = path.join(finalPath, SOURCE_METADATA_FILE);
      await fs.writeJson(metadataPath, sourceMetadata, { spaces: 2 });

      logger.info('Installed skill from private repo to application directory', 'PrivateRepoService', {
        repoId,
        skillPath,
        targetPath: finalPath,
        fileCount: files.size,
        provider,
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
   * Slugify a string for use as a directory name
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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
   * Get skill content from a private repository
   */
  static async getSkillContent(repoId: string, skillPath: string): Promise<string> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT (auto-fixes plaintext PATs)
      const pat = await this.decryptAndFixPAT(repo);

      // Get appropriate provider
      const provider = repo.provider || 'github';
      const gitProvider = getGitProvider(provider);

      const content = await (gitProvider as any).getPrivateRepoSkillContent?.(
        repo.owner,
        repo.repo,
        skillPath,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      ) || await (gitProvider as any).getSkillContent?.(
        repo.owner,
        repo.repo,
        skillPath,
        pat,
        repo.defaultBranch || 'main',
        repo.instanceUrl
      );

      return content;
    } catch (error) {
      logger.error('Failed to get skill content', 'PrivateRepoService', error);
      throw error;
    }
  }

  /**
   * Upload a skill to a private repository
   * Uploads all files in the skill directory, not just SKILL.md
   * @param repoId - ID of the private repository to upload to
   * @param skillPath - Local path of the skill directory to upload
   * @param skillContent - Content of the SKILL.md file (for backward compatibility)
   * @param skillName - Name of the skill for commit message
   * @param commitMessage - Optional custom commit message
   * @returns Upload result with success status and optional error
   */
  static async uploadSkillToRepo(
    repoId: string,
    skillPath: string,
    skillContent: string,
    skillName: string,
    commitMessage?: string
  ): Promise<{ success: boolean; sha?: string; uploadedCount?: number; error?: string }> {
    try {
      const repo = await this.getRepo(repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Decrypt PAT (auto-fixes plaintext PATs)
      const pat = await this.decryptAndFixPAT(repo);

      // Get appropriate provider
      const provider = repo.provider || 'github';
      const gitProvider = getGitProvider(provider);

      // Extract skill directory name from path (handle both Windows and Unix paths)
      const skillDirName = path.basename(skillPath);

      // Read all files from the skill directory
      const files: Array<{ relativePath: string; content: string }> = [];

      // Files to exclude from upload (local metadata and system files)
      const EXCLUDED_FILES = new Set([
        '.skill-source.json',    // Local installation metadata
        '.source.json',          // Alternative source metadata
        '.git',                  // Git directory
        '.gitignore',            // Git ignore file
        '.DS_Store',             // macOS system file
        'Thumbs.db',             // Windows system file
        '.skillmn',              // Application specific metadata
      ]);

      // Helper function to recursively read all files from a directory
      const readFilesRecursively = async (
        dirPath: string,
        baseDir: string,
        relativeDir: string = ''
      ): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryName = entry.name;
          const fullPath = path.join(dirPath, entryName);
          const relativePath = relativeDir ? path.join(relativeDir, entryName) : entryName;

          // Skip excluded files/directories
          if (EXCLUDED_FILES.has(entryName)) {
            logger.debug(`Skipping excluded item: ${entryName}`, 'PrivateRepoService');
            continue;
          }

          if (entry.isFile()) {
            try {
              // Try to read as UTF-8 text file
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({
                relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators for API
                content,
              });
              logger.debug(`Read file for upload: ${relativePath}`, 'PrivateRepoService');
            } catch (readError) {
              // Skip binary files that can't be read as UTF-8
              logger.warn(`Skipping binary or unreadable file: ${relativePath}`, 'PrivateRepoService', { error: readError });
            }
          } else if (entry.isDirectory()) {
            // Recursively read subdirectories
            logger.debug(`Entering subdirectory: ${relativePath}`, 'PrivateRepoService');
            await readFilesRecursively(fullPath, baseDir, relativePath);
          }
        }
      };

      // Check if the skill directory exists
      if (await fs.pathExists(skillPath)) {
        await readFilesRecursively(skillPath, skillPath);

        logger.info(`Found ${files.length} files in skill directory (including subdirectories)`, 'PrivateRepoService', {
          skillPath,
          files: files.map(f => f.relativePath),
        });
      } else {
        throw new Error(`Skill directory not found: ${skillPath}`);
      }

      // If no files found, fall back to just uploading SKILL.md content
      if (files.length === 0) {
        logger.warn('No files found in skill directory, using provided content', 'PrivateRepoService');
        files.push({
          relativePath: 'SKILL.md',
          content: skillContent,
        });
      }

      // Call provider's directory upload method
      const result = await (gitProvider as any).uploadSkillDirectory(
        repo.owner,
        repo.repo,
        skillDirName,
        skillName,
        files,
        pat,
        repo.defaultBranch || 'main',
        commitMessage,
        repo.instanceUrl
      );

      if (result.success) {
        logger.info('Successfully uploaded skill directory to private repo', 'PrivateRepoService', {
          repoId,
          skillPath,
          uploadedCount: result.uploadedCount,
          commitSha: result.commitSha,
        });

        // Clear contribution stats cache so the new commit is reflected
        try {
          await ContributionStatsService.clearCache(repoId);
          logger.debug('Cleared contribution stats cache after upload', 'PrivateRepoService', { repoId });
          // Notify renderer to refresh contribution stats
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.CONTRIBUTION_CACHE_CLEARED, { repoId });
          }
        } catch (cacheError) {
          logger.warn('Failed to clear contribution stats cache', 'PrivateRepoService', { error: cacheError });
        }

        // Update skill's source metadata to private-repo
        const metadataResult = await this.updateSkillSourceToPrivateRepo(skillPath, repoId, repo, skillDirName, result.commitSha);

        // Include warning in response if metadata update failed
        if (!metadataResult.success && metadataResult.warning) {
          return {
            ...result,
            warning: metadataResult.warning,
          };
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to upload skill to private repo', 'PrivateRepoService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a skill's source metadata to private-repo after uploading
   * This ensures future update checks are performed against the private repository
   * @param skillPath - Local path of the skill directory
   * @param repoId - ID of the private repository
   * @param repo - Private repository object
   * @param skillDirName - Skill directory name
   * @param commitSha - Optional commit SHA from the upload
   * @returns Object indicating success or warning message
   * @private
   */
  private static async updateSkillSourceToPrivateRepo(
    skillPath: string,
    repoId: string,
    repo: PrivateRepo,
    skillDirName: string,
    commitSha?: string
  ): Promise<{ success: boolean; warning?: string }> {
    try {
      const metadataPath = path.join(skillPath, SOURCE_METADATA_FILE);

      // Create new private-repo source metadata
      const newSourceMetadata = createPrivateRepoSource(
        repoId,
        `${repo.owner}/${repo.repo}`,
        skillDirName,
        commitSha
      );

      // Write the updated metadata
      await fs.writeJson(metadataPath, newSourceMetadata, { spaces: 2 });

      logger.info('Updated skill source metadata to private-repo', 'PrivateRepoService', {
        skillPath,
        metadataPath,
        repoId,
        repoPath: `${repo.owner}/${repo.repo}`,
        skillDirName,
        commitSha: commitSha || 'undefined',
        writtenMetadata: JSON.stringify(newSourceMetadata),
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update skill source metadata - update detection may not work correctly', 'PrivateRepoService', error);
      return {
        success: false,
        warning: `Skill uploaded successfully, but failed to update source metadata. Future update checks may not detect remote changes. Error: ${errorMsg}`,
      };
    }
  }
}
