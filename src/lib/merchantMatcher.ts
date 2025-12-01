/**
 * Merchant Matching Algorithm
 * 
 * Matches normalized merchant names to known merchants in the database
 * Uses fuzzy matching, amount proximity, and country filtering
 */

import { prisma } from '@/lib/prisma';
import { normalizeMerchant } from './merchantNormalizer';

export interface MatchedMerchant {
  id: string;
  name: string;
  displayName: string;
  category: string;
  confidenceScore: number;
  matchedKeyword?: string;
  amountMatch?: boolean;
  countryMatch?: boolean;
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy string matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculates similarity score between two strings (0-1)
 * 1.0 = exact match, 0.0 = completely different
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Checks if amount is within acceptable range of typical amount
 * Uses ±15% tolerance
 */
function isAmountMatch(
  transactionAmount: number,
  typicalAmount: number,
  tolerance: number = 0.15
): boolean {
  if (!typicalAmount || typicalAmount === 0) return false;
  const absAmount = Math.abs(transactionAmount);
  const diff = Math.abs(absAmount - typicalAmount);
  const percentDiff = diff / typicalAmount;
  return percentDiff <= tolerance;
}

/**
 * Finds the best matching known merchant for a normalized merchant name
 * 
 * @param normalizedMerchant - Normalized merchant name
 * @param amount - Transaction amount (optional, for amount matching)
 * @param country - Country code (optional, for country filtering)
 * @param currency - Currency code (optional, for currency filtering)
 * @returns Matched merchant with confidence score, or null if no good match
 * 
 * @example
 * const match = await findKnownMerchant('netflix', 15.49, 'US', 'USD');
 * // Returns: { id: '...', name: 'Netflix', confidenceScore: 0.95, ... }
 */
export async function findKnownMerchant(
  normalizedMerchant: string,
  amount?: number,
  country?: string,
  currency?: string
): Promise<MatchedMerchant | null> {
  if (!normalizedMerchant || normalizedMerchant.trim().length < 2) {
    return null;
  }

  // Get all active known merchants
  const knownMerchants = await prisma.knownMerchant.findMany({
    where: { isActive: true },
  });

  if (knownMerchants.length === 0) {
    return null;
  }

  let bestMatch: MatchedMerchant | null = null;
  let bestScore = 0;

  for (const merchant of knownMerchants) {
    // Country filter
    if (country && !merchant.countries.includes(country)) {
      continue;
    }

    // Currency filter
    if (currency && !merchant.currency.includes(currency)) {
      continue;
    }

    // Check keyword matches
    let keywordMatch = false;
    let matchedKeyword = '';
    let keywordScore = 0;

    for (const keyword of merchant.keywords) {
      const normalizedKeyword = normalizeMerchant(keyword);
      
      // Exact match
      if (normalizedMerchant === normalizedKeyword) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = 1.0;
        break;
      }

      // Contains match
      if (
        normalizedMerchant.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalizedMerchant)
      ) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = 0.8;
        break;
      }

