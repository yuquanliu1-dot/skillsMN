/**
 * Validation Utilities
 *
 * Provides validation functions for URLs, paths, and other inputs
 */

import { logger } from './Logger';

/**
 * Validate and parse GitHub repository URL
 * @param url - Repository URL (e.g., https://github.com/owner/repo)
 * @returns Parsed components or null if invalid
 */
export function validateGitHubRepoUrl(url: string): {
  owner: string;
  repo: string;
} | null {
  // Accept URLs with or without trailing slash
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)\/?$/;
  const match = url.match(regex);

  if (!match) {
    logger.debug('Invalid GitHub URL format', 'Validation', { url });
    return null;
  }

  const owner = match[1];
  const repo = match[2];

  // Validate owner and repo names (GitHub naming rules)
  if (!isValidGitHubName(owner) || !isValidGitHubName(repo)) {
    logger.debug('Invalid owner or repo name', 'Validation', { owner, repo });
    return null;
  }

  return { owner, repo };
}

/**
 * Validate GitHub username/repository name
 * GitHub allows: alphanumeric and hyphens, but not consecutive hyphens
 * @param name - Name to validate
 * @returns True if valid
 */
export function isValidGitHubName(name: string): boolean {
  // GitHub naming rules:
  // - Max 39 characters for user/org, 100 for repo
  // - Alphanumeric and hyphens only
  // - Cannot start or end with hyphen
  // - No consecutive hyphens

  if (!name || name.length === 0 || name.length > 100) {
    return false;
  }

  // Check for valid characters and hyphen rules
  const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return validPattern.test(name) && !name.includes('--');
}

/**
 * Validate Personal Access Token format
 * @param token - Token to validate
 * @returns True if format is valid
 */
export function isValidPATFormat(token: string): boolean {
  // GitHub PATs:
  // - Classic tokens: ghp_ followed by 36 alphanumeric characters
  // - Fine-grained tokens: github_pat_ followed by 22+ alphanumeric characters
  // - OAuth tokens: gho_, ghu_, ghs_, ghr_

  const classicPattern = /^ghp_[a-zA-Z0-9]{36}$/;
  const fineGrainedPattern = /^github_pat_[a-zA-Z0-9]{22,}$/;
  const oauthPattern = /^gh[o|u|s|r]_[a-zA-Z0-9]{36,}$/;

  return (
    classicPattern.test(token) ||
    fineGrainedPattern.test(token) ||
    oauthPattern.test(token)
  );
}

/**
 * Validate repository display name (optional field)
 * @param displayName - Display name to validate
 * @returns True if valid (or empty)
 */
export function isValidDisplayName(displayName: string | undefined): boolean {
  if (!displayName) {
    return true; // Optional field
  }

  // Max 100 characters, no newlines
  return displayName.length <= 100 && !displayName.includes('\n');
}

/**
 * Sanitize string for safe display
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  // Remove any potential HTML/script injection
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
