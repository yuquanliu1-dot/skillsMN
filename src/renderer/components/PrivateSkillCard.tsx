/**
 * PrivateSkillCard Component
 *
 * Displays individual skill from a private repository with install functionality
 * Styled to match the main SkillCard component
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
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  /**
   * Check if skill is already installed
   */
  useEffect(() => {
    checkIfInstalled();
  }, [skill.name, skill.path]);

  const checkIfInstalled = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await window.electronAPI.listSkills();
      if (response.success && response.data) {
        const skillDirName = skill.path.split('/').pop() || skill.path.split('\\').pop() || skill.name;
        const exists = response.data.some(s => {
          const localDirName = s.path.split('/').pop() || s.path.split('\\').pop() || '';
          return localDirName === skillDirName || s.name === skill.name;
        });
        setIsInstalled(exists);
      }
    } catch (error) {
      console.error('Failed to check install status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCardClick = () => {
    if (onSkillClick) {
      onSkillClick(skill);
    }
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalled) {
      return;
    }
    setShowInstallDialog(true);
    setInstallProgress('idle');
    setErrorMessage(null);
  };

  const handleInstall = async (conflictResolution?: 'overwrite' | 'rename' | 'skip') => {
    setInstallProgress('installing');
    setErrorMessage(null);

    try {
      const response = await window.electronAPI.installPrivateRepoSkill({
        repoId: repo.id,
        skillPath: skill.path,
        conflictResolution,
      });

      if (response.success) {
        setInstallProgress('success');
        setShowInstallDialog(false);
        setShowConflictDialog(false);
        setIsInstalled(true);

        if (onInstallComplete) {
          onInstallComplete();
        }

        setTimeout(() => {
          setInstallProgress('idle');
        }, 3000);
      } else if (response.error?.code === 'CONFLICT') {
        setShowInstallDialog(false);
        setShowConflictDialog(true);
        setInstallProgress('idle');
      } else {
        setInstallProgress('error');
        setErrorMessage(response.error?.message || 'Installation failed');
      }
    } catch (err) {
      setInstallProgress('error');
      setErrorMessage(err instanceof Error ? err.message : 'Installation failed');
    }
  };

  const handleConflictResolve = async (resolution: 'overwrite' | 'rename' | 'skip') => {
    await handleInstall(resolution);
  };

  return (
    <>
      {/* Card matching main SkillCard style: adaptive height */}
      <article
        onClick={handleCardClick}
        className={`relative mb-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors ${
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
        {/* Top row: Name + Badges + Actions */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-shrink" title={skill.name}>
              {skill.name}
            </h4>

            {/* Source Badge */}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex-shrink-0 border-0">
              {repo.provider === 'gitlab' ? 'GitLab' : 'GitHub'}
            </span>

            {/* Installed Badge */}
            {isInstalled && !isCheckingStatus && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0">
                Installed
              </span>
            )}

            {/* Success Badge */}
            {installProgress === 'success' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0 border-0">
                ✓
              </span>
            )}
          </div>

          {/* Right: Install Button */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              disabled={installProgress === 'installing' || isInstalled || isCheckingStatus}
              className={`btn text-xs px-3 py-1 ${
                isInstalled
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : installProgress === 'success'
                  ? 'bg-green-600 dark:bg-green-600 text-white'
                  : installProgress === 'error'
                  ? 'bg-red-600 dark:bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700'
              }`}
              aria-label={`Install skill: ${skill.name}`}
              aria-busy={installProgress === 'installing'}
              aria-live="polite"
            >
              {isCheckingStatus && (
                <span className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                </span>
              )}
              {!isCheckingStatus && isInstalled && 'Install'}
              {!isCheckingStatus && !isInstalled && installProgress === 'idle' && 'Install'}
              {!isCheckingStatus && !isInstalled && installProgress === 'installing' && (
                <span className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                </span>
              )}
              {!isCheckingStatus && !isInstalled && installProgress === 'error' && 'Retry'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {installProgress === 'error' && errorMessage && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Description row */}
        <div className="mb-2">
          {skill.description ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1" title={skill.description}>
              {skill.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              No description
            </p>
          )}
        </div>

        {/* Commit message row */}
        <div className="mb-2">
          {skill.lastCommitMessage && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1" title={skill.lastCommitMessage}>
              {skill.lastCommitMessage}
            </p>
          )}
        </div>

        {/* Bottom row: Author + Tags */}
        <div className="flex items-center gap-3 overflow-hidden">
          {skill.lastCommitAuthor && (
            <span className="flex items-center gap-1 min-w-0 flex-shrink-0">
              <svg className="w-3 h-3 flex-shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]" title={skill.lastCommitAuthor}>{skill.lastCommitAuthor}</span>
            </span>
          )}

          {/* Tags */}
          {skill.tags && skill.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden flex-1">
              {skill.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 flex-shrink-0"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">+{skill.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Install Dialog */}
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
          downloadUrl=""
          onClose={() => setShowConflictDialog(false)}
          onResolve={handleConflictResolve}
        />
      )}
    </>
  );
}
