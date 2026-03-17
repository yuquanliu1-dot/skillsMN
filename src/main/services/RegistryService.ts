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
import { gitOperations } from '../utils/gitOperations';
import { SkillDiscovery } from '../utils/skillDiscovery';

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
      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGISTRY_API_TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
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
   * Clones the repository and discovers the skill to read SKILL.md
   *
   * @param source - Skill source (e.g., "anthropics/skills")
   * @param skillId - Skill identifier (internal name from frontmatter)
   * @returns Skill content as string
   */
  async getSkillContent(source: string, skillId: string): Promise<string> {
    console.log(`[RegistryService] Fetching skill content: ${source}/${skillId}`);

    const tempRoot = path.join(os.tmpdir(), `skillsMN-preview-${uuidv4()}`);

    try {
      // Clone repository to temp directory
      console.log(`[RegistryService] Cloning repository to ${tempRoot}`);
      const cloneResult = await gitOperations.shallowClone(
        source,
        tempRoot,
        (message) => {
          console.log(`[RegistryService] Clone progress: ${message}`);
        }
      );

      if (!cloneResult.success) {
        throw new Error(`Failed to clone repository: ${cloneResult.error}`);
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
        throw new Error(`Skill "${skillId}" not found in repository`);
      }

      // Read SKILL.md content
      const skillMdPath = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        throw new Error(`SKILL.md not found in ${skillDir}`);
      }

      const content = await fs.promises.readFile(skillMdPath, 'utf-8');
      console.log(`[RegistryService] Skill content fetched (${content.length} chars)`);

      return content;

    } catch (error: any) {
      console.error('[RegistryService] Failed to fetch skill content:', error);
      throw error;
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
