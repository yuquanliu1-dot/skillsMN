/**
 * File Watcher Service
 *
 * Monitors skill directories for changes and emits events to renderer
 */

import { BrowserWindow } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import { logger } from '../utils/Logger';
import { PathValidator } from './PathValidator';
import { IPC_CHANNELS } from '../../shared/constants';
import type { FSEvent } from '../../shared/types';

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private mainWindow: BrowserWindow | null = null;
  private pathValidator: PathValidator;
  private watchedPaths: Set<string> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 200;

  constructor(pathValidator: PathValidator) {
    this.pathValidator = pathValidator;
  }

  /**
   * Set the main window reference for sending IPC events
   * Must be called before starting the watcher
   * @param window - BrowserWindow instance to send events to
   * @example
   * fileWatcher.setMainWindow(mainWindow);
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    logger.debug('Main window reference set for file watcher', 'FileWatcher');
  }

  /**
   * Start watching skill directories for file system changes
   * Monitors both project and global skill directories
   * Emits FS_CHANGE IPC events to renderer on file changes
   * @param projectDir - Project directory path or null if not configured
   * @param globalDir - Global skill directory path (required)
   * @example
   * fileWatcher.start('/path/to/project/skills', '/home/user/.claude/skills');
   */
  start(projectDir: string | null, globalDir: string): void {
    if (this.watcher) {
      logger.warn('File watcher already running, stopping previous instance', 'FileWatcher');
      this.stop();
    }

    const watchPaths: string[] = [];

    // Add global directory
    const validatedGlobal = this.pathValidator.validate(globalDir);
    watchPaths.push(validatedGlobal);

    // Add project directory if configured
    if (projectDir) {
      const validatedProject = this.pathValidator.validate(projectDir);
      watchPaths.push(validatedProject);
    }

    logger.info('Starting file watcher', 'FileWatcher', {
      paths: watchPaths,
    });

    // Create watcher with chokidar
    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      depth: 2, // Watch skill directories and their contents
    });

    // Event handlers
    this.watcher
      .on('add', (path) => this.handleChange('add', path))
      .on('change', (path) => this.handleChange('change', path))
      .on('unlink', (path) => this.handleChange('unlink', path))
      .on('addDir', (path) => this.handleChange('addDir', path))
      .on('unlinkDir', (path) => this.handleChange('unlinkDir', path))
      .on('error', (error) => this.handleError(error));

    this.watchedPaths = new Set(watchPaths);
    logger.info('File watcher started successfully', 'FileWatcher', {
      watchedPaths: Array.from(this.watchedPaths),
    });
  }

  /**
   * Stop watching directories and clean up resources
   * Clears all watched paths and pending debounce timers
   * Safe to call multiple times
   * @example
   * fileWatcher.stop();
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.watchedPaths.clear();
      logger.info('File watcher stopped', 'FileWatcher');
    }

    // Clear any pending debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleChange(eventType: string, path: string): void {
    // Debounce rapid changes
    const key = `${eventType}:${path}`;

    // Clear existing timer if any
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.emitEvent(eventType, path);
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Emit event to renderer process
   */
  private emitEvent(eventType: string, path: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.warn('Cannot emit event: main window not available', 'FileWatcher');
      return;
    }

    // Determine which directory this belongs to
    const directory = this.pathValidator.getSkillSource(path);

    const event: FSEvent = {
      type: eventType as FSEvent['type'],
      path,
      directory,
    };

    logger.debug('Emitting file system event', 'FileWatcher', {
      event,
    });

    this.mainWindow.webContents.send(IPC_CHANNELS.FS_CHANGE, event);
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    logger.error('File watcher error', 'FileWatcher', error);
    // Note: We don't emit error events to renderer as FSEvent doesn't support error type
    // The watcher will continue running despite errors
  }

  /**
   * Check if the file watcher is currently running
   * @returns True if watcher is active, false otherwise
   * @example
   * if (fileWatcher.isRunning()) {
   *   console.log('Watching for changes...');
   * }
   */
  isRunning(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get list of currently watched directory paths
   * @returns Array of absolute paths being watched
   * @example
   * const paths = fileWatcher.getWatchedPaths();
   * console.log('Watching:', paths.join(', '));
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }
}
