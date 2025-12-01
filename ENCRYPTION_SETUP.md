# Encryption Setup Guide

## Overview

Plaid access tokens are now encrypted at rest using AES-256-GCM encryption. This ensures that even if your database is compromised, access tokens cannot be read without the encryption key.

## Security Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Unique IV per encryption**: Each token is encrypted with a unique initialization vector
- **Authentication tags**: Prevents tampering with encrypted data
- **No token logging**: Access tokens are never logged or exposed in error messages
- **Key derivation**: Uses PBKDF2 for key derivation from environment secrets

## Setup Instructions

### 1. Generate Encryption Key

Run the key generation script:

```bash
npx tsx scripts/generate-encryption-key.ts
```

This will output a secure random key. **Copy this key** - you'll need it for the next step.

### 2. Add to Environment Variables

Add the encryption key to your `.env.local` file:

```env
ENCRYPTION_KEY=<generated-key-from-step-1>
```

**IMPORTANT:**
- Never commit this key to version control
- Store it securely in your production environment
- If you lose this key, you cannot decrypt existing encrypted data
- Each environment (dev, staging, production) should have its own unique key

### 3. Verify Encryption is Working

The encryption system will automatically validate on startup. If there are issues, you'll see errors in the console.

You can also manually test:

```typescript
import { validateEncryption } from '@/lib/encryption';

const isValid = validateEncryption();
console.log('Encryption working:', isValid);
```

### 4. Run Database Migration

After setting up the encryption key, run the Prisma migration:

```bash
npx prisma migrate dev --name add_encryption_fields
```

This will:
- Add `encryptedAccessToken` field to `BankAccount` model
- Add other new fields for subscription detection
- Create the `KnownMerchant` model

### 5. Migrate Existing Data (if applicable)

If you have existing bank accounts that need token encryption:

```bash
npx tsx scripts/migrate-encrypt-tokens.ts
```

**Note:** Since we weren't storing tokens before, existing accounts will need to be reconnected via Plaid to store encrypted tokens.

## How It Works

### Storing Tokens

When a user connects a bank account via Plaid:

1. Plaid returns an access token (plaintext)
2. The token is immediately encrypted using `encrypt()`
3. The encrypted token is stored in the database
4. The plaintext token is never stored or logged

### Retrieving Tokens

When syncing transactions:

1. The encrypted token is retrieved from the database
2. The token is decrypted using `decrypt()`
3. The decrypted token is used for Plaid API calls
4. The plaintext token is never logged or exposed

### Security Best Practices

1. **Environment Variables**: Always use environment variables for the encryption key
2. **Key Rotation**: If you need to rotate keys, you'll need to:
   - Generate a new key
   - Decrypt all existing tokens with the old key
   - Re-encrypt with the new key
   - Update the environment variable
3. **Backup**: Keep a secure backup of your encryption key
4. **Access Control**: Limit who has access to the encryption key
5. **Monitoring**: Monitor for decryption failures (could indicate key issues or tampering)

## Troubleshooting

### "ENCRYPTION_KEY environment variable is required"

**Solution:** Add `ENCRYPTION_KEY` to your `.env.local` file and restart your development server.

### "Failed to decrypt data"

**Possible causes:**
- Wrong encryption key
- Data was encrypted with a different key
- Encrypted data was tampered with

**Solution:** 
- Verify your `ENCRYPTION_KEY` matches the one used to encrypt the data
- If you've lost the key, you'll need to have users reconnect their bank accounts

### "Encryption validation failed"

**Solution:**
- Check that `ENCRYPTION_KEY` is set correctly
- Ensure the key is a valid hex string (64 characters) or a strong password
- Restart your development server

## Production Deployment

### Vercel

1. Go to your project settings
2. Navigate to Environment Variables
3. Add `ENCRYPTION_KEY` with your production key
4. Redeploy your application

### Other Platforms

Add `ENCRYPTION_KEY` to your platform's environment variable configuration before deploying.

## API Changes

### Before (Insecure)

```typescript
// ❌ Access token passed from client
const { bankAccountId, accessToken } = await request.json();
```

### After (Secure)

```typescript
// ✅ Access token retrieved from encrypted database storage
const accessToken = await getPlaidAccessToken(bankAccountId);
```

The `sync-transactions` API no longer accepts `accessToken` in the request body. It automatically retrieves and decrypts the token from the database.

## Code Examples

### Encrypting a Token

```typescript
import { encrypt } from '@/lib/encryption';
import { storePlaidAccessToken } from '@/lib/plaidHelpers';

const plaintextToken = 'access-sandbox-...';
const encryptedToken = encrypt(plaintextToken);
await storePlaidAccessToken(bankAccountId, plaintextToken);
```

### Decrypting a Token

```typescript
import { getPlaidAccessToken } from '@/lib/plaidHelpers';

const accessToken = await getPlaidAccessToken(bankAccountId);
// Use accessToken for Plaid API calls
```

## Support

If you encounter issues with encryption setup, check:
1. Environment variable is set correctly
2. Key format is correct (hex string or strong password)
3. Database migration has been run
4. Server has been restarted after adding the key

