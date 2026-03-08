/**
 * Error handling utility with actionable error messages
 */

import { ERROR_CODES } from '../../shared/constants';
import { logger } from './Logger';

/**
 * Application error class with actionable guidance
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly action: string;
  public readonly data?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    action: string,
    data?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    this.action = action;
    this.data = data;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert to IPC error response format
   */
  public toIPCError(): { code: string; message: string; userMessage: string; action: string } {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      action: this.action,
    };
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Create file not found error
   */
  public static fileNotFound(filePath: string): AppError {
    return new AppError(
      ERROR_CODES.ENOENT,
      `File not found: ${filePath}`,
      'File not found',
      'The file may have been moved or deleted. Try refreshing the skill list.'
    );
  }

  /**
   * Create permission denied error
   */
  public static permissionDenied(filePath: string, operation: string): AppError {
    return new AppError(
      ERROR_CODES.EACCES,
      `Permission denied: Cannot ${operation} ${filePath}`,
      'Permission denied',
      'Check file permissions or run the application with appropriate privileges.'
    );
  }

  /**
   * Create invalid input error
   */
  public static invalidInput(field: string, value: any, reason: string): AppError {
    return new AppError(
      ERROR_CODES.EINVAL,
      `Invalid ${field}: ${reason}`,
      `Invalid ${field}`,
      `Please provide a valid ${field}. ${reason}`
    );
  }

  /**
   * Create file already exists error
   */
  public static fileAlreadyExists(filePath: string): AppError {
    return new AppError(
      ERROR_CODES.EEXIST,
      `File already exists: ${filePath}`,
      'File already exists',
      'Choose a different name or delete the existing file first.'
    );
  }

  /**
   * Create not a directory error
   */
  public static notADirectory(path: string): AppError {
    return new AppError(
      ERROR_CODES.ENOTDIR,
      `Not a directory: ${path}`,
      'Not a directory',
      'The selected path is not a directory. Please choose a valid directory.'
    );
  }

  /**
   * Create path validation error (security violation)
   */
  public static pathValidationFailed(attemptedPath: string): AppError {
    logger.warn('Security', 'Path validation failed', { attemptedPath });

    return new AppError(
      ERROR_CODES.EPATH,
      `Path validation failed: ${attemptedPath} is outside allowed directories`,
      'Access denied for security',
      'You can only access files within your project or global skill directories.'
    );
  }

  /**
   * Create parse error (invalid YAML/markdown)
   */
  public static parseError(filePath: string, details: string): AppError {
    return new AppError(
      ERROR_CODES.EPARSE,
      `Failed to parse ${filePath}: ${details}`,
      'Failed to parse file',
      'Check that the file has valid YAML frontmatter and Markdown syntax.'
    );
  }

  /**
   * Create configuration error
   */
  public static configurationError(message: string, action: string): AppError {
    return new AppError(
      ERROR_CODES.ECONFIG,
      message,
      'Configuration error',
      action
    );
  }

  /**
   * Create skill operation error
   */
  public static skillError(operation: string, skillName: string, reason: string): AppError {
    return new AppError(
      ERROR_CODES.ESKILL,
      `Failed to ${operation} skill "${skillName}": ${reason}`,
      `Failed to ${operation} skill`,
      `Please try again or check the skill file for issues.`
    );
  }

  /**
   * Create directory operation error
   */
  public static directoryError(operation: string, dirPath: string, reason: string): AppError {
    return new AppError(
      ERROR_CODES.EDIRECTORY,
      `Failed to ${operation} directory "${dirPath}": ${reason}`,
      `Failed to ${operation} directory`,
      'Check that the directory exists and you have the necessary permissions.'
    );
  }

  /**
   * Wrap unknown errors with context
   */
  public static wrapUnknown(error: unknown, context: string): AppError {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('ErrorHandler', `Unexpected error in ${context}`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new AppError(
      'EUNKNOWN',
      `Unexpected error in ${context}: ${message}`,
      'An unexpected error occurred',
      'Please try again. If the problem persists, check the logs for details.'
    );
  }

  /**
   * Handle errors in IPC handlers
   */
  public static handleIPCError(error: unknown, operation: string): { success: false; error: any } {
    const appError =
      error instanceof AppError
        ? error
        : ErrorHandler.wrapUnknown(error, operation);

    logger.error('IPC', `Error in ${operation}`, {
      code: appError.code,
      message: appError.message,
    });

    return {
      success: false,
      error: appError.toIPCError(),
    };
  }
}
