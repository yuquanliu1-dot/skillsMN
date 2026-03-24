/**
 * Skill Discovery Utility
 *
 * Handles discovery and validation of skill directories in cloned repositories
 */

import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const accessAsync = promisify(fs.access);

const DEFAULT_SKILL_FILE = 'SKILL.md';
const SKILL_FILE_NAMES = ['SKILL.md', 'skill.md']; // Support both cases
const DEFAULT_SOURCE_META_FILE = '.source.json';
const MAX_SEARCH_DEPTH = 3;

/**
 * Skill discovery error codes
 */
export type SkillDiscoveryErrorCode =
  | 'INVALID_SKILL'
  | 'SKILL_NOT_FOUND'
  | 'METADATA_PARSE_ERROR';

/**
 * User-friendly error messages for skill discovery
 */
const ERROR_MESSAGES: Record<SkillDiscoveryErrorCode, { user: string; action: string }> = {
  INVALID_SKILL: {
    user: 'The skill directory is missing a SKILL.md file.',
    action: 'Verify the repository contains a valid skill with SKILL.md'
  },
  SKILL_NOT_FOUND: {
    user: 'Could not find the specified skill in the repository.',
    action: 'Check that the skill ID matches a directory in the repository'
  },
  METADATA_PARSE_ERROR: {
    user: 'Failed to parse skill metadata.',
    action: 'Verify SKILL.md contains valid metadata'
  }
};

/**
 * Skill Discovery class for finding skill directories
 */
export class SkillDiscovery {
  /**
   * Find a skill directory by name (case-insensitive match)
   *
   * @param repoDir - Root directory of cloned repository
   * @param skillName - Skill name to search for
   * @param maxDepth - Maximum recursion depth
   * @returns Skill directory path or undefined if not found
   */
  async findSkillByName(
    repoDir: string,
    skillName: string,
    maxDepth: number = MAX_SEARCH_DEPTH
  ): Promise<string | undefined> {
    try {
      const entries = await readdirAsync(repoDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(repoDir, entry.name);

        // Check if this entry is a directory
        if (entry.isDirectory()) {
          // Case-insensitive match by directory name
          if (entry.name.toLowerCase() === skillName.toLowerCase()) {
            // Check for any valid skill file name
            for (const skillFileName of SKILL_FILE_NAMES) {
              const skillFilePath = path.join(fullPath, skillFileName);
              if (fs.existsSync(skillFilePath)) {
                return fullPath;
              }
            }
          }

          // Recursively search subdirectories
          if (maxDepth > 0) {
            const found = await this.findSkillByName(fullPath, skillName, maxDepth - 1);
            if (found) {
              return found;
            }
          }
        }
      }

      return undefined;
    } catch (error: any) {
      console.warn(`[SkillDiscovery] Error searching for skill ${skillName}:`, error.message);
      return undefined;
    }
  }

  /**
   * Find the first skill directory in the repository
   *
   * @param repoDir - Root directory of cloned repository
   * @param maxDepth - Maximum recursion depth
   * @returns First skill directory path or undefined if not found
   */
  async findFirstSkill(
    repoDir: string,
    maxDepth: number = MAX_SEARCH_DEPTH
  ): Promise<string | undefined> {
    try {
      const entries = await readdirAsync(repoDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(repoDir, entry.name);

        // Check if this entry is a directory
        if (entry.isDirectory()) {
          // Check for any valid skill file name
          for (const skillFileName of SKILL_FILE_NAMES) {
            const skillFilePath = path.join(fullPath, skillFileName);
            if (fs.existsSync(skillFilePath)) {
              return fullPath;
            }
          }

          // Recursively search subdirectories
          if (maxDepth > 0) {
            const subSkill = await this.findFirstSkill(fullPath, maxDepth - 1);
            if (subSkill) {
              return subSkill;
            }
          }
        }
      }

      return undefined;
    } catch (error: any) {
      console.warn(`[SkillDiscovery] Could not find first skill:`, error.message);
      return undefined;
    }
  }

