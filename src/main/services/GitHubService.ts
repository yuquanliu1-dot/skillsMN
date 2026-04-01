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

const GITHUB_API_BASE = 'https://api.github.com';

// Proxy agents loaded via require to avoid ESM module resolution issues
let HttpsProxyAgent: any = null;
let HttpProxyAgent: any = null;
let proxyAgentsLoaded = false;
let proxyAgentsWarningLogged = false;

// System proxy settings cached from Windows registry
let cachedSystemProxySettings: { httpProxy?: string; httpsProxy?: string } | null = null;
let systemProxyLoadAttempted = false;

// Lazy load proxy agents (only when needed)
function loadProxyAgents(): void {
  if (proxyAgentsLoaded) return;

  proxyAgentsLoaded = true;
  let loaded = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpsProxyAgent = require('https-proxy-agent');
    loaded = true;
  } catch {
    // Module not available
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpProxyAgent = require('http-proxy-agent');
    loaded = true;
  } catch {
    // Module not available
  }

  // Only log warning once if proxy agents are needed but not available
  if (!loaded && !proxyAgentsWarningLogged) {
    proxyAgentsWarningLogged = true;
    logger.warn('Proxy agents not available. Proxy functionality will be disabled.', 'GitHubService');
  }
}

// Proxy configuration from settings
let proxySettings: ProxyConfig | null = null;

/**
 * Load system proxy settings from Windows registry
 * This uses the get-proxy-settings package to read actual system proxy configuration
 */
