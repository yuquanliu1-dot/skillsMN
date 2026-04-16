/**
 * Encryption Utility
 *
 * Unified encryption/decryption for API keys and PATs using Electron safeStorage
 * Supports two modes:
 * - Strict: Throws if encryption is unavailable (for PATs)
 * - Fallback: Falls back to base64 encoding (for API keys)
 */

import { safeStorage } from 'electron';
import { logger } from './Logger';

/**
 * Check if encryption is available on this platform
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
 */
export function getEncryptionBackend(): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return 'Not available';
  }

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

/**
 * Encrypt a value using Electron safeStorage (strict mode)
 * Throws if encryption is not available
 *
 * @param value - Plain text value to encrypt
 * @param label - Label for logging (e.g., 'PAT', 'API key')
 * @returns Base64-encoded encrypted value
 * @throws Error if encryption is not available or fails
 */
export function encryptStrict(value: string, label: string = 'value'): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }

  if (!value) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    const error = new Error('Credential encryption not available on this platform');
    logger.error('Encryption not available', 'EncryptionUtil', {
      platform: process.platform,
      error: error.message,
    });
    throw error;
  }

  try {
    const encrypted = safeStorage.encryptString(value);
    logger.debug(`${label} encrypted successfully`, 'EncryptionUtil');
    return encrypted.toString('base64');
  } catch (error) {
    logger.error(`Failed to encrypt ${label}`, 'EncryptionUtil', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to encrypt ${label}`);
  }
}

/**
 * Decrypt a value using Electron safeStorage (strict mode)
 * Throws if encryption is not available
 *
 * @param encryptedValue - Base64-encoded encrypted value
 * @param label - Label for logging (e.g., 'PAT', 'API key')
 * @returns Decrypted plain text value
 * @throws Error if decryption fails
 */
export function decryptStrict(encryptedValue: string, label: string = 'value'): string {
  if (typeof encryptedValue !== 'string') {
    throw new Error(`Encrypted ${label} must be a string`);
  }

  if (!encryptedValue) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    const error = new Error('Credential encryption not available on this platform');
    logger.error('Decryption not available', 'EncryptionUtil', {
      platform: process.platform,
      error: error.message,
    });
    throw error;
  }

  try {
    const buffer = Buffer.from(encryptedValue, 'base64');
    logger.debug(`${label} decrypted successfully`, 'EncryptionUtil');
    return safeStorage.decryptString(buffer);
  } catch (error) {
    logger.error(`Failed to decrypt ${label}`, 'EncryptionUtil', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to decrypt ${label}`);
  }
}

/**
 * Encrypt a value using Electron safeStorage (fallback mode)
 * Falls back to base64 if safeStorage is unavailable
 *
 * @param value - Plain text value to encrypt
 * @param label - Label for logging
 * @returns Encrypted value (base64 encoded)
 */
export function encryptWithFallback(value: string, label: string = 'API key'): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }

  if (!value) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn(
      `Encryption not available, storing ${label} in base64 (NOT SECURE)`,
      'EncryptionUtil'
    );
    return Buffer.from(value).toString('base64');
  }

  try {
    const encrypted = safeStorage.encryptString(value);
    return encrypted.toString('base64');
  } catch (error) {
    logger.error(`Failed to encrypt ${label}`, 'EncryptionUtil', error);
    throw new Error(`Failed to encrypt ${label}`);
  }
}

/**
 * Decrypt a value using Electron safeStorage (fallback mode)
 * Falls back to base64 decode if safeStorage is unavailable
 *
 * @param encryptedValue - Base64-encoded encrypted value
 * @param label - Label for logging
 * @returns Decrypted plain text value
 */
export function decryptWithFallback(encryptedValue: string, label: string = 'API key'): string {
  if (typeof encryptedValue !== 'string') {
    throw new Error(`Encrypted ${label} must be a string`);
  }

  if (!encryptedValue) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn(
      `Encryption not available, decrypting ${label} from base64 (NOT SECURE)`,
      'EncryptionUtil'
    );
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  }

  try {
    const buffer = Buffer.from(encryptedValue, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (error) {
    logger.error(`Failed to decrypt ${label}`, 'EncryptionUtil', error);
    throw new Error(`Failed to decrypt ${label}. The key may be corrupted or was encrypted on a different machine.`);
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible named exports
// ---------------------------------------------------------------------------

/** Encrypt API key (fallback mode) */
export function encryptAPIKey(apiKey: string): string {
  return encryptWithFallback(apiKey, 'API key');
}

/** Decrypt API key (fallback mode) */
export function decryptAPIKey(encryptedKey: string): string {
  return decryptWithFallback(encryptedKey, 'API key');
}

/** Encrypt PAT (strict mode) */
export function encryptPAT(pat: string): string {
  return encryptStrict(pat, 'PAT');
}

/** Decrypt PAT (strict mode) */
export function decryptPAT(encryptedPAT: string): string {
  return decryptStrict(encryptedPAT, 'PAT');
}