  /**
   * Find a skill by its internal name (from SKILL.md frontmatter)
   *
   * @param repoDir - Root directory of cloned repository
   * @param skillName - Skill name from frontmatter (case-insensitive)
   * @param maxDepth - Maximum recursion depth
   * @returns Skill directory path or undefined if not found
   */
  async findSkillByInternalName(
    repoDir: string,
    skillName: string,
    maxDepth: number = MAX_SEARCH_DEPTH
  ): Promise<string | undefined> {
    try {
      const entries = await readdirAsync(repoDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(repoDir, entry.name);

        // Check if this entry is a directory
        if (entry.isDirectory()) {
          // Try both SKILL.md and skill.md
          for (const skillFileName of SKILL_FILE_NAMES) {
            const skillFilePath = path.join(fullPath, skillFileName);

            // If skill file exists, check its frontmatter name
            if (fs.existsSync(skillFilePath)) {
              try {
                const content = await readFileAsync(skillFilePath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

                if (frontmatterMatch) {
                  const frontmatter = frontmatterMatch[1];
                  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);

                  if (nameMatch) {
                    const internalName = nameMatch[1].trim();
                    // Case-insensitive match
                    if (internalName.toLowerCase() === skillName.toLowerCase()) {
                      console.log(`[SkillDiscovery] Found skill "${skillName}" at ${fullPath} (${skillFileName})`);
                      return fullPath;
                    }
                  }
                }
              } catch (readError) {
                console.warn(`[SkillDiscovery] Could not read ${skillFilePath}:`, readError);
              }
            }
          }

          // Recursively search subdirectories
          if (maxDepth > 0) {
            const found = await this.findSkillByInternalName(fullPath, skillName, maxDepth - 1);
            if (found) {
              return found;
            }
          }
        }
      }

      return undefined;
    } catch (error: any) {
      console.warn(`[SkillDiscovery] Error searching for skill ${skillName}:`, error.message);
      return undefined;
    }
  }

  /**
   * Validate skill structure (directory has SKILL.md or skill.md)
   *
   * @param skillDir - Path to skill directory
   * @returns True if directory contains a valid skill file
   */
  private async validateSkillStructure(skillDir: string): Promise<boolean> {
    for (const skillFileName of SKILL_FILE_NAMES) {
      const skillMdPath = path.join(skillDir, skillFileName);

      try {
        await accessAsync(skillMdPath, fs.constants.R_OK);
        return true;
      } catch {
        // Try next file name
      }
    }
    return false;
  }

  /**
   * Validate skill directory (public method for checking if SKILL.md exists)
   *
   * @param skillDir - Path to skill directory
   * @returns True if directory contains SKILL.md
   */
  async validateSkillDirectory(skillDir: string): Promise<boolean> {
    return this.validateSkillStructure(skillDir);
  }

  /**
   * Check if a skill is already installed
   *
   * @param skillDir - Path to skill directory
   * @returns Installation status with metadata if installed
   */
  async checkInstallationStatus(skillDir: string): Promise<{
    installed: boolean;
    installedAt?: string;
    commitHash?: string;
  }> {
    const sourcePath = path.join(skillDir, DEFAULT_SOURCE_META_FILE);

    try {
      const exists = fs.existsSync(sourcePath);
      if (exists) {
        const content = await readFileAsync(sourcePath, 'utf-8');
        const metadata = JSON.parse(content);

        return {
          installed: true,
          installedAt: metadata.installedAt,
          commitHash: metadata.commitHash
        };
      }

      return { installed: false };
    } catch (error: any) {
      console.warn(`[SkillDiscovery] Could not check installation status:`, error.message);
      return { installed: false };
    }
  }

  /**
   * Write source metadata to a skill directory
   *
   * @param skillDir - Path to skill directory
   * @param sourceMetadata - Source metadata to write
   * @param commitHash - Optional git commit hash for versioning
   */
  async writeSourceMetadata(
    skillDir: string,
    sourceMetadata: any,
    commitHash?: string
  ): Promise<void> {
    const sourcePath = path.join(skillDir, DEFAULT_SOURCE_META_FILE);

    const metadata = {
      ...sourceMetadata,
      installedAt: new Date().toISOString(),
      ...(commitHash && { commitHash })
    };

    try {
      await writeFileAsync(sourcePath, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log(`[SkillDiscovery] Wrote source metadata to ${sourcePath}`);
    } catch (error: any) {
      console.warn(`[SkillDiscovery] Could not write source metadata:`, error.message);
      throw error;
    }
  }

  /**
   * Get user-friendly error action for an error code
   *
   * @param code - Skill discovery error code
   * @returns Actionable guidance string
   */
  getErrorAction(code: SkillDiscoveryErrorCode): string {
    return ERROR_MESSAGES[code]?.action || 'Please try again';
  }
}