      // Fuzzy match
      const similarity = calculateSimilarity(normalizedMerchant, normalizedKeyword);
      if (similarity > 0.7 && similarity > keywordScore) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = similarity;
      }
    }

    if (!keywordMatch) {
      continue;
    }

    // Calculate confidence score
    let confidenceScore = keywordScore;

    // Amount matching bonus
    let amountMatch = false;
    if (amount && merchant.typicalAmounts) {
      const amounts = merchant.typicalAmounts as Record<string, number>;
      const relevantCurrency = currency || 'USD';
      const typicalAmount = amounts[relevantCurrency] || amounts['USD'] || amounts['GBP'];

      if (typicalAmount && isAmountMatch(amount, typicalAmount)) {
        amountMatch = true;
        confidenceScore = Math.min(1.0, confidenceScore + 0.15); // Boost confidence
      } else if (typicalAmount) {
        // Penalize if amount is way off
        const absAmount = Math.abs(amount);
        const diff = Math.abs(absAmount - typicalAmount);
        const percentDiff = diff / typicalAmount;
        if (percentDiff > 0.5) {
          // More than 50% difference, reduce confidence
          confidenceScore *= 0.7;
        }
      }
    }

    // Country match bonus
    const countryMatch = country ? merchant.countries.includes(country) : true;
    if (countryMatch && country) {
      confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    }

    // Only consider matches with confidence > 0.6
    if (confidenceScore > 0.6 && confidenceScore > bestScore) {
      bestScore = confidenceScore;
      bestMatch = {
        id: merchant.id,
        name: merchant.name,
        displayName: merchant.displayName,
        category: merchant.category,
        confidenceScore: Math.round(confidenceScore * 100) / 100, // Round to 2 decimals
        matchedKeyword,
        amountMatch,
        countryMatch,
      };
    }
  }

  // Update match count for the matched merchant (for popularity tracking)
  if (bestMatch) {
    await prisma.knownMerchant.update({
      where: { id: bestMatch.id },
      data: { matchCount: { increment: 1 } },
    });
  }

  return bestMatch;
}

/**
 * Finds multiple potential matches (useful for disambiguation)
 * 
 * @param normalizedMerchant - Normalized merchant name
 * @param amount - Transaction amount (optional)
 * @param country - Country code (optional)
 * @param currency - Currency code (optional)
 * @param limit - Maximum number of matches to return
 * @returns Array of matched merchants sorted by confidence score
 */
export async function findKnownMerchants(
  normalizedMerchant: string,
  amount?: number,
  country?: string,
  currency?: string,
  limit: number = 5
): Promise<MatchedMerchant[]> {
  if (!normalizedMerchant || normalizedMerchant.trim().length < 2) {
    return [];
  }

  const knownMerchants = await prisma.knownMerchant.findMany({
    where: { isActive: true },
  });

  const matches: MatchedMerchant[] = [];

  for (const merchant of knownMerchants) {
    // Country filter
    if (country && !merchant.countries.includes(country)) {
      continue;
    }

    // Currency filter
    if (currency && !merchant.currency.includes(currency)) {
      continue;
    }

    // Check keyword matches
    let keywordMatch = false;
    let matchedKeyword = '';
    let keywordScore = 0;

    for (const keyword of merchant.keywords) {
      const normalizedKeyword = normalizeMerchant(keyword);
      
      if (normalizedMerchant === normalizedKeyword) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = 1.0;
        break;
      }

      if (
        normalizedMerchant.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalizedMerchant)
      ) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = 0.8;
        break;
      }

      const similarity = calculateSimilarity(normalizedMerchant, normalizedKeyword);
      if (similarity > 0.6 && similarity > keywordScore) {
        keywordMatch = true;
        matchedKeyword = keyword;
        keywordScore = similarity;
      }
    }

    if (!keywordMatch) {
      continue;
    }

    let confidenceScore = keywordScore;
    let amountMatch = false;

    if (amount && merchant.typicalAmounts) {
      const amounts = merchant.typicalAmounts as Record<string, number>;
      const relevantCurrency = currency || 'USD';
      const typicalAmount = amounts[relevantCurrency] || amounts['USD'] || amounts['GBP'];

      if (typicalAmount && isAmountMatch(amount, typicalAmount)) {
        amountMatch = true;
        confidenceScore = Math.min(1.0, confidenceScore + 0.15);
      }
    }

    const countryMatch = country ? merchant.countries.includes(country) : true;
    if (countryMatch && country) {
      confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    }

    if (confidenceScore > 0.5) {
      matches.push({
        id: merchant.id,
        name: merchant.name,
        displayName: merchant.displayName,
        category: merchant.category,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        matchedKeyword,
        amountMatch,
        countryMatch,
      });
    }
  }

  // Sort by confidence score (highest first) and return top matches
  return matches
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, limit);
}

