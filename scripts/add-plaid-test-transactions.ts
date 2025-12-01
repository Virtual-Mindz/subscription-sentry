/**
 * Script to add test transactions to Plaid Sandbox
 * 
 * This script uses the Plaid API to add test transactions to your Sandbox items.
 * 
 * Usage:
 * 1. Make sure you have a connected Plaid item (from your app)
 * 2. Get the access_token from your database or Plaid Dashboard
 * 3. Run: npx tsx scripts/add-plaid-test-transactions.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getPlaidClient } from '../src/lib/plaidConfig';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface TestTransaction {
  amount: number;
  date: string; // YYYY-MM-DD
  name: string;
  merchant_name?: string;
}

// Sample subscription transactions
const testTransactions: TestTransaction[] = [
  {
    amount: 15.99,
    date: new Date().toISOString().split('T')[0], // Today
    name: 'Netflix',
    merchant_name: 'Netflix',
  },
  {
    amount: 9.99,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    name: 'Spotify',
    merchant_name: 'Spotify',
  },
  {
    amount: 14.99,
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
    name: 'Amazon Prime',
    merchant_name: 'Amazon Prime',
  },
  {
    amount: 52.99,
    date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    name: 'Adobe Creative Cloud',
    merchant_name: 'Adobe',
  },
];

async function addTestTransactions() {
  try {
    console.log('⚠️  Note: Plaid Sandbox transactions must be added through the Dashboard UI.');
    console.log('The Plaid API does not support adding transactions directly in Sandbox mode.\n');
    
    console.log('📋 To add test transactions:');
    console.log('1. Go to: https://dashboard.plaid.com/activity/item-debugger');
    console.log('2. Select your connected item');
    console.log('3. Look for "Add Transaction" or use the Item Debugger\n');
    
    console.log('💡 Alternative: Use Plaid\'s test credentials that come with transactions:');
    console.log('   - Username: user_good');
    console.log('   - Password: pass_good');
    console.log('   - Some test accounts have pre-populated transactions\n');
    
    console.log('📝 Sample transactions to add manually:');
    testTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.merchant_name || tx.name}: $${tx.amount} on ${tx.date}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
addTestTransactions();

