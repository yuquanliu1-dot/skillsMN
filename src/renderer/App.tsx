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
   * Handle create skill
   */
  const handleCreateSkill = async (name: string, directory: 'project' | 'global'): Promise<void> => {
    try {
      const response = await window.electronAPI.createSkill(name, directory);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create skill');
      }

      // Refresh skill list
      await loadSkills();

      console.log('Skill created successfully:', name);
    } catch (error) {
      console.error('Failed to create skill:', error);
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
        </header>
        <main className="flex-1 overflow-hidden">
          <SkillList
            skills={state.skills}
            onSkillClick={(skill) => {
              console.log('Skill clicked:', skill.name);
              // TODO: Open skill editor (User Story 4)
            }}
            onCreateSkill={() => setShowCreateDialog(true)}
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
    </AppContext.Provider>
  );
}
