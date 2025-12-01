/**
 * Plaid Configuration Utility
 * 
 * Handles multi-region Plaid configuration (US and UK)
 * Detects user country and returns appropriate credentials
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { prisma } from './prisma';

export type PlaidRegion = 'US' | 'UK';
export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

/**
 * Gets Plaid environment from environment variable
 */
function getPlaidEnvironment(): PlaidEnvironment {
  const env = process.env.PLAID_ENV?.toLowerCase();
  if (env === 'production') return 'production';
  if (env === 'development') return 'development';
  return 'sandbox'; // Default to sandbox
}

/**
 * Gets Plaid API configuration for a specific region
 * 
 * @param region - 'US' or 'UK'
 * @returns PlaidApi instance configured for the region
 */
export function getPlaidClient(region: PlaidRegion = 'US'): PlaidApi {
  const env = getPlaidEnvironment();
  
  // Get credentials based on region
  let clientId: string;
  let secret: string;

  if (region === 'UK') {
    // UK uses EU credentials
    clientId = process.env.PLAID_CLIENT_ID_EU || process.env.PLAID_CLIENT_ID || '';
    secret = process.env.PLAID_SECRET_EU || process.env.PLAID_SECRET || '';
  } else {
    // US credentials
    clientId = process.env.PLAID_CLIENT_ID_US || process.env.PLAID_CLIENT_ID || '';
    secret = process.env.PLAID_SECRET_US || process.env.PLAID_SECRET || '';
  }

  if (!clientId || !secret) {
    throw new Error(`Plaid credentials not configured for region: ${region}`);
  }

  // Map environment to Plaid environment
  let basePath: string;
  switch (env) {
    case 'production':
      basePath = PlaidEnvironments.production;
      break;
    case 'development':
      basePath = PlaidEnvironments.development;
      break;
    default:
      basePath = PlaidEnvironments.sandbox;
  }

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

/**
 * Detects user's country from their bank accounts or user profile
 * 
 * @param userId - User ID
 * @returns 'US' or 'UK', defaults to 'US'
 */
export async function getUserCountry(userId: string): Promise<PlaidRegion> {
  try {
    // Check bank accounts first (most reliable)
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { userId },
      select: { country: true },
      orderBy: { createdAt: 'desc' }, // Most recent account
    });

    if (bankAccount?.country) {
      if (bankAccount.country === 'UK' || bankAccount.country === 'GB') {
        return 'UK';
      }
      return 'US';
    }

    // TODO: Could check user profile for country preference
    // For now, default to US
    return 'US';
  } catch (error) {
    console.error('Error detecting user country:', error);
    return 'US'; // Default to US
  }
}

/**
 * Gets Plaid country codes for a region
 * 
 * @param region - 'US' or 'UK'
 * @returns Array of country codes
 */
export function getPlaidCountryCodes(region: PlaidRegion): string[] {
  if (region === 'UK') {
    return ['GB']; // Plaid uses 'GB' for UK
  }
  return ['US'];
}

/**
 * Gets Plaid products available for a region
 * 
 * @param region - 'US' or 'UK'
 * @returns Array of product strings
 */
export function getPlaidProducts(region: PlaidRegion): string[] {
  // Both US and UK support these products
  return ['auth', 'transactions'];
}

/**
 * Gets currency for a region
 * 
 * @param region - 'US' or 'UK'
 * @returns Currency code
 */
export function getRegionCurrency(region: PlaidRegion): string {
  return region === 'UK' ? 'GBP' : 'USD';
}

/**
 * Creates a Plaid client for a specific user
 * Automatically detects user's country
 * 
 * @param userId - User ID
 * @returns PlaidApi instance
 */
export async function getPlaidClientForUser(userId: string): Promise<{
  client: PlaidApi;
  region: PlaidRegion;
  countryCodes: string[];
  currency: string;
}> {
  const region = await getUserCountry(userId);
  const client = getPlaidClient(region);
  const countryCodes = getPlaidCountryCodes(region);
  const currency = getRegionCurrency(region);

  return {
    client,
    region,
    countryCodes,
    currency,
  };
}

