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
import type { ProxyConfig } from '../../shared/types';
// Import shared proxy utilities and re-export for backward compatibility
export { setProxyConfig, getProxyAgent, getProxySettings } from '../utils/proxy';
import { getProxyAgent, fetchWithProxy } from '../utils/proxy';
import { GitApiError } from '../utils/GitApiError';
import { Cache } from '../utils/Cache';
import { findSkillDirectories } from './GitProvider';

const GITHUB_API_BASE = 'https://api.github.com';

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
      const searchQuery = `${query} "SKILL.md" in:path`;
      const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=30`;

      // Use retry logic for network resilience
      const response = await retryWithBackoff(
        async () => {
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'skillsMN-App',
          };

          const res = await fetchWithProxy(url, {
            headers,
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
        if (response.status === 401) {
          throw new Error(
            'GitHub API authentication failed. Please configure a GitHub Personal Access Token in Settings → General for higher rate limits (5,000 requests/hour vs 60/hour). Get your free token from: https://github.com/settings/tokens'
          );
        }
        if (response.status === 403) {
          throw new Error(
            'GitHub API rate limit exceeded. Please configure a GitHub Personal Access Token in Settings → General for higher limits, or wait 1 hour for the limit to reset.'
          );
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
      const response = await fetchWithProxy(downloadUrl, {
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
   * Downloads entire skill directory and saves to application skills directory
   * Handles conflicts based on resolution strategy
   * @param repositoryName - Full repository name (owner/repo)
   * @param skillFilePath - Path to SKILL.md in repository
   * @param downloadUrl - Raw GitHub URL to SKILL.md file
   * @param targetDirectory - 'project' or 'global' (deprecated, uses application directory)
   * @param pathValidator - PathValidator instance for security checks
   * @param conflictResolution - Strategy for handling conflicts: 'overwrite', 'rename', or 'skip'
   * @returns Object with success status, new path if successful, or error message
   * @example
   * const result = await GitHubService.installSkill(
   *   'user/repo',
   *   'skills/my-skill/SKILL.md',
   *   'https://raw.githubusercontent.com/user/repo/main/skills/my-skill/SKILL.md',
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

      // Always use application skills directory (centralized storage)
      const baseDir = pathValidator.getApplicationDirectory();

      if (!baseDir) {
        throw new Error('Application skills directory not configured');
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
          return await GitHubService.downloadAndInstallSkillDirectory(
            repositoryName,
            skillFilePath,
            newPath,
            downloadUrl
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

      // Download and install entire skill directory
      return await GitHubService.downloadAndInstallSkillDirectory(
        repositoryName,
        skillFilePath,
        targetPath,
        downloadUrl
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
   * Download entire skill directory from GitHub and install to local directory
   * Extracts repository owner/name from repositoryName and downloads all files in skill directory
   */
  private static async downloadAndInstallSkillDirectory(
    repositoryName: string,
    skillFilePath: string,
    targetPath: string,
    downloadUrl: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // Parse repository name (owner/repo)
      const [owner, repo] = repositoryName.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repositoryName}`);
      }

      // Extract skill directory path (parent of SKILL.md)
      const skillDirPath = path.dirname(skillFilePath);

      // Get the branch from download URL
      // URL format: https://raw.githubusercontent.com/owner/repo/branch/path/to/SKILL.md
      const urlParts = downloadUrl.split('/');
      const branchIndex = urlParts.findIndex(part => part === 'raw.githubusercontent.com') + 3;
      const branch = urlParts[branchIndex] || 'main';

      logger.debug('Downloading skill directory from GitHub', 'GitHubService', {
        owner,
        repo,
        branch,
        skillDirPath,
        targetPath,
      });

      // Get repository tree to find all files in skill directory
      const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const treeResponse = await fetchWithProxy(treeUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!treeResponse.ok) {
        // If tree API fails, fallback to downloading just SKILL.md
        logger.warn('Failed to get repository tree, downloading SKILL.md only', 'GitHubService', {
          status: treeResponse.status,
        });
        return await GitHubService.downloadSingleFile(downloadUrl, targetPath, repositoryName);
      }

      const treeData = await treeResponse.json();
      const skillDirFiles = treeData.tree.filter((item: any) =>
        item.type === 'blob' &&
        item.path.startsWith(skillDirPath + '/') ||
        item.path === skillFilePath
      );

      if (skillDirFiles.length === 0) {
        // No files found in tree, fallback to single file
        logger.warn('No files found in skill directory, downloading SKILL.md only', 'GitHubService');
        return await GitHubService.downloadSingleFile(downloadUrl, targetPath, repositoryName);
      }

      // Create skill directory
      await fs.ensureDir(targetPath);

      // Download all files in parallel
      let downloadedCount = 0;
      const errors: string[] = [];

      await Promise.all(
        skillDirFiles.map(async (file: any) => {
          try {
            const fileDownloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            const fileResponse = await fetchWithProxy(fileDownloadUrl, {
              headers: {
                'User-Agent': 'skillsMN-App',
              },
            });

            if (!fileResponse.ok) {
              errors.push(`Failed to download ${file.path}: ${fileResponse.status}`);
              return;
            }

            const fileContent = await fileResponse.text();

            // Calculate relative path within skill directory
            const relativePath = file.path.substring(skillDirPath.length + 1);
            const localFilePath = path.join(targetPath, relativePath);

            // Ensure parent directory exists
            await fs.ensureDir(path.dirname(localFilePath));

            // Write file
            await fs.writeFile(localFilePath, fileContent, 'utf-8');
            downloadedCount++;

            logger.debug('Downloaded skill file', 'GitHubService', {
              file: file.path,
              localPath: localFilePath,
            });
          } catch (fileError) {
            errors.push(`Failed to download ${file.path}: ${fileError}`);
          }
        })
      );

      if (downloadedCount === 0) {
        // All downloads failed, try single file fallback
        return await GitHubService.downloadSingleFile(downloadUrl, targetPath, repositoryName);
      }

      logger.info('Skill directory installed successfully', 'GitHubService', {
        targetPath,
        repositoryName,
        fileCount: downloadedCount,
        errors: errors.length > 0 ? errors : undefined,
      });

      return {
        success: true,
        newPath: targetPath,
      };
    } catch (error) {
      logger.error('Failed to download skill directory', 'GitHubService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fallback: Download single SKILL.md file
   */
  private static async downloadSingleFile(
    downloadUrl: string,
    targetPath: string,
    repositoryName: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      const response = await fetchWithProxy(downloadUrl, {
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

      // Write SKILL.md file
      await fs.writeFile(path.join(targetPath, 'SKILL.md'), content, 'utf-8');

      logger.info('Skill installed (single file)', 'GitHubService', {
        targetPath,
        repositoryName,
      });

      return {
        success: true,
        newPath: targetPath,
      };
    } catch (error) {
      logger.error('Failed to download single file', 'GitHubService', error);
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
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'skillsMN-App',
      };
      // Only add Authorization header if PAT is provided
      if (pat) {
        headers['Authorization'] = `token ${pat}`;
      }
      const response = await fetchWithProxy(url, { headers });

      if (!response.ok) {
        // Handle 404 gracefully - repository may be empty or branch doesn't exist
        if (response.status === 404) {
          logger.debug('Repository tree not found (404) - repository may be empty or branch does not exist', 'GitHubService', { owner, repo, branch });
          return [];
        }
        // Read error response body for better error messages
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Failed to fetch repository tree: ${response.status}${errorBody ? ` - ${errorBody}` : ''}`);
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
   * Delegates to shared utility in GitProvider
   */
  static findSkillDirectories(tree: any[]): any[] {
    return findSkillDirectories(tree);
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

      // Download files in parallel using GitHub API
      const results = await Promise.allSettled(
        directoryFiles.map(async (file: any) => {
          const content = await retryWithBackoff(
            async () => {
              const headers: Record<string, string> = {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'skillsMN-App',
              };

              if (pat) {
                headers['Authorization'] = `token ${pat}`;
              }

              const response = await fetchWithProxy(
                `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`,
                { headers }
              );

              if (!response.ok) {
                throw new Error(`Failed to download ${file.path}: ${response.status}`);
              }

              const data = await response.json();
              // GitHub API returns base64-encoded content
              return Buffer.from(data.content, 'base64').toString('utf-8');
            },
            { maxAttempts: 3, initialDelay: 1000, backoffMultiplier: 2 }
          );

          return { path: file.path, content };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          files.set(result.value.path, result.value.content);
        } else {
          logger.warn('Failed to download file, skipping', 'GitHubService', {
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      }

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
      const response = await fetchWithProxy(url, {
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
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(directoryPath)}&sha=${branch}&per_page=10`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'skillsMN-App',
    };

    // Only add Authorization header if PAT is provided (for private repos or higher rate limits)
    if (pat && pat.trim()) {
      headers['Authorization'] = `token ${pat}`;
    }

    const response = await fetchWithProxy(url, { headers });

    if (!response.ok) {
      logger.warn(`Failed to fetch commits for ${directoryPath}`, 'GitHubService', {
        status: response.status,
      });
      throw new GitApiError(
        `Failed to fetch commits for ${directoryPath}: ${response.status}`,
        response.status,
        'github'
      );
    }

    const data: any = await response.json();
    return data || [];
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
      // Handle errors gracefully - if one skill fails, still return others
      const skillsWithMetadata = await Promise.all(
        skillDirs.map(async (dir: any) => {
          try {
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
          } catch (commitError) {
            // Log warning but still return skill without commit metadata
            logger.warn('Failed to fetch commits for skill directory, returning without metadata', 'GitHubService', {
              dirPath: dir.path,
              error: commitError instanceof Error ? commitError.message : commitError,
            });
            return {
              path: dir.path,
              name: dir.name,
              skillFilePath: dir.skillFilePath,
              directoryCommitSHA: '',
              lastCommitMessage: '',
              lastCommitAuthor: '',
              lastCommitDate: null,
            };
          }
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

  /**
   * Get private repository skill file content
   */
  static async getPrivateRepoSkillContent(
    owner: string,
    repo: string,
    skillPath: string,
    pat?: string,
    branch?: string
  ): Promise<string> {
    const actualBranch = branch || 'main';
    const fullPath = skillPath.startsWith('/') ? skillPath : `${skillPath}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'skillsMN-App',
    };

    if (pat) {
      headers['Authorization'] = `token ${pat}`;
    }

    const response = await fetchWithProxy(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}?ref=${actualBranch}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch skill content: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  }

  /**
   * Get repository README.md content
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pat - Personal Access Token with repo scope
   * @param branch - Branch to read from (default: 'main')
   * @returns README.md content as string
   * @throws Error if README.md is not found or cannot be fetched
   */
  static async getRepoReadme(
    owner: string,
    repo: string,
    pat: string,
    branch: string = 'main'
  ): Promise<string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'skillsMN-App',
    };

    if (pat) {
      headers['Authorization'] = `token ${pat}`;
    }

    // Try common README filenames
    const readmeNames = ['README.md', 'readme.md', 'README.MD'];
    let lastError: Error | null = null;

    for (const readmeName of readmeNames) {
      try {
        const response = await fetchWithProxy(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${readmeName}?ref=${branch}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          return content;
        }

        // Store error for next iteration
        lastError = new Error(`Failed to fetch ${readmeName}: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new Error(`README.md not found in repository ${owner}/${repo}`);
  }

  /**
   * Upload a skill to a private GitHub repository
   * Creates or updates the skill.md file and commits it to the repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param skillDirName - Directory name for the skill
   * @param skillName - Name of the skill (for commit message)
   * @param content - Skill content (markdown with YAML frontmatter)
   * @param pat - Personal Access Token with repo scope
   * @param branch - Branch to commit to (default: 'main')
   * @param commitMessage - Optional custom commit message
   * @param instanceUrl - Optional instance URL (for GitHub Enterprise, not used in GitHub.com)
   * @returns Object with success status and SHA or error message
   */
  static async uploadSkill(
    owner: string,
    repo: string,
    skillDirName: string,
    skillName: string,
    content: string,
    pat: string,
    branch: string = 'main',
    commitMessage?: string,
    instanceUrl?: string
  ): Promise<{ success: boolean; sha?: string; error?: string }> {
    const GITHUB_API_BASE = instanceUrl
      ? `${instanceUrl}/api/v3`
      : 'https://api.github.com';

    const fullPath = skillDirName.startsWith('/') ? `${skillDirName}/SKILL.md` : `${skillDirName}/SKILL.md`;
    const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

    logger.info('GitHub upload parameters', 'GitHubService', {
      owner,
      repo,
      skillDirName,
      fullPath,
      branch,
      skillName,
      apiBase: GITHUB_API_BASE,
      hasInstanceUrl: !!instanceUrl
    });

    // Helper function to create abort controller with timeout
    const createTimeoutController = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      return controller;
    };

    // Helper function to fetch with timeout and proxy
    const fetchWithTimeout = async (url: string, options: any): Promise<any> => {
      const controller = createTimeoutController();
      const agent = getProxyAgent(url);
      return fetch(url, { ...options, signal: controller.signal, agent });
    };

    try {
      // Check if file already exists to get its SHA for update (with retry)
      let existingSha: string | undefined;
      try {
        const checkUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`;
        logger.debug('Checking if file exists', 'GitHubService', { checkUrl });

        const checkResponse = await retryWithBackoff(
          async () => {
            const response = await fetchWithTimeout(checkUrl, {
              headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'skillsMN-App',
              },
            });
            // Check for rate limit
            if (response.status === 429) {
              const error: any = new Error('Rate limit exceeded');
              error.status = 429;
              throw error;
            }
            return response;
          },
          { maxAttempts: 3, initialDelay: 1000 }
        );

        logger.debug('File check response', 'GitHubService', {
          status: checkResponse.status,
          statusText: checkResponse.statusText
        });

        if (checkResponse.ok) {
          const existingFile = await checkResponse.json();
          existingSha = existingFile.sha;
          logger.debug('File exists, SHA retrieved', 'GitHubService', { sha: existingSha });
        } else if (checkResponse.status === 404) {
          logger.debug('File does not exist, will create new', 'GitHubService');
        } else {
          const errorText = await checkResponse.text();
          logger.warn('File check failed', 'GitHubService', {
            status: checkResponse.status,
            error: errorText
          });
        }
      } catch (error) {
        logger.warn('File check request failed', 'GitHubService', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Create or update the file (with retry)
      const message = commitMessage || (existingSha ? `Update skill: ${skillName}` : `Add skill: ${skillName}`);
      const uploadUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}`;

      logger.info('Uploading skill to GitHub', 'GitHubService', {
        url: uploadUrl,
        method: 'PUT',
        branch,
        message,
        hasExistingSha: !!existingSha,
        contentLength: content.length
      });

      const response = await retryWithBackoff(
        async () => {
          const res = await fetchWithTimeout(uploadUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${pat}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'skillsMN-App',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              content: Buffer.from(content).toString('base64'),
              branch,
              ...(existingSha && { sha: existingSha }),
            }),
          });
          // Check for rate limit
          if (res.status === 429) {
            const error: any = new Error('Rate limit exceeded');
            error.status = 429;
            throw error;
          }
          return res;
        },
        { maxAttempts: 3, initialDelay: 2000 }
      );

      logger.debug('Upload response received', 'GitHubService', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('GitHub upload failed', 'GitHubService', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return {
          success: false,
          error: errorData.message || `GitHub API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        sha: data.content.sha,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload skill';

      // Provide more helpful error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        userMessage = 'Request timed out. Please check your network connection and try again.';
      } else if (errorMessage.includes('socket hang up')) {
        userMessage = 'Connection was closed unexpectedly. Please try again.';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      }

      logger.error('GitHub upload error', 'GitHubService', {
        error: errorMessage,
        userMessage
      });

      return {
        success: false,
        error: userMessage,
      };
    }
  }

  /**
   * Upload all files from a skill directory to a private GitHub repository
   * Creates or updates each file and commits them to the repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param skillDirName - Directory name for the skill
   * @param skillName - Name of the skill (for commit message)
   * @param files - Array of files with relative path and content
   * @param pat - Personal Access Token with repo scope
   * @param branch - Branch to commit to (default: 'main')
   * @param commitMessage - Optional custom commit message
   * @param instanceUrl - Optional instance URL (for GitHub Enterprise)
   * @returns Object with success status and uploaded file count or error message
   */
  static async uploadSkillDirectory(
    owner: string,
    repo: string,
    skillDirName: string,
    skillName: string,
    files: Array<{ relativePath: string; content: string }>,
    pat: string,
    branch: string = 'main',
    commitMessage?: string,
    instanceUrl?: string
  ): Promise<{ success: boolean; uploadedCount?: number; commitSha?: string; errors?: string[]; error?: string }> {
    const GITHUB_API_BASE = instanceUrl
      ? `${instanceUrl}/api/v3`
      : 'https://api.github.com';

    // Increased timeout for file uploads (2 minutes per file)
    // Large files or slow networks need more time
    const REQUEST_TIMEOUT = 120000; // 120 seconds timeout
    const errors: string[] = [];
    let uploadedCount = 0;

    // Track uploaded files for potential rollback
    const uploadedFiles: Array<{ fullPath: string; sha: string; isNewFile: boolean }> = [];
    // Track original SHAs of files that were updated (for rollback restoration)
    const originalFileShas: Map<string, string> = new Map();

    logger.info('GitHub directory upload parameters', 'GitHubService', {
      owner,
      repo,
      skillDirName,
      branch,
      skillName,
      fileCount: files.length,
      apiBase: GITHUB_API_BASE,
    });

    // Helper function to create abort controller with timeout
    const createTimeoutController = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      return controller;
    };

    // Helper function to fetch with timeout and proxy
    const fetchWithTimeout = async (url: string, options: any): Promise<any> => {
      const controller = createTimeoutController();
      const agent = getProxyAgent(url);
      return fetch(url, { ...options, signal: controller.signal, agent });
    };

    // Helper function to rollback uploaded files
    const rollbackUploads = async (failedFile: string): Promise<void> => {
      logger.warn(`Rolling back ${uploadedFiles.length} uploaded files due to failure: ${failedFile}`, 'GitHubService');

      for (const uploadedFile of uploadedFiles) {
        try {
          if (uploadedFile.isNewFile) {
            // Delete newly created file
            const deleteUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${uploadedFile.fullPath}`;
            const response = await fetchWithTimeout(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'skillsMN-App',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Rollback: Remove ${uploadedFile.fullPath} due to upload failure`,
                sha: uploadedFile.sha,
                branch,
              }),
            });

            if (response.ok) {
              logger.debug(`Rolled back (deleted) file: ${uploadedFile.fullPath}`, 'GitHubService');
            } else {
              const errorData = await response.json();
              logger.error(`Failed to rollback file ${uploadedFile.fullPath}: ${errorData.message}`, 'GitHubService');
            }
          } else {
            // For updated files, we can't easily restore the original content
            // The original commit SHA is stored in originalFileShas, but restoring would require
            // fetching the original content from git history, which is complex.
            // For now, log a warning - the file was updated in place and remains updated.
            logger.warn(`File ${uploadedFile.fullPath} was updated (not new), content change remains after rollback`, 'GitHubService');
          }
        } catch (rollbackError) {
          logger.error(`Error during rollback of ${uploadedFile.fullPath}`, 'GitHubService', rollbackError);
        }
      }
    };

    try {
      // Upload each file
      for (const file of files) {
        // Construct the full path in the repository
        const relativePath = file.relativePath.startsWith('/')
          ? file.relativePath.slice(1)
          : file.relativePath;
        const fullPath = `${skillDirName}/${relativePath}`;

        try {
          // Check if file already exists to get its SHA for update
          let existingSha: string | undefined;
          let isNewFile = true;
          try {
            const checkUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`;
            const checkResponse = await retryWithBackoff(
              async () => {
                const response = await fetchWithTimeout(checkUrl, {
                  headers: {
                    'Authorization': `token ${pat}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'skillsMN-App',
                  },
                });
                if (response.status === 429) {
                  const error: any = new Error('Rate limit exceeded');
                  error.status = 429;
                  throw error;
                }
                return response;
              },
              { maxAttempts: 3, initialDelay: 1000 }
            );

            if (checkResponse.ok) {
              const existingFile = await checkResponse.json();
              existingSha = existingFile.sha;
              isNewFile = false;
              // Store original SHA for potential rollback reference
              originalFileShas.set(fullPath, existingFile.sha);
            }
          } catch (checkError) {
            // File doesn't exist or error checking - continue with create
          }

          // Create or update the file
          const message = commitMessage ||
            (existingSha ? `Update ${relativePath} in ${skillName}` : `Add ${relativePath} to ${skillName}`);
          const uploadUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}`;

          const response = await retryWithBackoff(
            async () => {
              const res = await fetchWithTimeout(uploadUrl, {
                method: 'PUT',
                headers: {
                  'Authorization': `token ${pat}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'skillsMN-App',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message,
                  content: Buffer.from(file.content).toString('base64'),
                  branch,
                  ...(existingSha && { sha: existingSha }),
                }),
              });
              if (res.status === 429) {
                const error: any = new Error('Rate limit exceeded');
                error.status = 429;
                throw error;
              }
              return res;
            },
            { maxAttempts: 3, initialDelay: 2000 }
          );

          if (response.ok) {
            const responseData = await response.json();
            uploadedCount++;
            // Track uploaded file for potential rollback
            uploadedFiles.push({
              fullPath,
              sha: responseData.content.sha,
              isNewFile,
            });
            logger.debug(`Uploaded file: ${fullPath}`, 'GitHubService');
          } else {
            const errorData = await response.json();
            const errorMsg = `Failed to upload ${relativePath}: ${errorData.message || response.statusText}`;
            errors.push(errorMsg);

            // Rollback previously uploaded files
            await rollbackUploads(relativePath);

            return {
              success: false,
              error: `Upload failed: ${errorMsg}. Rolled back ${uploadedFiles.length} previously uploaded files.`,
              errors,
            };
          }
        } catch (fileError) {
          const errorMsg = fileError instanceof Error ? fileError.message : 'Unknown error';
          errors.push(`Failed to upload ${relativePath}: ${errorMsg}`);

          // Rollback previously uploaded files
          await rollbackUploads(relativePath);

          return {
            success: false,
            error: `Upload failed: ${errorMsg}. Rolled back ${uploadedFiles.length} previously uploaded files.`,
            errors,
          };
        }
      }

      // Get the latest commit SHA after upload
      let commitSha: string | undefined;
      let commitShaWarning: string | undefined;
      try {
        const commitResponse = await fetchWithTimeout(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'skillsMN-App',
            },
          }
        );

        if (commitResponse.ok) {
          const commits = await commitResponse.json();
          if (commits && commits.length > 0) {
            commitSha = commits[0].sha;
            logger.debug('Retrieved latest commit SHA after upload', 'GitHubService', { commitSha });
          }
        }
      } catch (error) {
        // This is non-critical, but we should warn the user
        commitShaWarning = 'Failed to retrieve commit SHA after upload. Update detection may not work correctly for this skill.';
        logger.warn('Failed to retrieve commit SHA after upload - update detection may be affected', 'GitHubService', { error });
      }

      if (uploadedCount === files.length) {
        logger.info('All files uploaded successfully', 'GitHubService', {
          uploadedCount,
          totalFiles: files.length,
          commitSha,
        });
        return {
          success: true,
          uploadedCount,
          commitSha,
          ...(commitShaWarning && { warning: commitShaWarning }),
        };
      } else {
        // This shouldn't happen with the new rollback logic, but handle it just in case
        logger.error('Unexpected state: partial upload without rollback', 'GitHubService', {
          uploadedCount,
          totalFiles: files.length,
          errors,
        });
        return {
          success: false,
          error: 'Unexpected partial upload state',
          errors,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload skill directory';
      logger.error('GitHub directory upload error', 'GitHubService', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current authenticated user info from GitHub
   * Uses the PAT to fetch the authenticated user's profile
   * @param pat - Personal Access Token
   * @returns User info including username, email, name, and avatar
   */
  static async getCurrentUser(pat: string): Promise<{
    success: boolean;
    user?: {
      id?: number;
      login: string;
      name: string | null;
      email: string | null;
      avatarUrl: string | null;
    };
    error?: string;
  }> {
    try {
      const url = `${GITHUB_API_BASE}/user`;
      const response = await fetchWithProxy(url, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Please check your PAT.',
          };
        }
        return {
          success: false,
          error: `GitHub API error: ${response.status}`,
        };
      }

      const data = await response.json();

      logger.info('Retrieved GitHub user info', 'GitHubService', {
        login: data.login,
        name: data.name,
      });

      return {
        success: true,
        user: {
          login: data.login,
          name: data.name || null,
          email: data.email || null,
          avatarUrl: data.avatar_url || null,
        },
      };
    } catch (error) {
      logger.error('Failed to get GitHub user info', 'GitHubService', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
