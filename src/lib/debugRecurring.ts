/**
 * Debug Recurring Subscription Detection
 * 
 * Provides detailed logging to diagnose why recurring patterns are or aren't detected
 */

import { normalizeMerchant } from './merchantNormalizer';

// Permissive test thresholds for debugging
const DEBUG_THRESHOLDS = {
  minOccurrences: 2,
  amountTolerance: 0.25, // ±25%
  monthlyRange: { min: 22, max: 38 }, // 22-38 days
  weeklyRange: { min: 6, max: 8 },
  biWeeklyRange: { min: 13, max: 15 },
  quarterlyRange: { min: 85, max: 95 },
  yearlyRange: { min: 350, max: 380 },
};

interface Transaction {
  id: string;
  merchant: string | null;
  normalizedMerchant: string | null;
  amount: number;
  currency: string | null;
  date: Date;
}

interface IntervalMatch {
  type: string;
  confidence: number;
  averageInterval: number;
}

interface Candidate {
  merchant: string;
  count: number;
  interval: string;
  averageInterval: string;
  amount: string;
  confidence: string;
}

interface Skipped {
  merchant: string;
  reason: string;
}

/**
 * Calculates days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if amounts are consistent within tolerance
 */
function isAmountConsistent(amounts: number[], tolerance: number = DEBUG_THRESHOLDS.amountTolerance): boolean {
  if (amounts.length < 2) return true;

  const avg = amounts.reduce((a, b) => a + Math.abs(b), 0) / amounts.length;
  return amounts.every((amount) => {
    const diff = Math.abs(Math.abs(amount) - avg);
    const percentDiff = diff / avg;
    return percentDiff <= tolerance;
  });
}

/**
 * Detects interval type from array of intervals (in days)
 */
function detectIntervalType(intervals: number[]): IntervalMatch | null {
  if (intervals.length === 0) return null;

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  const patterns = [
    { type: 'weekly', range: DEBUG_THRESHOLDS.weeklyRange, ideal: 7 },
    { type: 'bi-weekly', range: DEBUG_THRESHOLDS.biWeeklyRange, ideal: 14 },
    { type: 'monthly', range: DEBUG_THRESHOLDS.monthlyRange, ideal: 30 },
    { type: 'quarterly', range: DEBUG_THRESHOLDS.quarterlyRange, ideal: 90 },
    { type: 'yearly', range: DEBUG_THRESHOLDS.yearlyRange, ideal: 365 },
  ];

  for (const pattern of patterns) {
    if (avgInterval >= pattern.range.min && avgInterval <= pattern.range.max) {
      const distanceFromIdeal = Math.abs(avgInterval - pattern.ideal);
      const range = pattern.range.max - pattern.range.min;
      const confidence = 1 - (distanceFromIdeal / (range / 2));

      const consistentIntervals = intervals.filter(
        (interval) => interval >= pattern.range.min && interval <= pattern.range.max
      ).length;
      const consistencyRatio = consistentIntervals / intervals.length;

      const totalConfidence = (confidence * 0.6) + (consistencyRatio * 0.4);

      return {
        type: pattern.type,
        confidence: totalConfidence,
        averageInterval: avgInterval,
      };
    }
  }

  return null;
}

/**
 * Debug recurring detection with detailed logging
 * 
 * @param transactions - Array of transaction objects with: id, merchant, normalizedMerchant, amount, date
 * @param opts - Options for debugging
 */
