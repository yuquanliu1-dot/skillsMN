/**
 * SkillSource Model
 *
 * Unified metadata tracking the source of an installed skill for updates and traceability
 * Supports three source types: local, registry, and private-repo
 */

/**
 * Source metadata for locally created skills
 */
export interface LocalSource {
  /** Source type identifier */
  type: 'local';
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Source metadata for skills installed from skills.sh registry
 */
export interface RegistrySource {
  /** Source type identifier */
  type: 'registry';
  /** Base URL of the registry */
  registryUrl: string;
  /** GitHub repository path (org/repo) */
  source: string;
  /** Skill identifier */
  skillId: string;
  /** Installation timestamp (ISO 8601) */
  installedAt: string;
  /** Git commit hash (optional, 40-character hex string) */
  commitHash?: string;
}

/**
 * Source metadata for skills installed from private GitHub repositories
 */
export interface PrivateRepoSource {
  /** Source type identifier */
  type: 'private-repo';
  /** Repository ID (UUID from config) */
  repoId: string;
  /** Repository path (owner/repo) */
  repoPath: string;
  /** Skill directory path within repository */
  skillPath: string;
  /** Installation timestamp (ISO 8601) */
  installedAt: string;
  /** Git commit hash of the installed directory (optional) */
  commitHash?: string;
}

/**
 * Unified skill source type supporting all installation methods
 */
export type SkillSource = LocalSource | RegistrySource | PrivateRepoSource;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a LocalSource object for locally created skills
 *
 * @returns LocalSource object with current timestamp
 *
 * @example
 * ```typescript
 * const source = createLocalSource();
 * // {
 * //   type: 'local',
 * //   createdAt: '2026-03-14T10:30:45.123Z'
 * // }
 * ```
 */
export function createLocalSource(): LocalSource {
  return {
    type: 'local',
    createdAt: new Date().toISOString()
  };
}

/**
 * Creates a RegistrySource object for registry-installed skills
 *
 * @param source - GitHub repository path (org/repo)
 * @param skillId - Skill identifier
 * @param commitHash - Optional git commit hash
 * @returns RegistrySource object with current timestamp
 *
 * @example
 * ```typescript
 * const source = createRegistrySource('org/repo', 'my-skill', 'abc123...');
 * // {
 * //   type: 'registry',
 * //   registryUrl: 'https://skills.sh',
 * //   source: 'org/repo',
 * //   skillId: 'my-skill',
 * //   installedAt: '2026-03-14T10:30:45.123Z',
 * //   commitHash: 'abc123...'
 * // }
 * ```
 */
export function createRegistrySource(
  source: string,
  skillId: string,
  commitHash?: string
): RegistrySource {
  const registrySource: RegistrySource = {
    type: 'registry',
    registryUrl: 'https://skills.sh',
    source,
    skillId,
    installedAt: new Date().toISOString()
  };

  if (commitHash) {
    registrySource.commitHash = commitHash;
  }

  return registrySource;
}

/**
 * Creates a PrivateRepoSource object for private repository installed skills
 *
 * @param repoId - Repository ID from config
 * @param repoPath - Repository path (owner/repo)
 * @param skillPath - Skill directory path within repository
 * @param commitHash - Optional git commit hash
 * @returns PrivateRepoSource object with current timestamp
 *
 * @example
 * ```typescript
 * const source = createPrivateRepoSource('uuid-1234', 'owner/repo', 'skills/my-skill', 'def456...');
 * // {
 * //   type: 'private-repo',
 * //   repoId: 'uuid-1234',
 * //   repoPath: 'owner/repo',
 * //   skillPath: 'skills/my-skill',
 * //   installedAt: '2026-03-14T10:30:45.123Z',
 * //   commitHash: 'def456...'
 * // }
 * ```
 */
export function createPrivateRepoSource(
  repoId: string,
  repoPath: string,
  skillPath: string,
  commitHash?: string
): PrivateRepoSource {
  const privateSource: PrivateRepoSource = {
    type: 'private-repo',
    repoId,
    repoPath,
    skillPath,
    installedAt: new Date().toISOString()
  };

  if (commitHash) {
    privateSource.commitHash = commitHash;
  }

  return privateSource;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a skill was created locally
 *
 * @param skillSource - SkillSource object or undefined
 * @returns True if the skill was created locally
 */
export function isLocalSkill(skillSource: SkillSource | undefined): skillSource is LocalSource {
  return skillSource?.type === 'local';
}

/**
 * Type guard to check if a skill was installed from the registry
 *
 * @param skillSource - SkillSource object or undefined
 * @returns True if the skill was installed from the registry
 */
export function isRegistrySkill(skillSource: SkillSource | undefined): skillSource is RegistrySource {
  return skillSource?.type === 'registry';
}

/**
 * Type guard to check if a skill was installed from a private repository
 *
 * @param skillSource - SkillSource object or undefined
 * @returns True if the skill was installed from a private repository
 */
export function isPrivateRepoSkill(skillSource: SkillSource | undefined): skillSource is PrivateRepoSource {
  return skillSource?.type === 'private-repo';
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a LocalSource object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid LocalSource
 */
export function validateLocalSource(data: unknown): data is LocalSource {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validate type: must be 'local'
  if (obj.type !== 'local') {
    return false;
  }

  // Validate createdAt: valid ISO 8601 timestamp
  if (typeof obj.createdAt !== 'string') {
    return false;
  }

  try {
    const date = new Date(obj.createdAt);
    if (isNaN(date.getTime())) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Validates a RegistrySource object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid RegistrySource
 */
export function validateRegistrySource(data: unknown): data is RegistrySource {
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

/**
 * Validates a PrivateRepoSource object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid PrivateRepoSource
 */
export function validatePrivateRepoSource(data: unknown): data is PrivateRepoSource {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validate type: must be 'private-repo'
  if (obj.type !== 'private-repo') {
    return false;
  }

  // Validate repoId: non-empty string
  if (typeof obj.repoId !== 'string' || obj.repoId.length === 0) {
    return false;
  }

  // Validate repoPath: GitHub repository path format
  if (typeof obj.repoPath !== 'string' || !/^[^/]+\/[^/]+$/.test(obj.repoPath)) {
    return false;
  }

  // Validate skillPath: non-empty string
  if (typeof obj.skillPath !== 'string' || obj.skillPath.length === 0) {
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

/**
 * Validates a SkillSource object (any type)
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid SkillSource
 */
export function validateSkillSource(data: unknown): data is SkillSource {
  return validateLocalSource(data) || validateRegistrySource(data) || validatePrivateRepoSource(data);
}
