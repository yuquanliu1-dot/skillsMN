/**
 * Settings Component
 *
 * Configuration panel for user preferences
 */

import { useState, useEffect, useCallback } from 'react';
import type { Configuration, InstallDirectory, EditorMode, PrivateRepo, AIConfiguration, SkillEditorConfig } from '../../shared/types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: Configuration | null;
  onSave: (config: Partial<Configuration>) => Promise<void>;
}

export default function Settings({ isOpen, onClose, config, onSave }: SettingsProps): JSX.Element | null {
  console.log('[Settings] Component rendering', { isOpen, activeTab: undefined });

  const [defaultInstallDirectory, setDefaultInstallDirectory] = useState<InstallDirectory>('project');
  const [editorDefaultMode, setEditorDefaultMode] = useState<EditorMode>('edit');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Project Directories State
  const [projectDirectories, setProjectDirectories] = useState<string[]>([]);
  const [showAddDirectoryForm, setShowAddDirectoryForm] = useState(false);
  const [newDirectoryPath, setNewDirectoryPath] = useState('');
  const [isAddingDirectory, setIsAddingDirectory] = useState(false);

  // Skill Editor Configuration State
  const [skillEditorConfig, setSkillEditorConfig] = useState<SkillEditorConfig>({
    fontSize: 14,
    theme: 'light',
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    showMinimap: false,
    lineNumbers: 'on',
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    tabSize: 2,
    wordWrap: true,
  });

  // Private Repository State
  const [privateRepos, setPrivateRepos] = useState<PrivateRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoPAT, setNewRepoPAT] = useState('');
  const [newRepoDisplayName, setNewRepoDisplayName] = useState('');
  const [newRepoProvider, setNewRepoProvider] = useState<'github' | 'gitlab'>('github');
  const [newRepoInstanceUrl, setNewRepoInstanceUrl] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [testingRepoId, setTestingRepoId] = useState<string | null>(null);
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPAT, setEditPAT] = useState('');
  const [isUpdatingRepo, setIsUpdatingRepo] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'skill-view' | 'repositories' | 'ai'>('general');

  console.log('[Settings] Current state', { activeTab, isOpen });

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<AIConfiguration | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAITestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  /**
   * Load current settings when dialog opens
   */
  useEffect(() => {
    if (isOpen && config) {
      setDefaultInstallDirectory(config.defaultInstallDirectory);
      setEditorDefaultMode(config.editorDefaultMode);
      setAutoRefresh(config.autoRefresh);
      setProjectDirectories(config.projectDirectories || []);

      // Load skill editor config with defaults
      if (config.skillEditor) {
        setSkillEditorConfig(config.skillEditor);
      }

      setError(null);
      setSuccess(null);
      setActiveTab('general');
    }
  }, [isOpen, config]);

  /**
   * Load private repositories
   */
  useEffect(() => {
    if (isOpen && activeTab === 'repositories') {
      loadPrivateRepos();
    }
  }, [isOpen, activeTab]);

  /**
   * Load AI configuration
   */
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      loadAIConfig();
    }
  }, [isOpen, activeTab]);

  const loadPrivateRepos = async () => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const response = await window.electronAPI.listPrivateRepos();
      if (response.success && response.data) {
        setPrivateRepos(response.data);
      } else {
        setError(response.error?.message || 'Failed to load repositories');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(message);
      console.error('Load repos error:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  /**
   * Handle add project directory
   */
  const handleAddDirectory = async () => {
    if (!newDirectoryPath.trim()) return;

    setIsAddingDirectory(true);
    setError(null);
    setSuccess(null);

    try {
      // Test directory validity by checking if it exists and contains .claude folder
      // We'll just check if the directory can be added - the validation happens on save
      // For now, we'll just add it directly
      const updatedDirectories = [...projectDirectories, newDirectoryPath];
      setProjectDirectories(updatedDirectories);

      // Save immediately
      await onSave({ projectDirectories: updatedDirectories });

      setSuccess('Project directory added successfully');
      setNewDirectoryPath('');
      setShowAddDirectoryForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add directory';
      setError(message);
      console.error('Add directory error:', err);
    } finally {
      setIsAddingDirectory(false);
    }
  };

  /**
   * Handle remove project directory
   */
  const handleRemoveDirectory = async (directoryPath: string) => {
    setError(null);
    setSuccess(null);

    try {
      const updatedDirectories = projectDirectories.filter(d => d !== directoryPath);
      setProjectDirectories(updatedDirectories);

      // Save immediately
      await onSave({ projectDirectories: updatedDirectories });

      setSuccess('Project directory removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove directory';
      setError(message);
      console.error('Remove directory error:', err);
    }
  };

  /**
   * Handle browse for directory
   */
  const handleBrowseDirectory = async () => {
    try {
      const response = await window.electronAPI.selectDirectory();
      if (response.success && response.data && !response.data.canceled && response.data.filePaths.length > 0) {
        setNewDirectoryPath(response.data.filePaths[0]);
      }
    } catch (err) {
      console.error('Browse directory error:', err);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave({
        defaultInstallDirectory,
        editorDefaultMode,
        autoRefresh,
        skillEditor: skillEditorConfig,
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Load AI configuration
   */
  const loadAIConfig = useCallback(async () => {
    setIsLoadingAI(true);
    setError(null);
    try {
      const response = await window.electronAPI.getAIConfiguration();
      if (response.success && response.data) {
        setAiConfig(response.data);
        setAITestResult(null);
      } else {
        setError(response.error?.message || 'Failed to load AI configuration');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load AI configuration';
      setError(message);
      console.error('Load AI config error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  /**
   * Load AI configuration when AI tab is opened
   */
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      loadAIConfig();
    }
  }, [isOpen, activeTab, loadAIConfig]);

  /**
   * Handle test AI connection
   */
  const handleTestAIConnection = useCallback(async () => {
    if (!aiConfig) return;

    setIsTestingAI(true);
    setAITestResult(null);
    setError(null);

    try {
      const startTime = Date.now();
      // Pass current config to test (allows testing before saving)
      const response = await window.electronAPI.testAIConnection(aiConfig);
      const latency = Date.now() - startTime;

      if (response.success) {
        setAITestResult({ success: true, latency });
        setSuccess('AI connection test successful');
      } else {
        setAITestResult({
          success: false,
          error: response.error?.message || 'Connection test failed'
        });
        setError(response.error?.message || 'Connection test failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setAITestResult({ success: false, error: message });
      setError(message);
      console.error('Test AI connection error:', err);
    } finally {
      setIsTestingAI(false);
    }
  }, [aiConfig]);

  /**
   * Handle save AI configuration
   */
  const handleSaveAIConfig = useCallback(async () => {
    if (!aiConfig) return;

    setIsSavingAI(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.saveAIConfiguration(aiConfig);
      if (response.success) {
        setSuccess('AI configuration saved successfully');
        setAITestResult(null);
      } else {
        setError(response.error?.message || 'Failed to save AI configuration');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save AI configuration';
      setError(message);
      console.error('Save AI config error:', err);
    } finally {
      setIsSavingAI(false);
    }
  }, [aiConfig]);

  /**
   * Handle add repository
   */
  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRepo(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.addPrivateRepo({
        url: newRepoUrl,
        pat: newRepoPAT,
        displayName: newRepoDisplayName || undefined,
        provider: newRepoProvider,
        instanceUrl: newRepoInstanceUrl || undefined,
      });

      if (response.success && response.data) {
        setSuccess('Repository added successfully');
        setNewRepoUrl('');
        setNewRepoPAT('');
        setNewRepoDisplayName('');
        setNewRepoProvider('github');
        setNewRepoInstanceUrl('');
        setShowAddRepoForm(false);
        await loadPrivateRepos();
      } else {
        setError(response.error?.message || 'Failed to add repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add repository';
      setError(message);
      console.error('Add repo error:', err);
    } finally {
      setIsAddingRepo(false);
    }
  };

  /**
   * Handle test repository connection
   */
  const handleTestRepo = async (repoId: string) => {
    setTestingRepoId(repoId);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.testPrivateRepoConnection(repoId);
      if (response.success && response.data) {
        if (response.data.valid) {
          setSuccess(`Connection successful: ${response.data.repository?.name}`);
        } else {
          setError(`Connection failed: ${response.data.error || 'Unknown error'}`);
        }
      } else {
        setError(response.error?.message || 'Failed to test connection');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test connection';
      setError(message);
      console.error('Test repo error:', err);
    } finally {
      setTestingRepoId(null);
    }
  };

  /**
   * Handle remove repository
   */
  const handleRemoveRepo = async (repoId: string) => {
    const repo = privateRepos.find(r => r.id === repoId);
    const repoName = repo?.displayName || `${repo?.owner}/${repo?.repo}` || 'this repository';

    if (!window.confirm(
      `Remove "${repoName}"?\n\n` +
      `Note: Locally installed skills from this repository will be preserved and can still be used.\n\n` +
      `You can re-add this repository later if needed.`
    )) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.removePrivateRepo(repoId);
      if (response.success) {
        setSuccess('Repository removed successfully. Installed skills have been preserved.');
        await loadPrivateRepos();
      } else {
        setError(response.error?.message || 'Failed to remove repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove repository';
      setError(message);
      console.error('Remove repo error:', err);
    }
  };

  /**
   * Handle edit repository - start editing
   */
  const handleStartEditRepo = (repo: PrivateRepo) => {
    setEditingRepoId(repo.id);
    setEditDisplayName(repo.displayName || '');
    setEditPAT('');
    setError(null);
    setSuccess(null);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setEditingRepoId(null);
    setEditDisplayName('');
    setEditPAT('');
  };

  /**
   * Handle save edit repository
   */
  const handleSaveEditRepo = async (repoId: string) => {
    setIsUpdatingRepo(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: Partial<PrivateRepo> = {};

      if (editDisplayName.trim()) {
        updates.displayName = editDisplayName.trim();
      }

      if (editPAT.trim()) {
        // PAT will be encrypted by the backend service
        updates.patEncrypted = editPAT.trim();
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setIsUpdatingRepo(false);
        return;
      }

      const response = await window.electronAPI.updatePrivateRepo(repoId, updates);
      if (response.success) {
        setSuccess('Repository updated successfully');
        setEditingRepoId(null);
        setEditDisplayName('');
        setEditPAT('');
        await loadPrivateRepos();
      } else {
        setError(response.error?.message || 'Failed to update repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update repository';
      setError(message);
      console.error('Update repo error:', err);
    } finally {
      setIsUpdatingRepo(false);
    }
  };

  /**
   * Handle escape key to close
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={() => {
                console.log('[Settings] General tab clicked');
                setActiveTab('general');
              }}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              General
            </button>
            <button
              onClick={() => {
                console.log('[Settings] Skill View tab clicked');
                setActiveTab('skill-view');
              }}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'skill-view'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Skill View
            </button>
            <button
              onClick={() => {
                console.log('[Settings] Private Repositories tab clicked');
                setActiveTab('repositories');
              }}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'repositories'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Private Repositories
            </button>
            <button
              onClick={() => {
                console.log('[Settings] AI Configuration tab clicked');
                setActiveTab('ai');
              }}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              AI Configuration
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
          {/* Project Directories */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Project Directories
              </label>
              <button
                type="button"
                onClick={() => setShowAddDirectoryForm(!showAddDirectoryForm)}
                className="btn btn-secondary btn-sm"
                disabled={isAddingDirectory}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Directory
              </button>
            </div>

            {/* Add Directory Form */}
            {showAddDirectoryForm && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDirectoryPath}
                    onChange={(e) => setNewDirectoryPath(e.target.value)}
                    placeholder="Select or enter directory path..."
                    className="input flex-1 text-sm"
                    disabled={isAddingDirectory}
                  />
                  <button
                    type="button"
                    onClick={handleBrowseDirectory}
                    className="btn btn-secondary btn-sm"
                    disabled={isAddingDirectory}
                  >
                    Browse
                  </button>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDirectoryForm(false);
                      setNewDirectoryPath('');
                    }}
                    className="btn btn-secondary btn-sm"
                    disabled={isAddingDirectory}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddDirectory}
                    className="btn btn-primary btn-sm"
                    disabled={isAddingDirectory || !newDirectoryPath.trim()}
                  >
                    {isAddingDirectory ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Directory List */}
            {projectDirectories.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No project directories configured. Add a directory to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {projectDirectories.map((dir) => (
                  <div
                    key={dir}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <span className="text-sm text-slate-700 font-mono truncate flex-1" title={dir}>
                      {dir}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDirectory(dir)}
                      className="btn btn-danger btn-sm ml-2"
                      title="Remove directory"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Install Directory */}
          <div className="mb-3">
            <label
              htmlFor="default-install-directory"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Default Install Directory
            </label>
            <select
              id="default-install-directory"
              value={defaultInstallDirectory}
              onChange={(e) => setDefaultInstallDirectory(e.target.value as InstallDirectory)}
              className="select w-full"
              disabled={isSaving}
            >
              <option value="project">Project Directory</option>
              <option value="global">Global Directory</option>
            </select>
          </div>

          {/* Editor Default Mode */}
          <div className="mb-3">
            <label
              htmlFor="editor-default-mode"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Editor Default Mode
            </label>
            <select
              id="editor-default-mode"
              value={editorDefaultMode}
              onChange={(e) => setEditorDefaultMode(e.target.value as EditorMode)}
              className="select w-full"
              disabled={isSaving}
            >
              <option value="edit">Edit Mode</option>
              <option value="preview">Preview Mode</option>
            </select>
          </div>

          {/* Auto Refresh */}
          <div className="mb-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                disabled={isSaving}
              />
              <span className="text-sm text-slate-700">Auto-refresh skill list on file changes</span>
            </label>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2.5">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Create new skill</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">Ctrl+N</kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Save skill</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">Ctrl+S</kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Close editor</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">Ctrl+W</kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Delete skill</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">Delete</kbd>
              </div>
              <div className="flex items-center justify-between text-sm col-span-2">
                <span className="text-slate-600">Close dialog</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">Escape</kbd>
              </div>
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Skill View Tab */}
        {activeTab === 'skill-view' && (
          <div className="space-y-6">
            {/* Skill Editor Configuration */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3 border-b border-slate-200 pb-2">
                Skill Editor
              </h3>
              <div className="space-y-3">
                {/* Font Size and Theme - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Font Size
                    </label>
                    <select
                      value={skillEditorConfig.fontSize}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, fontSize: parseInt(e.target.value) })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="10">10px - Very Small</option>
                      <option value="11">11px - Small</option>
                      <option value="12">12px - Compact</option>
                      <option value="13">13px - Medium Small</option>
                      <option value="14">14px - Default</option>
                      <option value="15">15px - Medium</option>
                      <option value="16">16px - Large</option>
                      <option value="18">18px - Extra Large</option>
                      <option value="20">20px - Big</option>
                      <option value="22">22px - Very Big</option>
                      <option value="24">24px - Huge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Theme
                    </label>
                    <select
                      value={skillEditorConfig.theme}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, theme: e.target.value as 'light' | 'dark' })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                {/* Tab Size and Line Numbers - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tab Size
                    </label>
                    <input
                      type="number"
                      value={skillEditorConfig.tabSize}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, tabSize: parseInt(e.target.value) })}
                      min={2}
                      max={8}
                      step={2}
                      className="input w-full"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-slate-500 mt-1">2 - 8</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Line Numbers
                    </label>
                    <select
                      value={skillEditorConfig.lineNumbers}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, lineNumbers: e.target.value as 'on' | 'off' | 'relative' })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                      <option value="relative">Relative</option>
                    </select>
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Font Family
                  </label>
                  <select
                    value={skillEditorConfig.fontFamily}
                    onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, fontFamily: e.target.value })}
                    className="select w-full"
                    disabled={isSaving}
                  >
                    <option value="'Fira Code', 'Cascadia Code', 'Consolas', monospace">Fira Code (Recommended)</option>
                    <option value="'Cascadia Code', 'Consolas', monospace">Cascadia Code</option>
                    <option value="'JetBrains Mono', 'Consolas', monospace">JetBrains Mono</option>
                    <option value="'Source Code Pro', 'Consolas', monospace">Source Code Pro</option>
                    <option value="Consolas, 'Courier New', monospace">Consolas (Windows)</option>
                    <option value="'Monaco', 'Menlo', monospace">Monaco (macOS)</option>
                    <option value="'Menlo', 'Monaco', monospace">Menlo (macOS)</option>
                    <option value="'Courier New', monospace">Courier New (Universal)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a monospace font for code editing
                  </p>
                </div>

                {/* Auto-save Options */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skillEditorConfig.autoSaveEnabled}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, autoSaveEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">Enable auto-save</span>
                  </label>

                  {skillEditorConfig.autoSaveEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Auto-save Delay (ms)
                      </label>
                      <input
                        type="number"
                        value={skillEditorConfig.autoSaveDelay}
                        onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, autoSaveDelay: parseInt(e.target.value) })}
                        min={500}
                        max={10000}
                        step={500}
                        className="input w-full"
                        disabled={isSaving}
                      />
                      <p className="text-xs text-slate-500 mt-1">500 - 10,000 (default: 2000)</p>
                    </div>
                  )}
                </div>

                {/* Editor Display Options */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skillEditorConfig.showMinimap}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, showMinimap: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">Show minimap</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skillEditorConfig.wordWrap}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, wordWrap: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">Enable word wrap</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Success message */}
            {success && activeTab === 'skill-view' && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'skill-view' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSaving(true);
                  setError(null);
                  setSuccess(null);
                  try {
                    await onSave({
                      skillEditor: skillEditorConfig,
                    });
                    setSuccess('Skill editor settings saved successfully');
                    setTimeout(() => {
                      onClose();
                    }, 1000);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to save settings';
                    setError(message);
                    console.error('Save skill editor settings error:', err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repositories' && (
          <div>
            {/* Add Repository Button */}
            <div className="mb-3">
              <button
                onClick={() => setShowAddRepoForm(!showAddRepoForm)}
                className="btn btn-primary btn-sm"
                disabled={isAddingRepo}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Repository
              </button>
            </div>

            {/* Add Repository Form */}
            {showAddRepoForm && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Add Private Repository</h3>
                <form onSubmit={handleAddRepo}>
                  <div className="space-y-3">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Provider
                      </label>
                      <select
                        value={newRepoProvider}
                        onChange={(e) => setNewRepoProvider(e.target.value as 'github' | 'gitlab')}
                        className="input w-full"
                        disabled={isAddingRepo}
                      >
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                      </select>
                    </div>

                    {/* Instance URL (only for GitLab) */}
                    {newRepoProvider === 'gitlab' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          GitLab Instance URL (optional)
                        </label>
                        <input
                          type="text"
                          value={newRepoInstanceUrl}
                          onChange={(e) => setNewRepoInstanceUrl(e.target.value)}
                          placeholder="https://gitlab.company.com (leave empty for GitLab.com)"
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Leave empty for GitLab.com, or enter your self-hosted GitLab URL
                        </p>
                      </div>
                    )}

                    {/* Repository URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Repository URL
                      </label>
                      <input
                        type="text"
                        value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        placeholder={
                          newRepoProvider === 'github'
                            ? 'https://github.com/owner/repo'
                            : newRepoInstanceUrl
                            ? `${newRepoInstanceUrl}/owner/repo`
                            : 'https://gitlab.com/owner/repo'
                        }
                        className="input w-full"
                        disabled={isAddingRepo}
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {newRepoProvider === 'github'
                          ? 'Enter your GitHub repository URL'
                          : 'Enter your GitLab repository URL'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Personal Access Token */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Personal Access Token
                        </label>
                        <input
                          type="password"
                          value={newRepoPAT}
                          onChange={(e) => setNewRepoPAT(e.target.value)}
                          placeholder={newRepoProvider === 'github' ? 'ghp_xxxx...' : 'glpat-xxxx...'}
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                          required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {newRepoProvider === 'github'
                            ? 'GitHub PAT with "repo" scope'
                            : 'GitLab PAT with "read_api" scope'}
                        </p>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={newRepoDisplayName}
                          onChange={(e) => setNewRepoDisplayName(e.target.value)}
                          placeholder="My Team Skills"
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRepoForm(false);
                        setNewRepoProvider('github');
                        setNewRepoInstanceUrl('');
                      }}
                      className="btn btn-secondary btn-sm"
                      disabled={isAddingRepo}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isAddingRepo || !newRepoUrl || !newRepoPAT}
                    >
                      {isAddingRepo ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Success message */}
            {success && activeTab === 'repositories' && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'repositories' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Repository List */}
            {isLoadingRepos ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : privateRepos.length === 0 ? (
              <div className="text-center py-6">
                <svg
                  className="mx-auto h-10 w-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-600">No repositories configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {privateRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {editingRepoId === repo.id ? (
                      // Edit Form
                      <div className="space-y-2.5">
                        <h4 className="text-sm font-medium text-slate-900">Edit Repository</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder={`${repo.owner}/${repo.repo}`}
                              className="input w-full text-sm"
                              disabled={isUpdatingRepo}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              New PAT
                            </label>
                            <input
                              type="password"
                              value={editPAT}
                              onChange={(e) => setEditPAT(e.target.value)}
                              placeholder="Leave empty to keep"
                              className="input w-full text-sm"
                              disabled={isUpdatingRepo}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEditRepo(repo.id)}
                            disabled={isUpdatingRepo}
                            className="btn btn-primary btn-sm"
                          >
                            {isUpdatingRepo ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdatingRepo}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal Display
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <svg
                              className="w-4 h-4 text-slate-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <h4 className="text-sm font-medium text-slate-900 truncate">
                              {repo.displayName || `${repo.owner}/${repo.repo}`}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                (repo.provider || 'github') === 'github'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-orange-100 text-orange-600'
                              }`}
                            >
                              {(repo.provider || 'github') === 'github' ? 'GitHub' : 'GitLab'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate mb-1">{repo.url}</p>
                          {repo.instanceUrl && (
                            <p className="text-xs text-slate-500 truncate mb-1">
                              Instance: {repo.instanceUrl}
                            </p>
                          )}
                          {repo.description && (
                            <p className="text-xs text-slate-500 truncate mb-1">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{repo.defaultBranch || 'main'}</span>
                            {repo.skillCount !== undefined && (
                              <span>{repo.skillCount} skills</span>
                            )}
                            {repo.lastSyncTime && (
                              <span>{new Date(repo.lastSyncTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleTestRepo(repo.id)}
                            disabled={testingRepoId === repo.id}
                            className="btn btn-secondary btn-sm"
                            title="Test connection"
                          >
                            {testingRepoId === repo.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600"></div>
                            ) : (
                              'Test'
                            )}
                          </button>
                          <button
                            onClick={() => handleStartEditRepo(repo)}
                            className="btn btn-secondary btn-sm"
                            title="Edit repository"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveRepo(repo.id)}
                            className="btn btn-secondary btn-sm text-red-600 hover:text-red-700"
                            title="Remove repository"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Configuration Tab */}
        {activeTab === 'ai' && (() => {
          console.log('[Settings] Rendering AI Configuration tab', { isLoadingAI, hasAiConfig: !!aiConfig });
          return (
          <div>
            {isLoadingAI ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : aiConfig ? (
              <div className="space-y-4">
                {/* API Configuration Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">API Configuration</h3>

                  {/* API Key - Full width */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="input w-full"
                      disabled={isSavingAI}
                    />
                  </div>

                  {/* Base URL and Model - Side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={aiConfig.baseUrl || ''}
                        onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value || undefined })}
                        placeholder="https://api.anthropic.com"
                        className="input w-full text-sm"
                        disabled={isSavingAI}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Model
                      </label>
                      <input
                        type="text"
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                        className="input w-full text-sm"
                        disabled={isSavingAI}
                        placeholder="claude-3-sonnet-20240229"
                      />
                    </div>
                  </div>
                </div>

                {/* Request Settings Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">Request Settings</h3>

                  {/* Timeout and Retries - Side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={aiConfig.timeout}
                        onChange={(e) => setAiConfig({ ...aiConfig, timeout: parseInt(e.target.value) })}
                        min={5000}
                        max={60000}
                        step={1000}
                        className="input w-full"
                        disabled={isSavingAI}
                      />
                      <p className="text-xs text-slate-500 mt-1">5,000 - 60,000</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Max Retries
                      </label>
                      <input
                        type="number"
                        value={aiConfig.maxRetries}
                        onChange={(e) => setAiConfig({ ...aiConfig, maxRetries: parseInt(e.target.value) })}
                        min={0}
                        max={5}
                        className="input w-full"
                        disabled={isSavingAI}
                      />
                      <p className="text-xs text-slate-500 mt-1">0 - 5 attempts</p>
                    </div>
                  </div>

                  {/* Streaming Toggle */}
                  <div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiConfig.streamingEnabled}
                        onChange={(e) => setAiConfig({ ...aiConfig, streamingEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                        disabled={isSavingAI}
                      />
                      <span className="text-sm text-slate-700">Enable streaming responses</span>
                    </label>
                  </div>
                </div>

                {/* Test Result */}
                {aiTestResult && (
                  <div className={`p-3 rounded-md ${
                    aiTestResult.success
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          aiTestResult.success ? 'text-green-400' : 'text-red-400'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {aiTestResult.success ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                      </svg>
                      <div className="text-sm">
                        {aiTestResult.success ? (
                          <p className="text-green-400">
                            Connection successful ({aiTestResult.latency}ms)
                          </p>
                        ) : (
                          <p className="text-red-400">{aiTestResult.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Success/Error messages */}
                {success && activeTab === 'ai' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-sm text-green-400">{success}</p>
                    </div>
                  </div>
                )}

                {error && activeTab === 'ai' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleTestAIConnection}
                    disabled={isTestingAI || !aiConfig.apiKey}
                    className="btn btn-secondary"
                  >
                    {isTestingAI ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAIConfig}
                    disabled={isSavingAI || !aiConfig.apiKey}
                    className="btn btn-primary"
                  >
                    {isSavingAI ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-700">AI not configured</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure your AI settings to enable AI-powered skill generation.
                </p>
              </div>
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
