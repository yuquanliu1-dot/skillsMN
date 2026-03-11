/**
 * API Key Encryption Utility
 *
 * Handles encryption/decryption of API keys using Electron safeStorage
 */

import { safeStorage } from 'electron';
import { logger } from '../utils/Logger';

/**
 * Encrypt API key using Electron safeStorage
 *
 * @param apiKey - Plain text API key
 * @returns Encrypted API key (base64 encoded)
 */
export function encryptAPIKey(apiKey: string): string {
  if (typeof apiKey !== 'string') {
    throw new Error('API key must be a string');
  }

  // Allow empty string (for initial setup)
  if (!apiKey) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn(
      'Encryption not available, storing API key in base64 (NOT SECURE)',
      'EncryptionUtil'
    );
    return Buffer.from(apiKey).toString('base64');
  }

  try {
    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  } catch (error) {
    logger.error('Failed to encrypt API key', 'EncryptionUtil', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypt API key using Electron safeStorage
 *
 * @param encryptedKey - Encrypted API key (base64 encoded)
 * @returns Plain text API key
 */
export function decryptAPIKey(encryptedKey: string): string {
  if (typeof encryptedKey !== 'string') {
    throw new Error('Encrypted key must be a string');
  }

  // Allow empty string (for initial setup)
  if (!encryptedKey) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn(
      'Encryption not available, decrypting from base64 (NOT SECURE)',
      'EncryptionUtil'
    );
    return Buffer.from(encryptedKey, 'base64').toString('utf-8');
  }

  try {
    const buffer = Buffer.from(encryptedKey, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (error) {
    logger.error('Failed to decrypt API key', 'EncryptionUtil', error);
    throw new Error('Failed to decrypt API key. The key may be corrupted or was encrypted on a different machine.');
  }
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
