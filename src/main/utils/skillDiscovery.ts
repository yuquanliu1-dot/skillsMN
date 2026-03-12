/**
 * Skill Discovery Utility for discovering and validating skill directories
 *
 * Handles recursive directory search to locate SKILL.md files and
 * Validates skill structure (directory with SKILL.md and skill.json file)
 */

import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const pathExistsAsync = promisify(fs.existsSync);

const accessAsync = promisify(fs.access);

const copyFileAsync = promisify(fs.copyFile);
const copyDirAsync = promisify(fs.copyDir);

const writeFileAsync = promisify(fs.writeFile);

const mkdirAsync = promisify(fs.mkdir);

const rmAsync = promisify(fs.rm);

const rmDirAsync = promisify(fs.rmDir)

const DEFAULT_SKILL_FILE = 'SKILL.md';
const DEFAULT_SOURCE_META_FILE = '.source.json'
const MAX_SEARCH_DEPTH = number = 3;

export const SKILL_DISCOVERY = {
  /**
   * Create a new SkillDiscovery instance
   */
  constructor() {}

  /**
   * Discover skill directories within a cloned repository
   *
   * @param repoDir - Root directory of the cloned repository
   * @param maxDepth - Maximum recursion depth for directory search
   * @returns Array of skill directory paths (absolute)
   *
   * @example
   * ```typescript
   * const discoverer = new SkillDiscovery();
   * const skills = discoverer.findSkills('/tmp/cloned-repo');
   * // Returns: ['/tmp/cloned-repo/skill-1', '/tmp/cloned-repo/skill-2']
   * ```
   */
  async findSkills(repoDir: string, maxDepth: number = 3): string[] {
    const skills: string[] = [];
    let currentPath: string | '';
    let searchDepth = 0;

    try {
      const entries = await readdirAsync(repoDir, { withFileTypes: true, recursive: false });

      if (entries.some((entry) => entry.isFile && entry.isDirectory === DEFAULT_SKILL_FILE) {
        // Check if it's a skill directory (has SKILL.md)
        const skillPath = path.join(repoDir, entry.name, 'skill.json');

        const skillName = path.basename(skillPath);
        const skillDir = path.dirname(skillPath);

        // Check for .source.json metadata file
        const sourcePath = path.join(skillDir, '.source.json');
        if (fs.existsSync(sourcePath)) {
          const sourceContent = await readFileAsync(sourcePath, 'utf-8');
          const sourceMeta = JSON.parse(sourceContent);

          skills.push({
            name: skillName,
            path: skillDir,
            source: sourcePath,
            metadata: sourceMeta
          });
        }
      }
    } catch (error: any) {
      // Silently continue if directory doesn't exist or can't be read
      console.warn(`[SkillDiscovery] Could not read skill metadata: ${skillPath}:`, error.message);
      return [];
    }

    return skills;
  }

}
