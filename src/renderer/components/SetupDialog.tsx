/**
 * Setup Wizard Dialog Component
 *
 * Simple, clean setup wizard matching the app's minimalist style
 * Step 1: Private Repository Authentication (Optional)
 * Step 2: AI Configuration (Optional)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AIConfiguration, PrivateRepo } from '../../shared/types';

interface SetupDialogProps {
  onComplete: () => Promise<void>;
}

type SetupStep = 'private-repos' | 'ai-config';

export default function SetupDialog({ onComplete }: SetupDialogProps): JSX.Element {
  const { t } = useTranslation();

  // Step state
  const [currentStep, setCurrentStep] = useState<SetupStep>('private-repos');

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Step 1: Private Repos - Initialize with defaults from API
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

  // Step 2: AI Configuration - Initialize with defaults from API
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
      loadRepoDefaults();
    }
  }, [currentStep]);

  /**
   * Load repository defaults from API
   */
  const loadRepoDefaults = async () => {
    try {
      const response = await window.electronAPI.getSetupRepoDefaults();
      if (response.success) {
        setNewRepoProvider('gitlab');
        setNewRepoInstanceUrl(response.data.instanceUrl || '');
        setNewRepoUrl(response.data.repositoryUrl || '');
        setNewRepoDisplayName(response.data.description || '');
      }
    } catch (err) {
      console.error('Failed to load repo defaults:', err);
    }
  };

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
      // In setup wizard, always use defaults from setup-defaults.json
      const defaultsResponse = await window.electronAPI.getSetupAIDefaults();

      if (defaultsResponse.success) {
        // Use default configuration from API (without API key)
        const defaults = defaultsResponse.data;
        setAiConfig({
          provider: 'anthropic', // Always anthropic for now
          apiKey: '', // Never pre-fill API key
          model: defaults.model,
          baseUrl: defaults.baseUrl,
          streamingEnabled: defaults.streamingEnabled,
          timeout: defaults.timeout,
          maxRetries: defaults.maxRetries,
        });
      } else {
        // Fallback to hardcoded defaults if API fails
        setAiConfig({
          provider: 'anthropic' as const,
          apiKey: '',
          model: 'GLM-4.7',
          baseUrl: 'https://open.bigmodel.cn/api/anthropic',
          streamingEnabled: true,
          timeout: 30000,
          maxRetries: 2,
        });
      }
    } catch (err) {
      // Create minimal config on error
      setAiConfig({
        provider: 'anthropic' as const,
        apiKey: '',
        model: 'GLM-4.7',
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        streamingEnabled: true,
        timeout: 30000,
        maxRetries: 2,
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

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
        // Reset form
        setNewRepoUrl('');
        setNewRepoPAT('');
        setNewRepoProvider('github');
        setNewRepoInstanceUrl('');
        setNewRepoDisplayName('');
        setShowAddRepoForm(false);

        window.dispatchEvent(new CustomEvent('private-repo-updated', {
          detail: { repoId: response.data.id, patUpdated: false, isNew: true }
        }));
      } else {
        setError(response.error?.message || 'Failed to add repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add repository';
      setError(message);
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
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setAITestResult({ success: false, error: message });
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
    } finally {
      setIsSavingAI(false);
    }
  };

  /**
   * Handle next step
   */
  const handleNext = async () => {
    if (currentStep === 'private-repos') {
      setCurrentStep('ai-config');
    } else if (currentStep === 'ai-config') {
      if (aiConfig && aiConfig.apiKey) {
        await handleSaveAIConfig();
      }
      setIsCompleting(true);
      try {
        await onComplete();
      } catch (err) {
        setError('Failed to save configuration');
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
      setIsCompleting(true);
      onComplete().catch(err => {
        setError('Failed to save configuration');
        setIsCompleting(false);
      });
    }
  };

  /**
   * Handle back step
   */
  const handleBack = () => {
    setError(null);
    if (currentStep === 'ai-config') {
      setCurrentStep('private-repos');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
              <span className="font-bold text-xl" style={{ color: '#DE2910' }}>SKM</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{t('setup.welcome')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('setup.setupDescription')}</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-3 py-1 rounded-full ${currentStep === 'private-repos' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                1
              </span>
              <span className="text-gray-300">/</span>
              <span className={`px-3 py-1 rounded-full ${currentStep === 'ai-config' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                2
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Private Repositories */}
          {currentStep === 'private-repos' && (
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">{t('setup.privateRepos')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('setup.privateReposDescription')} ({t('common.skip')})</p>

              {/* Add Button */}
              {!showAddRepoForm && (
                <button
                  onClick={() => setShowAddRepoForm(true)}
                  className="w-full mb-4 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm transition-colors flex items-center justify-center gap-2"
                  disabled={isAddingRepo}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('setup.addPrivateRepository')}
                </button>
              )}

              {/* Add Form */}
              {showAddRepoForm && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <form onSubmit={handleAddRepo}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                          <select
                            value={newRepoProvider}
                            onChange={(e) => setNewRepoProvider(e.target.value as 'github' | 'gitlab')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            disabled={isAddingRepo}
                          >
                            <option value="github">GitHub</option>
                            <option value="gitlab">GitLab</option>
                          </select>
                        </div>
                        {newRepoProvider === 'gitlab' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.gitlabInstanceUrl')}</label>
                            <input
                              type="text"
                              value={newRepoInstanceUrl}
                              onChange={(e) => setNewRepoInstanceUrl(e.target.value)}
                              placeholder="https://gitlab.com"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              disabled={isAddingRepo}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.repositoryUrl')}</label>
                        <input
                          type="text"
                          value={newRepoUrl}
                          onChange={(e) => setNewRepoUrl(e.target.value)}
                          placeholder={newRepoProvider === 'github' ? 'https://github.com/owner/repo' : 'https://gitlab.com/owner/repo'}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.personalAccessToken')}</label>
                        <input
                          type="password"
                          value={newRepoPAT}
                          onChange={(e) => setNewRepoPAT(e.target.value)}
                          placeholder="ghp_... or glpat-..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          disabled={isAddingRepo}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.displayNameOptional')}</label>
                        <input
                          type="text"
                          value={newRepoDisplayName}
                          onChange={(e) => setNewRepoDisplayName(e.target.value)}
                          placeholder={t('settings.displayNamePlaceholder')}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          disabled={isAddingRepo}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRepoForm(false);
                          // Reset form
                          setNewRepoUrl('');
                          setNewRepoPAT('');
                          setNewRepoProvider('github');
                          setNewRepoInstanceUrl('');
                          setNewRepoDisplayName('');
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        disabled={isAddingRepo}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        disabled={isAddingRepo || !newRepoUrl || !newRepoPAT}
                      >
                        {isAddingRepo ? t('common.adding') : t('common.create')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Repo List */}
              {privateRepos.length > 0 && (
                <div className="space-y-2">
                  {privateRepos.map((repo) => (
                    <div key={repo.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {repo.displayName || `${repo.owner}/${repo.repo}`}
                          </p>
                          <p className="text-xs text-gray-500">{repo.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {repoTestResults[repo.id] && (
                          <span className={`text-xs ${repoTestResults[repo.id].success ? 'text-green-600' : 'text-red-600'}`}>
                            {repoTestResults[repo.id].success ? t('setup.connectionVerified') : repoTestResults[repo.id].error}
                          </span>
                        )}
                        <button
                          onClick={() => handleTestRepoConnection(repo.id)}
                          disabled={testingRepoId === repo.id}
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        >
                          {testingRepoId === repo.id ? t('common.testing') : t('settings.testConnection')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {privateRepos.length === 0 && !showAddRepoForm && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t('setup.skipAndAddLater')}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: AI Configuration */}
          {currentStep === 'ai-config' && (
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">{t('setup.aiConfiguration')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('setup.aiConfigDescription')} ({t('common.skip')})</p>

              {isLoadingAI ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : aiConfig ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.apiKey')}</label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={isSavingAI}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.model')}</label>
                      <input
                        type="text"
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                        placeholder="GLM-4.7"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        disabled={isSavingAI}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.baseUrlOptional')}</label>
                      <input
                        type="text"
                        value={aiConfig.baseUrl || ''}
                        onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value || undefined })}
                        placeholder="https://open.bigmodel.cn/api/anthropic"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        disabled={isSavingAI}
                      />
                    </div>
                  </div>

                  {/* Test Connection */}
                  {aiConfig.apiKey && (
                    <div className="pt-2">
                      <button
                        onClick={handleTestAIConnection}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors disabled:opacity-50"
                        disabled={isTestingAI || isSavingAI}
                      >
                        {isTestingAI ? t('settings.testingConnection') : t('settings.testConnectionButton')}
                      </button>

                      {aiTestResult && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${aiTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {aiTestResult.success
                            ? t('settings.connectionTestSuccessful', { latency: aiTestResult.latency })
                            : aiTestResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t('setup.failedToLoadAiConfig')}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div>
              {currentStep !== 'private-repos' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isCompleting}
                >
                  {t('common.back')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isCompleting || isAddingRepo || isSavingAI}
              >
                {t('setup.skipForNow')}
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={isCompleting || isAddingRepo || isSavingAI}
              >
                {isCompleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('setup.completing')}
                  </>
                ) : currentStep === 'ai-config' ? (
                  t('setup.completeSetup')
                ) : (
                  t('common.next')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
