/**
 * Crypto Utility Functions
 *
 * Provides encryption and hashing utilities for secure credential storage
 * Uses Node.js crypto module for cryptographic operations
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Hash a string using SHA-256
 * @param input - String to hash
 * @returns Hexadecimal hash string
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Hash a repository URL for use as a unique identifier
 * @param url - Repository URL to hash
 * @returns Shortened hash string for storage key
 */
export function hashRepoUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 16);
}

/**
 * Generate a random ID
 * @param length - Length of the ID (default: 16)
 * @returns Random hexadecimal string
 */
export function generateId(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length);
}

/**
 * Obfuscate a token for display (show only last 4 characters)
 * @param token - Token to obfuscate
 * @returns Obfuscated token string
 */
export function obfuscateToken(token: string): string {
  if (!token || token.length < 4) {
    return '****';
  }
  return `****${token.slice(-4)}`;
}

/**
 * Validate that a string looks like a GitHub PAT
 * @param token - Token to validate
 * @returns True if token format is valid
 */
export function isValidGitHubPAT(token: string): boolean {
  // GitHub PATs start with 'ghp_' for classic tokens or 'github_pat_' for fine-grained tokens
  return /^ghp_[a-zA-Z0-9]{36}$/.test(token) || /^github_pat_[a-zA-Z0-9]{22,}$/.test(token);
}

/**
 * Validate that a string looks like an Anthropic API key
 * @param apiKey - API key to validate
 * @returns True if API key format is valid
 */
export function isValidAnthropicAPIKey(apiKey: string): boolean {
  // Anthropic API keys start with 'sk-ant-'
  return /^sk-ant-[a-zA-Z0-9-_]{95}$/.test(apiKey);
}
