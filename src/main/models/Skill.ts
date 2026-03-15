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
import { SkillSource as SkillSourceType, validateSkillSource } from './SkillSource';
import { SKILL_FILE_NAME, MAX_SKILL_NAME_LENGTH, MAX_SKILL_DESCRIPTION_LENGTH, SOURCE_METADATA_FILE } from '../../shared/constants';

export class SkillModel {
  /**
   * Parse skill directory and extract metadata
   */
  static async fromDirectory(
    dirPath: string,
    source: SkillSource,
    cache?: Map<string, { data: any; timestamp: number }>
  ): Promise<Skill> {
    const skillFilePath = path.join(dirPath, SKILL_FILE_NAME);

    // Check if skill.md exists
    if (!fs.existsSync(skillFilePath)) {
      throw new Error(`Skill file not found: ${skillFilePath}`);
    }

    // Get directory stats for lastModified
    const dirStats = await fs.promises.stat(dirPath);

    // Parse frontmatter (with caching support T127)
    const { frontmatter, isValid } = await this.parseFrontmatter(skillFilePath, cache);

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

    // Extract version, author, and tags from frontmatter
    const version = frontmatter.version?.trim();
    const author = frontmatter.author?.trim();
    const tags = frontmatter.tags?.map(tag => tag.trim()).filter(tag => tag.length > 0);

    // Count resources (all files except skill.md)
    const resourceCount = await this.countResources(dirPath);

    // Read source metadata if available
    let sourceMetadata: SkillSourceType | undefined;
    const metadataPath = path.join(dirPath, SOURCE_METADATA_FILE);
    if (fs.existsSync(metadataPath)) {
      try {
        const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
        const parsedMetadata = JSON.parse(metadataContent);

        if (validateSkillSource(parsedMetadata)) {
          sourceMetadata = parsedMetadata;
          logger.debug('Source metadata loaded', 'SkillModel', { dirPath, type: sourceMetadata.type });
        } else {
          logger.warn('Invalid source metadata format', 'SkillModel', { dirPath });
        }
      } catch (error) {
        logger.warn('Failed to read source metadata', 'SkillModel', { dirPath, error });
      }
    }

    const skill: Skill = {
      path: dirPath,
      name: validatedName,
      description,
      version,
      author,
      tags,
      source,
      lastModified: dirStats.mtime,
      resourceCount,
      sourceMetadata,
    };

    logger.debug(`Skill model created: ${validatedName}`, 'SkillModel', { path: dirPath, source });
    return skill;
  }

  /**
   * Parse YAML frontmatter from skill.md (with caching support T127)
   */
  private static async parseFrontmatter(
    skillFilePath: string,
    cache?: Map<string, { data: any; timestamp: number }>
  ): Promise<{ frontmatter: Partial<SkillFrontmatter>; isValid: boolean }> {
    try {
      // Check cache first (T127)
      if (cache) {
        const cached = cache.get(skillFilePath);
        if (cached) {
          logger.debug('Using cached frontmatter', 'SkillModel', { skillFilePath });
          return { frontmatter: cached.data, isValid: true };
        }
      }

      const content = await fs.promises.readFile(skillFilePath, 'utf-8');
      const { data } = matter(content);

      const frontmatter: Partial<SkillFrontmatter> = {
        name: data.name,
        description: data.description,
        version: data.version,
        author: data.author,
        tags: data.tags,
      };

      // Store in cache (T127)
      if (cache) {
        cache.set(skillFilePath, {
          data: frontmatter,
          timestamp: Date.now()
        });
      }

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