async function loadSystemProxySettings(): Promise<void> {
  if (systemProxyLoadAttempted) return;
  systemProxyLoadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getProxySettings } = require('get-proxy-settings');
    const settings = await getProxySettings();

    if (settings?.https) {
      cachedSystemProxySettings = {
        httpsProxy: `http://${settings.https.host}:${settings.https.port}`,
        httpProxy: settings.http ? `http://${settings.http.host}:${settings.http.port}` : undefined,
      };
      logger.info('Loaded system proxy settings from Windows registry', 'GitHubService', {
        httpsProxy: cachedSystemProxySettings.httpsProxy,
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    } else if (settings?.http) {
      cachedSystemProxySettings = {
        httpProxy: `http://${settings.http.host}:${settings.http.port}`,
      };
      logger.info('Loaded HTTP system proxy settings from Windows registry', 'GitHubService', {
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    }
  } catch (error) {
    logger.warn('Failed to load system proxy settings from Windows registry', 'GitHubService', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Set proxy configuration from settings
 */
export function setProxyConfig(config: ProxyConfig | undefined): void {
  proxySettings = config || null;
  logger.debug('Proxy configuration updated', 'GitHubService', { config });

  // Reset cached system proxy when settings change
  if (config?.enabled && config?.type === 'system') {
    // Clear cache to force reload
    cachedSystemProxySettings = null;
    systemProxyLoadAttempted = false;
    // Immediately preload system proxy settings (don't wait for first request)
    loadSystemProxySettings().catch(() => {});
  }
}

/**
 * Get proxy agent from settings or system environment variables
 * Priority: 1. Custom proxy URL from settings 2. System proxy (if enabled) 3. No proxy
 */
export function getProxyAgent(url: string): any {
  // If proxy is not enabled, return undefined immediately (don't load proxy agents)
  if (!proxySettings?.enabled) {
    return undefined;
  }

  // Only load proxy agents when proxy is actually enabled
  loadProxyAgents();

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  // Priority 1: Custom proxy URL
  if (proxySettings.type === 'custom' && proxySettings.customUrl) {
    logger.debug(`Using custom proxy for ${url}`, 'GitHubService', { proxyUrl: proxySettings.customUrl });
    try {
      if (isHttps && HttpsProxyAgent) {
        return new HttpsProxyAgent(proxySettings.customUrl);
      } else if (!isHttps && HttpProxyAgent) {
        return new HttpProxyAgent(proxySettings.customUrl);
      }
    } catch (error) {
      logger.warn('Failed to create proxy agent from custom URL', 'GitHubService', error);
    }
    return undefined;
  }

  // Priority 2: System proxy - check cached Windows registry settings first, then fallback to env vars
  if (proxySettings.type === 'system') {
    // First check cached Windows registry proxy settings
    if (cachedSystemProxySettings) {
      const proxyUrl = isHttps
        ? cachedSystemProxySettings.httpsProxy
        : cachedSystemProxySettings.httpProxy;

      if (proxyUrl) {
        logger.debug(`Using Windows system proxy for ${url}`, 'GitHubService', { proxyUrl });
        try {
          if (isHttps && HttpsProxyAgent) {
            return new HttpsProxyAgent(proxyUrl);
          } else if (!isHttps && HttpProxyAgent) {
            return new HttpProxyAgent(proxyUrl);
          }
        } catch (error) {
          logger.warn('Failed to create proxy agent from Windows system proxy', 'GitHubService', error);
        }
      }
    }

    // Fallback to environment variables (for non-Windows or if registry read failed)
    const envProxyUrl = isHttps
      ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);

    if (envProxyUrl) {
      logger.debug(`Using environment proxy for ${url}`, 'GitHubService', { proxyUrl: envProxyUrl });
      try {
        if (isHttps && HttpsProxyAgent) {
          return new HttpsProxyAgent(envProxyUrl);
        } else if (!isHttps && HttpProxyAgent) {
          return new HttpProxyAgent(envProxyUrl);
        }
      } catch (error) {
        logger.warn('Failed to create proxy agent from environment proxy', 'GitHubService', error);
      }
    }

    // If no proxy found and haven't attempted to load from Windows registry yet, try to load it
    if (!cachedSystemProxySettings && !systemProxyLoadAttempted) {
      // Trigger async load for next time, but don't block current request
      loadSystemProxySettings().catch(() => {});
      logger.debug('Initiated system proxy settings load for next request', 'GitHubService');
    }
  }

  return undefined;
}

/**
 * Fetch with system proxy support and timeout
 */
async function fetchWithProxy(url: string, options: any = {}): Promise<any> {
  // Add default timeout of 30 seconds if not specified
  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Get proxy agent if configured, otherwise use a fresh agent to avoid connection pooling issues
    let agent = getProxyAgent(url);

    // If no proxy agent, create a simple agent that disables connection pooling
    // This helps prevent ECONNRESET errors from connection reuse
    if (!agent && url.startsWith('https://')) {
      const https = require('https');
      agent = new https.Agent({
        keepAlive: false, // Disable keep-alive to prevent connection reuse issues
        timeout: 30000,
      });
    }

    const response = await fetch(url, {
      ...options,
      agent,
      signal: options.signal || controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
      const response = await fetchWithProxy(url, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        // Handle 404 gracefully - repository may be empty or branch doesn't exist
        if (response.status === 404) {
          logger.debug('Repository tree not found (404) - repository may be empty or branch does not exist', 'GitHubService', { owner, repo, branch });
          return [];
        }
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
      return item.type === 'blob' && item.path.endsWith('SKILL.md');
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

      // Process files sequentially with delay to avoid rate limiting and connection issues
      // Using GitHub API instead of raw.githubusercontent.com to avoid IPv6 issues
      for (const file of directoryFiles) {
        try {
          // Use GitHub API to get file content (more reliable than raw.githubusercontent.com)
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

          files.set(file.path, content);

          // Small delay between files to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (fileError) {
          logger.warn(`Failed to download file ${file.path}, skipping`, 'GitHubService', {
            error: fileError instanceof Error ? fileError.message : 'Unknown error',
          });
          // Continue with other files instead of failing completely
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
    try {
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

    const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
    const errors: string[] = [];
    let uploadedCount = 0;

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
            uploadedCount++;
            logger.debug(`Uploaded file: ${fullPath}`, 'GitHubService');
          } else {
            const errorData = await response.json();
            errors.push(`Failed to upload ${relativePath}: ${errorData.message || response.statusText}`);
          }
        } catch (fileError) {
          const errorMsg = fileError instanceof Error ? fileError.message : 'Unknown error';
          errors.push(`Failed to upload ${relativePath}: ${errorMsg}`);
        }
      }

      // Get the latest commit SHA after upload
      let commitSha: string | undefined;
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
        logger.warn('Failed to retrieve commit SHA after upload', 'GitHubService', { error });
      }

      if (uploadedCount === files.length) {
        logger.info('All files uploaded successfully', 'GitHubService', {
          uploadedCount,
          totalFiles: files.length,
          commitSha,
        });
        return { success: true, uploadedCount, commitSha };
      } else if (uploadedCount > 0) {
        logger.warn('Partial upload completed', 'GitHubService', {
          uploadedCount,
          totalFiles: files.length,
          errors,
          commitSha,
        });
        return {
          success: true,
          uploadedCount,
          commitSha,
          errors: errors.length > 0 ? errors : undefined,
        };
      } else {
        logger.error('All file uploads failed', 'GitHubService', { errors });
        return {
          success: false,
          error: 'All file uploads failed',
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
}
