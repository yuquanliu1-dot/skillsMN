/**
 * Logger utility for structured logging
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, any>;
  duration?: number;
}

/**
 * Structured logger with file output
 */
export class Logger {
  private static instance: Logger;
  private logFile: string;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, 'app.log');
    this.startFlushInterval();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log debug message
   */
  public debug(context: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  /**
   * Log info message
   */
  public info(context: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  /**
   * Log warning message
   */
  public warn(context: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, context, message, data);
  }

  /**
   * Log error message
   */
  public error(context: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, context, message, data);
  }

  /**
   * Log performance metric
   */
  public perf(context: string, operation: string, duration: number, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, context, operation, { ...data, duration });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, context: string, message: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Also log to console for errors and warnings
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      console.error(`[${level.toUpperCase()}] [${context}] ${message}`, data || '');
    } else {
      console.log(`[${level.toUpperCase()}] [${context}] ${message}`, data || '');
    }

    // Flush if buffer is large
    if (this.logBuffer.length >= 10) {
      this.flush();
    }
  }

  /**
   * Start interval to flush logs to file
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush log buffer to file
   */
  public flush(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      const logLines = this.logBuffer
        .map(entry => JSON.stringify(entry))
        .join('\n');

      fs.appendFileSync(this.logFile, logLines + '\n', 'utf8');
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to write logs to file:', error);
    }
  }

  /**
   * Clean up on app shutdown
   */
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
