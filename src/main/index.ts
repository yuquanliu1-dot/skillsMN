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
import { registerAllAIHandlers } from './ipc/aiHandlers';
import { registerGitHubHandlers } from './ipc/gitHubHandlers';
import { registerPrivateRepoHandlers } from './ipc/privateRepoHandlers';
import { registerRegistryHandlers } from './ipc/registryHandlers';
import { registerSymlinkHandlers } from './ipc/symlinkHandlers';
import { registerMigrationHandlers } from './ipc/migrationHandlers';
import { registerImportHandlers, initImportService } from './ipc/importHandlers';
import { registerAIConversationHandlers } from './ipc/aiConversationHandlers';
import { registerSkillGroupHandlers, setConfigService, autoInitializeDefaultGroups } from './ipc/skillGroupHandlers';
import { registerContributionStatsHandlers } from './ipc/contributionStatsHandlers';
import { PathValidator } from './services/PathValidator';
import { FileWatcher } from './services/FileWatcher';
import { SymlinkService } from './services/SymlinkService';
import { MigrationService } from './services/MigrationService';
import { SkillService } from './services/SkillService';
import { SkillDirectoryModel } from './models/SkillDirectory';

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

  // Get icon path based on environment and platform
  // Note: macOS uses the .app bundle icon (set by electron-builder), but we set
  // the window icon anyway for development and as a fallback
  let iconPath: string | undefined;
  if (isDev) {
    iconPath = path.join(__dirname, '../../../resources/icons/icon.png');
  } else {
    // In production, macOS uses the bundle icon, Windows/Linux use explicit icon
    if (process.platform !== 'darwin') {
      iconPath = path.join(process.resourcesPath, 'icons', 'icon.png');
    }
    // On macOS, iconPath stays undefined to use the bundle icon
  }

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
    icon: iconPath,
    show: false, // Show when ready to prevent visual flash
    center: true, // Center the window on screen
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    const viteDevServerUrl = 'http://localhost:5173';
    try {
      await mainWindow.loadURL(viteDevServerUrl);
      logger.info('Loaded renderer from Vite dev server', 'Main');

      // Open DevTools after window is shown (don't steal focus)
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          mainWindow?.webContents?.openDevTools({ mode: 'detach' });
          logger.info('DevTools opened', 'Main');
        }, 1000);
      });
    } catch (error) {
      logger.error('Failed to load from Vite dev server, falling back to built files', 'Main', error);
      const rendererPath = path.join(__dirname, '../../renderer/index.html');
      await mainWindow.loadFile(rendererPath);
      logger.info('Loaded renderer from built files (fallback)', 'Main');
    }
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

  // Remove application menu
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
    const firstProjectDir = config.projectDirectories[0] || null;
    pathValidator = new PathValidator(firstProjectDir, globalDir);
    logger.info('Path validator initialized', 'Main', {
      projectDir: firstProjectDir,
      globalDir,
    });

    // Initialize file watcher
    fileWatcher = new FileWatcher(pathValidator);
    logger.info('File watcher initialized', 'Main');

    // Initialize services for symlink and migration first
    const symlinkService = new SymlinkService();
    const skillService = new SkillService(pathValidator, symlinkService);
    const migrationService = new MigrationService(skillService);

    // Ensure application skills directory exists
    await skillService.ensureApplicationDirectory(config);
    logger.info('Application skills directory ensured', 'Main');

    // Set application directory on path validator and update config
    const appDir = skillService.getApplicationSkillsDirectory(config);
    pathValidator.setApplicationDirectory(appDir);
    logger.info('Application directory set on path validator', 'Main', { appDir });

    // Update config with applicationSkillsDirectory if not already set
    if (!config.applicationSkillsDirectory) {
      await configService.save({ applicationSkillsDirectory: appDir });
      logger.info('Updated config with applicationSkillsDirectory', 'Main', { appDir });
    }

    // Register skill handlers with path validator and symlink service
    registerSkillHandlers(pathValidator, symlinkService);
    logger.info('Skill handlers registered', 'Main');

    // Register AI handlers (configuration is now unified in ConfigService)
    registerAllAIHandlers();
    logger.info('AI handlers registered', 'Main');

    // Register GitHub handlers
    registerGitHubHandlers(pathValidator);
    logger.info('GitHub handlers registered', 'Main');

    // Register registry handlers
    registerRegistryHandlers();
    logger.info('Registry handlers registered', 'Main');

    // Register Private Repository handlers
    await registerPrivateRepoHandlers(pathValidator);
    logger.info('Private repository handlers registered', 'Main');

    // Register symlink handlers
    registerSymlinkHandlers(symlinkService, skillService, configService);
    logger.info('Symlink handlers registered', 'Main');

    // Register migration handlers
    registerMigrationHandlers(migrationService, skillService, configService);
    logger.info('Migration handlers registered', 'Main');

    // Register AI conversation handlers
    registerAIConversationHandlers();
    logger.info('AI conversation handlers registered', 'Main');

    // Register skill group handlers
    setConfigService(configService);
    registerSkillGroupHandlers();
    logger.info('Skill group handlers registered', 'Main');

    // Auto-initialize default skill groups if not already done
    await autoInitializeDefaultGroups();

    // Register contribution stats handlers
    registerContributionStatsHandlers();
    logger.info('Contribution stats handlers registered', 'Main');

    // Initialize and register import handlers
    initImportService(skillService);
    registerImportHandlers(mainWindow);
    logger.info('Import handlers registered', 'Main');

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
  logger.close();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'Main', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', 'Main', reason);
});
