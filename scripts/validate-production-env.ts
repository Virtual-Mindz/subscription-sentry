/**
 * Production Environment Variable Validator
 * 
 * Validates that all required production environment variables are set
 * Run before deployment: npx tsx scripts/validate-production-env.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface RequiredVar {
  name: string;
  description: string;
  isPublic?: boolean;
  optional?: boolean;
}

const REQUIRED_VARS: RequiredVar[] = [
  { name: 'DATABASE_URL', description: 'PostgreSQL database connection string' },
  { name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', description: 'Clerk publishable key (production)', isPublic: true },
  { name: 'CLERK_SECRET_KEY', description: 'Clerk secret key (production)' },
  { name: 'PLAID_CLIENT_ID_US', description: 'Plaid US client ID (production)' },
  { name: 'PLAID_SECRET_US', description: 'Plaid US secret (production)' },
  { name: 'PLAID_ENV', description: 'Plaid environment (must be "production")' },
  { name: 'ENCRYPTION_KEY', description: 'Encryption key for sensitive data' },
  { name: 'NEXT_PUBLIC_APP_URL', description: 'Production application URL', isPublic: true },
  { name: 'RESEND_API_KEY', description: 'Resend API key for emails' },
  { name: 'RESEND_FROM_EMAIL', description: 'Resend sender email address' },
  { name: 'GEMINI_API_KEY', description: 'Google Gemini API key' },
  { name: 'CRON_SECRET', description: 'Secret for securing cron endpoints' },
  { name: 'PLAID_CLIENT_ID_EU', description: 'Plaid EU client ID (optional)', optional: true },
  { name: 'PLAID_SECRET_EU', description: 'Plaid EU secret (optional)', optional: true },
];

function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('⚠️  NODE_ENV is not set to "production"');
  }

  // Validate required variables
  for (const variable of REQUIRED_VARS) {
    const value = process.env[variable.name];

    if (!value || value.trim() === '') {
      if (!variable.optional) {
        errors.push(`❌ Missing required variable: ${variable.name} - ${variable.description}`);
      } else {
        warnings.push(`⚠️  Optional variable not set: ${variable.name} - ${variable.description}`);
      }
    } else {
      // Additional validation
      if (variable.name === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
        errors.push(`❌ DATABASE_URL should start with "postgresql://" (got: ${value.substring(0, 20)}...)`);
      }

      if (variable.name === 'PLAID_ENV' && value !== 'production') {
        errors.push(`❌ PLAID_ENV must be "production" for production deployment (got: ${value})`);
      }

      if (variable.name === 'NEXT_PUBLIC_APP_URL' && !value.startsWith('https://')) {
        errors.push(`❌ NEXT_PUBLIC_APP_URL should use HTTPS in production (got: ${value})`);
      }

      if (variable.name === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' && !value.startsWith('pk_live_')) {
        errors.push(`❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with "pk_live_" for production`);
      }

      if (variable.name === 'CLERK_SECRET_KEY' && !value.startsWith('sk_live_')) {
        errors.push(`❌ CLERK_SECRET_KEY should start with "sk_live_" for production`);
      }

      if (variable.name === 'ENCRYPTION_KEY' && value.length < 16) {
        warnings.push(`⚠️  ENCRYPTION_KEY should be at least 16 characters (got: ${value.length})`);
      }

      if (variable.name === 'CRON_SECRET' && value.length < 16) {
        warnings.push(`⚠️  CRON_SECRET should be at least 16 characters for security`);
      }
    }
  }

  // Check for test/sandbox keys in production
  const testKeyPatterns = [
    { name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', pattern: /pk_test_/ },
    { name: 'CLERK_SECRET_KEY', pattern: /sk_test_/ },
    { name: 'PLAID_ENV', pattern: /sandbox|development/ },
  ];

  for (const check of testKeyPatterns) {
    const value = process.env[check.name];
    if (value && check.pattern.test(value)) {
      errors.push(`❌ ${check.name} appears to be a test/sandbox key. Use production keys!`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Run validation
console.log('\n🔍 Validating Production Environment Variables...\n');

const result = validateEnvironment();

if (result.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  result.warnings.forEach(warning => console.log(`   ${warning}`));
  console.log('');
}

if (result.errors.length > 0) {
  console.log('❌ ERRORS:');
  result.errors.forEach(error => console.log(`   ${error}`));
  console.log('\n❌ Validation FAILED. Please fix the errors above before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set correctly!\n');
  console.log('✅ Production environment validation PASSED\n');
  process.exit(0);
}

