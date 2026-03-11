/**
 * GitHub Service
 *
 * Handles GitHub API interactions for public skill discovery
 */

import { safeStorage } from 'electron';
import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/Logger';
import { retryWithBackoff } from '../utils/retry';
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
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache with TTL
 */
class Cache {
  private entries = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.entries.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.entries.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.entries.clear();
  }
}

// Cache instance (5-minute TTL)
const cache = new Cache();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
 * Conflict resolution preference (for "Apply to all" feature)
 */
interface ConflictPreference {
  resolution: 'overwrite' | 'rename' | 'skip';
  timestamp: number;
}

/**
 * Active requests for cancellation
 */
const activeRequests = new Map<string, AbortController>();

/**
 * Conflict resolution preference storage (session-scoped)
 */
let conflictPreference: ConflictPreference | null = null;

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
   * Set conflict resolution preference for "Apply to all" feature
   * This preference is session-scoped and cleared after installation completes
   */
  static setConflictPreference(resolution: 'overwrite' | 'rename' | 'skip'): void {
    conflictPreference = {
      resolution,
      timestamp: Date.now(),
    };
    logger.info('Conflict preference set', 'GitHubService', { resolution });
  }

  /**
   * Get current conflict resolution preference
   */
  static getConflictPreference(): 'overwrite' | 'rename' | 'skip' | null {
    return conflictPreference?.resolution || null;
  }

  /**
   * Clear conflict resolution preference
   * Called after installation session completes
   */
  static clearConflictPreference(): void {
    conflictPreference = null;
    logger.debug('Conflict preference cleared', 'GitHubService');
  }

  /**
   * Search for public repositories containing Claude Code skills
   * Uses GitHub code search API to find repositories with skill.md files
   * Results are cached for 5 minutes to reduce API calls
   * @param query - Search query string
   * @param page - Page number for pagination (default: 1)
   * @returns GitHubSearchResponse with results, total count, and rate limit info
   * @throws Error if GitHub API rate limit is exceeded or request fails
   * @example
   * const results = await GitHubService.searchSkills('code review', 1);
   * console.log(`Found ${results.totalCount} results`);
   * results.results.forEach(skill => console.log(skill.name));
   */
  static async searchSkills(query: string, page: number = 1): Promise<GitHubSearchResponse> {
    logger.info('Searching GitHub for skills', 'GitHubService', { query, page });

    // Check cache first
    const cacheKey = `search:${query}:${page}`;
    const cached = cache.get<GitHubSearchResponse>(cacheKey);
    if (cached) {
      logger.debug('Returning cached search results', 'GitHubService', { query, page });
      return cached;
    }

    // Check rate limit before making request
    await GitHubService.checkRateLimit();

    const requestId = `search-${Date.now()}`;
    const controller = new AbortController();
    activeRequests.set(requestId, controller);

    try {
      // Search for repositories with skill.md files
      const searchQuery = `${query} "skill.md" in:path`;
      const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=30`;

      // Use retry logic for network resilience
      const response = await retryWithBackoff(
        async () => {
          const res = await fetch(url, {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'skillsMN-App',
            },
            signal: controller.signal,
          });

          // Throw error for non-OK responses (will be caught by retry logic if retryable)
          if (!res.ok) {
            const error: any = new Error(`GitHub API error: ${res.status} ${res.statusText}`);
            error.status = res.status;
            throw error;
          }

          return res;
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        }
      );

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

      const searchResponse: GitHubSearchResponse = {
        results,
        totalCount: data.total_count || results.length,
        incomplete: data.incomplete_results || false,
        rateLimit: GitHubService.getRateLimitInfo(),
      };

      // Cache the results
      cache.set(cacheKey, searchResponse, CACHE_TTL_MS);

      return searchResponse;
    } catch (error) {
      logger.error('GitHub search failed', 'GitHubService', error);
      throw error;
    } finally {
      activeRequests.delete(requestId);
    }
  }

  /**
   * Preview skill content from raw GitHub URL
   * Downloads skill.md content for preview before installation
   * Results are cached for 5 minutes
   * @param downloadUrl - Raw GitHub URL to skill.md file
   * @returns Skill content as string
   * @throws Error if download fails
   * @example
   * const content = await GitHubService.previewSkill(
   *   'https://raw.githubusercontent.com/user/repo/main/skill.md'
   * );
   * console.log(content);
   */
  static async previewSkill(downloadUrl: string): Promise<string> {
    logger.info('Previewing skill from GitHub', 'GitHubService', { downloadUrl });

    // Check cache first
    const cacheKey = `preview:${downloadUrl}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      logger.debug('Returning cached preview content', 'GitHubService', { downloadUrl });
      return cached;
    }

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

      // Cache the content
      cache.set(cacheKey, content, CACHE_TTL_MS);

      return content;
    } catch (error) {
      logger.error('Failed to preview skill', 'GitHubService', error);
      throw error;
    }
  }

  /**
   * Install skill from GitHub to local directory
   * Downloads skill content and saves to project or global directory
   * Handles conflicts based on resolution strategy
   * @param repositoryName - Full repository name (owner/repo)
   * @param skillFilePath - Path to skill.md in repository
   * @param downloadUrl - Raw GitHub URL to skill.md file
   * @param targetDirectory - 'project' or 'global' directory
   * @param pathValidator - PathValidator instance for security checks
   * @param conflictResolution - Strategy for handling conflicts: 'overwrite', 'rename', or 'skip'
   * @returns Object with success status, new path if successful, or error message
   * @example
   * const result = await GitHubService.installSkill(
   *   'user/repo',
   *   'skills/my-skill/skill.md',
   *   'https://raw.githubusercontent.com/user/repo/main/skills/my-skill/skill.md',
   *   'project',
   *   pathValidator,
   *   'rename'
   * );
   * if (result.success) {
   *   console.log('Installed to:', result.newPath);
   * }
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
      // Use stored preference if no explicit resolution provided
      const resolution = conflictResolution || GitHubService.getConflictPreference();

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
        if (resolution === 'skip') {
          return { success: false, error: 'Skill already exists and conflict resolution is skip' };
        } else if (resolution === 'rename') {
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
        } else if (resolution === 'overwrite') {
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
   * Get current GitHub API rate limit information
   * @returns RateLimitInfo with remaining requests, limit, and reset time
   * @example
   * const rateLimit = GitHubService.getRateLimitInfo();
   * console.log(`${rateLimit.remaining}/${rateLimit.limit} requests remaining`);
   * console.log('Resets at:', rateLimit.resetDate);
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
   * Cancel an active GitHub API request
   * Aborts the request if it's still in progress
   * @param requestId - ID of the request to cancel
   * @returns True if request was cancelled, false if not found
   * @example
   * const cancelled = GitHubService.cancelRequest('search-123');
   * console.log(cancelled ? 'Request cancelled' : 'Request not found');
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

  /**
   * Get repository tree structure with authentication
   * Fetches recursive tree of all files and directories in the repository
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pat - Personal Access Token with repo access
   * @param branch - Branch name (default: 'main')
   * @returns Array of tree items with path, type, and SHA
   * @throws Error if fetch fails or authentication is invalid
   * @example
   * const tree = await GitHubService.getRepoTree('user', 'repo', pat, 'main');
   * tree.forEach(item => console.log(item.path, item.type));
   */
  static async getRepoTree(
    owner: string,
    repo: string,
    pat: string,
    branch: string = 'main'
  ): Promise<any[]> {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.status}`);
      }

      const data: any = await response.json();
      return data.tree || [];
    } catch (error) {
      logger.error('Failed to get repository tree', 'GitHubService', error);
      throw error;
    }
  }

  /**
   * Find skill directories in repository tree
   */
  static findSkillDirectories(tree: any[]): any[] {
    const skillFiles = tree.filter((item: any) => {
      return item.type === 'blob' && item.path.endsWith('skill.md');
    });

    const skillDirectories = skillFiles.map((file: any) => {
      const pathParts = file.path.split('/');
      pathParts.pop();
      const dirPath = pathParts.join('/');
      const depth = pathParts.length;

      return {
        path: dirPath,
        name: pathParts[pathParts.length - 1] || 'root',
        skillFilePath: file.path,
        depth,
      };
    });

    return skillDirectories.filter((dir: any) => dir.depth <= 5);
  }

  /**
   * Download directory from private repository with authentication
   * Fetches all files in a directory preserving structure
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param directoryPath - Path to directory in repository
   * @param pat - Personal Access Token with repo access
   * @param branch - Branch name (default: 'main')
   * @returns Map of file paths to file contents
   * @throws Error if download fails or authentication is invalid
   * @example
   * const files = await GitHubService.downloadPrivateDirectory(
   *   'user', 'repo', 'skills/my-skill', pat
   * );
   * files.forEach((content, path) => console.log(path, content.length));
   */
  static async downloadPrivateDirectory(
    owner: string,
    repo: string,
    directoryPath: string,
    pat: string,
    branch: string = 'main'
  ): Promise<Map<string, string>> {
    try {
      const tree = await GitHubService.getRepoTree(owner, repo, pat, branch);

      const directoryFiles = tree.filter((item: any) => {
        return item.type === 'blob' && item.path.startsWith(directoryPath);
      });

      const files = new Map<string, string>();

      await Promise.all(
        directoryFiles.map(async (file: any) => {
          const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
          const response = await fetch(downloadUrl, {
            headers: {
              'Authorization': `token ${pat}`,
              'User-Agent': 'skillsMN-App',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to download ${file.path}: ${response.status}`);
          }

          const content = await response.text();
          files.set(file.path, content);
        })
      );

      logger.info('Downloaded directory from private repo', 'GitHubService', {
        owner,
        repo,
        directoryPath,
        fileCount: files.size,
      });

      return files;
    } catch (error) {
      logger.error('Failed to download private directory', 'GitHubService', error);
      throw error;
    }
  }

  /**
   * Test repository connection with Personal Access Token
   * Validates PAT permissions and repository access
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pat - Personal Access Token to test
   * @returns Object with valid status, repository info if successful, or error message
   * @example
   * const result = await GitHubService.testConnection('user', 'repo', pat);
   * if (result.valid) {
   *   console.log('Connected to:', result.repository.name);
   *   console.log('Default branch:', result.repository.defaultBranch);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   */
  static async testConnection(
    owner: string,
    repo: string,
    pat: string
  ): Promise<{
    valid: boolean;
    repository?: {
      name: string;
      description: string;
      defaultBranch: string;
    };
    error?: string;
  }> {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            valid: false,
            error: 'Authentication failed. Please check your PAT.',
          };
        } else if (response.status === 404) {
          return {
            valid: false,
            error: 'Repository not found. Please check the URL.',
          };
        } else if (response.status === 403) {
          return {
            valid: false,
            error: 'Access forbidden. Please check your PAT permissions.',
          };
        }
        return {
          valid: false,
          error: `GitHub API error: ${response.status} ${response.statusText}`,
        };
      }

      const data: any = await response.json();
      return {
        valid: true,
        repository: {
          name: data.name,
          description: data.description || '',
          defaultBranch: data.default_branch || 'main',
        },
      };
    } catch (error) {
      logger.error('Failed to test repository connection', 'GitHubService', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
  /**
   * Get directory commit history from private repository
   * Fetches recent commits for a specific directory path
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pat - Personal Access Token with repo access
   * @param directoryPath - Path to directory in repository
   * @param branch - Branch name (default: 'main')
   * @returns Array of commit objects (max 10), empty array on error
   * @example
   * const commits = await GitHubService.getDirectoryCommits(
   *   'user', 'repo', pat, 'skills/my-skill'
   * );
   * const latestCommit = commits[0];
   * console.log('Latest commit:', latestCommit.sha, latestCommit.commit.message);
   */
  static async getDirectoryCommits(
    owner: string,
    repo: string,
    pat: string,
    directoryPath: string,
    branch: string = 'main'
  ): Promise<any[]> {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(directoryPath)}&sha=${branch}&per_page=10`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        logger.warn(`Failed to fetch commits for ${directoryPath}`, 'GitHubService', {
          status: response.status,
        });
        return [];
      }

      const data: any = await response.json();
      return data || [];
    } catch (error) {
      logger.error('Failed to get directory commits', 'GitHubService', error);
      return [];
    }
  }

  /**
   * Get skills from private repository with metadata
   * Finds all skill directories and fetches commit history for each
   * Results are cached for 5 minutes
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pat - Personal Access Token with repo access
   * @param branch - Branch name (optional, defaults to 'main')
   * @returns Array of skill objects with path, commit info, and metadata
   * @throws Error if fetch fails
   * @example
   * const skills = await GitHubService.getPrivateRepoSkills('user', 'repo', pat);
   * skills.forEach(skill => {
   *   console.log(skill.name, skill.lastCommitDate, skill.directoryCommitSHA);
   * });
   */
  static async getPrivateRepoSkills(
    owner: string,
    repo: string,
    pat: string,
    branch?: string
  ): Promise<any[]> {
    const cacheKey = `private-skills:${owner}/${repo}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached private repo skills', 'GitHubService', { owner, repo });
      return cached;
    }

    try {
      const actualBranch = branch || 'main';
      const tree = await GitHubService.getRepoTree(owner, repo, pat, actualBranch);
      const skillDirs = GitHubService.findSkillDirectories(tree);

      // PERFORMANCE: Fetch commit history for all skill directories in parallel
      // This reduces total fetch time from O(n * latency) to O(max_latency)
      // Each directory gets its commit metadata concurrently
      const skillsWithMetadata = await Promise.all(
        skillDirs.map(async (dir: any) => {
          const commits = await GitHubService.getDirectoryCommits(owner, repo, pat, dir.path, actualBranch);
          const latestCommit = commits[0];

          return {
            path: dir.path,
            name: dir.name,
            skillFilePath: dir.skillFilePath,
            directoryCommitSHA: latestCommit?.sha || '',
            lastCommitMessage: latestCommit?.commit?.message || '',
            lastCommitAuthor: latestCommit?.commit?.author?.name || '',
            lastCommitDate: latestCommit?.commit?.author?.date
              ? new Date(latestCommit.commit.author.date)
              : null,
          };
        })
      );

      cache.set(cacheKey, skillsWithMetadata, CACHE_TTL_MS);

      logger.info('Retrieved private repo skills', 'GitHubService', {
        owner,
        repo,
        count: skillsWithMetadata.length,
      });

      return skillsWithMetadata;
    } catch (error) {
      logger.error('Failed to get private repo skills', 'GitHubService', error);
      throw error;
    }
  }
}
