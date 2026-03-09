/**
 * Error Handler Utility
 *
 * Provides structured error handling with actionable error messages
 */

import { logger } from './Logger';

export class FileNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`File not found: ${path}`);
    this.name = 'FileNotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(public readonly path: string, public readonly operation: string) {
    super(`Permission denied: Cannot ${operation} ${path}`);
    this.name = 'PermissionError';
  }
}

export class PathTraversalError extends Error {
  constructor(public readonly path: string) {
    super(`Path traversal detected: ${path}`);
    this.name = 'PathTraversalError';
  }
}

export class YAMLParseError extends Error {
  constructor(
    public readonly file: string,
    public readonly line: number,
    message: string
  ) {
    super(`Invalid YAML in ${file} at line ${line}: ${message}`);
    this.name = 'YAMLParseError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class SkillExistsError extends Error {
  constructor(public readonly name: string, public readonly path: string) {
    super(`Skill already exists: ${name} at ${path}`);
    this.name = 'SkillExistsError';
  }
}

export class ErrorHandler {
  /**
   * Format error into actionable user-friendly message
   */
  static format(error: unknown): string {
    logger.error('Error occurred', 'ErrorHandler', error);

    if (error instanceof FileNotFoundError) {
      return `Skill not found: ${error.path}. The skill may have been moved or deleted. Try refreshing the skill list.`;
    }

    if (error instanceof PermissionError) {
      return `Permission denied: Cannot ${error.operation} ${error.path}. Check file permissions and ensure you have the necessary access rights.`;
    }

    if (error instanceof PathTraversalError) {
      return `Security error: Invalid file path. The operation has been blocked for security reasons.`;
    }

    if (error instanceof YAMLParseError) {
      return `Invalid YAML in ${error.file}: ${error.message}. Check syntax at line ${error.line}. Common issues: missing quotes, incorrect indentation, or invalid characters.`;
    }

    if (error instanceof ConfigurationError) {
      const fieldHint = error.field
        ? ` Check the "${error.field}" setting.`
        : '';
      return `Configuration error: ${error.message}${fieldHint} Try resetting to defaults if the issue persists.`;
    }

    if (error instanceof SkillExistsError) {
      return `A skill named "${error.name}" already exists at ${error.path}. Choose a different name or delete the existing skill first.`;
    }

    if (error instanceof Error) {
      // Generic error with message
      return `Error: ${error.message}. If this issue persists, check the logs for more details.`;
    }

    // Unknown error type
    return 'An unexpected error occurred. Check the application logs for more information.';
  }

  /**
   * Log error with context
   */
  static log(error: unknown, context: string): void {
    if (error instanceof Error) {
      logger.error(error.message, context, {
        name: error.name,
        stack: error.stack,
      });
    } else {
      logger.error('Unknown error', context, error);
    }
  }

  /**
   * Check if error is actionable (has specific guidance)
   */
  static isActionable(error: unknown): boolean {
    return (
      error instanceof FileNotFoundError ||
      error instanceof PermissionError ||
      error instanceof YAMLParseError ||
      error instanceof ConfigurationError ||
      error instanceof SkillExistsError
    );
  }
}
