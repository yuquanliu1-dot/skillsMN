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
 * Factory function to get the appropriate Git provider service
 */
export function getGitProvider(provider: 'github' | 'gitlab'): typeof GitHubService | typeof GitLabService {
  return provider === 'gitlab' ? GitLabService : GitHubService;
}

