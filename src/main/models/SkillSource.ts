/**
 * SkillSource Model
 *
 * Metadata tracking the source of an installed skill for updates and traceability
 */

/**
 * Source metadata for tracking installed skills
 */
export interface SkillSource {
  /** Source type identifier */
  type: 'registry';
  /** Base URL of the registry */
  registryUrl: string;
  /** GitHub repository path */
  source: string;
  /** Skill identifier */
  skillId: string;
  /** Installation timestamp (ISO 8601) */
  installedAt: string;
  /** Git commit hash (optional, 40-character hex string) */
  commitHash?: string;
}

/**
 * Creates a SkillSource object for registry-installed skills
 *
 * @param source - GitHub repository path (org/repo)
 * @param skillId - Skill identifier
 * @param commitHash - Optional git commit hash
 * @returns SkillSource object with current timestamp
 *
 * @example
 * ```typescript
 * const source = createSkillSource('org/repo', 'my-skill', 'abc123...');
 * // {
 * //   type: 'registry',
 * //   registryUrl: 'https://skills.sh',
 * //   source: 'org/repo',
 * //   skillId: 'my-skill',
 * //   installedAt: '2026-03-12T10:30:45.123Z',
 * //   commitHash: 'abc123...'
 * // }
 * ```
 */
export function createSkillSource(
  source: string,
  skillId: string,
  commitHash?: string
): SkillSource {
  const skillSource: SkillSource = {
    type: 'registry',
    registryUrl: 'https://skills.sh',
    source,
    skillId,
    installedAt: new Date().toISOString()
  };

  if (commitHash) {
    skillSource.commitHash = commitHash;
  }

  return skillSource;
}

/**
 * Type guard to check if a skill was installed from the registry
 *
 * @param skillSource - SkillSource object or undefined
 * @returns True if the skill was installed from the registry
 *
 * @example
 * ```typescript
 * const source = createSkillSource('org/repo', 'my-skill');
 *
 * if (isRegistrySkill(source)) {
 *   console.log('Installed from registry:', source.source);
 * }
 * ```
 */
export function isRegistrySkill(skillSource: SkillSource | undefined): boolean {
  return skillSource?.type === 'registry';
}

/**
 * Validates a SkillSource object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid SkillSource
 */
export function validateSkillSource(data: unknown): data is SkillSource {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validate type: must be 'registry'
  if (obj.type !== 'registry') {
    return false;
  }

  // Validate registryUrl: valid HTTPS URL
  if (typeof obj.registryUrl !== 'string' || !obj.registryUrl.startsWith('https://')) {
    return false;
  }

  // Validate source: GitHub repository path format
  if (typeof obj.source !== 'string' || !/^[^/]+\/[^/]+$/.test(obj.source)) {
    return false;
  }

  // Validate skillId: non-empty string
  if (typeof obj.skillId !== 'string' || obj.skillId.length === 0) {
    return false;
  }

  // Validate installedAt: valid ISO 8601 timestamp
  if (typeof obj.installedAt !== 'string') {
    return false;
  }

  try {
    const date = new Date(obj.installedAt);
    if (isNaN(date.getTime())) {
      return false;
    }
  } catch {
    return false;
  }

  // Validate commitHash if present: 40-character hex string
  if (obj.commitHash !== undefined) {
    if (typeof obj.commitHash !== 'string' || !/^[0-9a-f]{40}$/i.test(obj.commitHash)) {
      return false;
    }
  }

  return true;
}
