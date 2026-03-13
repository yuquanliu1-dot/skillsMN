/**
 * Registry Service
 *
 * Handles communication with skills.sh API for skill discovery
 */

import fetch from 'node-fetch';
import {
  REGISTRY_API_BASE_URL,
  REGISTRY_SEARCH_ENDPOINT,
  REGISTRY_SEARCH_LIMIT,
  REGISTRY_API_TIMEOUT_MS
} from '../../shared/constants';
import { validateSearchResponse, extractSearchResults } from '../models/SearchSkillsResponse';
import { SearchSkillResult } from '../models/SearchSkillResult';

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
}
