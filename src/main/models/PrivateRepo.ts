/**
 * Private Repository Model
 *
 * Manages configuration for private GitHub repositories
 */

import { v4 as uuidv4 } from 'uuid';
import { PrivateRepo, PrivateRepoConfig } from '../../shared/types';

export class PrivateRepoModel {
  /**
   * Create a new PrivateRepo instance
   */
  static create(
    owner: string,
    repo: string,
    patEncrypted: string,
    displayName?: string,
    provider: 'github' | 'gitlab' = 'github',
    instanceUrl?: string
  ): PrivateRepo {
    const now = new Date();
    const baseUrl = provider === 'gitlab' && instanceUrl
      ? instanceUrl
      : (provider === 'gitlab' ? 'https://gitlab.com' : 'https://github.com');

    return {
      id: uuidv4(),
      owner,
      repo,
      url: `${baseUrl}/${owner}/${repo}`,
      displayName: displayName || `${owner}/${repo}`,
      patEncrypted,
      defaultBranch: 'main',
      lastSyncTime: undefined,
      description: undefined,
      addedAt: now,
      createdAt: now,
      updatedAt: now,
      provider,
      instanceUrl,
    };
  }

  /**
   * Validate repository configuration
   */
  static validate(repo: Partial<PrivateRepo>): repo is PrivateRepo {
    // Validate required fields
    if (!repo.id || typeof repo.id !== 'string') {
      throw new Error('Repository ID is required and must be a string');
    }

    if (!repo.owner || typeof repo.owner !== 'string') {
      throw new Error('Repository owner is required and must be a string');
    }

    if (!repo.repo || typeof repo.repo !== 'string') {
      throw new Error('Repository name is required and must be a string');
    }

    if (!repo.url || typeof repo.url !== 'string') {
      throw new Error('Repository URL is required and must be a string');
    }

    if (!repo.patEncrypted || typeof repo.patEncrypted !== 'string') {
      throw new Error('Encrypted PAT is required and must be a string');
    }

    if (!(repo.addedAt instanceof Date)) {
      throw new Error('Added date is required and must be a Date');
    }

    if (!(repo.updatedAt instanceof Date)) {
      throw new Error('Updated date is required and must be a Date');
    }

    // Validate provider field (default to 'github' for backward compatibility)
    if (repo.provider && !['github', 'gitlab'].includes(repo.provider)) {
      throw new Error('Provider must be either "github" or "gitlab"');
    }

    // Validate URL format based on provider
    const provider = repo.provider || 'github';
    if (provider === 'github') {
      const urlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
      if (!urlPattern.test(repo.url)) {
        throw new Error('Repository URL must be a valid GitHub repository URL (https://github.com/owner/repo)');
      }
    } else if (provider === 'gitlab') {
      // GitLab can be self-hosted, so we allow any URL with /owner/repo pattern
      const urlPattern = /^https?:\/\/[^/]+\/[^/]+\/[^/]+\/?$/;
      if (!urlPattern.test(repo.url)) {
        throw new Error('Repository URL must be a valid GitLab repository URL');
      }
    }

    // Validate display name length (if provided)
    if (repo.displayName && repo.displayName.length > 100) {
      throw new Error('Display name must be 100 characters or less');
    }

    return true;
  }

  /**
   * Parse repository URL to extract owner, repo name, and provider
   * Supports GitHub, GitLab.com, and self-hosted GitLab instances
   */
  static parseUrl(url: string): { owner: string; repo: string; provider: 'github' | 'gitlab'; instanceUrl?: string } | null {
    // Try GitHub pattern
    const githubPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
    const githubMatch = url.match(githubPattern);
    if (githubMatch) {
      return {
        owner: githubMatch[1],
        repo: githubMatch[2],
        provider: 'github',
      };
    }

    // Try GitLab.com pattern
    const gitlabPattern = /^https:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/?$/;
    const gitlabMatch = url.match(gitlabPattern);
    if (gitlabMatch) {
      return {
        owner: gitlabMatch[1],
        repo: gitlabMatch[2],
        provider: 'gitlab',
      };
    }

    // Try self-hosted GitLab pattern (e.g., https://gitlab.company.com/owner/repo)
    const selfHostedPattern = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;
    const selfHostedMatch = url.match(selfHostedPattern);
    if (selfHostedMatch && !selfHostedMatch[1].includes('github.com')) {
      return {
        owner: selfHostedMatch[2],
        repo: selfHostedMatch[3],
        provider: 'gitlab',
        instanceUrl: `https://${selfHostedMatch[1]}`,
      };
    }

    return null;
  }

  /**
   * Update repository configuration
   */
  static update(
    repo: PrivateRepo,
    updates: Partial<Pick<PrivateRepo, 'displayName' | 'patEncrypted' | 'defaultBranch' | 'description'>>
  ): PrivateRepo {
    return {
      ...repo,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Create default configuration structure
   */
  static createDefaultConfig(): PrivateRepoConfig {
    return {
      version: 1,
      repositories: [],
    };
  }

  /**
   * Validate configuration structure
   */
  static validateConfig(config: unknown): config is PrivateRepoConfig {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const cfg = config as Partial<PrivateRepoConfig>;

    if (cfg.version !== 1) {
      return false;
    }

    if (!Array.isArray(cfg.repositories)) {
      return false;
    }

    // Validate each repository
    for (const repo of cfg.repositories) {
      try {
        this.validate(repo);
      } catch {
        return false;
      }
    }

    return true;
  }
}
