import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSubscriptionsFromTransactions } from '@/lib/subscriptionGenerator';
import { debugDetectRecurring } from '@/lib/debugRecurring';

/**
 * POST /api/plaid/subscription-detect
 * 
 * Manually trigger subscription detection from user's transaction history
 * This endpoint:
 * 1. Reads user transactions from DB
 * 2. Runs recurring detector
 * 3. Generates subscriptions
 * 4. Returns count of detected subscriptions
 * 
 * Response format:
 * {
 *   accounts: number,
 *   transactions: number,
 *   subscriptions: number,
 *   detected: Array<GeneratedSubscription>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's bank accounts count
    const accountsCount = await prisma.bankAccount.count({
      where: { userId: user.id },
    });

    // Get user's transactions count
    const transactionsCount = await prisma.transaction.count({
      where: { userId: user.id },
    });

    const logger = (await import('@/lib/logger')).logger;
    logger.info(`Starting subscription detection for user ${user.id}: ${accountsCount} accounts, ${transactionsCount} transactions`);

    // Fetch user transactions for debugging
    const userTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
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

    // Run debug detection before actual detection (only in development)
    if (process.env.NODE_ENV === 'development' && userTransactions.length > 0) {
      const logger = (await import('@/lib/logger')).logger;
      logger.debug(`Running debug detection on ${userTransactions.length} transactions`);
      await debugDetectRecurring(userTransactions);
    }

    // Generate subscriptions from transactions
    const detected = await generateSubscriptionsFromTransactions(user.id, 24);

    // Calculate total monthly spend and most expensive subscription
    const totalMonthlySpend = detected.reduce((sum, sub) => {
      // Convert to monthly if needed
      let monthlyAmount = sub.amount;
      if (sub.interval === 'yearly') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.interval === 'quarterly') {
        monthlyAmount = sub.amount / 3;
      } else if (sub.interval === 'bi-weekly') {
        monthlyAmount = (sub.amount * 26) / 12; // 26 bi-weekly payments per year
      } else if (sub.interval === 'weekly') {
        monthlyAmount = (sub.amount * 52) / 12; // 52 weekly payments per year
      }
      return sum + monthlyAmount;
    }, 0);

    const mostExpensive = detected.length > 0 
      ? detected.reduce((max, sub) => {
          const monthlyAmount = sub.interval === 'yearly' ? sub.amount / 12 :
                              sub.interval === 'quarterly' ? sub.amount / 3 :
                              sub.interval === 'bi-weekly' ? (sub.amount * 26) / 12 :
                              sub.interval === 'weekly' ? (sub.amount * 52) / 12 :
                              sub.amount;
          const maxMonthly = max.interval === 'yearly' ? max.amount / 12 :
                           max.interval === 'quarterly' ? max.amount / 3 :
                           max.interval === 'bi-weekly' ? (max.amount * 26) / 12 :
                           max.interval === 'weekly' ? (max.amount * 52) / 12 :
                           max.amount;
          return monthlyAmount > maxMonthly ? sub : max;
        })
      : null;

    // Enhanced logging (production-safe)
    const logger = (await import('@/lib/logger')).logger;
    logger.subscriptionDetectionSummary({
      transactions: transactionsCount,
      merchants: detected.length,
      subscriptions: detected.length,
      monthlySpend: totalMonthlySpend,
      mostExpensive: mostExpensive ? `${mostExpensive.name} ($${(
        mostExpensive.interval === 'yearly' ? mostExpensive.amount / 12 :
        mostExpensive.interval === 'quarterly' ? mostExpensive.amount / 3 :
        mostExpensive.interval === 'bi-weekly' ? (mostExpensive.amount * 26) / 12 :
        mostExpensive.interval === 'weekly' ? (mostExpensive.amount * 52) / 12 :
        mostExpensive.amount
      ).toFixed(2)}/month)` : undefined,
    });

    return NextResponse.json({
      success: true,
      accounts: accountsCount,
      transactions: transactionsCount,
      subscriptions: detected.length,
      totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
      mostExpensiveSubscription: mostExpensive ? {
        id: mostExpensive.id,
        name: mostExpensive.name,
        amount: mostExpensive.amount,
        interval: mostExpensive.interval,
      } : null,
      detected: detected.map((sub) => ({
        id: sub.id,
        name: sub.name,
        merchant: sub.merchant,
        amount: sub.amount,
        currency: sub.currency,
        interval: sub.interval,
        confidenceScore: sub.confidenceScore,
        category: sub.category,
        isAutoDetected: sub.isAutoDetected,
        wasCreated: sub.wasCreated,
      })),
    });
  } catch (error) {
    console.error('Error detecting subscriptions:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

