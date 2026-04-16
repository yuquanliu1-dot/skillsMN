/**
 * Logger Utility
 *
 * Provides structured logging with timestamps and context for the main process
 * In packaged mode, writes to file to avoid interfering with CLI JSON communication
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  data?: unknown;
}

class Logger {
  private logFilePath: string | null = null;
  private logStream: fs.WriteStream | null = null;
  private isPackaged: boolean = false;

  constructor() {
    // Check if running in packaged mode
    try {
      this.isPackaged = app?.isPackaged ?? false;
    } catch {
      this.isPackaged = false;
    }

    if (this.isPackaged) {
      // In packaged mode, lazily initialize file logging on first write
      this.initPromise = null;
    }
  }

  private initPromise: Promise<void> | null = null;

  private ensureLogStream(): void {
    if (this.logStream || this.initPromise) return;
    this.initPromise = (async () => {
      try {
        const logsDir = path.join(app.getPath('userData'), 'logs');
        await fs.promises.mkdir(logsDir, { recursive: true });
        this.logFilePath = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      } catch (error) {
        console.error('Failed to initialize file logging:', error);
      }
    })();
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      entry.context ? `[${entry.context}]` : '',
      entry.message,
    ].filter(Boolean);

    let output = parts.join(' ');

    if (entry.data !== undefined) {
      // Handle Error objects specially since their properties are not enumerable
      let dataToLog = entry.data;
      if (entry.data instanceof Error) {
        const errorObj: any = {
          name: entry.data.name,
          message: entry.data.message,
          stack: entry.data.stack,
        };
        // Safely access cause property (ES2022+)
        if ('cause' in entry.data) {
          errorObj.cause = (entry.data as any).cause;
        }
        dataToLog = errorObj;
      }
      output += ` | ${JSON.stringify(dataToLog, null, 2)}`;
    }

    return output;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      context,
      message,
      data,
    };

    const formatted = this.formatEntry(entry);

    // In packaged mode, lazily init and write to file
    if (this.isPackaged) {
      this.ensureLogStream();
      if (this.logStream) {
        this.logStream.write(formatted + '\n');
      }
      // Also write errors to stderr for visibility
      if (level === LogLevel.ERROR) {
        console.error(formatted);
      }
    } else {
      // In development, write to console
      switch (level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Close the log stream (call on app quit)
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = new Logger();
