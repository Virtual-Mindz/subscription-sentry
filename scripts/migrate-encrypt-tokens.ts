/**
 * Migration script to encrypt existing Plaid access tokens
 * 
 * NOTE: This script is for migrating existing unencrypted tokens.
 * If you're starting fresh, you don't need to run this.
 * 
 * Usage: npx tsx scripts/migrate-encrypt-tokens.ts
 * 
 * This script:
 * 1. Checks if encryption is working
 * 2. Finds any bank accounts that might have unencrypted tokens (if stored elsewhere)
 * 3. Since we're not currently storing tokens, this is mainly for future use
 */

import { prisma } from '../src/lib/prisma';
import { validateEncryption } from '../src/lib/encryption';

async function main() {
  console.log('🔐 Starting token encryption migration...\n');

  // Validate encryption is working
  console.log('1. Validating encryption setup...');
  const isValid = validateEncryption();
  if (!isValid) {
    console.error('❌ Encryption validation failed!');
    console.error('   Please check your ENCRYPTION_KEY environment variable.');
    process.exit(1);
  }
  console.log('✅ Encryption is working correctly\n');

  // Check for bank accounts
  console.log('2. Checking for bank accounts...');
  const bankAccounts = await prisma.bankAccount.findMany({
    select: {
      id: true,
      plaidId: true,
      name: true,
      encryptedAccessToken: true,
    },
  });

  console.log(`   Found ${bankAccounts.length} bank account(s)\n`);

  if (bankAccounts.length === 0) {
    console.log('✅ No bank accounts to migrate. Migration complete!\n');
    return;
  }

  // Check which accounts have encrypted tokens
  const accountsWithTokens = bankAccounts.filter(
    (acc) => acc.encryptedAccessToken !== null
  );
  const accountsWithoutTokens = bankAccounts.filter(
    (acc) => acc.encryptedAccessToken === null
  );

  console.log(`   - ${accountsWithTokens.length} account(s) already have encrypted tokens`);
  console.log(`   - ${accountsWithoutTokens.length} account(s) need tokens (will be set on next Plaid connection)\n`);

  if (accountsWithoutTokens.length > 0) {
    console.log('ℹ️  Accounts without tokens will get encrypted tokens when users reconnect via Plaid.\n');
  }

  console.log('✅ Migration check complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Ensure ENCRYPTION_KEY is set in your environment');
  console.log('   2. Users may need to reconnect their bank accounts to store encrypted tokens');
  console.log('   3. All new connections will automatically encrypt tokens\n');
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

