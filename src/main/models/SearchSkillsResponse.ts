/**
 * SearchSkillsResponse Model
 *
 * Represents the API response from skills.sh registry search endpoint
 */

import { SearchSkillResult, validateSearchSkillResults } from './SearchSkillResult';

/**
 * Response from skills.sh registry search API
 */
export interface SearchSkillsResponse {
  /** Array of search results */
  skills: SearchSkillResult[];
}

/**
 * Validates a SearchSkillsResponse object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid SearchSkillsResponse
 *
 * @example
 * ```typescript
 * const response = await fetch('https://skills.sh/api/search?q=test');
 * const data = await response.json();
 *
 * if (validateSearchResponse(data)) {
 *   // Safe to use data.skills array
 * }
 * ```
 */
export function validateSearchResponse(data: unknown): data is SearchSkillsResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check if skills field exists and is an array
  if (!Array.isArray(obj.skills)) {
    return false;
  }

  // Validate each skill in the array
  // Note: We allow responses with some invalid skills (they'll be filtered out)
  // This makes the system more resilient to API changes
  return true;
}

/**
 * Extracts and validates search results from API response
 * Filters out invalid results and returns only valid skills
 *
 * @param data - Unknown data from API response
 * @returns Array of valid SearchSkillResult objects
 */
export function extractSearchResults(data: unknown): SearchSkillResult[] {
  if (!validateSearchResponse(data)) {
    return [];
  }

  return validateSearchSkillResults(data.skills);
}
