/**
 * Encryption Utility (backward-compatible re-export)
 *
 * All encryption functions are now in ./encryption.ts
 * This file re-exports them for backward compatibility with existing imports.
 */

export {
  encryptAPIKey,
  decryptAPIKey,
  encryptPAT,
  decryptPAT,
  isEncryptionAvailable,
  getEncryptionBackend,
  encryptStrict,
  decryptStrict,
  encryptWithFallback,
  decryptWithFallback,
} from './encryption';
