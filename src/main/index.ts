/**
 * Electron Main Process Entry Point
 *
 * Initializes and manages the application lifecycle
 */

import { app, BrowserWindow, shell, Menu } from 'electron';
import * as path from 'path';
import { logger } from './utils/Logger';
import { registerConfigHandlers, getConfigService } from './ipc/configHandlers';
import { registerSkillHandlers } from './ipc/skillHandlers';
import { registerAIHandlers, registerAITestHandler, registerAIConfigHandlers } from './ipc/aiHandlers';
import { registerGitHubHandlers } from './ipc/gitHubHandlers';
import { registerPrivateRepoHandlers } from './ipc/privateRepoHandlers';
import { PathValidator } from './services/PathValidator';
import { FileWatcher } from './services/FileWatcher';
import { SkillDirectoryModel } from './models/SkillDirectory';
import { AIConfigService } from './services/AIConfigService';

// Global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let pathValidator: PathValidator | null = null;
let fileWatcher: FileWatcher | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create main application window
 */
async function createWindow(): Promise<void> {
  logger.info('Creating main window', 'Main');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#F9FAFB', // Light background matching light theme
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // Disable sandbox for preload script to work
    },
    title: 'skillsMN',
    show: false, // Show when ready to prevent visual flash
    center: true, // Center the window on screen
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server or dist
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    await mainWindow.loadFile(rendererPath);
    logger.info('Loaded renderer in development mode', 'Main');

    // Open DevTools after window is shown (don't steal focus)
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        mainWindow?.webContents?.openDevTools({ mode: 'detach' });
        logger.info('DevTools opened', 'Main');
      }, 1000);
    });
  } else {
    // In production, load from built files
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    await mainWindow.loadFile(rendererPath);
    logger.info('Loaded renderer in production mode', 'Main');
  }

  // Show window immediately after loading
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.moveTop();
    logger.info('Main window shown after load', 'Main');
  });

  // Fallback: show window after 2 seconds if still not visible
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
      logger.info('Main window shown (fallback)', 'Main');
    }
  }, 2000);

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Remove default Electron menu
  Menu.setApplicationMenu(null);

  // Clean up on close
  mainWindow.on('closed', () => {
    logger.info('Main window closed', 'Main');
    mainWindow = null;
  });

  logger.info('Main window created successfully', 'Main');
}

/**
 * Initialize application
 */
async function initialize(): Promise<void> {
  logger.info('Initializing application', 'Main');

  try {
    // Register configuration handlers
    registerConfigHandlers();
    logger.info('Configuration handlers registered', 'Main');

    // Load configuration to initialize path validator
    const configService = getConfigService();
    if (!configService) {
      throw new Error('ConfigService not initialized');
    }

    const config = await configService.load();

    // Initialize path validator with allowed directories
    const globalDir = SkillDirectoryModel.getGlobalDirectory();
    pathValidator = new PathValidator(config.projectDirectory, globalDir);
    logger.info('Path validator initialized', 'Main', {
      projectDir: config.projectDirectory,
      globalDir,
    });

    // Initialize file watcher
    fileWatcher = new FileWatcher(pathValidator);
    logger.info('File watcher initialized', 'Main');

    // Register skill handlers with path validator
    registerSkillHandlers(pathValidator);
    logger.info('Skill handlers registered', 'Main');

    // Register AI handlers
    registerAIHandlers();
    registerAITestHandler();
    registerAIConfigHandlers();
    AIConfigService.initialize();
    logger.info('AI handlers registered', 'Main');

    // Register GitHub handlers
    registerGitHubHandlers(pathValidator);
    logger.info('GitHub handlers registered', 'Main');

    // Register Private Repository handlers
    await registerPrivateRepoHandlers(pathValidator);
    logger.info('Private repository handlers registered', 'Main');

    // Create main window
    await createWindow();

    // Set main window reference for file watcher
    if (mainWindow && fileWatcher) {
      fileWatcher.setMainWindow(mainWindow);
    }

    logger.info('Application initialized successfully', 'Main');
  } catch (error: any) {
    logger.error('Failed to initialize application', 'Main', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      error
    });
    app.quit();
  }
}

/**
 * Get file watcher instance
 */
export function getFileWatcher(): FileWatcher | null {
  return fileWatcher;
}

// Application lifecycle events
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  logger.info('All windows closed', 'Main');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  logger.info('App activated', 'Main');
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on('before-quit', () => {
  logger.info('Application quitting', 'Main');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'Main', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', 'Main', reason);
});
