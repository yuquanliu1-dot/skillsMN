/**
 * Encryption Utility for Private Repository PATs
 *
 * Uses Electron's safeStorage for secure credential encryption
 * Falls back to OS-specific credential managers on different platforms
 */

import { safeStorage } from 'electron';
import { logger } from './Logger';

/**
 * Encrypt a Personal Access Token using Electron safeStorage
 *
 * Platform-specific implementation:
 * - Windows: Uses DPAPI (Data Protection API) with user credentials
 * - macOS: Uses Keychain Access for secure storage
 * - Linux: Uses libsecret (requires GNOME Keyring or KDE Wallet)
 *
 * The encrypted data is tied to the user account and cannot be decrypted
 * on a different machine or by a different user.
 *
 * @param pat - Plain text PAT to encrypt
 * @returns Base64-encoded encrypted PAT (safe for JSON storage)
 * @throws Error if encryption is not available or fails
 */
export function encryptPAT(pat: string): string {
  // Check platform support before attempting encryption
  // This prevents runtime errors on Linux systems without libsecret
  if (!safeStorage.isEncryptionAvailable()) {
    const error = new Error('Credential encryption not available on this platform');
    logger.error('Encryption not available', 'EncryptionUtil', {
      platform: process.platform,
      error: error.message,
    });
    throw error;
  }

  try {
    const encrypted = safeStorage.encryptString(pat);
    const encryptedBase64 = encrypted.toString('base64');

    logger.debug('PAT encrypted successfully', 'EncryptionUtil');
    return encryptedBase64;
  } catch (error) {
    logger.error('Failed to encrypt PAT', 'EncryptionUtil', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to encrypt PAT');
  }
}

/**
 * Decrypt an encrypted Personal Access Token
 *
 * Reverse operation of encryptPAT():
 * 1. Converts Base64 string back to Buffer
 * 2. Passes to safeStorage.decryptString()
 * 3. Returns plain text PAT for API authentication
 *
 * SECURITY: The decrypted PAT should never be exposed to the renderer process.
 * It should only be used in the main process for GitHub API calls.
 *
 * @param encryptedPAT - Base64-encoded encrypted PAT (from config file)
 * @returns Decrypted plain text PAT (for API use only)
 * @throws Error if decryption fails (corrupted data or wrong platform)
 */
export function decryptPAT(encryptedPAT: string): string {
  // Verify encryption support before attempting decryption
  if (!safeStorage.isEncryptionAvailable()) {
    const error = new Error('Credential encryption not available on this platform');
    logger.error('Decryption not available', 'EncryptionUtil', {
      platform: process.platform,
      error: error.message,
    });
    throw error;
  }

  try {
    const buffer = Buffer.from(encryptedPAT, 'base64');
    const decrypted = safeStorage.decryptString(buffer);

    logger.debug('PAT decrypted successfully', 'EncryptionUtil');
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt PAT', 'EncryptionUtil', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to decrypt PAT');
  }
}

/**
 * Check if credential encryption is available on this platform
 * @returns True if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  const available = safeStorage.isEncryptionAvailable();

  logger.debug(`Encryption availability: ${available}`, 'EncryptionUtil', {
    platform: process.platform,
    available,
  });

  return available;
}

/**
 * Get encryption backend info for debugging
 * @returns Human-readable description of encryption backend
 */
export function getEncryptionBackend(): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return 'Not available';
  }

  // On Windows, uses DPAPI
  // On macOS, uses Keychain Access
  // On Linux, uses Secret Service API (libsecret)

  switch (process.platform) {
    case 'win32':
      return 'Windows DPAPI';
    case 'darwin':
      return 'macOS Keychain';
    case 'linux':
      return 'Linux Secret Service (libsecret)';
    default:
      return 'Unknown';
  }
}
