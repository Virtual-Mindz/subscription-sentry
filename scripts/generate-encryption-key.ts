/**
 * Script to generate a secure encryption key for ENCRYPTION_KEY environment variable
 * 
 * Usage: npx tsx scripts/generate-encryption-key.ts
 * 
 * This will generate a secure random key that you should:
 * 1. Copy to your .env.local file as ENCRYPTION_KEY=<generated-key>
 * 2. Store securely in your production environment variables
 * 3. NEVER commit this key to version control
 */

import { generateKey } from '../src/lib/encryption';

console.log('\n🔐 Generating secure encryption key...\n');
const key = generateKey();
console.log('Generated encryption key:');
console.log(key);
console.log('\n📝 Add this to your .env.local file:');
console.log(`ENCRYPTION_KEY=${key}\n`);
console.log('⚠️  IMPORTANT:');
console.log('  - Never commit this key to version control');
console.log('  - Store it securely in your production environment');
console.log('  - If you lose this key, you cannot decrypt existing data\n');

