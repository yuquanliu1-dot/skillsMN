/**
 * GitHub Error Mapping Utilities
 *
 * Maps GitHub API errors to structured IPCError objects with user-friendly messages
 */

import type { GitHubErrorCode } from '../../shared/types';

/**
 * Error information structure
 */
export interface GitHubErrorInfo {
  code: GitHubErrorCode;
  message: string;
  userFriendlyMessage: string;
  retryable: boolean;
  retryAfter?: number; // seconds until retry is allowed
  actionGuidance?: string;
}

/**
 * Map HTTP status codes to GitHub error codes
 */
export function mapHttpStatusToErrorCode(status: number): GitHubErrorCode {
  switch (status) {
    case 403:
      return 'RATE_LIMIT_EXCEEDED';
    case 404:
      return 'SKILL_NOT_FOUND';
    case 401:
      return 'PERMISSION_DENIED';
    case 422:
      return 'INVALID_QUERY';
    default:
      return 'GITHUB_API_ERROR';
  }
}

/**
 * Create error info from GitHub API response
 */
export function createGitHubErrorFromResponse(
  status: number,
  headers?: any,
  responseBody?: any
): GitHubErrorInfo {
  const errorCode = mapHttpStatusToErrorCode(status);

  switch (errorCode) {
    case 'RATE_LIMIT_EXCEEDED': {
      const remaining = headers?.['x-ratelimit-remaining'];
      const resetTime = headers?.['x-ratelimit-reset'];
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
      const retryAfter = resetDate
        ? Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / 1000))
        : 3600;

      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `GitHub API rate limit exceeded. Remaining: ${remaining || 0}`,
        userFriendlyMessage: `GitHub API rate limit reached. ${remaining === '0' ? 'No requests remaining.' : 'Approaching rate limit.'}`,
        retryable: true,
        retryAfter,
        actionGuidance: retryAfter > 60
          ? `Wait ${Math.ceil(retryAfter / 60)} minutes or configure a GitHub Personal Access Token for higher limits (5000 requests/hour).`
          : `Wait ${retryAfter} seconds before retrying.`,
      };
    }

    case 'SKILL_NOT_FOUND':
      return {
        code: 'SKILL_NOT_FOUND',
        message: 'Skill or repository not found on GitHub',
        userFriendlyMessage: 'The requested skill or repository could not be found on GitHub.',
        retryable: false,
        actionGuidance: 'Verify the repository name and skill path. Ensure the repository is public.',
      };

    case 'PERMISSION_DENIED':
      return {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied accessing GitHub resource',
        userFriendlyMessage: 'Permission denied. This may be a private repository or your access token may be invalid.',
        retryable: false,
        actionGuidance: 'If accessing a private repository, ensure your GitHub PAT has the necessary scopes.',
      };

    case 'INVALID_QUERY':
      return {
        code: 'INVALID_QUERY',
        message: 'Invalid search query',
        userFriendlyMessage: 'The search query is invalid or malformed.',
        retryable: false,
        actionGuidance: 'Simplify your search terms and avoid special characters.',
      };

    case 'GITHUB_API_ERROR':
    default:
      return {
        code: 'GITHUB_API_ERROR',
        message: `GitHub API error: ${status} ${responseBody?.message || 'Unknown error'}`,
        userFriendlyMessage: `GitHub API returned an error (status ${status}).`,
        retryable: status >= 500, // Server errors might be temporary
        actionGuidance: status >= 500
          ? 'GitHub servers may be experiencing issues. Try again in a few moments.'
          : 'An unexpected error occurred. Check your network connection and try again.',
      };
  }
}

/**
 * Create network error info
 */
export function createNetworkError(error: Error): GitHubErrorInfo {
  return {
    code: 'NETWORK_ERROR',
    message: `Network error: ${error.message}`,
    userFriendlyMessage: 'Unable to connect to GitHub. Please check your internet connection.',
    retryable: true,
    actionGuidance: 'Verify your network connection and try again. If the problem persists, GitHub may be temporarily unavailable.',
  };
}

