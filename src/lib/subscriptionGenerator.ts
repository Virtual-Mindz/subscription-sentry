/**
 * Subscription Generator
 * 
 * Generates Subscription records from detected recurring patterns
 * Handles creation, updates, and duplicate prevention
 */

import { prisma } from '@/lib/prisma';
import { detectRecurringPatternsForUser, RecurringPattern } from './recurringDetector';
import { generateMockRecurringTransactions, shouldGenerateMockTransactions } from './mockRecurringTransactions';

export interface GeneratedSubscription {
  id: string;
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  interval: string;
  confidenceScore: number;
  category?: string;
  isAutoDetected: boolean;
  wasCreated: boolean; // true if newly created, false if updated
}

/**
 * Generates subscriptions from user's transaction history
 * 
 * @param userId - User ID
 * @param monthsBack - Number of months to analyze (default: 24)
 * @returns Array of generated subscriptions
 */
export async function generateSubscriptionsFromTransactions(
  userId: string,
  monthsBack: number = 24
): Promise<GeneratedSubscription[]> {
  // Detect recurring patterns
  const logger = (await import('@/lib/logger')).logger;
  logger.debug(`Starting subscription generation for user ${userId} (looking back ${monthsBack} months)`);
  let patterns = await detectRecurringPatternsForUser(userId, monthsBack);

  // If no patterns detected and in development, generate mock transactions
  if (patterns.length === 0) {
    const shouldMock = await shouldGenerateMockTransactions(userId);
    if (shouldMock) {
      logger.debug(`No recurring patterns detected. Generating mock transactions for testing...`);
      
      // Get user's first bank account
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (bankAccount) {
        const mockCount = await generateMockRecurringTransactions(userId, bankAccount.id);
        if (mockCount > 0) {
          // Re-run detection after mock data is inserted
          logger.debug(`Re-running detection after mock data insertion...`);
          patterns = await detectRecurringPatternsForUser(userId, monthsBack);
        }
      }
    }
  }

  if (patterns.length === 0) {
    logger.debug(`No recurring patterns detected for user ${userId}`);
    return [];
  }

  logger.debug(`Found ${patterns.length} recurring patterns for user ${userId}`);

  const generated: GeneratedSubscription[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const pattern of patterns) {
    try {
      // Determine subscription name (use display name if matched, otherwise merchant name)
      const subscriptionName = pattern.matchedKnownMerchant?.displayName || pattern.merchant;

      // Check if subscription already exists
      // Prevent duplicates using unique constraint: userId + bankAccountId + merchantName
      // First, get the bank account ID from the first transaction
      const firstTransaction = await prisma.transaction.findFirst({
        where: {
          id: { in: pattern.transactionIds },
          userId,
        },
        select: { bankAccountId: true },
      });

      const existing = await prisma.subscription.findFirst({
        where: {
          userId,
          // Match by merchant name (normalized) - unique per user + merchant
          OR: [
            { merchant: { equals: pattern.normalizedMerchant, mode: 'insensitive' } },
            { merchant: { equals: pattern.merchant, mode: 'insensitive' } },
            ...(pattern.matchedKnownMerchant
              ? [
                  { merchant: { equals: pattern.matchedKnownMerchant.name, mode: 'insensitive' } },
                  { name: { equals: pattern.matchedKnownMerchant.displayName, mode: 'insensitive' } },
                ]
              : []),
          ],
          status: {
            in: ['active', 'paused'], // Only match active/paused subscriptions
          },
          // Optionally match by bankAccountId if available (for multi-account support)
          ...(firstTransaction?.bankAccountId ? {
            transactions: {
              some: {
                bankAccountId: firstTransaction.bankAccountId,
              },
            },
          } : {}),
        },
      });

      if (existing) {
        // Update existing subscription
        const updated = await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            name: subscriptionName,
            amount: pattern.amount,
            currency: pattern.currency,
            interval: pattern.interval,
            renewalDate: pattern.nextBillingDate,
            lastPaymentDate: pattern.lastTransactionDate,
            merchant: pattern.matchedKnownMerchant?.name || pattern.normalizedMerchant,
            category: pattern.category || existing.category,
            confidenceScore: pattern.confidenceScore,
            isAutoDetected: true,
            // Merge transaction IDs (avoid duplicates)
            plaidTransactionIds: {
              set: Array.from(
                new Set([...existing.plaidTransactionIds, ...pattern.transactionIds])
              ),
            },
            // Update status to active if it was paused
            ...(existing.status === 'paused' ? { status: 'active' } : {}),
          },
        });

        updatedCount++;
        generated.push({
          id: updated.id,
          name: updated.name,
          merchant: updated.merchant || subscriptionName,
          amount: updated.amount,
          currency: updated.currency || 'USD',
          interval: updated.interval || 'monthly',
          confidenceScore: updated.confidenceScore?.toNumber() || 0,
          category: updated.category || undefined,
          isAutoDetected: updated.isAutoDetected,
          wasCreated: false,
        });
      } else {
        // Create new subscription
        // Note: bankAccountId is stored via transaction relationship, not directly on subscription
        const created = await prisma.subscription.create({
          data: {
            userId,
            name: subscriptionName,
            amount: pattern.amount,
            currency: pattern.currency,
            interval: pattern.interval,
            renewalDate: pattern.nextBillingDate,
            lastPaymentDate: pattern.lastTransactionDate,
            merchant: pattern.matchedKnownMerchant?.name || pattern.normalizedMerchant,
            category: pattern.category,
            status: 'active',
            confidenceScore: pattern.confidenceScore,
            isAutoDetected: true,
            plaidTransactionIds: pattern.transactionIds,
          },
        });

        createdCount++;
        generated.push({
          id: created.id,
          name: created.name,
          merchant: created.merchant || subscriptionName,
          amount: created.amount,
          currency: created.currency || 'USD',
          interval: created.interval || 'monthly',
          confidenceScore: created.confidenceScore?.toNumber() || 0,
          category: created.category || undefined,
          isAutoDetected: created.isAutoDetected,
          wasCreated: true,
        });
      }
    } catch (error) {
      console.error(`Error generating subscription for pattern ${pattern.normalizedMerchant}:`, error);
      // Continue with next pattern
    }
  }

  // Production-safe logging
  logger.info(`Subscription generation complete: ${generated.length} subscriptions (${createdCount} created, ${updatedCount} updated)`);
  
  return generated;
}

/**
 * Gets statistics about generated subscriptions
 */
export async function getSubscriptionGenerationStats(
  userId: string
): Promise<{
  total: number;
  autoDetected: number;
  manual: number;
  byConfidence: {
    high: number; // >= 0.8
    medium: number; // 0.5 - 0.8
    low: number; // < 0.5
  };
}> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    select: {
      isAutoDetected: true,
      confidenceScore: true,
    },
  });

  const autoDetected = subscriptions.filter((s) => s.isAutoDetected).length;
  const manual = subscriptions.length - autoDetected;

  const byConfidence = {
    high: 0,
    medium: 0,
    low: 0,
  };

  subscriptions.forEach((s) => {
    const score = s.confidenceScore?.toNumber() || 0;
    if (score >= 0.8) {
      byConfidence.high++;
    } else if (score >= 0.5) {
      byConfidence.medium++;
    } else {
      byConfidence.low++;
    }
  });

  return {
    total: subscriptions.length,
    autoDetected,
    manual,
    byConfidence,
  };
}

