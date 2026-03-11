/**
 * GitHub Client
 *
 * Wrapper for GitHub-related IPC calls
 */

import type {
  SearchResult,
  RateLimitInfo,
  CuratedSource,
  InstallProgress,
  IPCResponse,
} from '../../shared/types';

/**
 * Search GitHub for skills
 */
export async function searchGitHub(
  query: string,
  page: number = 1
): Promise<{
  results: SearchResult[];
  totalCount: number;
  incomplete: boolean;
  rateLimit: RateLimitInfo;
}> {
  const response = await window.electronAPI.searchGitHub(query, page);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Search failed');
  }

  return response.data;
}

/**
 * Preview skill content
 */
export async function previewGitHubSkill(downloadUrl: string): Promise<string> {
  const response = await window.electronAPI.previewGitHubSkill(downloadUrl);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Preview failed');
  }

  return response.data.content;
}

/**
 * Install skill from GitHub
 */
export async function installGitHubSkill(params: {
  repositoryName: string;
  skillFilePath: string;
  downloadUrl: string;
  targetDirectory: 'project' | 'global';
  conflictResolution?: 'overwrite' | 'rename' | 'skip';
}): Promise<{ success: boolean; newPath?: string; error?: string }> {
  const response = await window.electronAPI.installGitHubSkill(params);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Installation failed');
  }

  return response.data;
}

/**
 * Get curated sources
 */
export async function getCuratedSources(): Promise<CuratedSource[]> {
  const response = await window.electronAPI.getCuratedSources();

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get curated sources');
  }

  return response.data.sources;
}

/**
 * Get skills from a specific source
 */
export async function getSkillsFromSource(
  repositoryUrl: string,
  page: number = 1
): Promise<{
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
}> {
  const response = await window.electronAPI.getSkillsFromSource({
    repositoryUrl,
    page,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get skills from source');
  }

  return response.data;
}

/**
 * Cancel skill installation
 */
export async function cancelGitHubInstall(
  skillName: string,
  repositoryFullName: string
): Promise<{ cancelled: boolean; cleanedUp: boolean }> {
  const response = await window.electronAPI.cancelGitHubInstall({
    skillName,
    repositoryFullName,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to cancel installation');
  }

  return response.data;
}

/**
 * Subscribe to installation progress updates
 */
export function onInstallProgress(
  callback: (progress: InstallProgress) => void
): () => void {
  window.electronAPI.onGitHubInstallProgress((_event, progress) => {
    callback(progress);
  });

  // Return unsubscribe function
  return () => {
    window.electronAPI.removeGitHubInstallProgressListener();
  };
}
