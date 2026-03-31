/**
 * Main Application Component
 *
 * Root component with React Context for state management
 */

import React, { createContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import type { Configuration, Skill, UIState, FilterSource, SortBy, PrivateSkill, PrivateRepo, MigrationOptions, MigrationResult, VersionComparison } from '../shared/types';
import { ipcClient } from './services/ipcClient';
import SetupDialog from './components/SetupDialog';
import SkillList from './components/SkillList';
import CreateSkillDialog from './components/CreateSkillDialog';
import CopySkillDialog from './components/CopySkillDialog';
import { lazy, Suspense } from 'react';
const SkillEditor = lazy(() => import('./components/SkillEditor'));
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import UploadToPrivateRepoDialog from './components/UploadToPrivateRepoDialog';
import CommitChangesDialog from './components/CommitChangesDialog';
import Settings from './components/Settings';
import ToastContainer, { ToastMessage } from './components/ToastContainer';
import PrivateRepoList from './components/PrivateRepoList';
import Sidebar, { ViewType } from './components/Sidebar';
import { RegistrySearchPanel } from './components/RegistrySearchPanel';
import MigrationDialog from './components/MigrationDialog';
import SkillPreviewDrawer from './components/SkillPreviewDrawer';
import LocalSkillPreviewDrawer from './components/LocalSkillPreviewDrawer';
import SkillEditorFull from './components/SkillEditorFull';

type MainTab = 'local' | 'private-repos';

// ============================================================================
// State Types
// ============================================================================

interface AppState {
  config: Configuration | null;
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
  ui: UIState;
}

type Action =
  | { type: 'SET_CONFIG'; payload: Configuration }
  | { type: 'SET_SKILLS'; payload: Skill[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_SKILL'; payload: string | null }
  | { type: 'SET_FILTER'; payload: FilterSource }
  | { type: 'SET_SORT'; payload: SortBy }
  | { type: 'SET_SEARCH'; payload: string };

const initialState: AppState = {
  config: null,
  skills: [],
  isLoading: true,
  error: null,
  ui: {
    selectedSkill: null,
    filterSource: 'all',
    sortBy: 'name',
    searchQuery: '',
  },
};

// ============================================================================
// Reducer
// ============================================================================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_SKILLS':
      return { ...state, skills: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SELECT_SKILL':
      return { ...state, ui: { ...state.ui, selectedSkill: action.payload } };
    case 'SET_FILTER':
      return { ...state, ui: { ...state.ui, filterSource: action.payload } };
    case 'SET_SORT':
      return { ...state, ui: { ...state.ui, sortBy: action.payload } };
    case 'SET_SEARCH':
      return { ...state, ui: { ...state.ui, searchQuery: action.payload } };
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadSkills: () => Promise<Skill[] | undefined>;
}

export const AppContext = createContext<AppContextValue | null>(null);

// ============================================================================
// App Component
// ============================================================================

export default function App(): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showSetup, setShowSetup] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isNewSkillMode, setIsNewSkillMode] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [copyingSkill, setCopyingSkill] = useState<Skill | null>(null);
  const [uploadingSkill, setUploadingSkill] = useState<Skill | null>(null);
  const [committingSkill, setCommittingSkill] = useState<Skill | null>(null);
  const [uncommittedResetTrigger, setUncommittedResetTrigger] = useState(0);
  const [skillsWithUncommittedChanges, setSkillsWithUncommittedChanges] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('skills');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null);
  const [skillUpdates, setSkillUpdates] = useState<Record<string, VersionComparison>>({});

  // Ref to store latest loadSkills function for file watcher callback
  const loadSkillsRef = useRef<() => Promise<Skill[] | undefined>>(async () => undefined);
  // Ref to prevent concurrent loadSkills calls
  const isLoadingSkillsRef = useRef(false);
  const [viewingPrivateSkill, setViewingPrivateSkill] = useState<{
    skill: PrivateSkill;
    repo: PrivateRepo;
    content: string;
  } | null>(null);
  const [viewingDiscoverSkill, setViewingDiscoverSkill] = useState<{
    skill: any;
    content: string;
  } | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationSkills, setMigrationSkills] = useState<Skill[]>([]);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);

  /**
   * Load configuration on mount
   */
  useEffect(() => {
    async function initialize() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Load configuration
        const config = await ipcClient.loadConfig();
        dispatch({ type: 'SET_CONFIG', payload: config });

        // Check if there are skills in project directories that could be migrated
        const skillsResponse = await window.electronAPI.detectExistingSkills();
        if (skillsResponse.success && skillsResponse.data && skillsResponse.data.length > 0) {
          setMigrationSkills(skillsResponse.data);
          setShowMigrationDialog(true);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Check if setup is needed (setupCompleted flag)
        if (!config.setupCompleted) {
          setShowSetup(true);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Start file watcher if autoRefresh is enabled
        console.log('🔍 [App.tsx] Checking autoRefresh setting:', config.autoRefresh);
        if (config.autoRefresh !== false) {  // Default to true if not set
          console.log('🚀 [App.tsx] AutoRefresh enabled, starting file watcher...');
          try {
            await ipcClient.startWatching();
            console.log('✅ [App.tsx] startWatching() completed successfully');
          } catch (error) {
            console.error('❌ [App.tsx] Failed to start file watcher:', error);
          }

          // Remove any existing listener before adding new one
          ipcClient.removeFSChangeListener();

          // Subscribe to file system changes
          ipcClient.onFSChange(async (event) => {
            console.log('🔔 [App.tsx] File system change detected:', event);
            console.log('🔔 [App.tsx] Calling loadSkills...');
            await loadSkillsRef.current();
            console.log('✅ [App.tsx] loadSkills completed');
          });
          console.log('File system watcher started on initialization');
        } else {
          console.log('⚠️ [App.tsx] AutoRefresh disabled, skipping file watcher');
        }

        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    initialize();

    // Cleanup on unmount
    return () => {
      ipcClient.removeFSChangeListener();
    };
  }, []);

  /**
   * Load skills when config is available
   * Skills are stored in applicationSkillsDirectory, not projectDirectories
   * So we load skills regardless of whether projectDirectories is set
   */
  useEffect(() => {
    if (state.config && !showSetup && !showMigrationDialog) {
      loadSkills();
    }
  }, [state.config, showSetup, showMigrationDialog]);

  /**
   * Global keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ctrl+N: Create new skill
      if ((event.ctrlKey || event.metaKey) && event.key === 'n' && !event.shiftKey) {
        event.preventDefault();
        if (!showSetup && state.config) {
          setShowCreateDialog(true);
        }
      }

      // Ctrl+S: Save current skill
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        // Save is handled within SkillEditor component
        // This prevents browser's default save dialog
      }

      // Ctrl+R: Refresh skill list
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        if (!showSetup && state.config) {
          loadSkills();
          showToast('Skills refreshed', 'success');
        }
      }

      // Delete: Delete selected skill
      if (event.key === 'Delete' && selectedSkillPath) {
        event.preventDefault();
        const selectedSkill = state.skills.find(s => s.path === selectedSkillPath);
        if (selectedSkill) {
          setDeletingSkill(selectedSkill);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSetup, state.config?.projectDirectories, selectedSkillPath, state.skills]);

  /**
   * Load skills from file system
   * @returns The loaded skills array, or undefined if loading was skipped/failed
   */
  const loadSkills = useCallback(async (): Promise<Skill[] | undefined> => {
    if (!state.config) {
      console.log('⚠️ [loadSkills] No config, skipping');
      return;
    }

    // Prevent concurrent loads
    if (isLoadingSkillsRef.current) {
      console.log('⚠️ [loadSkills] Already loading, skipping duplicate call');
      return;
    }

    try {
      isLoadingSkillsRef.current = true;
      console.log('🔄 [loadSkills] Starting to load skills...');
      const skills = await ipcClient.listSkills(state.config);
      console.log(`✅ [loadSkills] Loaded ${skills.length} skills`);
      dispatch({ type: 'SET_SKILLS', payload: skills });
      return skills;
    } catch (error) {
      console.error('❌ [loadSkills] Failed to load skills:', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      return;
    } finally {
      isLoadingSkillsRef.current = false;
    }
  }, [state.config]);

  // Keep ref updated with latest loadSkills function
  loadSkillsRef.current = loadSkills;

  /**
   * Check for skill updates
   */
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!state.skills || state.skills.length === 0) {
      return;
    }

    try {
      console.log('🔄 [checkForUpdates] Checking for skill updates...');
      const updates = await ipcClient.checkForUpdates(state.skills);
      console.log(`✅ [checkForUpdates] Found ${Object.keys(updates).filter(k => updates[k].hasUpdate).length} updates`);
      setSkillUpdates(updates);
    } catch (error) {
      console.error('❌ [checkForUpdates] Failed to check for updates:', error);
      // Don't show error toast for background update checks
    }
  }, [state.skills]);

  /**
   * Handle update skill
   */
  const handleUpdateSkill = async (skill: Skill, createBackup: boolean): Promise<void> => {
    try {
      const result = await ipcClient.updateSkillFromSource(skill.path, createBackup);

      // Refresh skill list to reflect the update
      await loadSkills();

      // Re-check for updates
      await checkForUpdates();

      // Show success notification
      const skillName = skill.name + (createBackup ? ' (backup created)' : '');
      showToast(`Skill "${skillName}" updated successfully`, 'success');

      console.log('Skill updated successfully:', skill.name, 'New path:', result.newPath);
    } catch (error: any) {
      console.error('Failed to update skill:', error);
      showToast(`Failed to update skill: ${error.message}`, 'error');
      throw error;
    }
  };

  /**
   * Handle upload skill to private repository
   */
  const handleUploadSkill = async (skill: Skill): Promise<void> => {
    setUploadingSkill(skill);
  };

  /**
   * Handle commit changes to repository
   */
  /**
   * Handle reset uncommitted changes state (called after successful commit from SkillEditorFull)
   */
  const handleResetUncommitted = (): void => {
    // This is called from SkillEditorFull after a successful commit
    // For now, just pass an empty callback
    setCommittingSkill(null);
  };

  const handleCommitChanges = async (skill: Skill): Promise<void> => {
    if (!skill.sourceMetadata || skill.sourceMetadata.type === 'local') {
      showToast('This skill was not installed from a repository', 'error');
      return;
    }

    setCommittingSkill(skill);
  };

  /**
   * Check for updates when skills are loaded
   */
  useEffect(() => {
    if (state.skills && state.skills.length > 0) {
      // Check immediately when skills load
      checkForUpdates();

      // Set up periodic update checking (every 30 minutes)
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [state.skills?.length, checkForUpdates]);

  /**
   * Handle setup completion
   */
  const handleSetupComplete = async (): Promise<void> => {
    try {
      // Save config with setupCompleted flag
      const config = await ipcClient.saveConfig({
        setupCompleted: true,
        migrationPreferenceAsked: true,
      });
      dispatch({ type: 'SET_CONFIG', payload: config });
      setShowSetup(false);

      // Start file watcher if autoRefresh is enabled (default: true)
      if (config.autoRefresh !== false) {
        await ipcClient.startWatching();

        // Remove any existing listener before adding new one
        ipcClient.removeFSChangeListener();

        // Subscribe to file system changes
        ipcClient.onFSChange(async (event) => {
          console.log('File system change detected:', event);
          await loadSkillsRef.current();
        });
        console.log('File system watcher started after setup');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  /**
   * Handle migration completion
   * Does NOT persist migration flags - allows future directories to trigger migration
   */
  const handleMigrationComplete = async (skills: Skill[], options: MigrationOptions): Promise<void> => {
    try {
      const result = await window.electronAPI.startMigration({ skills, options });

      if (result.success && result.data) {
        // Note: We do NOT persist migrationCompleted or migrationPreferenceAsked flags
        // This allows future directory additions to trigger migration checks

        setShowMigrationDialog(false);
        showToast(`Successfully migrated ${result.data.migratedCount} skills!`, 'success');

        // Reload skills
        await loadSkills();

        // Start file watcher if not already running (after setup flow)
        const config = state.config;
        if (config && config.autoRefresh !== false) {
          try {
            await ipcClient.startWatching();
            ipcClient.removeFSChangeListener();
            ipcClient.onFSChange(async (event) => {
              console.log('File system change detected:', event);
              await loadSkillsRef.current();
            });
            console.log('File system watcher started after migration');
          } catch (err) {
            console.warn('File watcher may already be running:', err);
          }
        }
      } else {
        throw new Error(result.error?.message || 'Migration failed');
      }
    } catch (error) {
      showToast(`Migration failed: ${(error as Error).message}`, 'error');
      throw error;
    }
  };

  /**
   * Handle migration skip
   * Does NOT persist migration flags - allows future directories to trigger migration
   */
  const handleMigrationSkip = async (): Promise<void> => {
    // Note: We do NOT persist migrationPreferenceAsked flag
    // This allows future directory additions to trigger migration checks

    setShowMigrationDialog(false);

    // Start file watcher if not already running (after setup flow)
    const config = state.config;
    if (config && config.autoRefresh !== false) {
      try {
        await ipcClient.startWatching();
        ipcClient.removeFSChangeListener();
        ipcClient.onFSChange(async (event) => {
          console.log('File system change detected:', event);
          await loadSkillsRef.current();
        });
        console.log('File system watcher started after migration skip');
      } catch (err) {
        console.warn('File watcher may already be running:', err);
      }
    }
  };

  /**
   * Handle project directory added - check for migration
   * Always checks for skills,   */
  const handleProjectDirectoryAdded = async (directoryPath: string): Promise<void> => {
    try {
      // Always check if the directory has skills (no persistent flag check)
      const response = await window.electronAPI.checkDirectoryForSkills(directoryPath);
      if (response.success && response.data && response.data.length > 0) {
        // Skills found - show migration dialog
        setMigrationSkills(response.data);
        setShowMigrationDialog(true);
      }
    } catch (error) {
      console.error('Failed to check directory for skills:', error);
    }
  };

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: ToastMessage['type'] = 'info', duration?: number): void => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
  };

  /**
   * Dismiss toast notification
   */
  const dismissToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  /**
   * Handle create skill - Opens the full-screen editor in new skill mode
   * The actual skill creation will be handled by the AI assistant
   */
  const handleCreateSkill = async (name: string): Promise<void> => {
    // Close the dialog and open the full-screen editor in new skill mode
    // The AI assistant will handle the actual skill creation
    setShowCreateDialog(false);
    setEditingSkill(null);
    setIsNewSkillMode(true);
  };

  /**
   * Handle save skill content
   */
  const handleSaveSkill = async (content: string, loadedLastModified?: number): Promise<{ lastModified: number } | void> => {
    if (!editingSkill) return;

    try {
      const response = await window.electronAPI.updateSkill(editingSkill.path, content, loadedLastModified);
      if (!response.success) {
        const error = new Error(response.error?.message || 'Failed to save skill');
        (error as any).code = response.error?.message.includes('externally') ? 'EXTERNAL_MODIFICATION' : undefined;
        throw error;
      }

      // Refresh skill list to update lastModified
      await loadSkills();

      // Show success notification (T084)
      showToast('Skill saved successfully', 'success');

      console.log('Skill saved successfully:', editingSkill.name);

      // Return the updated lastModified timestamp from the response
      if (response.data && response.data.lastModified) {
        return { lastModified: new Date(response.data.lastModified).getTime() };
      }
    } catch (error: any) {
      console.error('Failed to save skill:', error);

      // Show error notification (T085)
      if (error?.code !== 'EXTERNAL_MODIFICATION') {
        showToast(`Failed to save skill: ${error.message}`, 'error');
      }

      throw error;
    }
  };

  /**
   * Handle delete skill
   */
  const handleDeleteSkill = async (skill: Skill): Promise<void> => {
    try {
      // Close the editor if the skill being deleted is currently open
      if (editingSkill && editingSkill.path === skill.path) {
        console.log('Closing editor for skill being deleted:', skill.name);
        setEditingSkill(null);
      }

      // Clear selection if the deleted skill was selected
      if (selectedSkillPath === skill.path) {
        setSelectedSkillPath(null);
      }

      const response = await window.electronAPI.deleteSkill(skill.path);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete skill');
      }

      // Refresh skill list
      await loadSkills();

      // Show success notification (T097)
      showToast(`Skill "${skill.name}" moved to recycle bin`, 'success');

      console.log('Skill deleted successfully:', skill.name);
    } catch (error: any) {
      console.error('Failed to delete skill:', error);

      // Show error notification (T098)
      showToast(`Failed to delete skill: ${error.message}`, 'error');

      throw error;
    }
  };

  /**
   * Handle open skill folder
   */
  const handleOpenFolder = async (skill: Skill): Promise<void> => {
    try {
      const response = await window.electronAPI.openFolder(skill.path);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to open folder');
      }

      console.log('Folder opened successfully:', skill.name);
    } catch (error: any) {
      console.error('Failed to open folder:', error);
      showToast(`Failed to open folder: ${error.message}`, 'error');
    }
  };

  /**
   * Handle copy skill
   */
  const handleCopySkill = async (newName: string): Promise<void> => {
    if (!copyingSkill) return;

    try {
      const response = await window.electronAPI.copySkill(copyingSkill.path, newName);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to copy skill');
      }

      // Refresh skill list
      await loadSkills();

      // Show success notification
      showToast(`Skill "${newName}" created from "${copyingSkill.name}"`, 'success');

      console.log('Skill copied successfully:', newName);
    } catch (error: any) {
      console.error('Failed to copy skill:', error);
      showToast(`Failed to copy skill: ${error.message}`, 'error');
      throw error;
    }
  };

  /**
   * Handle save settings
   */
  const handleSaveSettings = async (settings: Partial<Configuration>): Promise<void> => {
    try {
      const oldConfig = state.config;
      const updatedConfig = await ipcClient.saveConfig(settings);

      // Update local state
      dispatch({ type: 'SET_CONFIG', payload: updatedConfig });

      // Handle autoRefresh changes
      if (oldConfig && 'autoRefresh' in settings) {
        const wasWatching = oldConfig.autoRefresh !== false;
        const shouldWatch = updatedConfig.autoRefresh !== false;

        if (!wasWatching && shouldWatch) {
          // Start watching
          await ipcClient.startWatching();

          // Remove any existing listener before adding new one
          ipcClient.removeFSChangeListener();

          ipcClient.onFSChange(async (event) => {
            console.log('File system change detected:', event);
            await loadSkillsRef.current();
          });
          console.log('File system watcher started');
        } else if (wasWatching && !shouldWatch) {
          // Stop watching
          await ipcClient.stopWatching();
          ipcClient.removeFSChangeListener();
          console.log('File system watcher stopped');
        }
      }

      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  /**
   * Handle viewing private skill content
   */
  const handleViewPrivateSkill = async (skill: PrivateSkill) => {
    try {
      // Get repository from PrivateRepoService
      const reposResponse = await window.electronAPI.listPrivateRepos();
      if (!reposResponse.success || !reposResponse.data) {
        throw new Error('Failed to load repositories');
      }

      const repo = reposResponse.data.find(r => r.id === skill.repoId);
      if (!repo) {
        showToast('Repository not found', 'error');
        return;
      }

      const response = await window.electronAPI.getPrivateRepoSkillContent(repo.id, skill.skillFilePath || skill.path);
      if (response.success && response.data) {
        setViewingPrivateSkill({
          skill,
          repo,
          content: response.data,
        });
      } else {
        throw new Error(response.error?.message || 'Failed to load skill content');
      }
    } catch (error) {
      console.error('Failed to view private skill:', error);
      showToast(`Failed to load skill: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  /**
   * Handle viewing discover skill content
   */
  const handleViewDiscoverSkill = async (skill: any) => {
    console.log('🔍 handleViewDiscoverSkill called with skill:', skill);
    try {
      // Fetch skill content from the registry
      console.log('📡 Fetching skill content from registry...', skill.source, skill.skillId);
      const response = await window.electronAPI.getRegistrySkillContent(
        skill.source,
        skill.skillId
      );

      console.log('📦 Registry response:', response);

      if (response.success && response.data) {
        console.log('✅ Skill content loaded, length:', response.data.length);
        setViewingDiscoverSkill({
          skill,
          content: response.data,
        });
      } else {
        console.error('❌ Failed to load skill content:', response.error);
        throw new Error(response.error?.message || 'Failed to load skill content');
      }
    } catch (error) {
      console.error('Failed to view discover skill:', error);
      showToast(`Failed to load skill: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  /**
   * Render loading state
   */
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (state.error && !showSetup) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg border border-gray-200 shadow-lg">
          <div className="text-red-500 mb-4">{state.error}</div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render setup dialog if not configured
   */
  if (showSetup) {
    return <SetupDialog onComplete={handleSetupComplete} />;
  }

  /**
   * Render migration dialog if needed
   */
  if (showMigrationDialog) {
    return (
      <MigrationDialog
        isOpen={showMigrationDialog}
        skills={migrationSkills}
        onMigrate={handleMigrationComplete}
        onSkip={handleMigrationSkip}
      />
    );
  }

  /**
   * Render main application
   */
  return (
    <AppContext.Provider value={{ state, dispatch, loadSkills }}>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar - Column 1 (fixed width) */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onSettingsClick={() => setShowSettings(true)}
          config={state.config}
        />

        {/* Main Content Area - Column 2 (fills remaining space) */}
        <div className="flex-1 overflow-hidden bg-white" data-testid="main-content">
          {/* Keep all views mounted but hidden to preserve state */}
          <div style={{ display: currentView === 'skills' ? 'flex' : 'none' }} className="h-full flex flex-col overflow-hidden">
            <SkillList
              skills={state.skills}
              onSkillClick={(skill) => setViewingSkill(skill)}
              onSkillSelect={(skill) => setSelectedSkillPath(skill.path)}
              onCreateSkill={() => {
                // Directly open the skill editor in new skill mode, skip the dialog
                setEditingSkill(null);
                setIsNewSkillMode(true);
              }}
              onEditSkill={(skill) => {
                setEditingSkill(skill);
                setIsNewSkillMode(false);
              }}
              onDeleteSkill={(skill) => setDeletingSkill(skill)}
              onCopySkill={(skill) => setCopyingSkill(skill)}
              onOpenFolder={handleOpenFolder}
              selectedSkillPath={selectedSkillPath}
              skillUpdates={skillUpdates}
              onSkillUpdate={handleUpdateSkill}
              onSkillUpload={handleUploadSkill}
              onNavigateToSettings={() => setShowSettings(true)}
              onTagAssigned={loadSkills}
            />
          </div>

          <div style={{ display: currentView === 'discover' ? 'flex' : 'none' }} className="h-full flex flex-col overflow-hidden">
            <RegistrySearchPanel
              config={state.config}
              onInstallComplete={loadSkills}
              onSkillClick={handleViewDiscoverSkill}
            />
          </div>

          <div style={{ display: currentView === 'private-repos' ? 'flex' : 'none' }} className="h-full flex flex-col overflow-hidden">
            <PrivateRepoList
              onSkillClick={handleViewPrivateSkill}
              onNavigateToSettings={() => setShowSettings(true)}
              onTagAssigned={loadSkills}
              onLocalSkillsRefresh={loadSkills}
            />
          </div>
        </div>
      </div>

      {/* Local Skill Preview Drawer */}
      <LocalSkillPreviewDrawer
        isOpen={!!viewingSkill}
        skill={viewingSkill}
        onClose={() => setViewingSkill(null)}
        onEdit={(skill) => {
          setViewingSkill(null);
          setEditingSkill(skill);
          setIsNewSkillMode(false);
        }}
      />

      {/* Full-Screen Skill Editor (Two-Column Layout) */}
      {(editingSkill || isNewSkillMode) && (
        <SkillEditorFull
          skill={editingSkill}
          isNewSkill={isNewSkillMode}
          onClose={() => {
            setEditingSkill(null);
            setIsNewSkillMode(false);
          }}
          onSave={handleSaveSkill}
          config={state.config?.skillEditor}
          appConfig={state.config}
          onSkillCreated={async (skillInfo) => {
            if (skillInfo?.path) {
              // Extract skill directory path from SKILL.md path
              const skillDirPath = skillInfo.path.replace(/[\\\/]SKILL\.md$/i, '');

              // Ensure source metadata exists for AI-created skills BEFORE reloading skills
              try {
                await ipcClient.ensureSourceMetadata(skillDirPath);
              } catch (error) {
                console.warn('Failed to ensure source metadata:', error);
              }

              // Reload skills AFTER metadata is created
              const skills = await loadSkills();

              // Find the newly created skill from the refreshed list
              const newSkill = skills?.find(s => s.path === skillDirPath);

              if (newSkill) {
                // Switch to edit mode - keep editor open and show file tree
                setEditingSkill(newSkill);
                setIsNewSkillMode(false);
              } else {
                // Fallback: close editor if skill not found
                setEditingSkill(null);
                setIsNewSkillMode(false);
              }

              setSelectedSkillPath(skillDirPath);
            } else {
              // No path info, close editor
              setEditingSkill(null);
              setIsNewSkillMode(false);
            }

            showToast('Skill created successfully!', 'success');
          }}
          onUploadSkill={handleUploadSkill}
          onCommitChanges={handleCommitChanges}
          versionStatus={editingSkill ? skillUpdates[editingSkill.path] : undefined}
          uncommittedResetTrigger={uncommittedResetTrigger}
          hasUncommittedChanges={editingSkill ? skillsWithUncommittedChanges.has(editingSkill.path) : false}
          onSetHasUncommittedChanges={(value) => {
            if (editingSkill) {
              setSkillsWithUncommittedChanges(prev => {
                const newSet = new Set(prev);
                if (value) {
                  newSet.add(editingSkill.path);
                } else {
                  newSet.delete(editingSkill.path);
                }
                return newSet;
              });
            }
          }}
        />
      )}

      {/* Discover Skill Preview Drawer */}
      <SkillPreviewDrawer
        isOpen={!!viewingDiscoverSkill}
        skillName={viewingDiscoverSkill?.skill.name || ''}
        skillSource={viewingDiscoverSkill?.skill.source || ''}
        content={viewingDiscoverSkill?.content || ''}
        onClose={() => setViewingDiscoverSkill(null)}
      />

      {/* Private Skill Preview Drawer */}
      <SkillPreviewDrawer
        isOpen={!!viewingPrivateSkill}
        skillName={viewingPrivateSkill?.skill.name || ''}
        skillSource={viewingPrivateSkill?.repo.displayName || `${viewingPrivateSkill?.repo.owner}/${viewingPrivateSkill?.repo.repo}` || ''}
        content={viewingPrivateSkill?.content || ''}
        onClose={() => setViewingPrivateSkill(null)}
      />

      {/* Create Skill Dialog */}
      <CreateSkillDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateSkill={handleCreateSkill}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deletingSkill !== null}
        skill={deletingSkill}
        onClose={() => setDeletingSkill(null)}
        onConfirm={handleDeleteSkill}
      />

      {/* Copy Skill Dialog */}
      {copyingSkill && (
        <CopySkillDialog
          skill={copyingSkill}
          isOpen={copyingSkill !== null}
          onClose={() => setCopyingSkill(null)}
          onConfirm={handleCopySkill}
          existingSkillNames={state.skills?.map(s => s.name) || []}
        />
      )}

      {/* Upload to Private Repository Dialog */}
      {uploadingSkill && (
        <UploadToPrivateRepoDialog
          isOpen={uploadingSkill !== null}
          skill={uploadingSkill}
          onClose={() => setUploadingSkill(null)}
          onSuccess={async () => {
            // Store skill info before clearing state
            const skillPath = uploadingSkill.path;
            const skillName = uploadingSkill.name;

            // Refresh skills first
            const skills = await loadSkills();

            // Find and update the editing skill
            const updatedSkill = skills?.find(s => s.path === skillPath);
            if (updatedSkill) {
              setEditingSkill(updatedSkill);
            }

            // Clear uploading state after refresh
            setUploadingSkill(null);

            // Show success toast
            showToast(`Skill "${skillName}" uploaded successfully!`, 'success');
          }}
        />
      )}

      {/* Commit Changes Dialog */}
      {committingSkill && (
        <CommitChangesDialog
          isOpen={committingSkill !== null}
          skill={committingSkill}
          onClose={() => setCommittingSkill(null)}
          onSuccess={() => {
            showToast(`Changes committed successfully for "${committingSkill.name}"!`, 'success');
            // Clear from uncommitted changes set
            if (committingSkill) {
              setSkillsWithUncommittedChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(committingSkill.path);
                return newSet;
              });
            }
            setCommittingSkill(null);
            setUncommittedResetTrigger(prev => prev + 1); // Signal SkillEditorFull to reset
            loadSkills(); // Refresh skill list
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={state.config}
        onSave={handleSaveSettings}
        onDirectoryAdded={handleProjectDirectoryAdded}
      />
    </AppContext.Provider>
  );
}
