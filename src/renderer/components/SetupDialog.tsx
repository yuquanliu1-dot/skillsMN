/**
 * Setup Wizard Dialog Component
 *
 * Multi-step setup wizard for first-time configuration
 * Step 1: Project Directory Configuration
 * Step 2: Private Repository Authentication (Optional)
 * Step 3: AI Configuration (Optional)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AIConfiguration, PrivateRepo } from '../../shared/types';

interface SetupDialogProps {
  onComplete: (projectDirectory: string) => Promise<void>;
}

type SetupStep = 'project-directory' | 'private-repos' | 'ai-config';

export default function SetupDialog({ onComplete }: SetupDialogProps): JSX.Element {
  const { t } = useTranslation();

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
  const [repoTestResults, setRepoTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

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

  // Load existing private repos when private repos step is shown
  useEffect(() => {
    if (currentStep === 'private-repos') {
      loadPrivateRepos();
    }
  }, [currentStep]);

  /**
   * Load existing private repositories configuration
   */
  const loadPrivateRepos = async () => {
    try {
      const response = await window.electronAPI.listPrivateRepos();
      if (response.success && response.data) {
        setPrivateRepos(response.data);
      }
    } catch (err) {
      console.error('Load private repos error:', err);
    }
  };

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
          model: '',
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
        model: '',
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
   * Validate directory exists and is accessible
   * Note: We no longer require .claude folder - user can select any directory as skills storage
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

      // Basic validation - check if the path looks valid (not just checking existence)
      // The actual directory will be created/used when skills are stored
      if (cleanDir.length < 1) {
        setError('Please enter a valid directory path');
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
   * Handle test repository connection
   */
  const handleTestRepoConnection = async (repoId: string) => {
    setTestingRepoId(repoId);
    setError(null);

    try {
      const response = await window.electronAPI.testPrivateRepoConnection(repoId);

      if (response.success && response.data) {
        setRepoTestResults(prev => ({
          ...prev,
          [repoId]: { success: response.data!.valid }
        }));
      } else {
        setRepoTestResults(prev => ({
          ...prev,
          [repoId]: {
            success: false,
            error: response.error?.message || 'Connection test failed'
          }
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setRepoTestResults(prev => ({
        ...prev,
        [repoId]: { success: false, error: message }
      }));
      console.error('Test repo connection error:', err);
    } finally {
      setTestingRepoId(null);
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative p-8 pb-6 border-b border-slate-100">
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {/* Logo/Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
                  {t('setup.welcome')}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{t('setup.setupDescription')}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl">
              <div className="flex gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      getStepNumber() === step
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg scale-110'
                        : getStepNumber() > step
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {getStepNumber() > step ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-semibold">{step}</span>
                      )}
                    </div>
                    {step < 3 && (
                      <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${
                        getStepNumber() > step ? 'bg-green-500' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step Title */}
          <div className="flex items-center gap-3 mt-4 pl-16">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentStep === 'project-directory' ? 'bg-blue-100' :
              currentStep === 'private-repos' ? 'bg-purple-100' : 'bg-green-100'
            }`}>
              {currentStep === 'project-directory' && (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
              {currentStep === 'private-repos' && (
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              )}
              {currentStep === 'ai-config' && (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {currentStep === 'project-directory' && t('setup.skillsDirectory')}
                {currentStep === 'private-repos' && t('setup.privateRepos')}
                {currentStep === 'ai-config' && t('setup.aiConfiguration')}
              </h3>
              <p className="text-sm text-slate-500">
                {currentStep === 'project-directory' && t('setup.skillsDirectoryDescription')}
                {currentStep === 'private-repos' && t('setup.privateReposDescription')}
                {currentStep === 'ai-config' && t('setup.aiConfigDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Step 1: Project Directory */}
          {currentStep === 'project-directory' && (
            <div className="animate-fadeIn">
              {/* Directory selection card */}
              {directory ? (
                <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-900 mb-1">{t('setup.selectedDirectory')}</p>
                      <p className="text-sm text-green-700 font-mono truncate" title={directory}>
                        {directory}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBrowse}
                      className="px-4 py-2 bg-white hover:bg-green-50 border-2 border-green-200 rounded-lg text-sm font-medium text-green-700 transition-all"
                      disabled={isValidating || isCompleting}
                    >
                      {t('setup.change')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="w-full mb-6 p-8 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-2 border-dashed border-blue-300 rounded-xl transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isValidating || isCompleting}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900 mb-1">
                        {t('setup.clickToSelectDirectory')}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t('setup.chooseFolderDescription')}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-shake">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-700 font-medium mt-1.5">{error}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">Quick Tip</p>
                    <p className="text-sm text-blue-700">
                      For project-level skills, the directory name is typically <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">skills</code>.
                      You can add multiple directories later from Settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Private Repositories */}
          {currentStep === 'private-repos' && (
            <div className="animate-fadeIn">
              {/* Add Button */}
              {!showAddRepoForm && (
                <button
                  onClick={() => setShowAddRepoForm(true)}
                  className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-2 border-dashed border-purple-300 rounded-xl text-purple-700 font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                  disabled={isAddingRepo}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Private Repository
                </button>
              )}

              {/* Add Form */}
              {showAddRepoForm && (
                <div className="mb-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Add Private Repository</h3>
                  </div>
                  <form onSubmit={handleAddRepo}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Provider</label>
                        <select
                          value={newRepoProvider}
                          onChange={(e) => setNewRepoProvider(e.target.value as 'github' | 'gitlab')}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                          disabled={isAddingRepo}
                        >
                          <option value="github">GitHub</option>
                          <option value="gitlab">GitLab</option>
                        </select>
                      </div>

                      {newRepoProvider === 'gitlab' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-2">Instance URL</label>
                          <input
                            type="text"
                            value={newRepoInstanceUrl}
                            onChange={(e) => setNewRepoInstanceUrl(e.target.value)}
                            placeholder="https://gitlab.com"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                            disabled={isAddingRepo}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Repository URL</label>
                        <input
                          type="text"
                          value={newRepoUrl}
                          onChange={(e) => setNewRepoUrl(e.target.value)}
                          placeholder={newRepoProvider === 'github' ? 'https://github.com/owner/repo' : 'https://gitlab.com/owner/repo'}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Personal Access Token (PAT)</label>
                        <input
                          type="password"
                          value={newRepoPAT}
                          onChange={(e) => setNewRepoPAT(e.target.value)}
                          placeholder="ghp_... or glpat-..."
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Display Name (Optional)</label>
                        <input
                          type="text"
                          value={newRepoDisplayName}
                          onChange={(e) => setNewRepoDisplayName(e.target.value)}
                          placeholder="My Private Skills"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                          disabled={isAddingRepo}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-6">
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
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 rounded-lg font-medium text-slate-700 transition-all"
                        disabled={isAddingRepo}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isAddingRepo || !newRepoUrl || !newRepoPAT}
                      >
                        {isAddingRepo ? 'Adding...' : 'Add Repository'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Repo List */}
              {privateRepos.length > 0 && (
                <div className="space-y-3">
                  {privateRepos.map((repo) => (
                    <div key={repo.id} className="p-4 bg-gradient-to-r from-white to-slate-50 border-2 border-slate-200 rounded-xl hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {repo.displayName || `${repo.owner}/${repo.repo}`}
                              </p>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                repo.provider === 'github' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {repo.provider}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-mono">{repo.url}</p>
                            {repoTestResults[repo.id] && (
                              <div className={`mt-2 text-xs flex items-center gap-1 ${
                                repoTestResults[repo.id].success ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {repoTestResults[repo.id].success ? (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Connection verified</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>{repoTestResults[repo.id].error || 'Connection failed'}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleTestRepoConnection(repo.id)}
                          disabled={testingRepoId === repo.id}
                          className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Test connection"
                        >
                          {testingRepoId === repo.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                              <span>Testing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>Test</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {privateRepos.length === 0 && !showAddRepoForm && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-slate-700 mb-2">No private repositories yet</p>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">You can skip this step and add repositories later from Settings</p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-700 font-medium mt-1.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AI Configuration */}
          {currentStep === 'ai-config' && (
            <div className="animate-fadeIn">
              {isLoadingAI ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Loading AI configuration...</p>
                  </div>
                </div>
              ) : aiConfig ? (
                <div className="space-y-6">
                  {/* API Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">API Configuration</h3>
                    </div>

                    <div className="pl-10 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">API Key</label>
                        <input
                          type="password"
                          value={aiConfig.apiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                          placeholder="sk-ant-..."
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                          disabled={isSavingAI}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-2">Model</label>
                          <input
                            type="text"
                            value={aiConfig.model}
                            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                            placeholder="claude-sonnet-4-6"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                            disabled={isSavingAI}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-2">Base URL (Optional)</label>
                          <input
                            type="text"
                            value={aiConfig.baseUrl || ''}
                            onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value || undefined })}
                            placeholder="https://api.anthropic.com"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                            disabled={isSavingAI}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">Advanced Settings</h3>
                    </div>

                    <div className="pl-10 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-2">Timeout (ms)</label>
                          <input
                            type="number"
                            value={aiConfig.timeout}
                            onChange={(e) => setAiConfig({ ...aiConfig, timeout: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                            disabled={isSavingAI}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-2">Max Retries</label>
                          <input
                            type="number"
                            value={aiConfig.maxRetries}
                            onChange={(e) => setAiConfig({ ...aiConfig, maxRetries: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                            disabled={isSavingAI}
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          id="streamingEnabled"
                          checked={aiConfig.streamingEnabled}
                          onChange={(e) => setAiConfig({ ...aiConfig, streamingEnabled: e.target.checked })}
                          disabled={isSavingAI}
                          className="w-5 h-5 rounded border-2 border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-900">Enable streaming responses</span>
                          <p className="text-xs text-slate-500 mt-0.5">Receive AI responses in real-time as they're generated</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Test Connection */}
                  {aiConfig.apiKey && (
                    <div className="pt-6 border-t-2 border-slate-100">
                      <button
                        onClick={handleTestAIConnection}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 border-2 border-green-300 rounded-xl font-medium text-green-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={isTestingAI || isSavingAI}
                      >
                        {isTestingAI ? (
                          <>
                            <div className="w-5 h-5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                            Testing Connection...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Test Connection
                          </>
                        )}
                      </button>

                      {aiTestResult && (
                        <div className={`mt-4 p-4 rounded-xl border-2 ${aiTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-fadeIn`}>
                          {aiTestResult.success ? (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-green-900">Connection Successful</p>
                                <p className="text-xs text-green-700 mt-0.5">Latency: {aiTestResult.latency}ms</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-red-900">Connection Failed</p>
                                <p className="text-xs text-red-700 mt-0.5">{aiTestResult.error}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-slate-700 mb-2">Failed to load AI configuration</p>
                  <p className="text-sm text-slate-500">Please try again or skip this step</p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-700 font-medium mt-1.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex items-center justify-between">
            <div>
              {currentStep !== 'project-directory' && (
                <button
                  onClick={handleBack}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-lg font-medium text-slate-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isValidating || isCompleting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {(currentStep === 'private-repos' || currentStep === 'ai-config') && (
                <button
                  onClick={handleSkip}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-lg font-medium text-slate-600 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isValidating || isCompleting || isAddingRepo || isSavingAI}
                >
                  Skip for Now
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
                disabled={
                  isValidating ||
                  isCompleting ||
                  isAddingRepo ||
                  isSavingAI ||
                  (currentStep === 'project-directory' && !directory)
                }
              >
                {isCompleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Completing...
                  </>
                ) : currentStep === 'ai-config' ? (
                  <>
                    Complete Setup
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
