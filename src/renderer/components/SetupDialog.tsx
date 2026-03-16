/**
 * Setup Wizard Dialog Component
 *
 * Multi-step setup wizard for first-time configuration
 * Step 1: Project Directory Configuration
 * Step 2: Private Repository Authentication (Optional)
 * Step 3: AI Configuration (Optional)
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { AIConfiguration, PrivateRepo } from '../../shared/types';

interface SetupDialogProps {
  onComplete: (projectDirectory: string) => Promise<void>;
}

type SetupStep = 'project-directory' | 'private-repos' | 'ai-config';

export default function SetupDialog({ onComplete }: SetupDialogProps): JSX.Element {
  // Step state
  const [currentStep, setCurrentStep] = useState<SetupStep>('project-directory');

  // Step 1: Project Directory
  const [directory, setDirectory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Step 2: Private Repos
  const [privateRepos, setPrivateRepos] = useState<PrivateRepo[]>([]);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoPAT, setNewRepoPAT] = useState('');
  const [newRepoDisplayName, setNewRepoDisplayName] = useState('');
  const [newRepoProvider, setNewRepoProvider] = useState<'github' | 'gitlab'>('github');
  const [newRepoInstanceUrl, setNewRepoInstanceUrl] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [testingRepoId, setTestingRepoId] = useState<string | null>(null);

  // Step 3: AI Configuration
  const [aiConfig, setAiConfig] = useState<AIConfiguration | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAITestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  // Load AI config when AI step is shown
  useEffect(() => {
    if (currentStep === 'ai-config' && !aiConfig) {
      loadAIConfig();
    }
  }, [currentStep, aiConfig]);

  /**
   * Load AI configuration
   */
  const loadAIConfig = async () => {
    setIsLoadingAI(true);
    setError(null);
    try {
      const response = await window.electronAPI.getAIConfiguration();
      if (response.success && response.data) {
        setAiConfig(response.data);
        setAITestResult(null);
      } else {
        // Create default AI config if none exists
        setAiConfig({
          provider: 'anthropic',
          apiKey: '',
          model: 'claude-sonnet-4-6',
          streamingEnabled: true,
          timeout: 120000,
          maxRetries: 3,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load AI configuration';
      setError(message);
      console.error('Load AI config error:', err);
      // Create default config on error
      setAiConfig({
        provider: 'anthropic',
        apiKey: '',
        model: 'claude-sonnet-4-6',
        streamingEnabled: true,
        timeout: 120000,
        maxRetries: 3,
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  /**
   * Handle browse for directory
   */
  const handleBrowse = useCallback(async () => {
    try {
      const response = await window.electronAPI.selectDirectory();
      if (response.success && response.data && !response.data.canceled && response.data.filePaths.length > 0) {
        setDirectory(response.data.filePaths[0]);
        setError(null);
      }
    } catch (err) {
      setError('Failed to open directory browser');
      console.error('Browse error:', err);
    }
  }, []);

  /**
   * Validate directory is a Claude project
   */
  const validateDirectory = useCallback(async (dir: string): Promise<boolean> => {
    if (!dir) {
      setError('Please select a directory');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const cleanDir = dir.replace(/[\\/]+$/, '');
      const testConfig = {
        projectDirectory: cleanDir,
        projectDirectories: [cleanDir],
        defaultInstallDirectory: 'project' as const,
        editorDefaultMode: 'edit' as const,
        autoRefresh: true,
      };

      const skills = await window.electronAPI.listSkills(testConfig);

      if (!skills.success) {
        setError('Invalid Claude project directory. The directory must contain a .claude folder.');
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate directory';
      setError(message);
      console.error('Validation error:', err);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Handle add private repository
   */
  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRepo(true);
    setError(null);

    try {
      const response = await window.electronAPI.addPrivateRepo({
        url: newRepoUrl,
        pat: newRepoPAT,
        displayName: newRepoDisplayName || undefined,
        provider: newRepoProvider,
        instanceUrl: newRepoInstanceUrl || undefined,
      });

      if (response.success && response.data) {
        setPrivateRepos([...privateRepos, response.data]);
        setNewRepoUrl('');
        setNewRepoPAT('');
        setNewRepoDisplayName('');
        setNewRepoProvider('github');
        setNewRepoInstanceUrl('');
        setShowAddRepoForm(false);
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
   * Handle test AI connection
   */
  const handleTestAIConnection = async () => {
    if (!aiConfig) return;

    setIsTestingAI(true);
    setAITestResult(null);
    setError(null);

    try {
      const startTime = Date.now();
      const response = await window.electronAPI.testAIConnection(aiConfig);
      const latency = Date.now() - startTime;

      if (response.success) {
        setAITestResult({ success: true, latency });
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
  };

  /**
   * Handle save AI configuration
   */
  const handleSaveAIConfig = async () => {
    if (!aiConfig) return;

    setIsSavingAI(true);
    setError(null);

    try {
      const response = await window.electronAPI.saveAIConfiguration(aiConfig);
      if (!response.success) {
        setError(response.error?.message || 'Failed to save AI configuration');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save AI configuration';
      setError(message);
      console.error('Save AI config error:', err);
    } finally {
      setIsSavingAI(false);
    }
  };

  /**
   * Handle next step
   */
  const handleNext = async () => {
    if (currentStep === 'project-directory') {
      const isValid = await validateDirectory(directory);
      if (!isValid) return;
      setCurrentStep('private-repos');
    } else if (currentStep === 'private-repos') {
      setCurrentStep('ai-config');
    } else if (currentStep === 'ai-config') {
      // Save AI config if provided
      if (aiConfig && aiConfig.apiKey) {
        await handleSaveAIConfig();
      }
      // Complete setup
      setIsCompleting(true);
      try {
        await onComplete(directory);
      } catch (err) {
        setError('Failed to save configuration');
        console.error('Complete error:', err);
      } finally {
        setIsCompleting(false);
      }
    }
  };

  /**
   * Handle skip current step
   */
  const handleSkip = () => {
    setError(null);
    if (currentStep === 'private-repos') {
      setCurrentStep('ai-config');
    } else if (currentStep === 'ai-config') {
      // Complete setup
      setIsCompleting(true);
      onComplete(directory).catch(err => {
        setError('Failed to save configuration');
        console.error('Complete error:', err);
        setIsCompleting(false);
      });
    }
  };

  /**
   * Handle back step
   */
  const handleBack = () => {
    setError(null);
    if (currentStep === 'private-repos') {
      setCurrentStep('project-directory');
    } else if (currentStep === 'ai-config') {
      setCurrentStep('private-repos');
    }
  };

  /**
   * Get step number for display
   */
  const getStepNumber = () => {
    switch (currentStep) {
      case 'project-directory': return 1;
      case 'private-repos': return 2;
      case 'ai-config': return 3;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-slate-900">
              Welcome to skillsMN
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Step {getStepNumber()} of 3</span>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${currentStep === 'project-directory' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentStep === 'private-repos' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentStep === 'ai-config' ? 'bg-blue-600' : 'bg-slate-300'}`} />
              </div>
            </div>
          </div>
          <p className="text-slate-600">
            {currentStep === 'project-directory' && 'Configure your project directory to get started'}
            {currentStep === 'private-repos' && 'Add private repositories (optional)'}
            {currentStep === 'ai-config' && 'Configure AI settings (optional)'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Project Directory */}
          {currentStep === 'project-directory' && (
            <div>
              <div className="mb-4">
                <label htmlFor="directory" className="block text-sm font-medium text-slate-700 mb-2">
                  Claude Project Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="directory"
                    value={directory}
                    onChange={(e) => {
                      setDirectory(e.target.value);
                      setError(null);
                    }}
                    placeholder="/path/to/your/project"
                    className="input flex-1"
                    disabled={isValidating || isCompleting}
                  />
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="btn btn-secondary"
                    disabled={isValidating || isCompleting}
                  >
                    Browse
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Tip:</strong> Select a directory that contains a{' '}
                  <code className="px-1 py-0.5 bg-slate-100 rounded text-blue-600">.claude</code> folder.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Private Repositories */}
          {currentStep === 'private-repos' && (
            <div>
              {/* Add Button */}
              {!showAddRepoForm && (
                <button
                  onClick={() => setShowAddRepoForm(true)}
                  className="btn btn-primary btn-sm mb-4"
                  disabled={isAddingRepo}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Repository
                </button>
              )}

              {/* Add Form */}
              {showAddRepoForm && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Add Private Repository</h3>
                  <form onSubmit={handleAddRepo}>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
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

                      {newRepoProvider === 'gitlab' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Instance URL</label>
                          <input
                            type="text"
                            value={newRepoInstanceUrl}
                            onChange={(e) => setNewRepoInstanceUrl(e.target.value)}
                            placeholder="https://gitlab.com"
                            className="input w-full"
                            disabled={isAddingRepo}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Repository URL</label>
                        <input
                          type="text"
                          value={newRepoUrl}
                          onChange={(e) => setNewRepoUrl(e.target.value)}
                          placeholder={newRepoProvider === 'github' ? 'https://github.com/owner/repo' : 'https://gitlab.com/owner/repo'}
                          className="input w-full"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Personal Access Token (PAT)</label>
                        <input
                          type="password"
                          value={newRepoPAT}
                          onChange={(e) => setNewRepoPAT(e.target.value)}
                          placeholder="ghp_... or glpat-..."
                          className="input w-full"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name (Optional)</label>
                        <input
                          type="text"
                          value={newRepoDisplayName}
                          onChange={(e) => setNewRepoDisplayName(e.target.value)}
                          placeholder="My Private Skills"
                          className="input w-full"
                          disabled={isAddingRepo}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRepoForm(false);
                          setNewRepoUrl('');
                          setNewRepoPAT('');
                          setNewRepoDisplayName('');
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

              {/* Repo List */}
              {privateRepos.length > 0 && (
                <div className="space-y-2">
                  {privateRepos.map((repo) => (
                    <div key={repo.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {repo.displayName || `${repo.owner}/${repo.repo}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{repo.url}</p>
                        </div>
                        <span className="text-xs text-slate-400 capitalize">{repo.provider}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {privateRepos.length === 0 && !showAddRepoForm && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <p className="text-sm text-slate-500">No private repositories configured yet</p>
                  <p className="text-xs text-slate-400 mt-1">You can skip this step or add repositories later in Settings</p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AI Configuration */}
          {currentStep === 'ai-config' && (
            <div>
              {isLoadingAI ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : aiConfig ? (
                <div className="space-y-4">
                  {/* API Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">API Configuration</h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
                      <input
                        type="password"
                        value={aiConfig.apiKey}
                        onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                        placeholder="sk-ant-..."
                        className="input w-full"
                        disabled={isSavingAI}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
                        <select
                          value={aiConfig.model}
                          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                          className="input w-full"
                          disabled={isSavingAI}
                        >
                          <option value="claude-opus-4-6">Claude Opus 4.6</option>
                          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL (Optional)</label>
                        <input
                          type="text"
                          value={aiConfig.baseUrl || ''}
                          onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value || undefined })}
                          placeholder="https://api.anthropic.com"
                          className="input w-full"
                          disabled={isSavingAI}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">Settings</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Timeout (ms)</label>
                        <input
                          type="number"
                          value={aiConfig.timeout}
                          onChange={(e) => setAiConfig({ ...aiConfig, timeout: parseInt(e.target.value) })}
                          className="input w-full"
                          disabled={isSavingAI}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Retries</label>
                        <input
                          type="number"
                          value={aiConfig.maxRetries}
                          onChange={(e) => setAiConfig({ ...aiConfig, maxRetries: parseInt(e.target.value) })}
                          className="input w-full"
                          disabled={isSavingAI}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="streamingEnabled"
                        checked={aiConfig.streamingEnabled}
                        onChange={(e) => setAiConfig({ ...aiConfig, streamingEnabled: e.target.checked })}
                        disabled={isSavingAI}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <label htmlFor="streamingEnabled" className="text-sm text-slate-700">Enable streaming responses</label>
                    </div>
                  </div>

                  {/* Test Connection */}
                  {aiConfig.apiKey && (
                    <div className="pt-4 border-t border-slate-200">
                      <button
                        onClick={handleTestAIConnection}
                        className="btn btn-secondary w-full"
                        disabled={isTestingAI || isSavingAI}
                      >
                        {isTestingAI ? 'Testing...' : 'Test Connection'}
                      </button>

                      {aiTestResult && (
                        <div className={`mt-3 p-3 rounded-md ${aiTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          {aiTestResult.success ? (
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm text-green-700">Connection successful ({aiTestResult.latency}ms)</span>
                            </div>
                          ) : (
                            <p className="text-sm text-red-600">{aiTestResult.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">Failed to load AI configuration</p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              {currentStep !== 'project-directory' && (
                <button
                  onClick={handleBack}
                  className="btn btn-secondary"
                  disabled={isValidating || isCompleting}
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {(currentStep === 'private-repos' || currentStep === 'ai-config') && (
                <button
                  onClick={handleSkip}
                  className="btn btn-secondary"
                  disabled={isValidating || isCompleting || isAddingRepo || isSavingAI}
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn btn-primary"
                disabled={
                  isValidating ||
                  isCompleting ||
                  isAddingRepo ||
                  isSavingAI ||
                  (currentStep === 'project-directory' && !directory)
                }
              >
                {isCompleting
                  ? 'Completing...'
                  : currentStep === 'ai-config'
                  ? 'Complete Setup'
                  : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
