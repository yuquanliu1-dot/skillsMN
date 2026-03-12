/**
 * SearchSkillResult Model
 *
 * Represents a skill discovered through the skills.sh registry API
 */

/**
 * Result from skills.sh registry search
 */
export interface SearchSkillResult {
  /** Unique identifier from registry */
  id: string;
  /** Skill identifier (may differ from id) */
  skillId: string;
  /** Display name of the skill */
  name: string;
  /** Number of installations */
  installs: number;
  /** GitHub repository path (format: "org/repo" or "user/repo") */
  source: string;
}

/**
 * Validates a SearchSkillResult object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid SearchSkillResult
 *
 * @example
 * ```typescript
 * const result = {
 *   id: "abc123",
 *   skillId: "my-skill",
 *   name: "My Skill",
 *   installs: 100,
 *   source: "org/repo"
 * };
 *
 * if (validateSearchSkillResult(result)) {
 *   // Safe to use as SearchSkillResult
 * }
 * ```
 */
export function validateSearchSkillResult(data: unknown): data is SearchSkillResult {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validate id: non-empty string
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    return false;
  }

  // Validate skillId: non-empty string
  if (typeof obj.skillId !== 'string' || obj.skillId.length === 0) {
    return false;
  }

  // Validate name: non-empty string, max 200 chars
  if (typeof obj.name !== 'string' || obj.name.length === 0 || obj.name.length > 200) {
    return false;
  }

  // Validate installs: non-negative integer
  if (typeof obj.installs !== 'number' || !Number.isInteger(obj.installs) || obj.installs < 0) {
    return false;
  }

  // Validate source: GitHub repository path format (org/repo or user/repo)
  if (typeof obj.source !== 'string' || !/^[^/]+\/[^/]+$/.test(obj.source)) {
    return false;
  }

  return true;
}

/**
 * Validates an array of SearchSkillResult objects
 * Filters out invalid results and logs warnings
 *
 * @param data - Unknown data to validate
 * @returns Array of valid SearchSkillResult objects
 */
export function validateSearchSkillResults(data: unknown): SearchSkillResult[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const validResults: SearchSkillResult[] = [];

  for (const item of data) {
    if (validateSearchSkillResult(item)) {
      validResults.push(item);
    } else {
      console.warn('[Registry] Invalid search result filtered out:', item);
    }
  }

  return validResults;
}
