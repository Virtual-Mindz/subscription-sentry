/**
 * Enhanced Recurring Transaction Detector
 * 
 * Detects recurring subscription patterns from transaction history
 * Uses interval analysis, amount consistency, and merchant matching
 */

import { prisma } from '@/lib/prisma';
import { findKnownMerchant } from './merchantMatcher';
import { normalizeMerchant } from './merchantNormalizer';

export interface RecurringPattern {
  merchant: string;
  normalizedMerchant: string;
  amount: number;
  currency: string;
  interval: string; // 'monthly' | 'bi-weekly' | 'weekly' | 'quarterly' | 'yearly'
  nextBillingDate: Date;
  confidenceScore: number;
  matchedKnownMerchant?: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  };
  category?: string;
  transactionIds: string[];
  firstTransactionDate: Date;
  lastTransactionDate: Date;
  transactionCount: number;
  averageInterval: number; // in days
  amountVariance: number; // percentage variance in amounts
}

// Interval patterns in days (with tolerance)
// Updated ranges per requirements: monthly 22-38, weekly 6-10, annual 350-380
const INTERVAL_PATTERNS = {
  weekly: { min: 6, max: 10, ideal: 7, minOccurrences: 4 }, // 4+ occurrences for weekly
  'bi-weekly': { min: 13, max: 15, ideal: 14, minOccurrences: 2 },
  monthly: { min: 22, max: 38, ideal: 30, minOccurrences: 2 }, // 22-38 days for monthly
  quarterly: { min: 85, max: 95, ideal: 90, minOccurrences: 2 },
  yearly: { min: 350, max: 380, ideal: 365, minOccurrences: 2 }, // 350-380 days for annual
} as const;

const AMOUNT_TOLERANCE = 0.20; // ±20% (increased tolerance)
const MIN_TRANSACTIONS = 2; // Minimum occurrences to detect pattern

// Patterns to exclude (bank interest, credit card payments, etc.)
const EXCLUDED_MERCHANT_PATTERNS = [
  /interest/i,
  /interest payment/i,
  /bank interest/i,
  /savings interest/i,
  /credit card payment/i,
  /card payment/i,
  /payment to/i,
  /payment -/i,
  /autopay/i,
  /bill pay/i,
  /transfer/i,
  /fee/i,
  /overdraft/i,
  /atm/i,
  /withdrawal/i,
];

/**
 * Calculates the number of days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a merchant should be excluded (bank interest, credit card payments, etc.)
 */
function shouldExcludeMerchant(merchant: string | null, normalizedMerchant: string | null): boolean {
  const checkString = (normalizedMerchant || merchant || '').toLowerCase();
  if (!checkString) return false;
  
  return EXCLUDED_MERCHANT_PATTERNS.some(pattern => pattern.test(checkString));
}

/**
 * Groups transactions by month bucket (YYYY-MM) to avoid false duplicate grouping
 * Returns array of unique month buckets with representative transaction
 */
function groupByMonthBucket(
  transactions: Array<{ date: Date; amount: number; id: string }>
): Array<{ date: Date; amount: number; id: string; monthBucket: string }> {
  const monthBuckets: Record<string, Array<{ date: Date; amount: number; id: string }>> = {};
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const monthBucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthBuckets[monthBucket]) {
      monthBuckets[monthBucket] = [];
    }
    monthBuckets[monthBucket].push(tx);
  }
  
  // For each month bucket, use the transaction with the median amount (most representative)
  const result: Array<{ date: Date; amount: number; id: string; monthBucket: string }> = [];
  
  for (const [monthBucket, txs] of Object.entries(monthBuckets)) {
    // Sort by amount and take the middle one (or first if odd)
    const sorted = [...txs].sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
    const representative = sorted[Math.floor(sorted.length / 2)];
    
    result.push({
      ...representative,
      monthBucket,
    });
  }
  
  // Sort by date
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Detects the interval pattern from an array of intervals (in days)
 * Returns the best matching interval type or null
 * Now checks minOccurrences requirement
 */
