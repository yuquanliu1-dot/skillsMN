/**
 * Registry Service
 *
 * Handles communication with skills.sh API for skill discovery
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import {
  REGISTRY_API_BASE_URL,
  REGISTRY_SEARCH_ENDPOINT,
  REGISTRY_SEARCH_LIMIT,
  REGISTRY_API_TIMEOUT_MS
} from '../../shared/constants';
import { validateSearchResponse, extractSearchResults } from '../models/SearchSkillsResponse';
import { SearchSkillResult } from '../models/SearchSkillResult';
import { gitOperations, GitErrorCode } from '../utils/gitOperations';
import { SkillDiscovery } from '../utils/skillDiscovery';
import type { ProxyConfig } from '../../shared/types';

// Proxy agents loaded via require to avoid ESM module resolution issues
let HttpsProxyAgent: any = null;
let HttpProxyAgent: any = null;

// Proxy configuration from settings
let proxySettings: ProxyConfig | null = null;

/**
 * Set proxy configuration from settings
 */
export function setRegistryProxyConfig(config: ProxyConfig | undefined): void {
  proxySettings = config || null;
}

/**
 * Load proxy agents lazily
 */
function loadProxyAgents(): void {
  if (!HttpsProxyAgent) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      HttpsProxyAgent = require('https-proxy-agent');
    } catch {
      // Proxy agent not available
    }
  }
  if (!HttpProxyAgent) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      HttpProxyAgent = require('http-proxy-agent');
    } catch {
      // Proxy agent not available
    }
  }
}

/**
 * Get proxy agent from settings or system environment variables
 */
function getProxyAgent(url: string): any {
  loadProxyAgents();

  // If proxy is not enabled, return undefined
  if (!proxySettings?.enabled) {
    return undefined;
  }

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  // Priority 1: Custom proxy URL
  if (proxySettings.type === 'custom' && proxySettings.customUrl) {
    try {
      if (isHttps && HttpsProxyAgent) {
        return new HttpsProxyAgent(proxySettings.customUrl);
      } else if (!isHttps && HttpProxyAgent) {
        return new HttpProxyAgent(proxySettings.customUrl);
      }
    } catch {
      // Failed to create proxy agent
    }
    return undefined;
  }

  // Priority 2: System proxy
  if (proxySettings.type === 'system') {
    const proxyUrl = isHttps
      ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);

    if (proxyUrl) {
      try {
        if (isHttps && HttpsProxyAgent) {
          return new HttpsProxyAgent(proxyUrl);
        } else if (!isHttps && HttpProxyAgent) {
          return new HttpProxyAgent(proxyUrl);
        }
      } catch {
        // Failed to create proxy agent
      }
    }
  }

  return undefined;
}

/**
 * Registry-specific error codes
 */
export type RegistryErrorCode =
  | GitErrorCode
  | 'SKILL_NOT_FOUND'
  | 'REGISTRY_UNAVAILABLE'
  | 'INVALID_RESPONSE';

/**
 * Result of skill content fetch operation
 */
export interface SkillContentResult {
  success: boolean;
  content?: string;
  errorCode?: RegistryErrorCode;
  errorMessage?: string;
}

/**
 * Registry Service for skills.sh API integration
 */
