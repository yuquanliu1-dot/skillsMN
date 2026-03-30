/**
 * GitLab Service
 *
 * Handles GitLab API interactions for private skill repositories
 * Supports both GitLab.com and self-hosted GitLab instances
 */

import fetch, { RequestInit } from 'node-fetch';
import https from 'https';
import { logger } from '../utils/Logger';
import { retryWithBackoff } from '../utils/retry';
import type { TreeItem, Commit, SkillMetadata } from './GitProvider';

// HTTPS agent that ignores self-signed certificates for self-hosted GitLab instances
const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Check if URL is a private/self-hosted instance (not gitlab.com)
const isInsecureInstance = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Allow insecure connections for non-gitlab.com instances (self-hosted, internal IPs, etc.)
    return !parsedUrl.hostname.endsWith('gitlab.com');
  } catch {
    return true;
  }
};

// Get appropriate fetch options with HTTPS agent if needed
const getFetchOptions = (url: string, options: RequestInit = {}): RequestInit => {
  if (url.startsWith('https://') && isInsecureInstance(url)) {
    return { ...options, agent: insecureAgent };
  }
  return options;
};

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

      const response = await fetch(url, getFetchOptions(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      }));

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

      const response = await fetch(url, getFetchOptions(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      }));

      if (!response.ok) {
        // Handle 404 gracefully - repository may be empty or branch doesn't exist
        if (response.status === 404) {
          logger.debug('GitLab repository tree not found (404) - repository may be empty or branch does not exist', 'GitLabService', { owner, repo, branch });
          return [];
        }
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
      return item.type === 'blob' && item.path.endsWith('SKILL.md');
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

    const response = await fetch(url, getFetchOptions(url, {
      headers: {
        'Private-Token': pat,
        'User-Agent': 'skillsMN-App',
      },
    }));

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

      const response = await fetch(url, getFetchOptions(url, {
        headers: {
          'Private-Token': pat,
          'User-Agent': 'skillsMN-App',
        },
      }));

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

  /**
   * Upload a skill to a private GitLab repository
   * Creates or updates the SKILL.md file and commits it to the repository
   *
   * @param owner - Repository owner (namespace)
   * @param repo - Repository name
   * @param skillDirName - Directory name for the skill
   * @param skillName - Name of the skill (for commit message)
   * @param content - Skill content (markdown with YAML frontmatter)
   * @param pat - Personal Access Token with api scope
   * @param branch - Branch to commit to (default: 'main')
   * @param commitMessage - Optional custom commit message
   * @param instanceUrl - GitLab instance URL (default: 'https://gitlab.com')
   * @returns Object with success status and SHA or error message
   */
  static async uploadSkill(
    owner: string,
    repo: string,
    skillDirName: string,
    skillName: string,
    content: string,
    pat: string,
    branch: string = 'main',
    commitMessage?: string,
    instanceUrl?: string
  ): Promise<{ success: boolean; sha?: string; error?: string }> {
    const baseUrl = instanceUrl || 'https://gitlab.com';
    const fullPath = skillDirName.startsWith('/') ? `${skillDirName}/SKILL.md` : `${skillDirName}/SKILL.md`;
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

    const message = commitMessage || `Update skill: ${skillName}`;

    // Helper function to create abort controller with timeout
    const createTimeoutController = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      return controller;
    };

    // Helper function to fetch with timeout and SSL support
    const fetchWithTimeout = async (url: string, options: any): Promise<any> => {
      const controller = createTimeoutController();
      return fetch(url, getFetchOptions(url, { ...options, signal: controller.signal }));
    };

    try {
      logger.info('Uploading skill to GitLab', 'GitLabService', {
        baseUrl,
        projectId,
        fullPath,
        branch,
        skillName,
      });

      // Try to update the file first
      const response = await retryWithBackoff(
        async () => {
          const res = await fetchWithTimeout(
            `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(fullPath)}`,
            {
              method: 'PUT',
              headers: {
                'PRIVATE-TOKEN': pat,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                branch,
                content,
                commit_message: message,
              }),
            }
          );
          // Check for rate limit
          if (res.status === 429) {
            const error: any = new Error('Rate limit exceeded');
            error.status = 429;
            throw error;
          }
          return res;
        },
        { maxAttempts: 3, initialDelay: 2000 }
      );

      if (!response.ok) {
        // Try creating the file if update fails (file might not exist)
        if (response.status === 404) {
          const createResponse = await retryWithBackoff(
            async () => {
              const res = await fetchWithTimeout(
                `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(fullPath)}`,
                {
                  method: 'POST',
                  headers: {
                    'PRIVATE-TOKEN': pat,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    branch,
                    content,
                    commit_message: `Add skill: ${skillName}`,
                  }),
                }
              );
              if (res.status === 429) {
                const error: any = new Error('Rate limit exceeded');
                error.status = 429;
                throw error;
              }
              return res;
            },
            { maxAttempts: 3, initialDelay: 2000 }
          );

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return {
              success: false,
              error: errorData.message || `GitLab API error: ${createResponse.status}`,
            };
          }

          const data = await createResponse.json();
          return {
            success: true,
            sha: data.commit_id,
          };
        }

        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || `GitLab API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        sha: data.commit_id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload skill';

      // Provide more helpful error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        userMessage = 'Request timed out. Please check your network connection and try again.';
      } else if (errorMessage.includes('socket hang up')) {
        userMessage = 'Connection was closed unexpectedly. Please try again.';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      }

      logger.error('GitLab upload error', 'GitLabService', {
        error: errorMessage,
        userMessage
      });

      return {
        success: false,
        error: userMessage,
      };
    }
  }

  /**
   * Upload all files from a skill directory to a private GitLab repository
   * Creates or updates each file and commits them to the repository
   *
   * @param owner - Repository owner/namespace
   * @param repo - Repository name
   * @param skillDirName - Directory name for the skill
   * @param skillName - Name of the skill (for commit message)
   * @param files - Array of files with relative path and content
   * @param pat - Personal Access Token with api scope
   * @param branch - Branch to commit to (default: 'main')
   * @param commitMessage - Optional custom commit message
   * @param instanceUrl - Optional instance URL (for self-hosted GitLab)
   * @returns Object with success status and uploaded file count or error message
   */
  static async uploadSkillDirectory(
    owner: string,
    repo: string,
    skillDirName: string,
    skillName: string,
    files: Array<{ relativePath: string; content: string }>,
    pat: string,
    branch: string = 'main',
    commitMessage?: string,
    instanceUrl?: string
  ): Promise<{ success: boolean; uploadedCount?: number; commitSha?: string; errors?: string[]; error?: string }> {
    const baseUrl = instanceUrl || 'https://gitlab.com';
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
    const errors: string[] = [];
    let uploadedCount = 0;

    // Helper function to create abort controller with timeout
    const createTimeoutController = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      return controller;
    };

    // Helper function to fetch with timeout and SSL support
    const fetchWithTimeout = async (url: string, options: any): Promise<any> => {
      const controller = createTimeoutController();
      return fetch(url, getFetchOptions(url, { ...options, signal: controller.signal }));
    };

    logger.info('GitLab directory upload parameters', 'GitLabService', {
      baseUrl,
      projectId,
      skillDirName,
      branch,
      skillName,
      fileCount: files.length,
    });

    try {
      // Upload each file
      for (const file of files) {
        // Construct the full path in the repository
        const relativePath = file.relativePath.startsWith('/')
          ? file.relativePath.slice(1)
          : file.relativePath;
        const fullPath = `${skillDirName}/${relativePath}`;
        const encodedPath = encodeURIComponent(fullPath);

        logger.debug(`Uploading file to GitLab`, 'GitLabService', {
          relativePath,
          fullPath,
          encodedPath,
        });

        try {
          const message = commitMessage || `Update ${relativePath} in ${skillName}`;

          // Try to update the file first
          const response = await retryWithBackoff(
            async () => {
              const res = await fetchWithTimeout(
                `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(fullPath)}`,
                {
                  method: 'PUT',
                  headers: {
                    'PRIVATE-TOKEN': pat,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    branch,
                    content: file.content,
                    commit_message: message,
                  }),
                }
              );
              if (res.status === 429) {
                const error: any = new Error('Rate limit exceeded');
                error.status = 429;
                throw error;
              }
              return res;
            },
            { maxAttempts: 3, initialDelay: 2000 }
          );

          if (!response.ok) {
            // Get error response to check if file doesn't exist
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch {
              // Ignore JSON parse errors
            }

            // Try creating the file if update fails (file might not exist)
            // GitLab returns 400 with "A file with this name doesn't exist" for missing files
            const isFileNotFoundError = response.status === 404 ||
              (response.status === 400 && errorData.message?.includes("doesn't exist"));

            if (isFileNotFoundError) {
              const createResponse = await retryWithBackoff(
                async () => {
                  const res = await fetchWithTimeout(
                    `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(fullPath)}`,
                    {
                      method: 'POST',
                      headers: {
                        'PRIVATE-TOKEN': pat,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        branch,
                        content: file.content,
                        commit_message: `Add ${relativePath} to ${skillName}`,
                      }),
                    }
                  );
                  if (res.status === 429) {
                    const error: any = new Error('Rate limit exceeded');
                    error.status = 429;
                    throw error;
                  }
                  return res;
                },
                { maxAttempts: 3, initialDelay: 2000 }
              );

              if (createResponse.ok) {
                uploadedCount++;
                logger.debug(`Created file: ${fullPath}`, 'GitLabService');
              } else {
                let createErrorData: any = {};
                try {
                  createErrorData = await createResponse.json();
                } catch {
                  // Ignore JSON parse errors
                }
                errors.push(`Failed to create ${relativePath}: ${createErrorData.message || 'Unknown error'}`);
              }
            } else {
              errors.push(`Failed to update ${relativePath}: ${errorData.message || 'Unknown error'}`);
            }
          } else {
            uploadedCount++;
            logger.debug(`Updated file: ${fullPath}`, 'GitLabService');
          }
        } catch (fileError) {
          const errorMsg = fileError instanceof Error ? fileError.message : 'Unknown error';
          errors.push(`Failed to upload ${relativePath}: ${errorMsg}`);
        }
      }

      // Get the latest commit SHA after upload
      let commitSha: string | undefined;
      try {
        const commitResponse = await fetchWithTimeout(
          `${baseUrl}/api/v4/projects/${projectId}/repository/commits?ref_name=${branch}&per_page=1`,
          {
            method: 'GET',
            headers: {
              'PRIVATE-TOKEN': pat,
              'Content-Type': 'application/json',
            },
          }
        );

        if (commitResponse.ok) {
          const commits = await commitResponse.json();
          if (commits && commits.length > 0) {
            commitSha = commits[0].id;
            logger.debug('Retrieved latest commit SHA after upload', 'GitLabService', { commitSha });
          }
        }
      } catch (error) {
        logger.warn('Failed to retrieve commit SHA after upload', 'GitLabService', { error });
      }

      if (uploadedCount === files.length) {
        logger.info('All files uploaded successfully', 'GitLabService', {
          uploadedCount,
          totalFiles: files.length,
          commitSha,
        });
        return { success: true, uploadedCount, commitSha };
      } else if (uploadedCount > 0) {
        logger.warn('Partial upload completed', 'GitLabService', {
          uploadedCount,
          totalFiles: files.length,
          errors,
          commitSha,
        });
        return {
          success: true,
          uploadedCount,
          commitSha,
          errors: errors.length > 0 ? errors : undefined,
        };
      } else {
        logger.error('All file uploads failed', 'GitLabService', { errors });
        return {
          success: false,
          error: 'All file uploads failed',
          errors,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload skill directory';
      logger.error('GitLab directory upload error', 'GitLabService', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
