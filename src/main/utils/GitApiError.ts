/**
 * Custom error class for Git API errors
 * Includes HTTP status code for proper error handling
 */
export class GitApiError extends Error {
  public readonly status: number;
  public readonly provider: 'github' | 'gitlab';

  constructor(message: string, status: number, provider: 'github' | 'gitlab' = 'github') {
    super(message);
    this.name = 'GitApiError';
    this.status = status;
    this.provider = provider;
  }

  /**
   * Check if error is an authentication error (401, 403)
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a rate limit error (429)
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }
}
