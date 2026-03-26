/**
 * Skill Result Card Component
 *
 * Individual search result card with install functionality
 */

import React, { useState, useEffect } from 'react';
import { SearchSkillResult } from '../../shared/types';
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
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string>('');
  const [installError, setInstallError] = useState<string>('');
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
          skillId: skill.skillId
        },
        targetDirectory
      );

      setIsInstalled(true);
      setInstalledAt(new Date().toISOString());
      setShowDialog(false);
      onInstallComplete?.(skill);
    } catch (error: any) {
      console.error('Installation failed:', error);
      setInstallError(error.message || 'Installation failed');
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
    } else {
      // Fallback: open skill details on skills.sh in new tab
      console.log('🌐 Opening external link (no callback provided)');
      const encodedSource = encodeURIComponent(skill.source);
      const encodedSkillId = encodeURIComponent(skill.skillId);
      const url = `https://skills.sh/${encodedSource}/${encodedSkillId}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div
        className="relative bg-white rounded-lg p-3 hover:shadow-md transition-all border border-gray-200 hover:border-blue-300 cursor-pointer h-full flex flex-col"
        onClick={handleSkillNameClick}
        data-testid="skill-card"
      >
        {/* Top row: Name + Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={skill.name}>
              {skill.name}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-0.5" title={skill.source}>
              {skill.source}
            </p>
          </div>
          {/* Source Badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 flex-shrink-0">
            Registry
          </span>
        </div>

        {/* Middle row: Installs + Installed status */}
        <div className="flex items-center gap-2 mb-2 flex-1">
          <span className="text-xs text-gray-500">
            {skill.installs.toLocaleString()} installs
          </span>
          {isInstalled && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Installed
            </span>
          )}
        </div>

        {/* Bottom row: Install button */}
        <div className="mt-auto">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling || isInstalled}
            className={`w-full px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isInstalled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isInstalling
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-label={isInstalled ? 'Already installed' : isInstalling ? 'Installing...' : 'Install skill'}
            data-testid="install-button"
          >
            {isInstalling ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Installing...
              </span>
            ) : isInstalled ? (
              'Installed'
            ) : (
              'Install'
            )}
          </button>
        </div>

        {/* Installation Progress */}
        {isInstalling && installProgress && (
          <div className="absolute inset-x-3 bottom-3 bg-blue-50 rounded p-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
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
    </>
  );
};


