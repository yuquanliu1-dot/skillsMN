/**
 * Upload to Private Repository Dialog
 *
 * Dialog for selecting a private repository and uploading a skill
 */

import React, { useState, useEffect } from 'react';
import type { PrivateRepo, Skill } from '../../shared/types';
import { ipcClient } from '../services/ipcClient';

interface UploadToPrivateRepoDialogProps {
  isOpen: boolean;
  skill: Skill;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadToPrivateRepoDialog({
  isOpen,
  skill,
  onClose,
  onSuccess,
}: UploadToPrivateRepoDialogProps): JSX.Element | null {
  const [repositories, setRepositories] = useState<PrivateRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skillContent, setSkillContent] = useState<string>('');

  // Load repositories and skill content on mount
  useEffect(() => {
    if (isOpen) {
      loadRepositories();
      loadSkillContent();
    }
  }, [isOpen, skill]);

  const loadRepositories = async () => {
    try {
      setIsLoading(true);
      const repos = await ipcClient.listPrivateRepos();
      setRepositories(repos);
      // Auto-select first repository if only one exists
      if (repos.length === 1) {
        setSelectedRepoId(repos[0].id);
      }
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSkillContent = async () => {
    try {
      const skillData = await ipcClient.getSkill(skill.path);
      setSkillContent(skillData.content);
    } catch (err) {
      setError('Failed to load skill content');
    }
  };

  const handleUpload = async () => {
    if (!selectedRepoId) {
      setError('Please select a repository');
      return;
    }

    if (!skillContent) {
      setError('Skill content not loaded');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await ipcClient.uploadSkillToPrivateRepo({
        repoId: selectedRepoId,
        skillPath: skill.path,
        skillContent,
        skillName: skill.name,
        commitMessage: commitMessage || undefined,
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error?.message || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upload to Private Repository</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Skill Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
            <div className="text-gray-900 font-medium">{skill.name}</div>
          </div>

          {/* Repository Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Repository</label>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading repositories...</div>
            ) : repositories.length === 0 ? (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                No private repositories configured. Please add a repository in Settings → Repositories.
              </div>
            ) : (
              <div className="space-y-2">
                {repositories.map((repo) => (
                  <label
                    key={repo.id}
                    className={`
                      flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors
                      ${selectedRepoId === repo.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    `}
                  >
                    <input
                      type="radio"
                      name="repository"
                      value={repo.id}
                      checked={selectedRepoId === repo.id}
                      onChange={(e) => setSelectedRepoId(e.target.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {repo.displayName || `${repo.owner}/${repo.repo}`}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {repo.provider || 'github'}
                        </span>
                        <span>{repo.url}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Commit Message (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commit Message <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`Upload skill: ${skill.name}`}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedRepoId || repositories.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4V4m0 12l4 4m-4-4l-4 4" />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
