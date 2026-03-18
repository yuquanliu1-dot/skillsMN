/**
 * File Watcher Service
 *
 * Monitors skill directories for changes and emits events to renderer
 * Uses @parcel/watcher for reliable file watching on Windows
 */

import { BrowserWindow } from 'electron';
import * as parcelWatcher from '@parcel/watcher';
import { logger } from '../utils/Logger';
import { PathValidator } from './PathValidator';
import { IPC_CHANNELS } from '../../shared/constants';
import type { FSEvent } from '../../shared/types';

export class FileWatcher {
  private subscriptions: parcelWatcher.AsyncSubscription[] = [];
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
    logger.info('Main window reference set for file watcher', 'FileWatcher');
  }

  /**
   * Start watching skill directories for file system changes
   * Monitors the centralized application skills directory
   * Emits FS_CHANGE IPC events to renderer on file changes
   * @param applicationDir - Application skills directory path (required)
   * @example
   * fileWatcher.start('/path/to/app/skills');
   */
  async start(applicationDir: string): Promise<void> {
    logger.info('Starting file watcher', 'FileWatcher', {
      applicationDir,
    });

    if (this.subscriptions.length > 0) {
      logger.warn('File watcher already running, stopping previous instances', 'FileWatcher');
      await this.stop();
    }

    const watchPaths: string[] = [];

    // Add application directory
    const validatedAppDir = this.pathValidator.validate(applicationDir);
    watchPaths.push(validatedAppDir);
    logger.debug('Added application path to watch list', 'FileWatcher', { path: validatedAppDir });

    logger.info('Starting to watch directories', 'FileWatcher', { watchPaths });

    // Subscribe to the directory
    for (const watchPath of watchPaths) {
      try {
        const subscription = await parcelWatcher.subscribe(
          watchPath,
          (err, events) => {
            if (err) {
              this.handleError(err);
              return;
            }

            // Process each event
            events.forEach(event => {
              this.handleChange(event.type, event.path);
            });
          },
          {
            ignore: ['**/node_modules/**', '**/.git/**', '**/.*'], // Ignore dotfiles and common directories
          }
        );

        this.subscriptions.push(subscription);
        logger.debug('Successfully subscribed to directory', 'FileWatcher', { path: watchPath });
      } catch (error) {
        logger.error(`Failed to subscribe to directory: ${watchPath}`, 'FileWatcher', error);
      }
    }

    this.watchedPaths = new Set(watchPaths);
    logger.info('File watcher started successfully', 'FileWatcher', {
      watchedPaths: Array.from(this.watchedPaths),
      subscriptionCount: this.subscriptions.length,
    });
  }

  /**
   * Stop watching directories and clean up resources
   * Clears all watched paths and pending debounce timers
   * Safe to call multiple times
   * @example
   * fileWatcher.stop();
   */
  async stop(): Promise<void> {
    logger.debug('Stopping file watcher', 'FileWatcher');

    // Unsubscribe from all watchers
    for (const subscription of this.subscriptions) {
      try {
        await subscription.unsubscribe();
      } catch (error) {
        logger.error('Error unsubscribing from watcher', 'FileWatcher', error);
      }
    }

    this.subscriptions = [];
    this.watchedPaths.clear();
    logger.info('File watcher stopped', 'FileWatcher');

    // Clear any pending debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Handle file system changes with debouncing
   * Maps parcel/watcher event types to our FSEvent types
   */
  private handleChange(eventType: 'create' | 'update' | 'delete', path: string): void {
    logger.debug('File system event received', 'FileWatcher', {
      eventType,
      path,
    });

    // Map parcel/watcher event types to our FSEvent types
    const eventTypeMap: Record<'create' | 'update' | 'delete', FSEvent['type']> = {
      create: 'add',
      update: 'change',
      delete: 'unlink',
    };

    const mappedEventType = eventTypeMap[eventType];

    // Debounce rapid changes
    const key = `${mappedEventType}:${path}`;

    // Clear existing timer if any
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      logger.info('Emitting debounced file system event', 'FileWatcher', {
        eventType: mappedEventType,
        path,
      });
      this.emitEvent(mappedEventType, path);
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Emit event to renderer process
   */
  private emitEvent(eventType: FSEvent['type'], path: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.warn('Cannot emit event: main window not available', 'FileWatcher');
      return;
    }

    // Determine which directory this belongs to
    const directory = this.pathValidator.getSkillSource(path);

    const event: FSEvent = {
      type: eventType,
      path,
      directory,
    };

    logger.info('Emitting FS_CHANGE event to renderer', 'FileWatcher', {
      event,
      channel: IPC_CHANNELS.FS_CHANGE,
    });

    this.mainWindow.webContents.send(IPC_CHANNELS.FS_CHANGE, event);

    logger.debug('FS_CHANGE event sent successfully', 'FileWatcher');
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    logger.error('File watcher error', 'FileWatcher', error);
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
    return this.subscriptions.length > 0;
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