export class RegistryService {
  /**
   * Search for skills in the registry
   *
   * @param query - Search query string
   * @param limit - Maximum number of results (default: 20)
   * @returns Array of search results
   */
  async searchSkills(query: string, limit: number = REGISTRY_SEARCH_LIMIT): Promise<SearchSkillResult[]> {
    // Validate input
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Construct URL with query parameters
    const url = new URL(
      `${REGISTRY_API_BASE_URL}${REGISTRY_SEARCH_ENDPOINT}`
    );

    url.searchParams.append('q', query.trim());
    url.searchParams.append('limit', limit.toString());

    console.log(`[RegistryService] Searching for skills: ${query}, limit: ${limit}`);

    try {
      // Make HTTP request with timeout and proxy support
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGISTRY_API_TIMEOUT_MS);
      const proxyAgent = getProxyAgent(url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        agent: proxyAgent,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'skillsMN-Desktop/1.0'
        }
      });

      clearTimeout(timeoutId);

      console.log(`[RegistryService] Response status: ${response.status}`);

      // Check response status
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');

        // Parse API errors and throw with a specific error code for better error handling
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.includes('at least 2 characters')) {
            throw new Error('QUERY_TOO_SHORT');
          }
        } catch (parseError) {
          // If not JSON, check if it's our specific error code
          if (parseError instanceof Error && parseError.message === 'QUERY_TOO_SHORT') {
            throw parseError;
          }
        }

        throw new Error(`Registry API error: ${response.status} - ${errorText}`);
      }

      // Parse JSON response
      const data = await response.json();

      console.log(`[RegistryService] Raw response data:`, JSON.stringify(data).substring(0, 200));

      // Validate response structure
      if (!validateSearchResponse(data)) {
        console.error('[RegistryService] Invalid response structure:', data);
        throw new Error('Invalid response from registry API');
      }

      // Extract and filter valid results
      const results = extractSearchResults(data);

      console.log(`[RegistryService] Found ${results.length} valid results`);

      return results;

    } catch (error: any) {
      console.error('[RegistryService] Search failed:', error);

      if (error.name === 'AbortError') {
        throw new Error(`Search request timed out after ${REGISTRY_API_TIMEOUT_MS}ms`);
      }

      throw error;
    }
  }

  /**
   * Get skill content from registry
   * Uses GitHub API to fetch file content directly without cloning
   *
   * @param source - Skill source (e.g., "anthropics/skills")
   * @param skillId - Skill identifier (internal name from frontmatter)
   * @returns SkillContentResult with content or error details
   */
  async getSkillContent(source: string, skillId: string): Promise<SkillContentResult> {
    console.log(`[RegistryService] Fetching skill content: ${source}/${skillId}`);

    // Try different possible paths for the skill
    const possiblePaths = [
      `${skillId}/SKILL.md`,
      `skills/${skillId}/SKILL.md`,
      `${skillId}/skill.md`,
      `skills/${skillId}/skill.md`
    ];

    // Try both main and master branches
    const branches = ['main', 'master'];

    // Try to fetch from raw GitHub content
    for (const branch of branches) {
      for (const skillPath of possiblePaths) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${source}/${branch}/${skillPath}`;
          console.log(`[RegistryService] Trying: ${rawUrl}`);

          const proxyAgent = getProxyAgent(rawUrl);
          const response = await fetch(rawUrl, {
            method: 'GET',
            agent: proxyAgent,
            headers: {
              'User-Agent': 'skillsMN-Desktop/1.0'
            },
            signal: AbortSignal.timeout(30000) // 30 second timeout (proxy connections may be slower)
          });

          if (response.ok) {
            const content = await response.text();
            console.log(`[RegistryService] Skill content fetched from ${skillPath} (${content.length} chars)`);
            return { success: true, content };
          } else {
            console.log(`[RegistryService] Got status ${response.status} for ${rawUrl}`);
          }
        } catch (error: any) {
          // Log but continue to next path
          console.log(`[RegistryService] Failed to fetch from ${skillPath} (${branch}): ${error.message}`);
        }
      }
    }

    // If all direct fetch attempts fail, fall back to cloning
    console.log(`[RegistryService] Direct fetch failed, falling back to cloning repository`);
    return await this.getSkillContentByCloning(source, skillId);
  }

  /**
   * Fallback method: Get skill content by cloning repository
   * Used when direct GitHub API access fails
   *
   * @param source - Skill source (e.g., "anthropics/skills")
   * @param skillId - Skill identifier (internal name from frontmatter)
   * @returns SkillContentResult with content or error details
   */
  private async getSkillContentByCloning(source: string, skillId: string): Promise<SkillContentResult> {
    const tempRoot = path.join(os.tmpdir(), `skillsMN-preview-${uuidv4()}`);

    try {
      // Clone repository to temp directory
      console.log(`[RegistryService] Cloning repository ${source} to ${tempRoot}`);
      const cloneResult = await gitOperations.shallowClone(
        source,
        tempRoot,
        (message) => {
          console.log(`[RegistryService] Clone progress: ${message}`);
        }
      );

      if (!cloneResult.success) {
        console.error(`[RegistryService] Clone failed with error code: ${cloneResult.errorCode}, error: ${cloneResult.error}`);
        return {
          success: false,
          errorCode: cloneResult.errorCode,
          errorMessage: cloneResult.error || 'Failed to clone repository'
        };
      }

      // Discover skill directory by internal name (from frontmatter)
      console.log(`[RegistryService] Discovering skill by internal name: ${skillId}`);
      const skillDiscovery = new SkillDiscovery();
      const skillDir = await skillDiscovery.findSkillByInternalName(
        tempRoot,
        skillId,
        2 // Search depth
      );

      if (!skillDir) {
        console.error(`[RegistryService] Skill "${skillId}" not found in repository ${source}`);
        return {
          success: false,
          errorCode: 'SKILL_NOT_FOUND',
          errorMessage: `Skill "${skillId}" not found in repository. It may have been renamed or removed.`
        };
      }

      // Read SKILL.md or skill.md content
      const skillFileNames = ['SKILL.md', 'skill.md'];
      let skillMdPath: string | null = null;

      for (const fileName of skillFileNames) {
        const testPath = path.join(skillDir, fileName);
        if (fs.existsSync(testPath)) {
          skillMdPath = testPath;
          break;
        }
      }

      if (!skillMdPath) {
        console.error(`[RegistryService] SKILL.md not found in ${skillDir}`);
        return {
          success: false,
          errorCode: 'SKILL_NOT_FOUND',
          errorMessage: `SKILL.md not found in skill directory. The skill may be corrupted or incomplete.`
        };
      }

      const content = await fs.promises.readFile(skillMdPath, 'utf-8');
      console.log(`[RegistryService] Skill content fetched from ${path.basename(skillMdPath)} (${content.length} chars)`);

      return { success: true, content };

    } catch (error: any) {
      console.error('[RegistryService] Failed to fetch skill content:', error);
      return {
        success: false,
        errorCode: 'CLONE_FAILED',
        errorMessage: error.message || 'Failed to fetch skill content'
      };
    } finally {
      // Clean up temp directory
      try {
        await fs.promises.rm(tempRoot, { recursive: true, force: true });
        console.log(`[RegistryService] Cleaned up temp directory: ${tempRoot}`);
      } catch (cleanupError) {
        console.warn('[RegistryService] Failed to clean up temp directory:', cleanupError);
      }
    }
  }

}
