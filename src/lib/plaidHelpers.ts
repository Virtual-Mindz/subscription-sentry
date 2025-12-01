/**
 * Helper functions for Plaid integration
 * Handles encrypted access token storage and retrieval
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY is not set. Plaid access tokens will not be encrypted.');
}

/**
 * Stores encrypted Plaid access token for a bank account
 * 
 * @param userId - The user ID
 * @param plaidItemId - The Plaid item ID
 * @param accessToken - The plaintext Plaid access token
 * @param country - The country code (US or UK)
 * @param currency - The currency code (USD or GBP)
 * 
 * Security:
 * - Encrypts token before storing
 * - Never logs the access token
 */
export async function storeEncryptedAccessToken(
  userId: string,
  plaidItemId: string,
  accessToken: string,
  country: string,
  currency: string
): Promise<void> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key is not configured. Cannot store access token securely.');
  }

  try {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new Error('Access token cannot be empty');
    }

    // Encrypt the access token (encryption.ts handles key internally)
    const encrypted = encrypt(accessToken);

    // Find an existing bank account linked to this Plaid Item ID
    let bankAccount = await prisma.bankAccount.findFirst({
      where: {
        userId: userId,
        plaidItemId: plaidItemId,
      },
    });

    if (bankAccount) {
      // Update existing bank account with new token and sync info
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          encryptedAccessToken: encrypted,
          plaidItemId: plaidItemId,
          country: country,
          currency: currency,
          lastSyncAt: new Date(),
        },
      });
    } else {
      // This scenario might happen if the first account for an item is being added,
      // or if we're adding an item without specific account details yet.
      // For now, we'll create a placeholder or link to the first account.
      // A more robust solution might involve creating a separate `PlaidItem` model.
      await prisma.bankAccount.create({
        data: {
          userId: userId,
          plaidId: `temp-plaid-id-${Date.now()}`, // Placeholder, will be updated with real account_id later
          plaidItemId: plaidItemId,
          name: 'Plaid Account (Pending Details)',
          type: 'depository',
          currency: currency,
          country: country,
          encryptedAccessToken: JSON.stringify(encrypted),
          lastSyncAt: new Date(),
        },
      });
    }
  } catch (error) {
    // Never log the access token
    console.error('Failed to store Plaid access token:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to store access token securely');
  }
}

/**
 * Stores encrypted Plaid access token for a bank account (legacy function for backward compatibility)
 * 
 * @param bankAccountId - The bank account ID
 * @param accessToken - The plaintext Plaid access token
 * @param plaidItemId - The Plaid item ID (optional)
 * 
 * Security:
 * - Encrypts token before storing
 * - Never logs the access token
 */
export async function storePlaidAccessToken(
  bankAccountId: string,
  accessToken: string,
  plaidItemId?: string
): Promise<void> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key is not configured. Cannot store access token securely.');
  }

  try {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new Error('Access token cannot be empty');
    }

    // Encrypt the access token (encryption.ts handles key internally)
    const encrypted = encrypt(accessToken);

    // Update bank account with encrypted token
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        encryptedAccessToken: JSON.stringify(encrypted),
        ...(plaidItemId && { plaidItemId }),
      },
    });
  } catch (error) {
    // Never log the access token
    console.error('Failed to store Plaid access token:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to store access token securely');
  }
}

/**
 * Retrieves and decrypts Plaid access token for a bank account
 * 
 * @param bankAccountId - The bank account ID
 * @returns Decrypted access token
 * 
 * Security:
 * - Decrypts token on retrieval
 * - Never logs the access token
 * - Throws error if token not found or decryption fails
 */
export async function getPlaidAccessToken(bankAccountId: string): Promise<string> {
  try {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { encryptedAccessToken: true },
    });

    if (!bankAccount || !bankAccount.encryptedAccessToken) {
      throw new Error('Access token not found for this bank account');
    }

    // Decrypt the access token (decryption.ts handles key internally)
    const encryptedData = typeof bankAccount.encryptedAccessToken === 'string' 
      ? bankAccount.encryptedAccessToken
      : JSON.stringify(bankAccount.encryptedAccessToken);
    
    const decryptedToken = decrypt(encryptedData);

    return decryptedToken;
  } catch (error) {
    // Never log the access token
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    console.error('Failed to retrieve Plaid access token:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to retrieve access token');
  }
}

/**
 * Gets Plaid access token by Plaid item ID
 * Useful when you have the item ID but need to find the associated bank account
 * 
 * @param userId - The user ID
 * @param plaidItemId - The Plaid item ID
 * @returns Decrypted access token
 */
export async function getPlaidAccessTokenByItemId(
  userId: string,
  plaidItemId: string
): Promise<string> {
  try {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        userId,
        plaidItemId,
        encryptedAccessToken: { not: null },
      },
      select: { encryptedAccessToken: true },
    });

    if (!bankAccount || !bankAccount.encryptedAccessToken) {
      throw new Error('Access token not found for this Plaid item');
    }

    // Decrypt the access token (decryption.ts handles key internally)
    const encryptedData = typeof bankAccount.encryptedAccessToken === 'string' 
      ? bankAccount.encryptedAccessToken
      : JSON.stringify(bankAccount.encryptedAccessToken);
    
    const decryptedToken = decrypt(encryptedData);

    return decryptedToken;
  } catch (error) {
    // Never log the access token
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    console.error('Failed to retrieve Plaid access token by item ID:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to retrieve access token');
  }
}

/**
 * Updates the last sync timestamp for a bank account
 * 
 * @param bankAccountId - The bank account ID
 */
export async function updateLastSyncTime(bankAccountId: string): Promise<void> {
  try {
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { lastSyncAt: new Date() },
    });
  } catch (error) {
    console.error('Failed to update last sync time:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Removes stored access token (for account disconnection)
 * 
 * @param bankAccountId - The bank account ID
 */
export async function removePlaidAccessToken(bankAccountId: string): Promise<void> {
  try {
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { encryptedAccessToken: null },
    });
  } catch (error) {
    console.error('Failed to remove access token:', error);
    throw new Error('Failed to disconnect bank account');
  }
}

