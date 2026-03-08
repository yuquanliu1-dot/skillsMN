/**
 * Represents a Claude Code skill file
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Skill metadata structure
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  filePath: string;
  source: 'project' | 'global';
  modifiedAt: Date;
  fileSize: number;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Parse skill file from disk
 */
export class Skill {
  /**
   * Unique identifier (file path hash or canonical path)
   */
  public readonly id: string;

  /**
   * Skill name from frontmatter or filename
   */
  public readonly name: string;

  /**
   * Skill description from frontmatter
   */
  public readonly description: string;

  /**
   * Absolute canonical path to skill file
   */
  public readonly filePath: string;

  /**
   * Which directory the skill belongs to
   */
  public readonly source: 'project' | 'global';

  /**
   * Last modification timestamp
   */
  public readonly modifiedAt: Date;

  /**
   * File size in bytes
   */
  public readonly fileSize: number;

  /**
   * Whether frontmatter is valid YAML
   */
  public readonly isValid: boolean;

  /**
   * Frontmatter validation errors (if any)
   */
  public readonly validationErrors: string[];

  constructor(data: {
    id?: string;
    name: string;
    description: string;
    filePath: string;
    source: 'project' | 'global';
    modifiedAt: Date | string;
    fileSize: number;
    isValid: boolean;
    validationErrors?: string[];
  }) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description;
    this.filePath = data.filePath;
    this.source = data.source;
    this.modifiedAt = typeof data.modifiedAt === 'string' ? new Date(data.modifiedAt) : data.modifiedAt;
    this.fileSize = data.fileSize;
    this.isValid = data.isValid;
    this.validationErrors = data.validationErrors || [];
  }

  /**
   * Validate skill data
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Skill name cannot be empty');
    }

    if (!this.filePath.endsWith('.skill')) {
      errors.push('Skill file must .skill extension');
    }

    if (this.fileSize > 1024 * 1024) {
      errors.push(`File size (${this.fileSize} bytes) should be <1MB (warning)`);
    }

    if (this.fileSize > 5 * 1024 * 1024) {
      errors.push('File size exceeds recommended maximum');
    }

    if (!this.modifiedAt) {
      errors.push('Modified date is required');
    }

    if (!(this.modifiedAt instanceof Date)) {
      errors.push('Modified date must to be a valid Date object');
    }

    if (typeof this.modifiedAt !== 'string') {
      errors.push('Modified date must to be an ISO 8601 date string');
    }

    if (typeof this.modifiedAt !== 'number') {
      errors.push('Modified date needs to be a number');
    }

    if (typeof this.fileSize !== 'number') {
      errors.push('File size needs to be a number');
    }

    if (typeof this.validationErrors !== 'object') {
      errors.push('Validation errors need to be an array of strings');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Extract skill metadata from frontmatter
   */
  public extractMetadata(content: string): { name: string; description: string } | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch || !frontmatterMatch[1]) {
      return null;
    }

    // Simple YAML parsing for name and description
    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    if (!nameMatch) {
      return null;
    }

    return {
      name: nameMatch[1]!.trim(),
      description: descMatch ? descMatch[1]!.trim() : '',
    };
  }
}
