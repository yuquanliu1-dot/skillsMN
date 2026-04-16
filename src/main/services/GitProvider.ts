/**
 * Git Provider Interface
 *
 * Common interface for Git hosting providers (GitHub, GitLab, etc.)
 */

import { GitHubService } from './GitHubService';
import { GitLabService } from './GitLabService';

export interface ConnectionTestResult {
  valid: boolean;
  repository?: {
    name: string;
    description: string;
    defaultBranch: string;
  };
  error?: string;
}

export interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface SkillMetadata {
  path: string;
  name: string;
  skillFilePath: string;
  directoryCommitSHA: string;
  lastCommitMessage: string;
  lastCommitAuthor: string;
  lastCommitDate: Date | null;
}

/**
 * Git Provider Interface
 *
 * Abstraction layer for different Git hosting providers
 */
export interface GitProvider {
  /**
   * Test connection to a repository
   */
  testConnection(
    owner: string,
    repo: string,
    pat: string,
    instanceUrl?: string
  ): Promise<ConnectionTestResult>;

  /**
   * Get repository tree structure
   */
  getRepoTree(
    owner: string,
    repo: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<TreeItem[]>;

  /**
   * Download directory contents
   */
  downloadDirectory(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<Map<string, string>>;

  /**
   * Get commit history for a directory
   */
  getDirectoryCommits(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<Commit[]>;

  /**
   * Get skills from repository
   */
  getSkills(
    owner: string,
    repo: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<SkillMetadata[]>;

  /**
   * Get skill file content
   */
  getSkillContent(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<string>;

  /**
   * Upload a skill to the repository
   */
  uploadSkill(
    owner: string,
    repo: string,
    skillPath: string,
    skillName: string,
    content: string,
    pat: string,
    branch: string,
    commitMessage?: string,
    instanceUrl?: string
  ): Promise<{ success: boolean; sha?: string; error?: string }>;
}

/**
 * Find skill directories in a repository tree
 *
 * Shared utility used by both GitHub and GitLab services.
 * When a directory is identified as a skill (contains SKILL.md), its subdirectories
 * are not searched for additional skills (prevents nested sub-skills from being listed).
 *
 * @param tree - Array of tree items from the repository
 * @returns Array of skill directory info with path, name, skillFilePath, and depth
 */
export function findSkillDirectories(tree: TreeItem[]): Array<{ path: string; name: string; skillFilePath: string; depth: number }> {
  const skillFiles = tree.filter((item: TreeItem) => {
    return item.type === 'blob' && item.path.endsWith('SKILL.md');
  });

  // Build list of skill directories with their paths
  const allSkillDirs: Array<{ path: string; name: string; skillFilePath: string; depth: number }> = [];
  for (const file of skillFiles) {
    const pathParts = file.path.split('/');
    pathParts.pop();
    const dirPath = pathParts.join('/');
    const depth = pathParts.length;

    allSkillDirs.push({
      path: dirPath,
      name: pathParts[pathParts.length - 1] || 'root',
      skillFilePath: file.path,
      depth,
    });
  }

  // Sort by path length (shorter first) to process parent dirs before children
  allSkillDirs.sort((a, b) => a.path.length - b.path.length);

  // Filter out nested skills (skills that are subdirectories of other skills)
  const topLevelSkills: typeof allSkillDirs = [];
  for (const skillDir of allSkillDirs) {
    const isNested = topLevelSkills.some(parent =>
      skillDir.path.startsWith(parent.path + '/')
    );

    if (!isNested) {
      topLevelSkills.push(skillDir);
    }
  }

  return topLevelSkills;
}

/**
 * Factory function to get the appropriate Git provider service
 */
export function getGitProvider(provider: 'github' | 'gitlab'): typeof GitHubService | typeof GitLabService {
  return provider === 'gitlab' ? GitLabService : GitHubService;
}

