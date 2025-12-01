import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPlaidClientForUser } from '@/lib/plaidConfig';
import { getPlaidAccessToken, updateLastSyncTime } from '@/lib/plaidHelpers';
import { normalizeMerchant } from '@/lib/merchantNormalizer';
import { findKnownMerchant } from '@/lib/merchantMatcher';
import { generateSubscriptionsFromTransactions } from '@/lib/subscriptionGenerator';

// POST - Sync transactions from Plaid for a bank account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bankAccountId } = body;

    // If no bankAccountId provided, sync all user's bank accounts
    if (!bankAccountId) {
      const allAccounts = await prisma.bankAccount.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      if (allAccounts.length === 0) {
        return NextResponse.json(
          { error: 'No bank accounts found. Please connect a bank account first.' },
          { status: 404 }
        );
      }

      // Sync all accounts
      let totalSaved = 0;
      let totalSkipped = 0;
      const errors: string[] = [];

      for (const account of allAccounts) {
        try {
          const result = await syncAccountTransactions(user.id, account.id);
          totalSaved += result.saved;
          totalSkipped += result.skipped;
        } catch (error) {
          errors.push(`Failed to sync account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Auto-detect subscriptions from all transactions
      let detectedSubscriptions: any[] = [];
      try {
        detectedSubscriptions = await generateSubscriptionsFromTransactions(user.id, 24);
      } catch (error) {
        console.error('Error generating subscriptions:', error);
      }

      return NextResponse.json({
        success: true,
        savedTransactions: totalSaved,
        skippedTransactions: totalSkipped,
        accountsSynced: allAccounts.length,
        detectedSubscriptions: detectedSubscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Verify bank account belongs to user
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        userId: user.id,
      },
      select: {
        id: true,
        userId: true,
        currency: true,
        country: true,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Sync single account
    const result = await syncAccountTransactions(user.id, bankAccountId);

    // Auto-detect subscriptions from saved transactions
    let detectedSubscriptions: any[] = [];
    try {
      detectedSubscriptions = await generateSubscriptionsFromTransactions(user.id, 24);
    } catch (error) {
      console.error('Error generating subscriptions:', error);
    }

    return NextResponse.json({
      success: true,
      savedTransactions: result.saved,
      skippedTransactions: result.skipped,
      detectedSubscriptions: detectedSubscriptions.length,
      subscriptions: detectedSubscriptions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        merchant: sub.merchant,
        amount: sub.amount,
        confidenceScore: sub.confidenceScore,
        wasCreated: sub.wasCreated,
      })),
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to sync transactions for a single bank account
 */
async function syncAccountTransactions(
  userId: string,
  bankAccountId: string
): Promise<{ saved: number; skipped: number }> {
  // Verify bank account belongs to user
  const bankAccount = await prisma.bankAccount.findFirst({
    where: {
      id: bankAccountId,
      userId: userId,
    },
    select: {
      id: true,
      userId: true,
      currency: true,
      country: true,
    },
  });

  if (!bankAccount) {
    throw new Error('Bank account not found');
  }

  // SECURITY: Retrieve and decrypt access token from database
  // Never accept access tokens from client requests
  let accessToken: string;
  try {
    accessToken = await getPlaidAccessToken(bankAccountId);
  } catch (error) {
    throw new Error('Bank account is not properly connected. Please reconnect your account.');
  }

  // Get Plaid client for user (to use correct region credentials)
  const { client: plaidClient } = await getPlaidClientForUser(userId);

  // Get transactions from Plaid (last 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  const transactionsResponse = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    // Removed account_ids - fetch all transactions for the item
  });

  const plaidTransactions = transactionsResponse.data.transactions;
  let savedCount = 0;
  let skippedCount = 0;

  // Save transactions to database
  for (const plaidTx of plaidTransactions) {
    // Check if transaction already exists (by date, amount, and merchant)
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        bankAccountId: bankAccountId,
        amount: -Math.abs(plaidTx.amount), // Plaid amounts are positive, we store as negative
        date: new Date(plaidTx.date),
        merchant: plaidTx.merchant_name || plaidTx.name,
      },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    // Normalize merchant name
    const rawMerchant = plaidTx.merchant_name || plaidTx.name || '';
    const normalizedMerchant = normalizeMerchant(rawMerchant);

    // Match against known merchants
    let category: string | undefined;
    let matchedMerchant = null;
    if (normalizedMerchant) {
      try {
        const match = await findKnownMerchant(
          normalizedMerchant,
          -Math.abs(plaidTx.amount),
          bankAccount.country || undefined,
          bankAccount.currency || undefined
        );
        if (match) {
          category = match.category;
          matchedMerchant = match;
        }
      } catch (error) {
        // Merchant matching failed, continue without it
        console.warn(`Failed to match merchant ${normalizedMerchant}:`, error);
      }
    }

    // Try to match with existing subscription
    let subscriptionId: string | undefined;
    if (normalizedMerchant || rawMerchant) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          OR: [
            { merchant: { equals: normalizedMerchant, mode: 'insensitive' } },
            { merchant: { contains: rawMerchant, mode: 'insensitive' } },
            ...(matchedMerchant
              ? [{ merchant: { equals: matchedMerchant.name, mode: 'insensitive' } }]
              : []),
          ],
          status: 'active',
        },
      });
      if (subscription) {
        subscriptionId = subscription.id;
      }
    }

    await prisma.transaction.create({
      data: {
        userId: userId,
        bankAccountId: bankAccountId,
        subscriptionId: subscriptionId,
        amount: -Math.abs(plaidTx.amount), // Store as negative for expenses
        currency: bankAccount.currency || 'USD',
        date: new Date(plaidTx.date),
        description: plaidTx.name,
        merchant: rawMerchant,
        normalizedMerchant: normalizedMerchant || null,
        category: category || null,
        mcc: plaidTx.category?.[0] || null,
      },
    });

    savedCount++;
  }

  console.log(`Saved ${savedCount} transactions for account ${bankAccountId} (user ${userId}, skipped ${skippedCount} duplicates)`);

  // Update last sync time
  await updateLastSyncTime(bankAccountId);

  return { saved: savedCount, skipped: skippedCount };
}

