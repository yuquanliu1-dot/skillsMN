/**
 * Version Comparison Utilities
 *
 * Provides semantic version comparison for skill update/upload detection
 */

/**
 * Compare two semantic version strings
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  // Handle undefined/null cases
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  // Clean version strings (remove 'v' prefix if present)
  const cleanA = a.replace(/^v/i, '').trim();
  const cleanB = b.replace(/^v/i, '').trim();

  // Split into parts
  const partsA = cleanA.split('.').map(p => parseInt(p, 10) || 0);
  const partsB = cleanB.split('.').map(p => parseInt(p, 10) || 0);

  // Compare each part
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}

/**
 * Check if local version is newer than remote version
 */
export function isLocalNewer(localVersion: string | undefined, remoteVersion: string | undefined): boolean {
  if (!localVersion || !remoteVersion) return false;
  return compareVersions(localVersion, remoteVersion) > 0;
}

/**
 * Check if remote version is newer than local version
 */
export function isRemoteNewer(localVersion: string | undefined, remoteVersion: string | undefined): boolean {
  if (!localVersion || !remoteVersion) return false;
  return compareVersions(localVersion, remoteVersion) < 0;
}

/**
 * Version comparison result
 */
export interface VersionCompareResult {
  hasUpdate: boolean;  // Remote > Local
  canUpload: boolean;  // Local > Remote (for private repos)
  localVersion?: string;
  remoteVersion?: string;
}
