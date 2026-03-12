/**
 * InstallFromRegistryRequest Model
 *
 * Represents a user's request to install a skill from the registry
 */

/**
 * Request to install a skill from the registry
 */
export interface InstallFromRegistryRequest {
  /** GitHub repository path (format: "org/repo") */
  source: string;
  /** Skill identifier to install */
  skillId: string;
  /** Target tool identifier (e.g., "claude-code", "claude-desktop") */
  targetToolId: string;
}

/**
 * Installation status enum
 */
export enum InstallStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Validates an InstallFromRegistryRequest object
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid InstallFromRegistryRequest
 *
 * @example
 * ```typescript
 * const request = {
 *   source: "skills-org/skills-collection",
 *   skillId: "my-awesome-skill",
 *   targetToolId: "claude-code"
 * };
 *
 * if (validateInstallRequest(request)) {
 *   // Safe to process installation
 * }
 * ```
 */
export function validateInstallRequest(data: unknown): data is InstallFromRegistryRequest {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validate source: GitHub repository path format (org/repo)
  if (typeof obj.source !== 'string' || !/^[^/]+\/[^/]+$/.test(obj.source)) {
    return false;
  }

  // Validate skillId: non-empty string
  if (typeof obj.skillId !== 'string' || obj.skillId.length === 0) {
    return false;
  }

  // Validate targetToolId: non-empty string
  if (typeof obj.targetToolId !== 'string' || obj.targetToolId.length === 0) {
    return false;
  }

  return true;
}

/**
 * Type guard for checking if a value is a valid InstallStatus
 *
 * @param value - Unknown value to check
 * @returns True if value is a valid InstallStatus
 */
export function isValidInstallStatus(value: unknown): value is InstallStatus {
  return (
    typeof value === 'string' &&
    Object.values(InstallStatus).includes(value as InstallStatus)
  );
}
