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
    displayName?: string
  ): PrivateRepo {
    const now = new Date();

    return {
      id: uuidv4(),
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      displayName: displayName || `${owner}/${repo}`,
      patEncrypted,
      defaultBranch: 'main',
      lastSyncTime: undefined,
      description: undefined,
      addedAt: now,
      createdAt: now,
      updatedAt: now,
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

    // Validate URL format
    const urlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!urlPattern.test(repo.url)) {
      throw new Error('Repository URL must be a valid GitHub repository URL (https://github.com/owner/repo)');
    }

    // Validate display name length (if provided)
    if (repo.displayName && repo.displayName.length > 100) {
      throw new Error('Display name must be 100 characters or less');
    }

    return true;
  }

  /**
   * Parse GitHub repository URL to extract owner and repo name
   */
  static parseUrl(url: string): { owner: string; repo: string } | null {
    const pattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
    const match = url.match(pattern);

    if (!match || !match[1] || !match[2]) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
    };
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
