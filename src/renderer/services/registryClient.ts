/**
 * Registry Client
 *
 * Wrapper for registry-related IPC calls
 */

import type {
  SearchSkillResult,
  InstallFromRegistryRequest,
  InstallProgressEvent,
  SkillInstallationStatus,
  IPCResponse,
} from '../../shared/types';

/**
 * Search skills in the registry
 */
export async function searchRegistry(
  query: string,
  limit: number = 20
): Promise<SearchSkillResult[]> {
  const response: IPCResponse<SearchSkillResult[]> =
    await window.electronAPI.searchRegistry(query, limit);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Registry search failed');
  }

  return response.data;
}

/**
 * Install skill from registry
 */
export async function installFromRegistry(
  request: InstallFromRegistryRequest,
  targetDirectory: string
): Promise<{ success: boolean; skillPath?: string; error?: string }> {
  const response: IPCResponse<{ success: boolean; skillPath?: string; error?: string }> =
    await window.electronAPI.installFromRegistry(request, targetDirectory);

  if (!response.success) {
    throw new Error(response.error?.message || 'Installation failed');
  }

  return response.data!;
}

/**
 * Check if skill is installed
 */
export async function checkSkillInstalled(
  skillId: string,
  targetDirectory: string
): Promise<SkillInstallationStatus> {
  const response: IPCResponse<SkillInstallationStatus> =
    await window.electronAPI.checkSkillInstalled(skillId, targetDirectory);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to check installation status');
  }

  return response.data;
}

/**
 * Subscribe to installation progress updates
 */
export function onInstallProgress(
  callback: (progress: InstallProgressEvent) => void
): () => void {
  window.electronAPI.onInstallProgress((_event, progress) => {
    callback(progress);
  });

  // Return unsubscribe function
  return () => {
    window.electronAPI.removeInstallProgressListener();
  };
}