export async function debugDetectRecurring(
  transactions: Transaction[],
  opts: Record<string, unknown> = {}
): Promise<{
  candidates: Candidate[];
  skipped: Skipped[];
  totalTransactions: number;
  expenseTransactions: number;
  uniqueMerchants: number;
}> {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('🔍 DEBUG: Recurring Subscription Detection');
  console.log('══════════════════════════════════════════════════════════\n');

  if (!transactions || transactions.length === 0) {
    console.log('❌ No transactions provided');
    return {
      candidates: [],
      skipped: [],
      totalTransactions: 0,
      expenseTransactions: 0,
      uniqueMerchants: 0,
    };
  }

  console.log(`📊 Total transactions: ${transactions.length}\n`);

  // Filter out positive amounts (credits) and transactions without merchants
  const expenseTransactions = transactions.filter(
    (tx) => tx.amount < 0 && (tx.merchant || tx.normalizedMerchant)
  );

  console.log(`💰 Expense transactions (amount < 0): ${expenseTransactions.length}\n`);

  if (expenseTransactions.length < DEBUG_THRESHOLDS.minOccurrences) {
    console.log(`❌ Not enough expense transactions (need at least ${DEBUG_THRESHOLDS.minOccurrences})`);
    return {
      candidates: [],
      skipped: [],
      totalTransactions: transactions.length,
      expenseTransactions: expenseTransactions.length,
      uniqueMerchants: 0,
    };
  }

  // Group transactions by normalized merchant
  const merchantGroups: Record<string, Transaction[]> = {};
  const rawMerchants = new Set<string>();

  for (const tx of expenseTransactions) {
    const rawMerchant = tx.merchant || '';
    if (rawMerchant) {
      rawMerchants.add(rawMerchant);
    }

    // Use normalized merchant if available, otherwise normalize
    let normalized = tx.normalizedMerchant;
    if (!normalized) {
      try {
        normalized = normalizeMerchant(rawMerchant);
      } catch (error) {
        console.warn(`⚠️  Failed to normalize merchant "${rawMerchant}":`, error);
        normalized = rawMerchant.toLowerCase().trim();
      }
    }

    if (!normalized || normalized.length < 2) {
      console.log(`⚠️  Skipping transaction ${tx.id}: merchant "${rawMerchant}" normalized to empty string`);
      continue;
    }

    if (!merchantGroups[normalized]) {
      merchantGroups[normalized] = [];
    }
    merchantGroups[normalized].push(tx);
  }

  console.log(`📝 Unique raw merchants: ${rawMerchants.size}`);
  console.log(`🔤 Unique merchants after normalization: ${Object.keys(merchantGroups).length}\n`);

  if (Object.keys(merchantGroups).length === 0) {
    console.log('❌ No valid merchant groups after normalization');
    return {
      candidates: [],
      skipped: [],
      totalTransactions: transactions.length,
      expenseTransactions: expenseTransactions.length,
      uniqueMerchants: 0,
    };
  }

  // Analyze each merchant group
  const candidates: Candidate[] = [];
  const skipped: Skipped[] = [];

  for (const [normalizedMerchant, txs] of Object.entries(merchantGroups)) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏪 Merchant: '${normalizedMerchant}'`);
    console.log(`   Transactions: ${txs.length}`);

    // Check minimum occurrences
    if (txs.length < DEBUG_THRESHOLDS.minOccurrences) {
      skipped.push({
        merchant: normalizedMerchant,
        reason: `Insufficient occurrences (${txs.length} < ${DEBUG_THRESHOLDS.minOccurrences})`,
      });
      console.log(`   ❌ SKIPPED: Need at least ${DEBUG_THRESHOLDS.minOccurrences} transactions, got ${txs.length}`);
      continue;
    }

    // Sort transactions by date
    const sortedTxs = [...txs].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Show transaction details
    console.log(`   Transaction details:`);
    sortedTxs.forEach((tx, idx) => {
      const date = new Date(tx.date).toISOString().split('T')[0];
      const amount = Math.abs(tx.amount).toFixed(2);
      console.log(`     ${idx + 1}. ${date} - $${amount} (raw: "${tx.merchant || 'N/A'}")`);
    });

    // Calculate intervals between consecutive transactions
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const date1 = new Date(sortedTxs[i - 1].date);
      const date2 = new Date(sortedTxs[i].date);
      const days = daysBetween(date1, date2);
      intervals.push(days);
    }

    console.log(`   Intervals (days): [${intervals.map(d => d.toFixed(1)).join(', ')}]`);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(`   Average interval: ${avgInterval.toFixed(1)} days`);

    // Detect interval pattern
    const intervalMatch = detectIntervalType(intervals);
    if (!intervalMatch) {
      skipped.push({
        merchant: normalizedMerchant,
        reason: `No clear interval pattern (avg: ${avgInterval.toFixed(1)} days)`,
      });
      console.log(`   ❌ SKIPPED: No clear interval pattern detected`);
      console.log(`      Average interval ${avgInterval.toFixed(1)} days doesn't match any known pattern`);
      continue;
    }

    console.log(`   ✅ Interval pattern: ${intervalMatch.type} (confidence: ${(intervalMatch.confidence * 100).toFixed(1)}%)`);

    // Check amount consistency
    const amounts = sortedTxs.map((tx) => tx.amount);
    const amountConsistent = isAmountConsistent(amounts, DEBUG_THRESHOLDS.amountTolerance);
    const avgAmount = amounts.reduce((a, b) => a + Math.abs(b), 0) / amounts.length;

    console.log(`   Amounts: [${amounts.map(a => `$${Math.abs(a).toFixed(2)}`).join(', ')}]`);
    console.log(`   Average amount: $${avgAmount.toFixed(2)}`);

    if (!amountConsistent) {
      // Calculate variance
      const variances = amounts.map((amount) => {
        const diff = Math.abs(Math.abs(amount) - avgAmount);
        return (diff / avgAmount) * 100;
      });
      const maxVariance = Math.max(...variances);
      console.log(`   ⚠️  Amount variance: ${maxVariance.toFixed(1)}% (tolerance: ${DEBUG_THRESHOLDS.amountTolerance * 100}%)`);
    } else {
      console.log(`   ✅ Amount consistency: Within ${DEBUG_THRESHOLDS.amountTolerance * 100}% tolerance`);
    }

    // Calculate confidence score
    let confidenceScore = intervalMatch.confidence * 0.4;
    if (amountConsistent) {
      confidenceScore += 0.3;
    } else {
      const maxVariance = Math.max(...amounts.map(a => Math.abs(Math.abs(a) - avgAmount) / avgAmount));
      if (maxVariance < 0.3) {
        confidenceScore += 0.15;
      }
    }

    const countBonus = Math.min(0.1, (sortedTxs.length - DEBUG_THRESHOLDS.minOccurrences) * 0.02);
    confidenceScore += countBonus;
    confidenceScore = Math.min(1.0, confidenceScore);

    // Determine final status
    if (confidenceScore >= 0.35) {
      candidates.push({
        merchant: normalizedMerchant,
        count: sortedTxs.length,
        interval: intervalMatch.type,
        averageInterval: avgInterval.toFixed(1),
        amount: avgAmount.toFixed(2),
        confidence: (confidenceScore * 100).toFixed(1),
      });

      console.log(`   ✅ CANDIDATE: frequency=${intervalMatch.type} confidence=${(confidenceScore * 100).toFixed(1)}%`);
    } else {
      skipped.push({
        merchant: normalizedMerchant,
        reason: `Low confidence score (${(confidenceScore * 100).toFixed(1)}% < 35%)`,
      });
      console.log(`   ❌ SKIPPED: Confidence too low (${(confidenceScore * 100).toFixed(1)}%)`);
    }
  }

  // Summary
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log('📊 DEBUG SUMMARY');
  console.log('══════════════════════════════════════════════════════════\n');

  console.log(`✅ Recurring candidates: ${candidates.length}`);
  if (candidates.length > 0) {
    candidates.forEach((c) => {
      console.log(`   • ${c.merchant}: ${c.count} txns → ${c.interval} (${c.averageInterval} days avg, $${c.amount}, ${c.confidence}% confidence)`);
    });
  }

  console.log(`\n❌ Skipped merchants: ${skipped.length}`);
  if (skipped.length > 0) {
    skipped.forEach((s) => {
      console.log(`   • ${s.merchant}: ${s.reason}`);
    });
  }

  console.log(`\n══════════════════════════════════════════════════════════\n`);

  return {
    candidates,
    skipped,
    totalTransactions: transactions.length,
    expenseTransactions: expenseTransactions.length,
    uniqueMerchants: Object.keys(merchantGroups).length,
  };
}

