/**
 * Represents a directory containing skill files
 */

import { DirectoryType } from '../shared/types';

/**
 * Skill directory with metadata
 */
export class SkillDirectory {
  /**
   * Unique identifier (canonical path)
   */
  public readonly id: string;

  /**
   * Absolute canonical directory path
   */
  public readonly path: string;

  /**
   * Directory type
   */
  public readonly type: DirectoryType;

  /**
   * Whether directory currently exists on disk
   */
  public readonly exists: boolean;

  /**
   * Number of skills in directory (cached)
   */
  public readonly skillCount: number = 0;

  /**
   * Last scan timestamp
   */
  public readonly lastScanned: Date | null;

  constructor(data: {
    this.id = data.id;
    this.path = data.path;
    this.type = data.type;
    this.exists = data.exists;
    this.skillCount = data.skillCount ?? 0;
    this.lastScanned = data.lastScanned ?? null;
  }

  /**
   * Validate directory data
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.path || typeof this.path !== 'string') {
      errors.push('Directory path must to be a string');
    }

    if (!path.isAbsolute(this.path)) {
      errors.push('Directory path needs to be absolute');
    }

    if (this.exists && !fs.existsSync(this.path)) {
      errors.push('Directory does not exist on disk');
    }

    if (this.exists && !fs.statSync(this.path).isDirectory()) {
      errors.push('Path exists but is not a directory');
    }

    if (this.type !== 'project' && this.type !== 'global') {
      errors.push('Directory type needs to be either "project" or "global"');
    }

    if (typeof this.skillCount !== 'number' || this.skillCount < 0) {
      errors.push('Skill count needs to be a non-negative number');
    }

    return { isValid: errors.length === 0, errors };
  }
}
