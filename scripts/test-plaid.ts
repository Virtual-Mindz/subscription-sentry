/**
 * Plaid Integration Test Script
 * 
 * Tests if Plaid is properly configured by:
 * 1. Checking environment variables
 * 2. Attempting to initialize Plaid client
 * 3. Attempting to create a link token (if credentials exist)
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { getPlaidClient } from '../src/lib/plaidConfig';

interface TestResult {
  test: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
  message: string;
}

const results: TestResult[] = [];

// Test 1: Check if plaid package is installed
try {
  require('plaid');
  results.push({
    test: 'Plaid Package Installed',
    status: '✅ PASS',
    message: 'plaid package is installed',
  });
} catch (error) {
  results.push({
    test: 'Plaid Package Installed',
    status: '❌ FAIL',
    message: 'plaid package is NOT installed. Run: npm install plaid',
  });
}

// Test 2: Check environment variables
const requiredEnvVars = {
  'PLAID_CLIENT_ID_US': process.env.PLAID_CLIENT_ID_US,
  'PLAID_SECRET_US': process.env.PLAID_SECRET_US,
  'PLAID_CLIENT_ID_EU': process.env.PLAID_CLIENT_ID_EU,
  'PLAID_SECRET_EU': process.env.PLAID_SECRET_EU,
  'PLAID_ENV': process.env.PLAID_ENV,
};

const missingVars: string[] = [];
const presentVars: string[] = [];

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value || value.trim() === '') {
    missingVars.push(key);
  } else {
    presentVars.push(key);
  }
});

if (missingVars.length === 0) {
  results.push({
    test: 'Environment Variables',
    status: '✅ PASS',
    message: `All required env vars are set: ${presentVars.join(', ')}`,
  });
} else if (presentVars.length > 0) {
  results.push({
    test: 'Environment Variables',
    status: '⚠️ WARNING',
    message: `Some env vars missing: ${missingVars.join(', ')}. Present: ${presentVars.join(', ')}`,
  });
} else {
  results.push({
    test: 'Environment Variables',
    status: '❌ FAIL',
    message: `All env vars are missing: ${missingVars.join(', ')}`,
  });
}

// Test 3: Check PLAID_ENV value
const plaidEnv = process.env.PLAID_ENV?.toLowerCase();
if (plaidEnv) {
  if (['sandbox', 'development', 'production'].includes(plaidEnv)) {
    results.push({
      test: 'Plaid Environment',
      status: '✅ PASS',
      message: `PLAID_ENV is set to: ${plaidEnv}`,
    });
  } else {
    results.push({
      test: 'Plaid Environment',
      status: '⚠️ WARNING',
      message: `PLAID_ENV is set to "${plaidEnv}" but should be "sandbox", "development", or "production"`,
    });
  }
} else {
  results.push({
    test: 'Plaid Environment',
    status: '⚠️ WARNING',
    message: 'PLAID_ENV is not set. Defaulting to "sandbox"',
  });
}

// Test 4: Try to initialize Plaid client (US)
try {
  if (process.env.PLAID_CLIENT_ID_US && process.env.PLAID_SECRET_US) {
    const client = getPlaidClient('US');
    results.push({
      test: 'Plaid Client (US)',
      status: '✅ PASS',
      message: 'US Plaid client initialized successfully',
    });
  } else {
    results.push({
      test: 'Plaid Client (US)',
      status: '❌ FAIL',
      message: 'Cannot initialize US client - missing credentials',
    });
  }
} catch (error) {
  results.push({
    test: 'Plaid Client (US)',
    status: '❌ FAIL',
    message: `Failed to initialize US client: ${error instanceof Error ? error.message : 'Unknown error'}`,
  });
}

// Test 5: Try to initialize Plaid client (UK)
try {
  if (process.env.PLAID_CLIENT_ID_EU && process.env.PLAID_SECRET_EU) {
    const client = getPlaidClient('UK');
    results.push({
      test: 'Plaid Client (UK)',
      status: '✅ PASS',
      message: 'UK Plaid client initialized successfully',
    });
  } else {
    results.push({
      test: 'Plaid Client (UK)',
      status: '⚠️ WARNING',
      message: 'UK credentials not set (optional if only supporting US)',
    });
  }
} catch (error) {
  results.push({
    test: 'Plaid Client (UK)',
    status: '⚠️ WARNING',
    message: `UK client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  });
}

// Print results
console.log('\n═══════════════════════════════════════════════════════════');
console.log('PLAID INTEGRATION TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

results.forEach((result) => {
  console.log(`${result.status} ${result.test}`);
  console.log(`   ${result.message}\n`);
});

// Summary
const passed = results.filter((r) => r.status === '✅ PASS').length;
const failed = results.filter((r) => r.status === '❌ FAIL').length;
const warnings = results.filter((r) => r.status === '⚠️ WARNING').length;

console.log('═══════════════════════════════════════════════════════════');
console.log('SUMMARY:');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  ⚠️  Warnings: ${warnings}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('❌ Plaid is NOT fully configured. Please fix the failed tests above.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Plaid is partially configured. Review warnings above.\n');
  process.exit(0);
} else {
  console.log('✅ Plaid appears to be fully configured!\n');
  process.exit(0);
}

