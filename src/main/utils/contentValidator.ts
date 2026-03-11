/**
 * Content Validation Utility
 *
 * Validates AI-generated skill content for valid YAML frontmatter and Markdown structure
 */

import * as yaml from 'js-yaml';
import type { ContentValidationResult, SkillFrontmatter } from '../../shared/types';

/**
 * Validate skill content structure
 *
 * Checks for:
 * 1. Valid YAML frontmatter between --- delimiters
 * 2. Required fields: name, description
 * 3. Valid Markdown body
 */
export function validateSkillContent(content: string): ContentValidationResult {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      valid: false,
      errors: ['Content must be a non-empty string'],
      warnings: [],
    };
  }

  // Extract YAML frontmatter
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!yamlMatch) {
    return {
      isValid: false,
      valid: false,
      errors: ['Missing YAML frontmatter. Skills must start with --- delimiters.'],
      warnings: [],
    };
  }

  const frontmatterText = yamlMatch[1];
  let frontmatter: SkillFrontmatter;

  try {
    frontmatter = yaml.load(frontmatterText) as SkillFrontmatter;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid YAML syntax';
    return {
      isValid: false,
      valid: false,
      errors: [`YAML parsing error: ${message}`],
      warnings: [],
    };
  }

  const errors: string[] = [];

  // Validate required fields
  if (!frontmatter.name || typeof frontmatter.name !== 'string' || frontmatter.name.trim().length === 0) {
    errors.push('YAML frontmatter must include a non-empty "name" field');
  }

  if (!frontmatter.description || typeof frontmatter.description !== 'string' || frontmatter.description.trim().length === 0) {
    errors.push('YAML frontmatter must include a non-empty "description" field');
  }

  // Validate optional fields
  if (frontmatter.version && typeof frontmatter.version !== 'string') {
    errors.push('Version must be a string');
  }

  if (frontmatter.author && typeof frontmatter.author !== 'string') {
    errors.push('Author must be a string');
  }

  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push('Tags must be an array');
  }

  // Check if there's content after frontmatter
  const contentAfterFrontmatter = content.substring(yamlMatch[0].length).trim();
  if (contentAfterFrontmatter.length === 0) {
    errors.push('Skill must include Markdown content after YAML frontmatter');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      valid: false,
      errors,
      warnings: [],
    };
  }

  return {
    isValid: true,
    valid: true,
    frontmatter: frontmatter!,
    errors: [],
    warnings: [],
  };
}

/**
 * Extract skill name from content
 */
export function extractSkillName(content: string): string | null {
  const result = validateSkillContent(content);
  return result.valid && result.frontmatter ? result.frontmatter.name : null;
}