function detectIntervalType(
  intervals: number[],
  transactionCount: number
): {
  type: keyof typeof INTERVAL_PATTERNS;
  confidence: number;
  averageInterval: number;
} | null {
  if (intervals.length === 0) return null;

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  let bestMatch: {
    type: keyof typeof INTERVAL_PATTERNS;
    confidence: number;
    averageInterval: number;
  } | null = null;
  let bestScore = 0;

  for (const [type, pattern] of Object.entries(INTERVAL_PATTERNS)) {
    // Check minimum occurrences requirement
    if (transactionCount < pattern.minOccurrences) {
      continue;
    }
    
    // Check if average interval falls within pattern range
    if (avgInterval >= pattern.min && avgInterval <= pattern.max) {
      // Calculate confidence based on how close to ideal
      const distanceFromIdeal = Math.abs(avgInterval - pattern.ideal);
      const range = pattern.max - pattern.min;
      const confidence = 1 - (distanceFromIdeal / (range / 2));

      // Check if individual intervals are consistent
      const consistentIntervals = intervals.filter(
        (interval) => interval >= pattern.min && interval <= pattern.max
      ).length;
      const consistencyRatio = consistentIntervals / intervals.length;

      // Combined confidence score
      const totalConfidence = (confidence * 0.6) + (consistencyRatio * 0.4);

      if (totalConfidence > bestScore) {
        bestScore = totalConfidence;
        bestMatch = {
          type: type as keyof typeof INTERVAL_PATTERNS,
          confidence: totalConfidence,
          averageInterval: avgInterval,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Calculates amount variance percentage
 */
function calculateAmountVariance(amounts: number[]): number {
  if (amounts.length < 2) return 0;

  const avg = amounts.reduce((a, b) => a + Math.abs(b), 0) / amounts.length;
  const variances = amounts.map((amount) => {
    const diff = Math.abs(Math.abs(amount) - avg);
    return diff / avg;
  });
  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;

  return avgVariance;
}

/**
 * Checks if amounts are consistent within tolerance
 */
function isAmountConsistent(amounts: number[], tolerance: number = AMOUNT_TOLERANCE): boolean {
  if (amounts.length < 2) return true;

  const avg = amounts.reduce((a, b) => a + Math.abs(b), 0) / amounts.length;
  return amounts.every((amount) => {
    const diff = Math.abs(Math.abs(amount) - avg);
    const percentDiff = diff / avg;
    return percentDiff <= tolerance;
  });
}

/**
 * Detects recurring subscription patterns from transactions
 * 
 * @param transactions - Array of transactions with merchant, amount, date
 * @param userId - User ID for merchant matching (optional)
 * @param country - Country code for merchant matching (optional)
 * @returns Array of detected recurring patterns
 */
export async function detectRecurringPatterns(
  transactions: Array<{
    id: string;
    merchant: string | null;
    normalizedMerchant: string | null;
    amount: number;
    currency: string | null;
    date: Date;
  }>,
  userId?: string,
  country?: string
): Promise<RecurringPattern[]> {
  if (!transactions || transactions.length < MIN_TRANSACTIONS) {
    return [];
  }

  // Filter out positive amounts (credits) and transactions without merchants
  const expenseTransactions = transactions.filter(
    (tx) => tx.amount < 0 && (tx.merchant || tx.normalizedMerchant)
  );

  if (expenseTransactions.length < MIN_TRANSACTIONS) {
    return [];
  }

  // Group transactions by normalized merchant
  const merchantGroups: Record<string, typeof expenseTransactions> = {};

  for (const tx of expenseTransactions) {
    try {
      // Use normalized merchant if available, otherwise normalize the raw merchant
      const normalized = tx.normalizedMerchant || normalizeMerchant(tx.merchant || '');
      
      if (!normalized || normalized.length < 2) {
        continue;
      }

      // Exclude bank interest, credit card payments, etc.
      if (shouldExcludeMerchant(tx.merchant, normalized)) {
        console.log(`Excluding merchant (bank interest/payment): ${normalized}`);
        continue;
      }

      if (!merchantGroups[normalized]) {
        merchantGroups[normalized] = [];
      }
      merchantGroups[normalized].push(tx);
    } catch (error) {
      // Fallback protection: skip transactions that fail normalization
      console.warn(`Failed to normalize merchant for transaction ${tx.id}:`, error);
      continue;
    }
  }

  const detectedPatterns: RecurringPattern[] = [];

  // Analyze each merchant group
  for (const [normalizedMerchant, txs] of Object.entries(merchantGroups)) {
    if (txs.length < MIN_TRANSACTIONS) {
      continue;
    }

    // Group by month bucket to avoid false duplicate grouping
    // This ensures transactions in the same month are treated as one occurrence
    const monthBucketed = groupByMonthBucket(
      txs.map(tx => ({ date: tx.date, amount: tx.amount, id: tx.id }))
    );
    
    if (monthBucketed.length < MIN_TRANSACTIONS) {
      console.log(`Merchant ${normalizedMerchant}: Only ${monthBucketed.length} unique months (need ${MIN_TRANSACTIONS})`);
      continue;
    }

    // Sort by date
    const sortedBuckets = monthBucketed.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // For each bucket, find representative transaction from original txs
    const sortedTxsWithFullData = sortedBuckets.map(bucket => {
      // Find transactions in the same month bucket
      const bucketTxs = txs.filter(tx => {
        const txDate = new Date(tx.date);
        const bucketDate = new Date(bucket.date);
        return txDate.getFullYear() === bucketDate.getFullYear() &&
               txDate.getMonth() === bucketDate.getMonth();
      });
      
      // Use the transaction with amount closest to bucket amount, or first one
      const representative = bucketTxs.find(tx => Math.abs(tx.amount - bucket.amount) < 0.01) 
        || bucketTxs[0] 
        || txs[0];
      
      return representative;
    });

    // Calculate intervals between consecutive month buckets
    const intervals: number[] = [];
    for (let i = 1; i < sortedBuckets.length; i++) {
      const days = daysBetween(sortedBuckets[i - 1].date, sortedBuckets[i].date);
      intervals.push(days);
    }

    // Detect interval pattern (pass transaction count for minOccurrences check)
    const intervalMatch = detectIntervalType(intervals, sortedBuckets.length);
    if (!intervalMatch) {
      console.log(`Merchant ${normalizedMerchant}: No clear interval pattern (intervals: [${intervals.map(d => d.toFixed(1)).join(', ')}])`);
      continue; // No clear interval pattern
    }

    // Check amount consistency (use month-bucketed transactions for amount calculation)
    const bucketedAmounts = sortedTxsWithFullData.map((tx) => tx.amount);
    const amountConsistent = isAmountConsistent(bucketedAmounts, AMOUNT_TOLERANCE);
    const amountVariance = calculateAmountVariance(bucketedAmounts);
    const avgAmount = bucketedAmounts.reduce((a, b) => a + Math.abs(b), 0) / bucketedAmounts.length;

    // Debug log for recurring candidate
    console.log(`Recurring candidate detected: ${normalizedMerchant}, amount: ${avgAmount.toFixed(2)}, interval: ${intervalMatch.averageInterval.toFixed(1)} days (${intervalMatch.type}), confidence: ${intervalMatch.confidence.toFixed(2)}`);

    // Get currency (use most common currency from original transactions)
    const currencies = txs.map((tx) => tx.currency || 'USD');
    const currencyCounts: Record<string, number> = {};
    currencies.forEach((curr) => {
      currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
    });
    const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';

    // Try to match with known merchant (optional - not required for detection)
    let matchedMerchant = null;
    let category: string | undefined;

    if (userId) {
      try {
        const match = await findKnownMerchant(
          normalizedMerchant,
          avgAmount,
          country,
          currency
        );
        if (match) {
          matchedMerchant = {
            id: match.id,
            name: match.name,
            displayName: match.displayName,
            category: match.category,
          };
          category = match.category;
        }
      } catch (error) {
        // Merchant matching failed, continue without it (not required)
        // Don't log as warning since KnownMerchant is optional
      }
    }
    
    // If no known merchant match, use a default category based on merchant name
    if (!category) {
      // Simple category inference (can be enhanced later)
      const merchantLower = normalizedMerchant.toLowerCase();
      if (merchantLower.includes('netflix') || merchantLower.includes('spotify') || merchantLower.includes('disney')) {
        category = 'Streaming';
      } else if (merchantLower.includes('adobe') || merchantLower.includes('notion') || merchantLower.includes('microsoft')) {
        category = 'Software';
      } else {
        category = 'Other';
      }
    }

    // Calculate confidence score (simplified - no longer requires KnownMerchant)
    let confidenceScore = 0.0;

    // Base confidence from interval match
    confidenceScore = intervalMatch.confidence * 0.5; // Increased weight

    // Amount consistency bonus
    if (amountConsistent) {
      confidenceScore += 0.3;
    } else if (amountVariance < 0.3) {
      // Some variance but not too much
      confidenceScore += 0.15;
    }

    // Known merchant bonus (optional, not required)
    if (matchedMerchant) {
      confidenceScore += 0.1; // Reduced weight since it's optional
    }

    // Transaction count bonus (more transactions = higher confidence)
    const countBonus = Math.min(0.1, (sortedBuckets.length - MIN_TRANSACTIONS) * 0.02);
    confidenceScore += countBonus;

    // Cap at 1.0
    confidenceScore = Math.min(1.0, confidenceScore);

    // Simplified confidence thresholds (no longer requires KnownMerchant)
    if (confidenceScore >= 0.5 && amountConsistent) {
      confidenceScore = Math.max(0.6, confidenceScore); // Good match
    } else if (confidenceScore >= 0.35 && intervalMatch.confidence > 0.6) {
      confidenceScore = 0.5; // Interval match but amount varies
    } else if (confidenceScore >= 0.25) {
      confidenceScore = 0.4; // Possible recurring pattern
    } else {
      // Too low confidence, skip
      console.log(`Merchant ${normalizedMerchant}: Confidence too low (${(confidenceScore * 100).toFixed(1)}%)`);
      continue;
    }

    // Use all original transaction IDs, not just month-bucketed ones
    const allTransactionIds = txs.map((tx) => tx.id);
    const sortedOriginalTxs = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstTx = sortedOriginalTxs[0];
    const lastTx = sortedOriginalTxs[sortedOriginalTxs.length - 1];

    // Calculate next billing date based on last transaction
    const nextBillingDate = new Date(lastTx.date);
    
    switch (intervalMatch.type) {
      case 'weekly':
        nextBillingDate.setDate(nextBillingDate.getDate() + 7);
        break;
      case 'bi-weekly':
        nextBillingDate.setDate(nextBillingDate.getDate() + 14);
        break;
      case 'monthly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        break;
      case 'yearly':
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        break;
    }

    detectedPatterns.push({
      merchant: firstTx.merchant || normalizedMerchant,
      normalizedMerchant,
      amount: Math.round(avgAmount * 100) / 100,
      currency,
      interval: intervalMatch.type,
      nextBillingDate,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      matchedKnownMerchant: matchedMerchant || undefined,
      category,
      transactionIds: allTransactionIds,
      firstTransactionDate: firstTx.date,
      lastTransactionDate: lastTx.date,
      transactionCount: sortedBuckets.length, // Month-bucketed count
      averageInterval: Math.round(intervalMatch.averageInterval * 10) / 10,
      amountVariance: Math.round(amountVariance * 1000) / 10, // percentage
    });
  }

  // Sort by confidence score (highest first)
  return detectedPatterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Detects recurring patterns for a specific user
 * Fetches transactions from the database and analyzes them
 * 
 * @param userId - User ID
 * @param monthsBack - Number of months to look back (default: 24)
 * @returns Array of detected recurring patterns
 */
export async function detectRecurringPatternsForUser(
  userId: string,
  monthsBack: number = 24
): Promise<RecurringPattern[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  // Fetch user transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
      },
      amount: {
        lt: 0, // Only expenses
      },
    },
    select: {
      id: true,
      merchant: true,
      normalizedMerchant: true,
      amount: true,
      currency: true,
      date: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Get user's country from bank account (if available)
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { userId },
    select: { country: true },
  });
  const country = bankAccount?.country || undefined;

  return detectRecurringPatterns(transactions, userId, country);
}

