/**
 * Encryption utility for sensitive data (Plaid access tokens)
 * 
 * Uses AES-256-GCM for authenticated encryption
 * Security considerations:
 * - Never log encrypted values or keys
 * - Encryption key must be stored in environment variables
 * - Each encryption uses a unique IV (initialization vector)
 * - GCM mode provides authentication to prevent tampering
 */

import crypto from 'crypto';

// Encryption algorithm and key length
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits for key derivation

/**
 * Get encryption key from environment variable
 * Falls back to a derived key if ENCRYPTION_KEY is not set (for development only)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    // In production, this should throw an error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    
    // For development, derive a key from a default secret (NOT SECURE FOR PRODUCTION)
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
    return crypto.pbkdf2Sync(
      'default-dev-key-change-in-production',
      'salt',
      100000,
      KEY_LENGTH,
      'sha512'
    );
  }

  // If key is provided as hex string, convert it
  if (envKey.length === KEY_LENGTH * 2) {
    return Buffer.from(envKey, 'hex');
  }

  // Otherwise, derive key from the provided secret
  return crypto.pbkdf2Sync(
    envKey,
    'subscription-sentry-salt',
    100000,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypts a plaintext string
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64 encoded)
 * 
 * Security:
 * - Uses unique IV for each encryption
 * - Includes authentication tag to prevent tampering
 * - Never logs the plaintext or encrypted value
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    // Format: iv:authTag:encryptedData (all base64)
    const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

    // Clear sensitive data from memory (best effort)
    key.fill(0);
    iv.fill(0);

    return result;
  } catch (error) {
    // Never log the plaintext in error messages
    console.error('Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string
 * 
 * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext string
 * 
 * Security:
 * - Validates authentication tag to detect tampering
 * - Throws error if decryption fails (invalid key, tampered data, etc.)
 * - Never logs the decrypted value
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || encryptedData.trim().length === 0) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encrypted] = parts;
    
    // Decode from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encryptedBuffer = Buffer.from(encrypted, 'base64');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedBuffer, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Clear sensitive data from memory (best effort)
    key.fill(0);
    iv.fill(0);
    authTag.fill(0);

    return decrypted;
  } catch (error) {
    // Never log the decrypted value or key in error messages
    if (error instanceof Error && error.message.includes('Unsupported state')) {
      // This usually means authentication failed (tampered data or wrong key)
      console.error('Decryption failed: Authentication tag validation failed');
      throw new Error('Failed to decrypt data: Invalid or tampered data');
    }
    
    console.error('Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Validates that encryption/decryption is working correctly
 * Useful for testing and startup validation
 */
export function validateEncryption(): boolean {
  try {
    const testData = 'test-encryption-' + Date.now();
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      console.error('Encryption validation failed: Decrypted data does not match');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Encryption validation failed:', error);
    return false;
  }
}

/**
 * Generates a secure random encryption key (for setting ENCRYPTION_KEY)
 * Run this once to generate a key, then store it securely in environment variables
 * 
 * Usage: node -e "const {generateKey} = require('./src/lib/encryption.ts'); console.log(generateKey())"
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

