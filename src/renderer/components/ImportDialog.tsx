/**
 * ImportDialog Component
 *
 * Modal dialog for importing skills from local directories or Git URLs (GitHub/GitLab)
 * Supports multi-skill selection, conflict resolution, and progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  DetectedSkill,
  ImportOptions,
  ImportProgress,
  ImportResult,
  UrlScanResult,
} from '../../shared/types';

type ImportTab = 'local' | 'url';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<ImportTab>('local');

  // Local import state
  const [localDirectory, setLocalDirectory] = useState<string>('');
  const [localSkills, setLocalSkills] = useState<DetectedSkill[]>([]);
  const [selectedLocalSkills, setSelectedLocalSkills] = useState<Set<string>>(new Set());
  const [isScanningLocal, setIsScanningLocal] = useState(false);

  // URL import state
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [pat, setPat] = useState<string>('');
  const [urlSkills, setUrlSkills] = useState<DetectedSkill[]>([]);
  const [selectedUrlSkills, setSelectedUrlSkills] = useState<Set<string>>(new Set());
  const [urlScanResult, setUrlScanResult] = useState<UrlScanResult | null>(null);
  const [isScanningUrl, setIsScanningUrl] = useState(false);

  // Common import state
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Import options
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<'rename' | 'skip' | 'overwrite'>('rename');

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLocalDirectory('');
      setLocalSkills([]);
      setSelectedLocalSkills(new Set());
      setRepoUrl('');
      setPat('');
      setUrlSkills([]);
      setSelectedUrlSkills(new Set());
      setUrlScanResult(null);
      setError(null);
      setShowErrorDetails(false);
      setProgress(null);
      setImportResult(null);
      setIsImporting(false);
    }
  }, [isOpen]);

  // Listen for import progress updates
  useEffect(() => {
    if (!isOpen) return;

    const handleProgress = (_event: any, progressData: ImportProgress) => {
      setProgress(progressData);
    };

    window.electronAPI.onImportProgress?.(handleProgress);

    return () => {
      window.electronAPI.removeImportProgressListener?.();
    };
  }, [isOpen]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImporting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImporting, onClose]);

  // Ref for dialog content
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle click on overlay to close dialog
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not the dialog content
    if (e.target === e.currentTarget && !isImporting) {
      onClose();
    }
  }, [isImporting, onClose]);

  // Handle local directory selection
  const handleSelectDirectory = useCallback(async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (result.success && result.data && !result.data.canceled && result.data.filePaths.length > 0) {
        const dirPath = result.data.filePaths[0];
        setLocalDirectory(dirPath);
        await scanLocalDirectory(dirPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select directory');
    }
  }, []);

  // Scan local directory for skills
  const scanLocalDirectory = useCallback(async (dirPath: string) => {
    setIsScanningLocal(true);
    setError(null);
    setLocalSkills([]);
    setSelectedLocalSkills(new Set());

    try {
      const response = await window.electronAPI.scanDirectoryForImport(dirPath);
      if (response.success && response.data) {
        setLocalSkills(response.data);
        // Select all by default
        setSelectedLocalSkills(new Set(response.data.map(s => s.path)));
      } else {
        const errorMsg = response.error?.message || 'Failed to scan directory';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan directory');
    } finally {
      setIsScanningLocal(false);
    }
  }, []);

  // Scan URL for skills
  const handleScanUrl = useCallback(async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsScanningUrl(true);
    setError(null);
    setUrlSkills([]);
    setSelectedUrlSkills(new Set());
    setUrlScanResult(null);

    try {
      const result = await window.electronAPI.scanUrlForImport(repoUrl.trim(), pat || undefined);
      setUrlScanResult(result);

      if (result.success && result.skills.length > 0) {
        setUrlSkills(result.skills);
        // Select all by default
        setSelectedUrlSkills(new Set(result.skills.map(s => s.path)));
      } else {
        setError(result.error || 'No skills found in repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan URL');
    } finally {
      setIsScanningUrl(false);
    }
  }, [repoUrl, pat]);

  // Toggle skill selection
  const toggleSkillSelection = useCallback((skillPath: string, type: ImportTab) => {
    const setSkills = type === 'local' ? setSelectedLocalSkills : setSelectedUrlSkills;
    setSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillPath)) {
        next.delete(skillPath);
      } else {
        next.add(skillPath);
      }
      return next;
    });
  }, []);

  // Toggle all skills
  const toggleAllSkills = useCallback((type: ImportTab) => {
    const skills = type === 'local' ? localSkills : urlSkills;
    const setSkills = type === 'local' ? setSelectedLocalSkills : setSelectedUrlSkills;
    const selectedSkills = type === 'local' ? selectedLocalSkills : selectedUrlSkills;

    if (selectedSkills.size === skills.length) {
      setSkills(new Set());
    } else {
      setSkills(new Set(skills.map(s => s.path)));
    }
  }, [localSkills, urlSkills, selectedLocalSkills, selectedUrlSkills]);

  // Handle import
  const handleImport = useCallback(async () => {
    const skills = activeTab === 'local' ? localSkills : urlSkills;
    const selectedPaths = activeTab === 'local' ? selectedLocalSkills : selectedUrlSkills;

    if (selectedPaths.size === 0) {
      setError('Please select at least one skill to import');
      return;
    }

    setIsImporting(true);
    setError(null);
    setProgress(null);
    setImportResult(null);

    const options: ImportOptions = {
      deleteOriginals: activeTab === 'local' ? deleteOriginals : false,
      conflictStrategy,
    };

    try {
      let response;

      if (activeTab === 'local') {
        const selectedSkills = skills.filter(s => selectedPaths.has(s.path));
        response = await window.electronAPI.importLocalSkills({
          skills: selectedSkills,
          options,
        });
      } else {
        response = await window.electronAPI.importSkillsFromUrl({
          url: repoUrl.trim(),
          skillPaths: Array.from(selectedPaths),
          pat: pat || undefined,
          options,
        });
      }

      if (response.success && response.data) {
        setImportResult(response.data);
        if (response.data.importedCount > 0) {
          onImportComplete();
        }
      } else {
        setError(response.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [
    activeTab,
    localSkills,
    urlSkills,
    selectedLocalSkills,
    selectedUrlSkills,
    deleteOriginals,
    conflictStrategy,
    repoUrl,
    pat,
    onImportComplete,
  ]);

  // Get current skills and selection based on active tab
  const currentSkills = activeTab === 'local' ? localSkills : urlSkills;
  const currentSelection = activeTab === 'local' ? selectedLocalSkills : selectedUrlSkills;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="import-dialog"
      onClick={handleOverlayClick}
    >
      <div ref={dialogRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-card-title font-semibold text-gray-900">
            {t('import.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isImporting}
            data-testid="close-import-dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('local')}
              disabled={isImporting}
              data-testid="import-tab-local"
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('import.fromLocal')}
            </button>
            <button
              onClick={() => setActiveTab('url')}
              disabled={isImporting}
              data-testid="import-tab-url"
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'url'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('import.fromUrl')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Local Tab Content */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {/* Directory Selection Card */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-900">{t('import.selectDirectory')}</h4>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localDirectory}
                    readOnly
                    placeholder={t('import.directoryPlaceholder')}
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={handleSelectDirectory}
                    disabled={isScanningLocal || isImporting}
                    className="btn btn-secondary"
                  >
                    {t('common.browse')}
                  </button>
                </div>

                {isScanningLocal && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('import.scanning')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Tab Content */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              {/* Repository URL Card */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-900">{t('import.repoUrl')}</h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      disabled={isScanningUrl || isImporting}
                      data-testid="import-url-input"
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      {t('import.pat')} (Optional)
                    </label>
                    <input
                      type="password"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder={t('import.patPlaceholder')}
                      disabled={isScanningUrl || isImporting}
                      data-testid="import-pat-input"
                      className="input text-sm"
                    />
                  </div>

                  <button
                    onClick={handleScanUrl}
                    disabled={!repoUrl.trim() || isScanningUrl || isImporting}
                    data-testid="scan-url-button"
                    className="btn btn-primary w-full"
                  >
                    {isScanningUrl ? (
                      <>
                        <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('import.scanning')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {t('import.scanUrl')}
                      </>
                    )}
                  </button>

                  {urlScanResult && urlScanResult.success && (
                    <div data-testid="scan-success-message" className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('import.foundSkills', {
                        provider: urlScanResult.provider,
                        repo: `${urlScanResult.owner}/${urlScanResult.repo}`,
                        count: urlSkills.length,
                        defaultValue: `Found ${urlSkills.length} skill(s) in ${urlScanResult.provider} repository`,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State - No skills found after scanning */}
          {activeTab === 'local' && localDirectory && !isScanningLocal && localSkills.length === 0 && !error && (
            <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg text-center">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v18m10-3a.75.75 0 00-1.5-.75L3 7.5a3 3-2 2 0 00-2 2v2a2 2 0 012 2 2h6m6 2 2 0 002-2v-2a2 2 0 00-2-2v-2a2 2 0 00-2-2-2H5v-2a2 2 0 00-2 2v2a2 2 0 012 2 2h6M3 7v6a4 4 0 01-.99.28l1.47-1.47A4.5 4.5 0 00-6.364l1.36-1.36A4.5 4.5 0 006.364 0l1.36 1.36A4.5 4.5 0 006.364l-1.36-1.36A4.5 4.5 0 00-6.364-1.36L12 13zm0 3a4 4 0 014 4 4v4H3a4a4 0 01-4-4z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('import.noSkillsFound')}
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                {t('import.noSkillsInDirectory')}
              </p>
              <div className="bg-blue-50 rounded-md p-3 text-left">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">{t('import.tip')}:</span> {t('import.skillStructureTip')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'url' && urlScanResult && !isScanningUrl && urlSkills.length === 0 && (
            <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg text-center">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('import.noSkillsFound')}
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                {t('import.noSkillsInRepo')}
              </p>
              <div className="bg-blue-50 rounded-md p-3 text-left">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">{t('import.tip')}:</span> {t('import.skillStructureTip')}
                </p>
              </div>
            </div>
          )}

          {/* Initial State - Prompt to scan */}
          {activeTab === 'local' && !localDirectory && !isScanningLocal && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-700">
                {t('import.selectDirectoryFirst')}
              </p>
            </div>
          )}

          {activeTab === 'url' && !urlScanResult && !isScanningUrl && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-700">
                {t('import.enterUrlFirst')}
              </p>
            </div>
          )}

          {/* Skill List (both tabs) */}
          {currentSkills.length > 0 && (
            <div className="card" data-testid="import-skill-list">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-900">{t('import.selectSkills')}</h4>
                  <span className="text-xs text-slate-500 font-normal">
                    {currentSelection.size} / {currentSkills.length} selected
                  </span>
                </div>
                <button
                  onClick={() => toggleAllSkills(activeTab)}
                  disabled={isImporting}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {currentSelection.size === currentSkills.length
                    ? t('common.deselectAll')
                    : t('common.selectAll')}
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-60 overflow-y-auto">
                {currentSkills.map((skill) => (
                  <label
                    key={skill.path}
                    data-testid={`import-skill-${skill.name}`}
                    className="flex items-center gap-3.5 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={currentSelection.has(skill.path)}
                      onChange={() => toggleSkillSelection(skill.path, activeTab)}
                      disabled={isImporting}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{skill.name}</span>
                        {skill.hasConflict && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            {t('import.conflict')}
                          </span>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-xs text-slate-500 truncate">{skill.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Import Options */}
          {currentSkills.length > 0 && (
            <div className="space-y-4">
              {/* Conflict resolution strategy */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-900">{t('import.conflictStrategy')}</h4>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'rename'}
                      onChange={() => setConflictStrategy('rename')}
                      disabled={isImporting}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 font-medium">{t('import.rename', 'Rename')}</span>
                      <p className="text-xs text-slate-500">{t('import.renameDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'skip'}
                      onChange={() => setConflictStrategy('skip')}
                      disabled={isImporting}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 font-medium">{t('import.skip', 'Skip')}</span>
                      <p className="text-xs text-slate-500">{t('import.skipDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'overwrite'}
                      onChange={() => setConflictStrategy('overwrite')}
                      disabled={isImporting}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 font-medium">{t('import.overwrite', 'Overwrite')}</span>
                      <p className="text-xs text-slate-500">{t('import.overwriteDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Delete original option (local only) */}
              {activeTab === 'local' && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <h4 className="text-sm font-semibold text-slate-900">{t('import.afterImport', 'After Import:')}</h4>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3.5 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOption"
                        checked={deleteOriginals}
                        onChange={() => setDeleteOriginals(true)}
                        disabled={isImporting}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm text-slate-700 font-medium">{t('import.deleteOriginals')}</span>
                        <p className="text-xs text-slate-500">Remove original files after import</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3.5 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOption"
                        checked={!deleteOriginals}
                        onChange={() => setDeleteOriginals(false)}
                        disabled={isImporting}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm text-slate-700 font-medium">{t('import.keepOriginals', 'Keep original files')}</span>
                        <p className="text-xs text-slate-500">Preserve original files in place</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <h4 className="text-sm font-semibold text-slate-900">{t('import.importing')}</h4>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {progress.currentSkill}
                </span>
                <span className="text-sm text-slate-500">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {t('import.ofSkills', { current: Math.min(progress.currentIndex + 1, progress.totalSkills), total: progress.totalSkills })}
              </p>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className={`card ${importResult.success ? 'border-green-300' : 'border-amber-300'}`}>
              <div className="flex items-center gap-2 mb-3">
                {importResult.success ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <h4 className={`text-sm font-semibold ${importResult.success ? 'text-green-900' : 'text-amber-900'}`}>
                  {t('import.complete')}
                </h4>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-green-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('import.imported', { count: importResult.importedCount })}
                </p>
                {importResult.skippedCount > 0 && (
                  <p className="text-amber-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('import.skipped', { count: importResult.skippedCount })}
                  </p>
                )}
                {importResult.failedCount > 0 && (
                  <p className="text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('import.failed', { count: importResult.failedCount })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card border-red-300">
              <div className="flex items-start gap-3.5">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">{t('import.importFailed', 'Import Failed')}</p>
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="text-xs text-red-600 hover:text-red-800 mt-2 underline font-medium"
                  >
                    {showErrorDetails ? 'Hide Details' : 'View Details'}
                  </button>
                  {showErrorDetails && (
                    <pre className="mt-3 p-3 bg-red-100 rounded text-xs text-red-800 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {error}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3.5">
          <button
            onClick={onClose}
            disabled={isImporting}
            data-testid="cancel-import-button"
            className="btn btn-secondary btn-sm disabled:opacity-50"
          >
            {t('common.close')}
          </button>
          {currentSkills.length > 0 && !importResult && (
            <button
              onClick={handleImport}
              disabled={isImporting || (activeTab === 'local' ? selectedLocalSkills.size === 0 : selectedUrlSkills.size === 0)}
              data-testid="confirm-import-button"
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {isImporting ? t('import.importing') : t('import.import')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