/**
 * Create download error info
 */
export function createDownloadError(skillName: string, reason?: string): GitHubErrorInfo {
  return {
    code: 'DOWNLOAD_FAILED',
    message: `Failed to download skill: ${skillName}. ${reason || 'Unknown error'}`,
    userFriendlyMessage: `Failed to download skill "${skillName}" from GitHub.`,
    retryable: true,
    actionGuidance: 'Check your network connection and try again. The repository may have been deleted or made private.',
  };
}

/**
 * Create validation error info
 */
export function createValidationError(skillName: string, validationErrors: string[]): GitHubErrorInfo {
  return {
    code: 'VALIDATION_FAILED',
    message: `Skill validation failed for ${skillName}: ${validationErrors.join(', ')}`,
    userFriendlyMessage: `Skill "${skillName}" failed validation checks.`,
    retryable: false,
    actionGuidance: `Validation issues: ${validationErrors.join('; ')}. Contact the skill author or try a different skill.`,
  };
}

/**
 * Create conflict error info
 */
export function createConflictError(skillName: string, existingPath: string): GitHubErrorInfo {
  return {
    code: 'CONFLICT_DETECTED',
    message: `Skill "${skillName}" already exists at ${existingPath}`,
    userFriendlyMessage: `A skill named "${skillName}" already exists in your directory.`,
    retryable: false,
    actionGuidance: 'Choose to overwrite the existing skill, rename the new skill, or skip installation.',
  };
}

/**
 * Create invalid target error info
 */
export function createInvalidTargetError(targetPath: string, reason: string): GitHubErrorInfo {
  return {
    code: 'INVALID_TARGET',
    message: `Invalid installation target: ${targetPath}. ${reason}`,
    userFriendlyMessage: `Cannot install skill to the specified location.`,
    retryable: false,
    actionGuidance: reason.includes('not configured')
      ? 'Configure the target directory in Settings before installing skills.'
      : 'Choose a different installation directory.',
  };
}

/**
 * Create invalid content error info
 */
export function createInvalidContentError(skillName: string, reason: string): GitHubErrorInfo {
  return {
    code: 'INVALID_CONTENT',
    message: `Invalid content for skill ${skillName}: ${reason}`,
    userFriendlyMessage: `The skill "${skillName}" contains invalid or corrupted content.`,
    retryable: false,
    actionGuidance: 'This skill may be improperly formatted. Try a different skill or contact the repository owner.',
  };
}

/**
 * Create install not found error info
 */
export function createInstallNotFoundError(installId: string): GitHubErrorInfo {
  return {
    code: 'INSTALL_NOT_FOUND',
    message: `Installation request not found: ${installId}`,
    userFriendlyMessage: 'The installation request could not be found.',
    retryable: false,
    actionGuidance: 'The installation may have already completed or been cancelled.',
  };
}

/**
 * Determine if error is retryable and get retry delay
 */
export function getRetryStrategy(errorInfo: GitHubErrorInfo): {
  shouldRetry: boolean;
  delayMs: number;
} {
  if (!errorInfo.retryable) {
    return { shouldRetry: false, delayMs: 0 };
  }

  // For rate limits, use the provided retryAfter value
  if (errorInfo.code === 'RATE_LIMIT_EXCEEDED' && errorInfo.retryAfter) {
    return { shouldRetry: true, delayMs: errorInfo.retryAfter * 1000 };
  }

  // For other retryable errors, use exponential backoff
  // Start with 1 second, max 60 seconds
  return { shouldRetry: true, delayMs: 1000 };
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(errorInfo: GitHubErrorInfo): string {
  const parts = [
    `[${errorInfo.code}]`,
    errorInfo.message,
    errorInfo.retryable ? '(retryable)' : '(non-retryable)',
  ];

  if (errorInfo.retryAfter) {
    parts.push(`retry after ${errorInfo.retryAfter}s`);
  }

  return parts.join(' ');
}
