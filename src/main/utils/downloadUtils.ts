/**
 * Download Utilities
 *
 * Provides utilities for downloading files with concurrency control,
 * progress tracking, and error handling
 */

import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from './Logger';

/**
 * Download progress callback
 */
export type ProgressCallback = (completed: number, total: number) => void;

/**
 * Download options
 */
export interface DownloadOptions {
  /** URL to download from */
  url: string;
  /** Local file path to save to */
  outputPath: string;
  /** Progress callback (optional) */
  onProgress?: ProgressCallback;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** User-Agent header */
  userAgent?: string;
}

/**
 * Download result
 */
export interface DownloadResult {
  success: boolean;
  bytesDownloaded: number;
  error?: string;
}

/**
 * Concurrency limiter for download operations
 */
export class DownloadQueue {
  private active: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(private maxConcurrent: number = 3) {}

  /**
   * Add a download task to the queue
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.active++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.next();
        }
      };

      if (this.active < this.maxConcurrent) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  /**
   * Process next task in queue
   */
  private next(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Get number of active downloads
   */
  get activeCount(): number {
    return this.active;
  }
}

/**
 * Download a single file with retry logic
 */
export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const {
    url,
    outputPath,
    onProgress,
    timeout = 30000,
    maxRetries = 3,
    userAgent = 'skillsMN-App',
  } = options;

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Downloading file (attempt ${attempt}/${maxRetries})`, 'DownloadUtils', {
        url,
        outputPath,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get content length for progress tracking
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      let bytesDownloaded = 0;

      // Ensure parent directory exists
      await fs.ensureDir(path.dirname(outputPath));

      // Stream response to file
      const fileStream = fs.createWriteStream(outputPath);

      await new Promise((resolve, reject) => {
        response.body?.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;
          if (onProgress && contentLength > 0) {
            onProgress(bytesDownloaded, contentLength);
          }
        });

        response.body?.pipe(fileStream);
        response.body?.on('error', (err) => reject(err));
        fileStream.on('finish', () => resolve());
        fileStream.on('error', (err) => reject(err));
      });

      logger.info('File downloaded successfully', 'DownloadUtils', {
        url,
        outputPath,
        bytesDownloaded,
      });

      return {
        success: true,
        bytesDownloaded,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Download attempt ${attempt} failed`, 'DownloadUtils', {
        url,
        error: lastError,
      });

      // Clean up partial download
      try {
        await fs.remove(outputPath);
      } catch {
        // Ignore cleanup errors
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('All download attempts failed', 'DownloadUtils', { url, error: lastError });

  return {
    success: false,
    bytesDownloaded: 0,
    error: lastError,
  };
}

/**
 * Download multiple files with concurrency control
 */
export async function downloadFiles(
  files: Array<{ url: string; outputPath: string }>,
  options: {
    maxConcurrent?: number;
    onProgress?: (completed: number, total: number) => void;
    onFileComplete?: (file: { url: string; outputPath: string }, result: DownloadResult) => void;
  } = {}
): Promise<Map<string, DownloadResult>> {
  const { maxConcurrent = 3, onProgress, onFileComplete } = options;

  const results = new Map<string, DownloadResult>();
  const queue = new DownloadQueue(maxConcurrent);
  let completed = 0;
  const total = files.length;

  logger.info('Starting batch download', 'DownloadUtils', {
    fileCount: total,
    maxConcurrent,
  });

  await Promise.all(
    files.map((file) =>
      queue.add(async () => {
        const result = await downloadFile({
          url: file.url,
          outputPath: file.outputPath,
        });

        results.set(file.url, result);

        if (onFileComplete) {
          onFileComplete(file, result);
        }

        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }
      })
    )
  );

  logger.info('Batch download complete', 'DownloadUtils', {
    total,
    successful: Array.from(results.values()).filter((r) => r.success).length,
    failed: Array.from(results.values()).filter((r) => !r.success).length,
  });

  return results;
}

/**
 * Download directory tree from GitHub repository
 *
 * Note: This is a simplified version that downloads individual files.
 * For full directory downloads, consider using GitHub's archive endpoints.
 */
export async function downloadDirectoryFromGitHub(
  repositoryFullName: string,
  directoryPath: string,
  branch: string,
  outputPath: string,
  fileUrls: Array<{ path: string; downloadUrl: string }>,
  options: {
    maxConcurrent?: number;
    onProgress?: ProgressCallback;
  } = {}
): Promise<{ success: boolean; filesDownloaded: number; errors: string[] }> {
  logger.info('Downloading directory from GitHub', 'DownloadUtils', {
    repositoryFullName,
    directoryPath,
    outputPath,
    fileCount: fileUrls.length,
  });

  const errors: string[] = [];
  let filesDownloaded = 0;

  const downloadTasks = fileUrls.map((file) => ({
    url: file.downloadUrl,
    outputPath: path.join(outputPath, file.path.replace(directoryPath, '')),
  }));

  const results = await downloadFiles(downloadTasks, {
    maxConcurrent: options.maxConcurrent,
    onProgress: options.onProgress,
    onFileComplete: (file, result) => {
      if (result.success) {
        filesDownloaded++;
      } else {
        errors.push(`Failed to download ${file.url}: ${result.error}`);
      }
    },
  });

  const success = filesDownloaded === fileUrls.length;

  logger.info('Directory download complete', 'DownloadUtils', {
    success,
    filesDownloaded,
    totalFiles: fileUrls.length,
    errors: errors.length,
  });

  return {
    success,
    filesDownloaded,
    errors,
  };
}

/**
 * Validate downloaded file
 */
export async function validateDownloadedFile(
  filePath: string,
  expectedMinSize?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const exists = await fs.pathExists(filePath);

    if (!exists) {
      return { valid: false, error: 'File does not exist' };
    }

    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' };
    }

    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (expectedMinSize && stats.size < expectedMinSize) {
      return {
        valid: false,
        error: `File size ${stats.size} is smaller than expected minimum ${expectedMinSize}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
