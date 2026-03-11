/**
 * Retry Utility
 *
 * Provides retry logic with exponential backoff for network operations
 */

import { logger } from './Logger';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays */
  jitter?: boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);

  // Cap at max delay
  let delay = Math.min(exponentialDelay, options.maxDelay);

  // Add jitter (±10%) to prevent thundering herd
  if (options.jitter) {
    const jitterRange = delay * 0.1;
    delay += (Math.random() * 2 - 1) * jitterRange;
  }

  return Math.floor(delay);
}

/**
 * Check if error is retryable (network error, 5xx, 429)
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENETUNREACH'
  ) {
    return true;
  }

  // HTTP status codes
  if (error.status) {
    // 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 rate limit
    if (error.status === 429) {
      return true;
    }
  }

  // Check error message for common network issues
  const errorMessage = error.message?.toLowerCase() || '';
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('socket hang up')
  ) {
    return true;
  }

  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await fetch('https://api.github.com/...'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.debug('Non-retryable error encountered', 'RetryUtil', {
          error: error.message,
          attempt,
        });
        throw error;
      }

      // Don't sleep on last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(attempt, opts);

        logger.warn('Retrying after error', 'RetryUtil', {
          error: error.message,
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
          delayMs: delay,
        });

        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  logger.error('All retry attempts exhausted', 'RetryUtil', {
    maxAttempts: opts.maxAttempts,
    lastError: lastError?.message,
  });

  throw lastError || new Error('All retry attempts exhausted');
}

/**
 * Wrap a function with retry logic
 *
 * @param fn - Async function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry logic
 *
 * @example
 * const fetchWithRetry = withRetry(fetch, { maxAttempts: 3 });
 * const result = await fetchWithRetry('https://api.github.com/...');
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return (async (...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
