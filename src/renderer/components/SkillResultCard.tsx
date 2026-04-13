/**
 * Skill Result Card Component
 *
 * Individual search result card with install functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchSkillResult, SkillOption } from '../../shared/types';
import { checkSkillInstalled, installFromRegistry, onInstallProgress } from '../services/registryClient';
import { InstallDialog } from './InstallDialog';

interface SkillResultCardProps {
  skill: SearchSkillResult;
  targetDirectory: string;
  onInstallComplete?: (skill: SearchSkillResult) => void;
  onSkillClick?: (skill: SearchSkillResult) => void;
}

export const SkillResultCard: React.FC<SkillResultCardProps> = ({
  skill,
  targetDirectory,
  onInstallComplete,
  onSkillClick
}) => {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string>('');
  const [installError, setInstallError] = useState<string>('');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedAt, setInstalledAt] = useState<string | undefined>();
  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState<string | undefined>();
  const [multipleSkillsOptions, setMultipleSkillsOptions] = useState<SkillOption[]>([]);
  const [showSkillSelectionDialog, setShowSkillSelectionDialog] = useState(false);

  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Check if skill is already installed
  const checkInstalledStatus = useCallback(async () => {
    try {
      const status = await checkSkillInstalled(skill.skillId, targetDirectory);
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsInstalled(status.installed);
        setInstalledAt(status.installedAt);
      }
    } catch (error) {
      console.error('Failed to check installation status:', error);
    }
  }, [skill.skillId, targetDirectory]);

  // Check install status when skill or directory changes
  useEffect(() => {
    checkInstalledStatus();
  }, [checkInstalledStatus]);

  // Listen for skills:refresh event to update install status when skills are deleted/modified elsewhere
  useEffect(() => {
    const handleSkillsRefresh = () => {
      console.log('🔔 [SkillResultCard] skills:refresh received, re-checking install status for:', skill.name);
      checkInstalledStatus();
    };

    const unsubscribe = window.electronAPI.onSkillsRefresh(handleSkillsRefresh);

    return () => {
      unsubscribe();
    };
  }, [checkInstalledStatus, skill.name]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking install button
    setInstallError('');
    setShowDialog(true);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallProgress('Starting installation...');
    setInstallError('');

    // Subscribe to progress updates
    const unsubscribe = onInstallProgress((progress) => {
      setInstallProgress(progress.message);
    });

    try {
      await installFromRegistry(
        {
          source: skill.source,
          skillId: skill.skillId,
          selectedDirectoryPath: selectedDirectoryPath // Add this
        },
        targetDirectory
      );

      setIsInstalled(true);
      setInstalledAt(new Date().toISOString());
      setShowDialog(false);
      onInstallComplete?.(skill);
    } catch (error: any) {
      console.error('Installation failed:', error);

      // Check if this is a multiple skills found error
      if (error.code === 'REGISTRY_MULTIPLE_SKILLS_FOUND') {
        setMultipleSkillsOptions(error.skillOptions);
        setShowSkillSelectionDialog(true);
      } else {
        setInstallError(error.message || 'Installation failed');
      }
      throw error; // Re-throw so InstallDialog knows it failed
    } finally {
      setIsInstalling(false);
      setInstallProgress('');
      unsubscribe();
    }
  };

  const handleClose = () => {
    setShowDialog(false);
  };

  const handleSkillNameClick = () => {
    console.log('🖱️ SkillResultCard handleSkillNameClick called');
    console.log('📋 onSkillClick callback exists:', !!onSkillClick);
    console.log('📦 Skill data:', skill);

    if (onSkillClick) {
      // If onSkillClick callback is provided, use it to show skill in third column
      console.log('✅ Calling onSkillClick callback');
      onSkillClick(skill);
    }
  };

  const handleGitHubLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const url = `https://github.com/${skill.source}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div
        className="relative bg-white rounded-lg p-3 hover:shadow-md transition-all border border-gray-200 hover:border-blue-300 cursor-pointer h-full flex flex-col"
        onClick={handleSkillNameClick}
        data-testid="skill-card"
      >
        {/* Top row: Name + External Link Icon + Installed Badge + Install Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Skill Name */}
            <h3 className="text-sm font-medium text-gray-900 truncate" title={skill.name}>
              {skill.name}
            </h3>

            {/* External Link Icon */}
            <button
              onClick={handleGitHubLinkClick}
              className="flex-shrink-0 p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
              title={`Open ${skill.source} on GitHub`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            {/* Installed Badge */}
            {isInstalled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('install.installed')}
              </span>
            )}
          </div>

          {/* Right: Install Button */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling || isInstalled}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                isInstalled
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isInstalling
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-primary hover:bg-primary-600 text-white'
              }`}
              aria-label={isInstalled ? 'Already installed' : isInstalling ? 'Installing...' : 'Install skill'}
              data-testid="install-button"
            >
              {isInstalling ? (
                <span className="flex items-center justify-center gap-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-4 border-white border-t-transparent" />
                </span>
              ) : isInstalled ? (
                t('install.installed')
              ) : (
                t('install.install')
              )}
            </button>
          </div>
        </div>

        {/* Source path */}
        <p className="text-xs text-gray-500 truncate mb-2" title={skill.source}>
          {skill.source}
        </p>

        {/* Bottom row: Installs count - highlighted */}
        <div className="flex items-center gap-2 flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {skill.installs.toLocaleString()} {t('skills.installs')}
          </span>
        </div>

        {/* Installation Progress */}
        {isInstalling && installProgress && (
          <div className="absolute inset-x-3 bottom-3 bg-blue-50 rounded p-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-4 border-blue-500 border-t-transparent" />
              <p className="text-xs text-blue-700 font-medium truncate">{installProgress}</p>
            </div>
          </div>
        )}
      </div>

      {/* Install Dialog */}
      {showDialog && (
        <InstallDialog
          isOpen={showDialog}
          skillName={skill.name}
          skillId={skill.skillId}
          source={skill.source}
          onClose={handleClose}
          onInstall={handleInstall}
          isInstalling={isInstalling}
          installProgress={installProgress}
          installError={installError}
        />
      )}

      {/* Skill Selection Dialog */}
      {showSkillSelectionDialog && multipleSkillsOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSkillSelectionDialog(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('discover.selectSkill')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('discover.multipleSkillsFound')}
              </p>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                {multipleSkillsOptions.map((option) => (
                  <button
                    key={option.directoryPath}
                    onClick={() => {
                      setSelectedDirectoryPath(option.directoryPath);
                      setShowSkillSelectionDialog(false);
                      setShowDialog(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">
                      {option.name}
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {option.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                      {option.directoryPath}
                    </p>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setShowSkillSelectionDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};


