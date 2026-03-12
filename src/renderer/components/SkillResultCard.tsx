/**
 * Skill Result Card Component
 *
 * Individual search result card with install functionality
 */

import React, { useState, useEffect } from 'react';
import { SearchSkillResult } from '../../../shared/types';
import { checkSkillInstalled, installFromRegistry, onInstallProgress } from '../services/registryClient';
import { InstallDialog } from './InstallDialog';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';

interface SkillResultCardProps {
  skill: SearchSkillResult;
  targetDirectory: string;
  onInstallComplete?: (skill: SearchSkillResult) => void;
}

export const SkillResultCard: React.FC<SkillResultCardProps> = ({
  skill,
  targetDirectory,
  onInstallComplete
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string>('');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedAt, setInstalledAt] = useState<string | undefined>();

  // Check if skill is already installed
  useEffect(() => {
    const checkInstalled = async () => {
      try {
        const status = await checkSkillInstalled(skill.skillId, targetDirectory);
        setIsInstalled(status.installed);
        setInstalledAt(status.installedAt);
      } catch (error) {
        console.error('Failed to check installation status:', error);
      }
    };

    checkInstalled();
  }, [skill.skillId, targetDirectory]);

  const handleInstallClick = () => {
    setShowDialog(true);
  };

  const handleInstall = async (targetToolId: string) => {
    setIsInstalling(true);
    setInstallProgress('Starting installation...');

    // Subscribe to progress updates
    const unsubscribe = onInstallProgress((progress) => {
      setInstallProgress(progress.message);
    });

    try {
      await installFromRegistry(
        {
          source: skill.source,
          skillId: skill.skillId,
          targetToolId
        },
        targetDirectory
      );

      setIsInstalled(true);
      setInstalledAt(new Date().toISOString());
      setShowDialog(false);
      onInstallComplete?.(skill);
    } catch (error) {
      console.error('Installation failed:', error);
      throw error;
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
    // Open skill details on skills.sh in new tab
    const encodedSource = encodeURIComponent(skill.source);
    const encodedSkillId = encodeURIComponent(skill.skillId);
    const url = `https://skills.sh/${encodedSource}/${encodedSkillId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-all border border-transparent hover:border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Clickable skill name with external link icon */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkillNameClick}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1.5 group"
                aria-label={`View ${skill.name} details on skills.sh (opens in new tab)`}
              >
                {skill.name}
                <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {skill.source}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {skill.installs.toLocaleString()} installations
              </span>
              {isInstalled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Installed
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling || isInstalled}
            className={`px-4 py-2 text-xs font-medium rounded transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
              isInstalled
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : isInstalling
                ? 'bg-primary/50 text-white cursor-wait'
                : 'bg-primary hover:bg-blue-600 text-white hover:shadow-md'
            }`}
            aria-label={isInstalled ? 'Already installed' : isInstalling ? 'Installing...' : 'Install skill'}
          >
            {isInstalling ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Installing
              </span>
            ) : isInstalled ? (
              'Installed'
            ) : (
              'Install'
            )}
          </button>
        </div>

        {/* Installation Progress Bar */}
        {isInstalling && installProgress && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <p className="text-xs text-primary font-medium">{installProgress}</p>
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
        />
      )}
    </>
  );
};


