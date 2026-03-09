/**
 * Electron Main Process Entry Point
 *
 * Initializes and manages the application lifecycle
 */

import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { logger } from './utils/Logger';
import { registerConfigHandlers, getConfigService } from './ipc/configHandlers';
import { registerSkillHandlers } from './ipc/skillHandlers';
import { PathValidator } from './services/PathValidator';
import { SkillDirectoryModel } from './models/SkillDirectory';

// Global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let pathValidator: PathValidator | null = null;

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
    backgroundColor: '#0F172A', // Dark background matching design spec
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // Disable sandbox for preload script to work
    },
    title: 'skillsMN - Local Skill Management',
    show: false, // Show when ready to prevent visual flash
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server or dist
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(rendererPath);
    mainWindow.webContents.openDevTools();
    logger.info('Loaded renderer in development mode', 'Main');
  } else {
    // In production, load from built files
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(rendererPath);
    logger.info('Loaded renderer in production mode', 'Main');
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logger.info('Main window shown', 'Main');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

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

    // Register skill handlers with path validator
    registerSkillHandlers(pathValidator);
    logger.info('Skill handlers registered', 'Main');

    // Create main window
    await createWindow();

    logger.info('Application initialized successfully', 'Main');
  } catch (error) {
    logger.error('Failed to initialize application', 'Main', error);
    app.quit();
  }
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
