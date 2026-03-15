/**
 * GitLab Service
 *
 * Handles GitLab API interactions for private skill repositories
 * Supports both GitLab.com and self-hosted GitLab instances
 */

import fetch from 'node-fetch';
import { logger } from '../utils/Logger';
import type { TreeItem, Commit, SkillMetadata } from './GitProvider';

/**
 * GitLab API Service
 */
export class GitLabService {
  /**
   * Get GitLab API base URL
   */
  private static getApiBaseUrl(instanceUrl?: string): string {
    const baseUrl = instanceUrl || 'https://gitlab.com';
    return `${baseUrl}/api/v4`;
  }

  /**
   * Get project ID (URL-encoded owner/repo)
   */
  private static getProjectId(owner: string, repo: string): string {
    return encodeURIComponent(`${owner}/${repo}`);
  }

  /**
   * Test connection to GitLab repository
   */
  static async testConnection(
    owner: string,
    repo: string,
    pat: string,
    instanceUrl?: string
  ): Promise<{
    valid: boolean;
    repository?: {
      name: string;
      description: string;
      defaultBranch: string;
    };
    error?: string;
  }> {
    try {
      const apiBaseUrl = this.getApiBaseUrl(instanceUrl);
      const projectId = this.getProjectId(owner, repo);
      const url = `${apiBaseUrl}/projects/${projectId}`;

      const response = await fetch(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            valid: false,
            error: 'Authentication failed. Please check your GitLab Personal Access Token.',
          };
        } else if (response.status === 404) {
          return {
            valid: false,
            error: 'Repository not found. Please check the URL.',
          };
        } else if (response.status === 403) {
          return {
            valid: false,
            error: 'Access forbidden. Please check your PAT permissions (needs read_api scope).',
          };
        }
        return {
          valid: false,
          error: `GitLab API error: ${response.status} ${response.statusText}`,
        };
      }

      const data: any = await response.json();
      return {
        valid: true,
        repository: {
          name: data.name,
          description: data.description || '',
          defaultBranch: data.default_branch || 'main',
        },
      };
    } catch (error) {
      logger.error('Failed to test GitLab connection', 'GitLabService', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get repository tree
   */
  static async getRepoTree(
    owner: string,
    repo: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<TreeItem[]> {
    try {
      const apiBaseUrl = this.getApiBaseUrl(instanceUrl);
      const projectId = this.getProjectId(owner, repo);
      const url = `${apiBaseUrl}/projects/${projectId}/repository/tree?recursive=1&ref=${encodeURIComponent(branch)}`;

      const response = await fetch(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.status}`);
      }

      const data: any[] = await response.json();
      return data.map(item => ({
        path: item.path,
        type: item.type === 'blob' ? 'blob' : 'tree',
        sha: item.id,
      }));
    } catch (error) {
      logger.error('Failed to get GitLab repository tree', 'GitLabService', error);
      throw error;
    }
  }

  /**
   * Find skill directories in repository tree
   */
  private static findSkillDirectories(tree: TreeItem[]): any[] {
    const skillFiles = tree.filter((item: TreeItem) => {
      return item.type === 'blob' && item.path.endsWith('skill.md');
    });

    const skillDirectories = skillFiles.map((file: TreeItem) => {
      const pathParts = file.path.split('/');
      pathParts.pop();
      const dirPath = pathParts.join('/');
      const depth = pathParts.length;

      return {
        path: dirPath,
        name: pathParts[pathParts.length - 1] || 'root',
        skillFilePath: file.path,
        depth,
      };
    });

    return skillDirectories.filter((dir: any) => dir.depth <= 5);
  }

  /**
   * Download directory contents
   */
  static async downloadDirectory(
    owner: string,
    repo: string,
    directoryPath: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<Map<string, string>> {
    try {
      const tree = await this.getRepoTree(owner, repo, pat, branch, instanceUrl);

      const directoryFiles = tree.filter((item: TreeItem) => {
        return item.type === 'blob' && item.path.startsWith(directoryPath);
      });

      const files = new Map<string, string>();

      await Promise.all(
        directoryFiles.map(async (file: TreeItem) => {
          const content = await this.getFileContent(
            owner,
            repo,
            file.path,
            pat,
            branch,
            instanceUrl
          );
          files.set(file.path, content);
        })
      );

      logger.info('Downloaded directory from GitLab', 'GitLabService', {
        owner,
        repo,
        directoryPath,
        fileCount: files.size,
      });

      return files;
    } catch (error) {
      logger.error('Failed to download GitLab directory', 'GitLabService', error);
      throw error;
    }
  }

  /**
   * Get file content
   */
  private static async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<string> {
    const apiBaseUrl = this.getApiBaseUrl(instanceUrl);
    const projectId = this.getProjectId(owner, repo);
    const url = `${apiBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
      headers: {
        'Private-Token': pat,
        'User-Agent': 'skillsMN-App',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file ${filePath}: ${response.status}`);
    }

    const data: any = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  }

  /**
   * Get directory commit history
   */
  static async getDirectoryCommits(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<Commit[]> {
    try {
      const apiBaseUrl = this.getApiBaseUrl(instanceUrl);
      const projectId = this.getProjectId(owner, repo);
      const url = `${apiBaseUrl}/projects/${projectId}/repository/commits?path=${encodeURIComponent(path)}&ref_name=${encodeURIComponent(branch)}&per_page=10`;

      const response = await fetch(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      });

      if (!response.ok) {
        logger.warn(`Failed to fetch commits for ${path}`, 'GitLabService', {
          status: response.status,
        });
        return [];
      }

      const data: any[] = await response.json();
      return data.map(commit => ({
        sha: commit.id,
        message: commit.message || '',
        author: commit.author_name || '',
        date: new Date(commit.created_at),
      }));
    } catch (error) {
      logger.error('Failed to get GitLab directory commits', 'GitLabService', error);
      return [];
    }
  }

  /**
   * Get skills from repository
   */
  static async getSkills(
    owner: string,
    repo: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<SkillMetadata[]> {
    try {
      const tree = await this.getRepoTree(owner, repo, pat, branch, instanceUrl);
      const skillDirs = this.findSkillDirectories(tree);

      // Fetch commit history for each skill directory in parallel
      const skillsWithMetadata = await Promise.all(
        skillDirs.map(async (dir: any) => {
          const commits = await this.getDirectoryCommits(
            owner,
            repo,
            dir.path,
            pat,
            branch,
            instanceUrl
          );
          const latestCommit = commits[0];

          return {
            path: dir.path,
            name: dir.name,
            skillFilePath: dir.skillFilePath,
            directoryCommitSHA: latestCommit?.sha || '',
            lastCommitMessage: latestCommit?.message || '',
            lastCommitAuthor: latestCommit?.author || '',
            lastCommitDate: latestCommit?.date || null,
          };
        })
      );

      logger.info('Retrieved GitLab skills', 'GitLabService', {
        owner,
        repo,
        count: skillsWithMetadata.length,
      });

      return skillsWithMetadata;
    } catch (error) {
      logger.error('Failed to get GitLab skills', 'GitLabService', error);
      throw error;
    }
  }

  /**
   * Get skill file content
   */
  static async getSkillContent(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    branch: string,
    instanceUrl?: string
  ): Promise<string> {
    return this.getFileContent(owner, repo, path, pat, branch, instanceUrl);
  }
}
