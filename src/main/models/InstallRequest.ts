/**
 * Install Request Model
 *
 * Represents a skill installation request
 */

export interface InstallRequest {
  /** Skill name */
  skillName: string;
  /** Repository full name (owner/repo) */
  repositoryFullName: string;
  /** Path to skill file in repository */
  skillPath: string;
  /** Target directory for installation */
  targetDirectory: 'project' | 'global';
  /** Branch name */
  branch: string;
  /** Conflict resolution strategy */
  conflictResolution?: 'overwrite' | 'rename' | 'skip' | null;
}

