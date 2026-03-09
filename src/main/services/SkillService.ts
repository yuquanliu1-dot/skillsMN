/**
 * Skill Service
 *
 * Handles skill scanning, creation, reading, updating, and deletion
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PathValidator } from './PathValidator';
import { SkillModel } from '../models/Skill';
import { SkillDirectoryModel } from '../models/SkillDirectory';
import { Configuration, Skill } from '../../shared/types';
import { SKILL_FILE_NAME } from '../../shared/constants';

export class SkillService {
  constructor(
    private pathValidator: PathValidator
  ) {}

  /**
   * List all skills from project and global directories
   */
  async listAllSkills(config: Configuration): Promise<Skill[]> {
    logger.info('Listing all skills', 'SkillService', {
      projectDir: config.projectDirectory,
    });

    const skills: Skill[] = [];

    // Scan global directory
    const globalDir = SkillDirectoryModel.getGlobalDirectory();
    const globalSkills = await this.scanDirectory(globalDir, 'global');
    skills.push(...globalSkills);

    // Scan project directory if configured
    if (config.projectDirectory) {
      const projectDir = SkillDirectoryModel.getProjectDirectory(config.projectDirectory);
      const projectSkills = await this.scanDirectory(projectDir, 'project');
      skills.push(...projectSkills);
    }

    logger.info(`Found ${skills.length} skills`, 'SkillService');
    return skills;
  }

  /**
   * Alias for listAllSkills for backward compatibility
   */
  async listSkills(): Promise<Skill[]> {
    const config = await this.getConfig();
    return this.listAllSkills(config);
  }

  /**
   * Scan a directory for skills
   */
  private async scanDirectory(dirPath: string, source: 'project' | 'global'): Promise<Skill[]> {
    logger.debug(`Scanning directory: ${dirPath}`, 'SkillService', { source });

    try {
      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        logger.debug(`Directory does not exist: ${dirPath}`, 'SkillService');
        return [];
      }

      // Get skill directories
      const skillDirs = await SkillDirectoryModel.getSkillDirectories(dirPath);
      const skills: Skill[] = [];

      // Parse each skill directory
      for (const skillDir of skillDirs) {
        try {
          const skill = await SkillModel.fromDirectory(skillDir, source);
          skills.push(skill);
        } catch (error) {
          logger.warn(`Failed to parse skill: ${skillDir}`, 'SkillService', { error });
          // Continue with other skills
        }
      }

      logger.debug(`Found ${skills.length} skills in ${source} directory`, 'SkillService');
      return skills;
    } catch (error) {
      ErrorHandler.log(error, 'SkillService.scanDirectory');
      return [];
    }
  }

  /**
   * Get a single skill's content
   */
  async getSkill(skillPath: string): Promise<{ metadata: Skill; content: string }> {
    logger.debug(`Getting skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Determine source
    const source = this.pathValidator.getSkillSource(validatedPath);

    // Get skill metadata
    const metadata = await SkillModel.fromDirectory(validatedPath, source);

    // Read skill content
    const skillFile = path.join(validatedPath, SKILL_FILE_NAME);
    const content = await fs.promises.readFile(skillFile, 'utf-8');

    logger.debug(`Skill loaded: ${metadata.name}`, 'SkillService');
    return { metadata, content };
  }

  /**
   * Create a new skill
   */
  async createSkill(name: string, directory: 'project' | 'global'): Promise<Skill> {
    logger.info(`Creating skill: ${name}`, 'SkillService', { directory });

    // Get target directory
    const config = await this.getConfig();
    const targetBase = directory === 'project' && config.projectDirectory
      ? SkillDirectoryModel.getProjectDirectory(config.projectDirectory)
      : SkillDirectoryModel.getGlobalDirectory();

    // Generate kebab-case directory name
    const kebabName = this.toKebabCase(name);
    const skillDir = path.join(targetBase, kebabName);

    // Validate path
    this.pathValidator.validate(skillDir);

    // Check if skill already exists
    if (fs.existsSync(skillDir)) {
      throw new Error(`Skill already exists: ${name} at ${skillDir}`);
    }

    // Create directory
    await fs.promises.mkdir(skillDir, { recursive: true });

    // Create skill.md with template
    const skillFile = path.join(skillDir, SKILL_FILE_NAME);
    const template = SkillModel.generateTemplate(name);
    await fs.promises.writeFile(skillFile, template, 'utf-8');

    // Parse and return created skill
    const skill = await SkillModel.fromDirectory(skillDir, directory);

    logger.info(`Skill created: ${name}`, 'SkillService', { path: skillDir });
    return skill;
  }

  /**
   * Update a skill's content
   */
  async updateSkill(skillPath: string, content: string): Promise<Skill> {
    logger.debug(`Updating skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Write content
    const skillFile = path.join(validatedPath, SKILL_FILE_NAME);
    await fs.promises.writeFile(skillFile, content, 'utf-8');

    // Parse and return updated skill
    const source = this.pathValidator.getSkillSource(validatedPath);
    const skill = await SkillModel.fromDirectory(validatedPath, source);

    logger.debug(`Skill updated: ${skill.name}`, 'SkillService');
    return skill;
  }

  /**
   * Delete a skill (move to recycle bin)
   */
  async deleteSkill(skillPath: string): Promise<void> {
    logger.info(`Deleting skill: ${skillPath}`, 'SkillService');

    // Validate path
    const validatedPath = this.pathValidator.validate(skillPath);

    // Move to recycle bin using dynamic import for ES module
    const { default: trash } = await import('trash');
    await trash(validatedPath);

    logger.info(`Skill moved to recycle bin: ${skillPath}`, 'SkillService');
  }

  /**
   * Open skill folder in file explorer
   */
  async openFolder(skillPath: string): Promise<void> {
    const { shell } = require('electron');
    const validatedPath = this.pathValidator.validate(skillPath);
    await shell.openPath(validatedPath);
    logger.debug(`Opened folder: ${validatedPath}`, 'SkillService');
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get configuration (temporary - should use ConfigService)
   */
  private async getConfig(): Promise<Configuration> {
    // This should be injected or retrieved from ConfigService
    // For now, return a minimal config
    return {
      projectDirectory: null,
      defaultInstallDirectory: 'project',
      editorDefaultMode: 'edit',
      autoRefresh: true,
    };
  }
}
