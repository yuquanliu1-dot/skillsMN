/**
 * GitHub Service
 *
 * Handles GitHub API interactions for public skill discovery
 */

import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/Logger';
import type {
  SearchResult,
  GitHubSearchResponse,
  RateLimitInfo,
} from '../models/SearchResult';
import { createSearchResultFromGitHub } from '../models/SearchResult';
import { PathValidator } from './PathValidator';
import { toKebabCase } from '../utils/pathUtils';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Rate limit state
 */
interface RateLimitState {
  remaining: number;
  limit: number;
  resetTime: number;
  lastUpdated: number;
}

/**
 * Active requests for cancellation
 */
const activeRequests = new Map<string, AbortController>();

/**
 * GitHub Service for public skill discovery
 */
export class GitHubService {
  private static rateLimitState: RateLimitState = {
    remaining: 60,
    limit: 60,
    resetTime: 0,
    lastUpdated: 0,
  };

  /**
   * Search for public repositories containing Claude Code skills
   */
  static async searchSkills(query: string, page: number = 1): Promise<GitHubSearchResponse> {
    logger.info('Searching GitHub for skills', 'GitHubService', { query, page });

    // Check rate limit before making request
    await GitHubService.checkRateLimit();

    const requestId = `search-${Date.now()}`;
    const controller = new AbortController();
    activeRequests.set(requestId, controller);

    try {
      // Search for repositories with skill.md files
      const searchQuery = `${query} "skill.md" in:path`;
      const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=30`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
        signal: controller.signal,
      });

      // Update rate limit state from response headers
      GitHubService.updateRateLimitFromHeaders(response.headers);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      // Group results by repository
      const repositoryMap = new Map<string, any>();

      for (const item of data.items || []) {
        const repoFullName = item.repository.full_name;

        if (!repositoryMap.has(repoFullName)) {
          repositoryMap.set(repoFullName, {
            ...item.repository,
            tree: [],
          });
        }

        // Add file to repository tree
        const repo = repositoryMap.get(repoFullName);
        repo.tree.push({
          path: item.path,
          type: 'blob',
        });
      }

      // Convert to SearchResult array
      const results: SearchResult[] = [];
      for (const repoData of repositoryMap.values()) {
        results.push(createSearchResultFromGitHub(repoData));
      }

      // Sort by stars (descending)
      results.sort((a, b) => b.stars - a.stars);

      logger.info('GitHub search complete', 'GitHubService', {
        query,
        resultsCount: results.length,
        totalCount: data.total_count || results.length,
      });

      return {
        results,
        totalCount: data.total_count || results.length,
        incomplete: data.incomplete_results || false,
        rateLimit: GitHubService.getRateLimitInfo(),
      };
    } catch (error) {
      logger.error('GitHub search failed', 'GitHubService', error);
      throw error;
    } finally {
      activeRequests.delete(requestId);
    }
  }

  /**
   * Preview skill content from raw GitHub URL
   */
  static async previewSkill(downloadUrl: string): Promise<string> {
    logger.info('Previewing skill from GitHub', 'GitHubService', { downloadUrl });

    try {
      const response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch skill: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();

      logger.info('Skill preview loaded', 'GitHubService', {
        length: content.length,
      });

      return content;
    } catch (error) {
      logger.error('Failed to preview skill', 'GitHubService', error);
      throw error;
    }
  }

  /**
   * Install skill from GitHub to local directory
   */
  static async installSkill(
    repositoryName: string,
    skillFilePath: string,
    downloadUrl: string,
    targetDirectory: 'project' | 'global',
    pathValidator: PathValidator,
    conflictResolution?: 'overwrite' | 'rename' | 'skip'
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    logger.info('Installing skill from GitHub', 'GitHubService', {
      repositoryName,
      skillFilePath,
      targetDirectory,
      conflictResolution,
    });

    try {
      // Determine target directory path
      const baseDir =
        targetDirectory === 'project'
          ? pathValidator.getProjectDirectory()
          : pathValidator.getGlobalDirectory();

      if (!baseDir) {
        throw new Error(`Target directory not configured for ${targetDirectory}`);
      }

      // Extract skill directory name from path
      const skillDirName = path.dirname(skillFilePath).split('/').pop() || 'imported-skill';
      const kebabName = toKebabCase(skillDirName);
      const targetPath = path.join(baseDir, kebabName);

      // Check for conflicts
      if (await fs.pathExists(targetPath)) {
        if (conflictResolution === 'skip') {
          return { success: false, error: 'Skill already exists and conflict resolution is skip' };
        } else if (conflictResolution === 'rename') {
          // Generate unique name
          let counter = 1;
          let newPath = `${targetPath}-${counter}`;
          while (await fs.pathExists(newPath)) {
            counter++;
            newPath = `${targetPath}-${counter}`;
          }
          return await GitHubService.downloadAndInstallSkill(
            downloadUrl,
            newPath,
            repositoryName,
            skillFilePath
          );
        } else if (conflictResolution === 'overwrite') {
          // Remove existing directory
          await fs.remove(targetPath);
        } else {
          // No resolution specified - return conflict error
          return {
            success: false,
            error: 'CONFLICT',
          };
        }
      }

      // Download and install
      return await GitHubService.downloadAndInstallSkill(
        downloadUrl,
        targetPath,
        repositoryName,
        skillFilePath
      );
    } catch (error) {
      logger.error('Failed to install skill', 'GitHubService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download skill content and install to local directory
   */
  private static async downloadAndInstallSkill(
    downloadUrl: string,
    targetPath: string,
    repositoryName: string,
    _skillFilePath: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // Download skill content
      const response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download skill: ${response.status}`);
      }

      const content = await response.text();

      // Create skill directory
      await fs.ensureDir(targetPath);

      // Write skill.md file
      await fs.writeFile(path.join(targetPath, 'skill.md'), content, 'utf-8');

      logger.info('Skill installed successfully', 'GitHubService', {
        targetPath,
        repositoryName,
      });

      return {
        success: true,
        newPath: targetPath,
      };
    } catch (error) {
      logger.error('Failed to download and install skill', 'GitHubService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check rate limit and wait if necessary
   */
  private static async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const { remaining, resetTime } = GitHubService.rateLimitState;

    if (remaining <= 5 && now < resetTime) {
      const waitTime = resetTime - now;
      logger.warn('Approaching rate limit, waiting', 'GitHubService', {
        waitTime,
        resetTime: new Date(resetTime),
      });

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 60000)));
    }
  }

  /**
   * Update rate limit state from response headers
   */
  private static updateRateLimitFromHeaders(headers: any): void {
    const remaining = parseInt(headers.get('x-ratelimit-remaining') || '60', 10);
    const limit = parseInt(headers.get('x-ratelimit-limit') || '60', 10);
    const resetTime = parseInt(headers.get('x-ratelimit-reset') || '0', 10) * 1000;

    GitHubService.rateLimitState = {
      remaining,
      limit,
      resetTime,
      lastUpdated: Date.now(),
    };

    logger.debug('Rate limit updated', 'GitHubService', {
      remaining,
      limit,
      resetTime: new Date(resetTime),
    });
  }

  /**
   * Get current rate limit info
   */
  static getRateLimitInfo(): RateLimitInfo {
    const { remaining, limit, resetTime } = GitHubService.rateLimitState;
    return {
      remaining,
      limit,
      resetTime,
      resetDate: new Date(resetTime),
    };
  }

  /**
   * Cancel active request
   */
  static cancelRequest(requestId: string): boolean {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
      logger.info('Request cancelled', 'GitHubService', { requestId });
      return true;
    }
    return false;
  }
}
