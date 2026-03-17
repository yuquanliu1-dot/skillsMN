/**
 * PrivateSkillCard Component
 *
 * Displays individual skill from a private repository with download functionality
 */

import { useState, useEffect } from 'react';
import type { PrivateSkill, PrivateRepo } from '../../shared/types';
import PrivateInstallDialog from './PrivateInstallDialog';
import ConflictResolutionDialog from './ConflictResolutionDialog';

interface PrivateSkillCardProps {
  skill: PrivateSkill;
  repo: PrivateRepo;
  onInstallComplete?: () => void;
  onSkillClick?: (skill: PrivateSkill) => void;
}

export default function PrivateSkillCard({ skill, repo, onInstallComplete, onSkillClick }: PrivateSkillCardProps): JSX.Element {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [installProgress, setInstallProgress] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  /**
   * Check if skill is already downloaded
   * Compare by directory name (basename) for more reliable matching
   */
  useEffect(() => {
    checkIfDownloaded();
  }, [skill.name, skill.path]);

  const checkIfDownloaded = async () => {
    setIsCheckingStatus(true);
    try {
      // Load current skills to check if this skill exists
      const response = await window.electronAPI.listSkills();
      if (response.success && response.data) {
        // Extract directory name from skill path
        const skillDirName = skill.path.split('/').pop() || skill.path.split('\\').pop() || skill.name;

        // Check if any local skill's path contains this directory name
        const exists = response.data.some(s => {
          const localDirName = s.path.split('/').pop() || s.path.split('\\').pop() || '';
          return localDirName === skillDirName || s.name === skill.name;
        });

        setIsDownloaded(exists);
      }
    } catch (error) {
      console.error('Failed to check download status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCardClick = () => {
    if (onSkillClick) {
      onSkillClick(skill);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isDownloaded) {
      return; // Don't allow re-download if already downloaded
    }
    setShowInstallDialog(true);
    setInstallProgress('idle');
    setErrorMessage(null);
  };

  const handleInstall = async (targetDirectory: 'project' | 'global', conflictResolution?: 'overwrite' | 'rename' | 'skip') => {
    setInstallProgress('installing');
    setErrorMessage(null);

    try {
      const response = await window.electronAPI.installPrivateRepoSkill({
        repoId: repo.id,
        skillPath: skill.path,
        targetDirectory,
        conflictResolution,
      });

      if (response.success) {
        setInstallProgress('success');
        setShowInstallDialog(false);
        setShowConflictDialog(false);
        setIsDownloaded(true);

        // Notify parent component
        if (onInstallComplete) {
          onInstallComplete();
        }

        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setInstallProgress('idle');
        }, 3000);
      } else if (response.error?.code === 'CONFLICT') {
        setShowInstallDialog(false);
        setShowConflictDialog(true);
        setInstallProgress('idle');
      } else {
        setInstallProgress('error');
        setErrorMessage(response.error?.message || 'Download failed');
      }
    } catch (err) {
      setInstallProgress('error');
      setErrorMessage(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleConflictResolve = async (resolution: 'overwrite' | 'rename' | 'skip') => {
    await handleInstall('project', resolution);
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        className={`p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors ${
          onSkillClick ? 'cursor-pointer' : ''
        }`}
        role={onSkillClick ? 'button' : undefined}
        tabIndex={onSkillClick ? 0 : undefined}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCardClick();
          }
        }}
        aria-label={onSkillClick ? `View ${skill.name} details` : undefined}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {skill.name}
              </h4>
              {isDownloaded && !isCheckingStatus && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Downloaded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{skill.path}</p>
          </div>

          {/* Download Button with Progress */}
          <button
            onClick={handleDownloadClick}
            disabled={installProgress === 'installing' || isDownloaded || isCheckingStatus}
            className={`btn text-xs px-3 py-1 ml-2 ${
              isDownloaded
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : installProgress === 'success'
                ? 'bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700'
                : installProgress === 'error'
                ? 'bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700'
                : 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700'
            }`}
            aria-label={`Download skill: ${skill.name}`}
            aria-busy={installProgress === 'installing'}
            aria-live="polite"
          >
            {isCheckingStatus && (
              <span className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Checking...
              </span>
            )}
            {!isCheckingStatus && isDownloaded && 'Downloaded'}
            {!isCheckingStatus && !isDownloaded && installProgress === 'idle' && 'Download'}
            {!isCheckingStatus && !isDownloaded && installProgress === 'installing' && (
              <span className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Downloading...
              </span>
            )}
            {!isCheckingStatus && !isDownloaded && installProgress === 'success' && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Downloaded!
              </span>
            )}
            {!isCheckingStatus && !isDownloaded && installProgress === 'error' && 'Retry'}
          </button>
        </div>

        {/* Error Message */}
        {installProgress === 'error' && errorMessage && (
          <div
            className="mb-2 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded text-xs text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Download Failed</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {installProgress === 'success' && (
          <div
            className="mb-2 p-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded text-xs text-green-600 dark:text-green-400"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">Skill downloaded successfully!</p>
            </div>
          </div>
        )}

        {skill.lastCommitMessage && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{skill.lastCommitMessage}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {skill.lastCommitAuthor && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              By {skill.lastCommitAuthor}
            </span>
          )}
          {skill.lastCommitDate && (
            <time dateTime={new Date(skill.lastCommitDate).toISOString()}>
              {new Date(skill.lastCommitDate).toLocaleDateString()}
            </time>
          )}
          {skill.fileCount !== undefined && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {skill.fileCount} files
            </span>
          )}
        </div>

        {/* Directory Commit SHA (if available) */}
        {skill.directoryCommitSHA && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
              SHA: {skill.directoryCommitSHA.substring(0, 8)}
            </p>
          </div>
        )}
      </article>

      {/* Download Dialog */}
      {showInstallDialog && (
        <PrivateInstallDialog
          skill={skill}
          repo={repo}
          onClose={() => setShowInstallDialog(false)}
          onInstall={handleInstall}
          onConflict={() => {
            setShowInstallDialog(false);
            setShowConflictDialog(true);
          }}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && (
        <ConflictResolutionDialog
          repositoryName={repo.displayName || `${repo.owner}/${repo.repo}`}
          skillFilePath={skill.path}
          downloadUrl="" // Not used for private repos
          onClose={() => setShowConflictDialog(false)}
          onResolve={handleConflictResolve}
        />
      )}
    </>
  );
}
