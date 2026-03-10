/**
 * Main Application Component
 *
 * Root component with React Context for state management
 */

import React, { createContext, useReducer, useEffect, useState } from 'react';
import type { Configuration, Skill, UIState, FilterSource, SortBy } from '../shared/types';
import { ipcClient } from './services/ipcClient';
import SetupDialog from './components/SetupDialog';
import SkillList from './components/SkillList';
import CreateSkillDialog from './components/CreateSkillDialog';
import SkillEditor from './components/SkillEditor';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import Settings from './components/Settings';
import ToastContainer, { ToastMessage } from './components/ToastContainer';

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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null);

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

        // Start file watcher
        await ipcClient.startWatching();

        // Subscribe to file system changes
        ipcClient.onFSChange(async (event) => {
          console.log('File system change detected:', event);
          await loadSkills();
        });

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
  async function loadSkills(): Promise<void> {
    if (!state.config) return;

    try {
      const skills = await ipcClient.listSkills(state.config);
      dispatch({ type: 'SET_SKILLS', payload: skills });
    } catch (error) {
      console.error('Failed to load skills:', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }

  /**
   * Handle setup completion
   */
  const handleSetupComplete = async (projectDirectory: string): Promise<void> => {
    try {
      const config = await ipcClient.saveConfig({ projectDirectory });
      dispatch({ type: 'SET_CONFIG', payload: config });
      setShowSetup(false);

      // Start file watcher
      await ipcClient.startWatching();

      // Subscribe to file system changes
      ipcClient.onFSChange(async (event) => {
        console.log('File system change detected:', event);
        await loadSkills();
      });
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
      const updatedConfig = await ipcClient.saveConfig(settings);

      // Update local state
      dispatch({ type: 'SET_CONFIG', payload: updatedConfig });

      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  /**
   * Render loading state
   */
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (state.error && !showSetup) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="max-w-md p-6 bg-slate-800 rounded-lg border border-slate-700">
          <div className="text-red-400 mb-4">{state.error}</div>
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
      <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
        <header className="border-b border-slate-700 p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">skillsMN</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="btn btn-secondary flex items-center gap-2"
            aria-label="Open settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </button>
        </header>
        <main className="flex-1 overflow-hidden">
          <SkillList
            skills={state.skills}
            onSkillClick={(skill) => {
              setEditingSkill(skill);
            }}
            onSkillSelect={(skill) => {
              setSelectedSkillPath(skill.path);
            }}
            onCreateSkill={() => setShowCreateDialog(true)}
            onDeleteSkill={(skill) => {
              setDeletingSkill(skill);
            }}
            onOpenFolder={handleOpenFolder}
            selectedSkillPath={selectedSkillPath}
          />
        </main>
      </div>

      {/* Create Skill Dialog */}
      <CreateSkillDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateSkill={handleCreateSkill}
        defaultDirectory={state.config?.defaultInstallDirectory || 'project'}
      />

      {/* Skill Editor */}
      {editingSkill && (
        <SkillEditor
          skill={editingSkill}
          onClose={() => setEditingSkill(null)}
          onSave={handleSaveSkill}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deletingSkill !== null}
        skill={deletingSkill}
        onClose={() => setDeletingSkill(null)}
        onConfirm={handleDeleteSkill}
      />

      {/* Settings Dialog */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={state.config}
        onSave={handleSaveSettings}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}
