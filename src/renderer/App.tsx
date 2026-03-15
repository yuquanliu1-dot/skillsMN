/**
 * Main Application Component
 *
 * Root component with React Context for state management
 */

import React, { createContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import type { Configuration, Skill, UIState, FilterSource, SortBy, PrivateSkill, PrivateRepo } from '../shared/types';
import { ipcClient } from './services/ipcClient';
import SetupDialog from './components/SetupDialog';
import SkillList from './components/SkillList';
import CreateSkillDialog from './components/CreateSkillDialog';
import { lazy, Suspense } from 'react';
const SkillEditor = lazy(() => import('./components/SkillEditor'));
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import Settings from './components/Settings';
import ToastContainer, { ToastMessage } from './components/ToastContainer';
import PrivateRepoList from './components/PrivateRepoList';
import Sidebar, { ViewType } from './components/Sidebar';
import { RegistrySearchPanel } from './components/RegistrySearchPanel';
import { AISkillCreationDialog } from './components/AISkillCreationDialog';
import DirectoryChangeDialog from './components/DirectoryChangeDialog';

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
  loadSkills: () => Promise<void>;
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
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('skills');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null);

  // Ref to store latest loadSkills function for file watcher callback
  const loadSkillsRef = useRef<() => Promise<void>>(async () => {});
  const [showAICreationDialog, setShowAICreationDialog] = useState(false);
  const [aiCreationDirectory, setAICreationDirectory] = useState<'project' | 'global'>('project');
  const [showDirectoryChangeDialog, setShowDirectoryChangeDialog] = useState(false);
  const [viewingPrivateSkill, setViewingPrivateSkill] = useState<{
    skill: PrivateSkill;
    repo: PrivateRepo;
    content: string;
  } | null>(null);
  const [viewingDiscoverSkill, setViewingDiscoverSkill] = useState<{
    skill: any;
    content: string;
  } | null>(null);

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

        // Check if setup is needed
        if (!config.projectDirectory) {
          setShowSetup(true);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Verify project directory still exists (T122)
        try {
          const response = await window.electronAPI.listSkills(config);
          if (!response.success) {
            // Project directory might be missing or inaccessible
            if (response.error?.message.includes('does not exist') || response.error?.message.includes('not found')) {
              showToast('Project directory not found. Please reconfigure.', 'error');
              setShowSetup(true);
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to verify project directory:', err);
          // Continue anyway - the directory might become available later
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
   */
  useEffect(() => {
    if (state.config?.projectDirectory) {
      loadSkills();
    }
  }, [state.config?.projectDirectory]);

  /**
   * Global keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ctrl+N: Create new skill
      if ((event.ctrlKey || event.metaKey) && event.key === 'n' && !event.shiftKey) {
        event.preventDefault();
        if (!showSetup && state.config?.projectDirectory) {
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
        if (!showSetup && state.config?.projectDirectory) {
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
  }, [showSetup, state.config?.projectDirectory, selectedSkillPath, state.skills]);

  /**
   * Load skills from file system
   */
  const loadSkills = useCallback(async (): Promise<void> => {
    if (!state.config) {
      console.log('⚠️ [loadSkills] No config, skipping');
      return;
    }

    try {
      console.log('🔄 [loadSkills] Starting to load skills...');
      const skills = await ipcClient.listSkills(state.config);
      console.log(`✅ [loadSkills] Loaded ${skills.length} skills`);
      dispatch({ type: 'SET_SKILLS', payload: skills });
    } catch (error) {
      console.error('❌ [loadSkills] Failed to load skills:', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, [state.config]);

  // Keep ref updated with latest loadSkills function
  loadSkillsRef.current = loadSkills;

  /**
   * Handle setup completion
   */
  const handleSetupComplete = async (projectDirectory: string): Promise<void> => {
    try {
      const config = await ipcClient.saveConfig({ projectDirectory });
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
   * Handle create skill
   */
  const handleCreateSkill = async (name: string, directory: 'project' | 'global'): Promise<void> => {
    try {
      const response = await window.electronAPI.createSkill(name, directory);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create skill');
      }

      // Refresh skill list
      await loadSkills();

      // Show success notification
      showToast(`Skill "${name}" created successfully`, 'success');

      console.log('Skill created successfully:', name);
    } catch (error) {
      console.error('Failed to create skill:', error);
      showToast(`Failed to create skill: ${(error as Error).message}`, 'error');
      throw error;
    }
  };

  /**
   * Handle save skill content
   */
  const handleSaveSkill = async (content: string, loadedLastModified?: number): Promise<void> => {
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
   * Handle change project directory
   */
  const handleChangeProjectDirectory = async (newDirectory: string): Promise<void> => {
    try {
      const config = await ipcClient.saveConfig({ projectDirectory: newDirectory });
      dispatch({ type: 'SET_CONFIG', payload: config });
      setShowDirectoryChangeDialog(false);

      // Reload skills for the new directory
      await loadSkills();

      showToast('Project directory changed successfully', 'success');
    } catch (error) {
      console.error('Failed to change project directory:', error);
      showToast(`Failed to change directory: ${(error as Error).message}`, 'error');
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
    try {
      // Fetch skill content from the registry
      const response = await window.electronAPI.getRegistrySkillContent(
        skill.source,
        skill.skillId
      );

      if (response.success && response.data) {
        setViewingDiscoverSkill({
          skill,
          content: response.data,
        });
      } else {
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
          onChangeProjectDirectory={() => setShowDirectoryChangeDialog(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Skills List - Column 2 (flexible) */}
          <div className="flex-1 max-w-[360px] border-r border-gray-200 bg-white overflow-hidden flex flex-col">
            {/* Keep all views mounted but hidden to preserve state */}
            <div style={{ display: currentView === 'skills' ? 'flex' : 'none' }} className="flex-1 flex flex-col overflow-hidden">
              <SkillList
                skills={state.skills}
                onSkillClick={(skill) => setEditingSkill(skill)}
                onSkillSelect={(skill) => setSelectedSkillPath(skill.path)}
                onCreateSkill={() => setShowCreateDialog(true)}
                onDeleteSkill={(skill) => setDeletingSkill(skill)}
                onOpenFolder={handleOpenFolder}
                selectedSkillPath={selectedSkillPath}
              />
            </div>

            <div style={{ display: currentView === 'discover' ? 'flex' : 'none' }} className="flex-1 flex flex-col overflow-hidden">
              <RegistrySearchPanel
                config={state.config}
                onInstallComplete={loadSkills}
                onSkillClick={handleViewDiscoverSkill}
              />
            </div>

            <div style={{ display: currentView === 'private-repos' ? 'flex' : 'none' }} className="flex-1 flex flex-col overflow-hidden">
              <PrivateRepoList
                onSkillClick={handleViewPrivateSkill}
              />
            </div>
          </div>

          {/* Detail Panel - Column 3 (adaptive width) */}
          <div className="flex-1 border-l border-gray-200 bg-white overflow-hidden">
            {/* Skills View - Show editing skill or empty state */}
            {currentView === 'skills' && editingSkill ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-text-muted">Loading editor...</div>
                  </div>
                }
              >
                <SkillEditor
                  skill={editingSkill}
                  onClose={() => setEditingSkill(null)}
                  onSave={handleSaveSkill}
                  isInline={true}
                  config={state.config?.skillEditor}
                />
              </Suspense>
            ) : currentView === 'skills' && !editingSkill ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">No Skill Selected</p>
                  <p className="text-sm text-gray-400 mt-2">Select a skill to view details</p>
                </div>
              </div>
            ) : null}

            {/* Discover View - Show discover skill or empty state */}
            {currentView === 'discover' && viewingDiscoverSkill ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {viewingDiscoverSkill.skill.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {viewingDiscoverSkill.skill.source}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingDiscoverSkill(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close preview"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="text-text-muted">Loading editor...</div>
                      </div>
                    }
                  >
                    <SkillEditor
                      skill={{
                        path: viewingDiscoverSkill.skill.skillId,
                        name: viewingDiscoverSkill.skill.name,
                        source: 'project',
                        lastModified: new Date(),
                        resourceCount: 0,
                      }}
                      content={viewingDiscoverSkill.content}
                      onClose={() => setViewingDiscoverSkill(null)}
                      onSave={async () => {
                        showToast('Registry skills are read-only. Install them to edit.', 'info');
                      }}
                      isInline={true}
                      readOnly={true}
                      config={state.config?.skillEditor}
                    />
                  </Suspense>
                </div>
              </div>
            ) : currentView === 'discover' && !viewingDiscoverSkill ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium">No Skill Selected</p>
                  <p className="text-sm text-gray-400 mt-2">Search and select a skill to preview</p>
                </div>
              </div>
            ) : null}

            {/* Private Repos View - Show private skill or empty state */}
            {currentView === 'private-repos' && viewingPrivateSkill ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {viewingPrivateSkill.skill.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {viewingPrivateSkill.repo.displayName || `${viewingPrivateSkill.repo.owner}/${viewingPrivateSkill.repo.repo}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingPrivateSkill(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close preview"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="text-text-muted">Loading editor...</div>
                      </div>
                    }
                  >
                    <SkillEditor
                      skill={{
                        path: viewingPrivateSkill.skill.path,
                        name: viewingPrivateSkill.skill.name,
                        source: 'project',
                        lastModified: new Date(),
                        resourceCount: 0,
                      }}
                      content={viewingPrivateSkill.content}
                      onClose={() => setViewingPrivateSkill(null)}
                      onSave={async () => {
                        showToast('Private repository skills are read-only. Install them to edit.', 'info');
                      }}
                      isInline={true}
                      readOnly={true}
                      config={state.config?.skillEditor}
                    />
                  </Suspense>
                </div>
              </div>
            ) : currentView === 'private-repos' && !viewingPrivateSkill ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-2-4a2 2 0 114 0v1h-4v-1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">No Skill Selected</p>
                  <p className="text-sm text-gray-400 mt-2">Select a skill from private repos to preview</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Create Skill Dialog */}
      <CreateSkillDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateSkill={handleCreateSkill}
        onOpenAICreation={(directory) => {
          setAICreationDirectory(directory);
          setShowCreateDialog(false);
          setShowAICreationDialog(true);
        }}
        defaultDirectory={state.config?.defaultInstallDirectory || 'project'}
      />

      {/* AI Skill Creation Dialog */}
      <AISkillCreationDialog
        isOpen={showAICreationDialog}
        onClose={() => setShowAICreationDialog(false)}
        directory={aiCreationDirectory}
        onSkillCreated={() => {
          loadSkills();
          showToast('Skill created successfully with AI!', 'success');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deletingSkill !== null}
        skill={deletingSkill}
        onClose={() => setDeletingSkill(null)}
        onConfirm={handleDeleteSkill}
      />

      {/* Directory Change Dialog */}
      {state.config?.projectDirectory && (
        <DirectoryChangeDialog
          isOpen={showDirectoryChangeDialog}
          currentDirectory={state.config.projectDirectory}
          onClose={() => setShowDirectoryChangeDialog(false)}
          onChangeDirectory={handleChangeProjectDirectory}
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
      />
    </AppContext.Provider>
  );
}
