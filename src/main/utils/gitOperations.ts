/**
 * Git Operations Utility
 *
 * Handles git operations for cloning skill repositories
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import type { ProxyConfig } from '../../shared/types';

const execAsync = promisify(exec);

// Timeout for git clone operations (60 seconds)
const CLONE_TIMEOUT_MS = 60000;

// Proxy settings from application config
let proxyConfig: ProxyConfig | null = null;

// Cached system proxy settings from Windows registry
let cachedSystemProxySettings: { httpProxy?: string; httpsProxy?: string } | null = null;
let systemProxyLoadAttempted = false;

/**
 * Load system proxy settings from Windows registry
 * Uses get-proxy-settings package to read actual system proxy configuration
 */
async function loadSystemProxySettings(): Promise<void> {
  if (systemProxyLoadAttempted) return;
  systemProxyLoadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getProxySettings } = require('get-proxy-settings');
    const settings = await getProxySettings();

    if (settings?.https) {
      cachedSystemProxySettings = {
        httpsProxy: `http://${settings.https.host}:${settings.https.port}`,
        httpProxy: settings.http ? `http://${settings.http.host}:${settings.http.port}` : undefined,
      };
      console.log('[GitOperations] Loaded system proxy settings from Windows registry', {
        httpsProxy: cachedSystemProxySettings.httpsProxy,
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    } else if (settings?.http) {
      cachedSystemProxySettings = {
        httpProxy: `http://${settings.http.host}:${settings.http.port}`,
      };
      console.log('[GitOperations] Loaded HTTP system proxy settings from Windows registry', {
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    }
  } catch (error) {
    console.warn('[GitOperations] Failed to load system proxy settings from Windows registry', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Set proxy configuration for git operations
 */
export function setGitProxyConfig(config: ProxyConfig | undefined): void {
  proxyConfig = config || null;

  // Reset cached system proxy when settings change
  if (config?.enabled && config?.type === 'system') {
    // Clear cache to force reload
    cachedSystemProxySettings = null;
    systemProxyLoadAttempted = false;
    // Immediately preload system proxy settings (don't wait for first git command)
    loadSystemProxySettings().catch(() => {});
  }
}

/**
 * Get environment variables for git commands based on proxy settings
 */
function getGitEnv(): NodeJS.ProcessEnv {
  const baseEnv = { ...process.env };

  // If proxy is not enabled, remove proxy env vars to prevent git from using them
  if (!proxyConfig?.enabled) {
    delete baseEnv.HTTPS_PROXY;
    delete baseEnv.https_proxy;
    delete baseEnv.HTTP_PROXY;
    delete baseEnv.http_proxy;
    return baseEnv;
  }

  // If using custom proxy, set the custom URL
  if (proxyConfig.type === 'custom' && proxyConfig.customUrl) {
    baseEnv.HTTPS_PROXY = proxyConfig.customUrl;
    baseEnv.https_proxy = proxyConfig.customUrl;
    baseEnv.HTTP_PROXY = proxyConfig.customUrl;
    baseEnv.http_proxy = proxyConfig.customUrl;
    return baseEnv;
  }

  // If using system proxy, check Windows registry cache first, then fallback to env vars
  if (proxyConfig.type === 'system') {
    // First check cached Windows registry proxy settings
    if (cachedSystemProxySettings) {
      if (cachedSystemProxySettings.httpsProxy) {
        baseEnv.HTTPS_PROXY = cachedSystemProxySettings.httpsProxy;
        baseEnv.https_proxy = cachedSystemProxySettings.httpsProxy;
      }
      if (cachedSystemProxySettings.httpProxy) {
        baseEnv.HTTP_PROXY = cachedSystemProxySettings.httpProxy;
        baseEnv.http_proxy = cachedSystemProxySettings.httpProxy;
      }
      console.log('[GitOperations] Using Windows system proxy for git command', {
        httpsProxy: cachedSystemProxySettings.httpsProxy,
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
      return baseEnv;
    }

    // Trigger async load for next time (don't block current request)
    if (!systemProxyLoadAttempted) {
      loadSystemProxySettings().catch(() => {});
    }

    // Fallback to existing environment variables
    return baseEnv;
  }

  return baseEnv;
}

/**
 * Result of a shallow clone operation
 */
export interface CloneResult {
  /** Whether the clone was successful */
  success: boolean;
  /** Path to the cloned directory */
  directory: string;
  /** Git commit hash (if successful) */
  commitHash?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: GitErrorCode;
}

/**
 * Git error codes
 */
export type GitErrorCode =
  | 'GIT_NOT_FOUND'
  | 'REPO_NOT_FOUND'
  | 'PRIVATE_REPO'
  | 'NETWORK_ERROR'
  | 'DISK_SPACE_ERROR'
  | 'CLONE_FAILED';

/**
 * User-friendly error messages with actionable guidance
 */
export const ERROR_MESSAGES: Record<GitErrorCode, { user: string; action: string }> = {
  GIT_NOT_FOUND: {
    user: 'Git is required but not installed. Please install Git and restart the application.',
    action: 'Install Git from https://git-scm.com'
  },
  REPO_NOT_FOUND: {
    user: 'This skill repository could not be found. It may have been moved or deleted.',
    action: 'Try searching for an alternative skill'
  },
  PRIVATE_REPO: {
    user: 'This skill is in a private repository and cannot be installed.',
    action: 'Contact the skill author or search for public alternatives'
  },
  NETWORK_ERROR: {
    user: 'Unable to connect to GitHub. Please check your internet connection.',
    action: 'Check your network and try again'
  },
  DISK_SPACE_ERROR: {
    user: 'Not enough disk space to install this skill.',
    action: 'Free up disk space and try again'
  },
  CLONE_FAILED: {
    user: 'Failed to download the skill repository.',
    action: 'Please try again or search for an alternative skill'
  }
};

/**
 * Git Operations class for cloning skill repositories
 */
export class GitOperations {
  /**
   * Check if git is available in the system PATH
   *
   * @returns True if git is installed and accessible
   */
  async checkGitAvailable(): Promise<boolean> {
    try {
      await execAsync('git --version', { timeout: 5000, env: getGitEnv() });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform a shallow clone of a GitHub repository
   *
   * @param source - GitHub repository path (format: "org/repo")
   * @param targetDir - Local directory to clone into
   * @param onProgress - Optional callback for progress updates
   * @returns CloneResult with success status and details
   *
   * @example
   * ```typescript
   * const gitOps = new GitOperations();
   * const result = await gitOps.shallowClone('org/repo', '/tmp/skill-clone');
   *
   * if (result.success) {
   *   console.log('Cloned to:', result.directory);
   *   console.log('Commit:', result.commitHash);
   * }
   * ```
   */
  async shallowClone(
    source: string,
    targetDir: string,
    onProgress?: (message: string) => void
  ): Promise<CloneResult> {
    // Validate source format
    if (!this.validateSource(source)) {
      return {
        success: false,
        directory: targetDir,
        error: `Invalid source format: ${source}. Expected "org/repo" format.`,
        errorCode: 'CLONE_FAILED'
      };
    }

    const repoUrl = `https://github.com/${source}.git`;

    onProgress?.(`Cloning repository from ${repoUrl}...`);

    try {
      // Check git availability
      const gitAvailable = await this.checkGitAvailable();
      if (!gitAvailable) {
        return {
          success: false,
          directory: targetDir,
          error: ERROR_MESSAGES.GIT_NOT_FOUND.user,
          errorCode: 'GIT_NOT_FOUND'
        };
      }

      // Execute shallow clone
      const { stdout, stderr } = await execAsync(
        `git clone --depth 1 --single-branch "${repoUrl}" "${targetDir}"`,
        {
          windowsHide: true,
          env: getGitEnv(),
          timeout: CLONE_TIMEOUT_MS,
        }
      );

      onProgress?.('Repository cloned successfully');

      // Get commit hash
      const commitHash = await this.getCommitHash(targetDir);

      return {
        success: true,
        directory: targetDir,
        commitHash
      };

    } catch (error: any) {
      const errorMessage = error.message || error.stderr || String(error);
      const stderr = error.stderr || '';
      console.error(`[GitOperations] Clone failed for ${source}`);
      console.error(`[GitOperations] Error message: ${errorMessage}`);
      console.error(`[GitOperations] Stderr: ${stderr}`);

      const parsed = this.parseGitError(errorMessage);

      onProgress?.(`Clone failed: ${parsed.message}`);

      return {
        success: false,
        directory: targetDir,
        error: parsed.message,
        errorCode: parsed.code
      };
    }
  }

  /**
   * Get the current commit hash from a repository
   *
   * @param repoDir - Path to git repository
   * @returns Commit hash or 'unknown' if unable to determine
   */
  private async getCommitHash(repoDir: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: repoDir,
        timeout: 5000,
        env: getGitEnv()
      });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Validate source format (org/repo or user/repo)
   *
   * @param source - Source string to validate
   * @returns True if source matches expected format
   */
  private validateSource(source: string): boolean {
    return /^[^/]+\/[^/]+$/.test(source);
  }

  /**
   * Parse git error messages into user-friendly format with error codes
   *
   * @param errorMessage - Raw git error message
   * @returns Object with user-friendly message and error code
   */
  private parseGitError(errorMessage: string): { message: string; code: GitErrorCode } {
    const lowerError = errorMessage.toLowerCase();

    // Git not found
    if (
      lowerError.includes('git: not found') ||
      lowerError.includes("'git' is not recognized") ||
      lowerError.includes('git is not recognized') ||
      lowerError.includes('command not found')
    ) {
      return {
        message: ERROR_MESSAGES.GIT_NOT_FOUND.user,
        code: 'GIT_NOT_FOUND'
      };
    }

    // Repository not found
    if (
      lowerError.includes('repository not found') ||
      lowerError.includes('could not create work tree') ||
      lowerError.includes('fatal: repository') ||
      lowerError.includes('404: repository')
    ) {
      return {
        message: ERROR_MESSAGES.REPO_NOT_FOUND.user,
        code: 'REPO_NOT_FOUND'
      };
    }

    // Private repository
    if (
      lowerError.includes('authentication failed') ||
      lowerError.includes('could not read username') ||
      lowerError.includes('fatal: could not read') ||
      lowerError.includes('403') ||
      lowerError.includes('permission denied')
    ) {
      return {
        message: ERROR_MESSAGES.PRIVATE_REPO.user,
        code: 'PRIVATE_REPO'
      };
    }

    // Network error
    if (
      lowerError.includes('connection timed out') ||
      lowerError.includes('could not resolve host') ||
      lowerError.includes('network is unreachable') ||
      lowerError.includes('failed to connect')
    ) {
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR.user,
        code: 'NETWORK_ERROR'
      };
    }

    // Clone timeout (exec killed after timeout)
    if (lowerError.includes('sigterm') || lowerError.includes('signal')) {
      return {
        message: 'Connection timed out. The server may be unreachable or responding too slowly. Please check the server address and network connection.',
        code: 'NETWORK_ERROR'
      };
    }

    // Disk space
    if (lowerError.includes('no space left on device') || lowerError.includes('disk full')) {
      return {
        message: ERROR_MESSAGES.DISK_SPACE_ERROR.user,
        code: 'DISK_SPACE_ERROR'
      };
    }

    // Generic clone failure
    return {
      message: ERROR_MESSAGES.CLONE_FAILED.user,
      code: 'CLONE_FAILED'
    };
  }

  /**
   * Get user-friendly error action for an error code
   *
   * @param code - Git error code
   * @returns Actionable guidance string
   */
  getErrorAction(code: GitErrorCode): string {
    return ERROR_MESSAGES[code]?.action || 'Please try again';
  }
}

/**
 * Check if a local git repository has unpushed commits
 * Compares local HEAD with remote tracking branch
 *
 * @param repoDir - Path to the local git repository
 * @returns Object with hasUnpushedCommits flag and count of unpushed commits
 */
export async function hasUnpushedCommits(repoDir: string): Promise<{ hasUnpushed: boolean; count: number }> {
  try {
    // Get the current branch name
    const { stdout: branchName } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoDir,
      timeout: 5000,
      env: getGitEnv()
    });

    const branch = branchName.trim();

    // Check if remote tracking branch exists
    try {
      await execAsync(`git rev-parse --verify origin/${branch}`, {
        cwd: repoDir,
        timeout: 5000,
        env: getGitEnv()
      });
    } catch {
      // No remote tracking branch - likely a new branch with no push yet
      // Check if we have any commits at all
      try {
        const { stdout: commitCount } = await execAsync('git rev-list --count HEAD', {
          cwd: repoDir,
          timeout: 5000,
          env: getGitEnv()
        });
        const count = parseInt(commitCount.trim(), 10);
        return { hasUnpushed: count > 0, count };
      } catch {
        return { hasUnpushed: false, count: 0 };
      }
    }

    // Count commits ahead of remote
    const { stdout: aheadCount } = await execAsync(
      `git rev-list --count origin/${branch}..HEAD`,
      {
        cwd: repoDir,
        timeout: 5000,
        env: getGitEnv()
      }
    );

    const count = parseInt(aheadCount.trim(), 10);
    return { hasUnpushed: count > 0, count };
  } catch (error) {
    console.warn('[GitOperations] Failed to check unpushed commits', {
      repoDir,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { hasUnpushed: false, count: 0 };
  }
}

/**
 * Singleton instance for convenience
 */
export const gitOperations = new GitOperations();
