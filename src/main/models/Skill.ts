/**
 * Skill Model
 *
 * Represents a skill directory containing skill.md and optional resources
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../utils/Logger';
import { Skill, SkillFrontmatter, SkillSource } from '../../shared/types';
import { SKILL_FILE_NAME, MAX_SKILL_NAME_LENGTH, MAX_SKILL_DESCRIPTION_LENGTH } from '../../shared/constants';

export class SkillModel {
  /**
   * Parse skill directory and extract metadata
   */
  static async fromDirectory(dirPath: string, source: SkillSource): Promise<Skill> {
    const skillFilePath = path.join(dirPath, SKILL_FILE_NAME);

    // Check if skill.md exists
    if (!fs.existsSync(skillFilePath)) {
      throw new Error(`Skill file not found: ${skillFilePath}`);
    }

    // Get directory stats for lastModified
    const dirStats = await fs.promises.stat(dirPath);

    // Parse frontmatter
    const { frontmatter, isValid } = await this.parseFrontmatter(skillFilePath);

    // Use frontmatter name or fall back to directory name
    const dirName = path.basename(dirPath);
    const name = isValid && frontmatter.name
      ? frontmatter.name.trim()
      : dirName;

    // Validate name length
    const validatedName = name.length > MAX_SKILL_NAME_LENGTH
      ? name.substring(0, MAX_SKILL_NAME_LENGTH)
      : name;

    // Validate description length
    let description = frontmatter.description?.trim();
    if (description && description.length > MAX_SKILL_DESCRIPTION_LENGTH) {
      description = description.substring(0, MAX_SKILL_DESCRIPTION_LENGTH);
    }

    // Count resources (all files except skill.md)
    const resourceCount = await this.countResources(dirPath);

    const skill: Skill = {
      path: dirPath,
      name: validatedName,
      description,
      source,
      lastModified: dirStats.mtime,
      resourceCount,
    };

    logger.debug(`Skill model created: ${validatedName}`, 'SkillModel', { path: dirPath, source });
    return skill;
  }

  /**
   * Parse YAML frontmatter from skill.md
   */
  private static async parseFrontmatter(
    skillFilePath: string
  ): Promise<{ frontmatter: Partial<SkillFrontmatter>; isValid: boolean }> {
    try {
      const content = await fs.promises.readFile(skillFilePath, 'utf-8');
      const { data } = matter(content);

      const frontmatter: Partial<SkillFrontmatter> = {
        name: data.name,
        description: data.description,
      };

      logger.debug('Frontmatter parsed successfully', 'SkillModel', { skillFilePath });
      return { frontmatter, isValid: true };
    } catch (error) {
      logger.warn('Failed to parse frontmatter, using defaults', 'SkillModel', {
        skillFilePath,
        error: error instanceof Error ? error.message : error,
      });
      return { frontmatter: {}, isValid: false };
    }
  }

  /**
   * Count resource files in skill directory (excluding skill.md)
   */
  private static async countResources(dirPath: string): Promise<number> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const resources = entries.filter(entry => {
        // Exclude skill.md and hidden files
        return entry.isFile() && entry.name !== SKILL_FILE_NAME && !entry.name.startsWith('.');
      });
      return resources.length;
    } catch (error) {
      logger.warn('Failed to count resources', 'SkillModel', { dirPath, error });
      return 0;
    }
  }

  /**
   * Validate skill data
   */
  static validate(skill: Partial<Skill>): skill is Skill {
    if (!skill.path || typeof skill.path !== 'string') {
      throw new Error('Skill path is required and must be a string');
    }

    if (!skill.name || skill.name.trim().length === 0) {
      throw new Error('Skill name is required');
    }

    if (skill.name.length > MAX_SKILL_NAME_LENGTH) {
      throw new Error(`Skill name must be ${MAX_SKILL_NAME_LENGTH} characters or less`);
    }

    if (skill.description && skill.description.length > MAX_SKILL_DESCRIPTION_LENGTH) {
      throw new Error(`Skill description must be ${MAX_SKILL_DESCRIPTION_LENGTH} characters or less`);
    }

    if (!['project', 'global'].includes(skill.source!)) {
      throw new Error('Skill source must be "project" or "global"');
    }

    if (typeof skill.resourceCount !== 'number' || skill.resourceCount < 0) {
      throw new Error('Resource count must be a non-negative number');
    }

    return true;
  }

  /**
   * Generate skill.md template content
   */
  static generateTemplate(name: string): string {
    return `---
name: ${name}
description: ''
---

# ${name}

Skill content goes here...
`;
  }
}
