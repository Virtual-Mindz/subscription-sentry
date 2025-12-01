/**
 * Mock Recurring Transaction Generator
 * 
 * Generates test recurring transactions for development/testing
 * Only runs in development mode when no recurring subscriptions are detected
 */

import { prisma } from '@/lib/prisma';

interface MockSubscription {
  name: string;
  merchant: string;
  amount: number;
  interval: 'monthly' | 'yearly';
  startDate: Date;
  occurrences: number;
}

const MOCK_SUBSCRIPTIONS: MockSubscription[] = [
  {
    name: 'Netflix',
    merchant: 'netflix',
    amount: 15.99,
    interval: 'monthly',
    startDate: new Date(),
    occurrences: 3,
  },
  {
    name: 'Spotify',
    merchant: 'spotify',
    amount: 10.99,
    interval: 'monthly',
    startDate: new Date(),
    occurrences: 3,
  },
  {
    name: 'Adobe',
    merchant: 'adobe',
    amount: 22.00,
    interval: 'monthly',
    startDate: new Date(),
    occurrences: 3,
  },
  {
    name: 'Notion',
    merchant: 'notion',
    amount: 12.00,
    interval: 'monthly',
    startDate: new Date(),
    occurrences: 3,
  },
  {
    name: 'Disney+',
    merchant: 'disney',
    amount: 9.99,
    interval: 'monthly',
    startDate: new Date(),
    occurrences: 3,
  },
];

/**
 * Generates mock recurring transactions for a user
 * Only runs in development mode
 */
export async function generateMockRecurringTransactions(
  userId: string,
  bankAccountId: string
): Promise<number> {
  // Only run in development
  if (process.env.NODE_ENV === 'production') {
    console.log('Mock transactions disabled in production');
    return 0;
  }

  // Check if user already has recurring subscriptions
  const existingSubscriptions = await prisma.subscription.count({
    where: {
      userId,
      isAutoDetected: true,
      status: 'active',
    },
  });

  if (existingSubscriptions > 0) {
    console.log(`User ${userId} already has ${existingSubscriptions} subscriptions, skipping mock data`);
    return 0;
  }

  // Check if mock transactions already exist
  const existingMockTransactions = await prisma.transaction.count({
    where: {
      userId,
      description: {
        contains: '[MOCK]',
      },
    },
  });

  if (existingMockTransactions > 0) {
    console.log(`User ${userId} already has mock transactions, skipping`);
    return 0;
  }

  console.log(`\n🎭 Generating mock recurring transactions for user ${userId}...`);

  let totalCreated = 0;

  for (const mockSub of MOCK_SUBSCRIPTIONS) {
    const transactions = [];
    const now = new Date();
    
    // Generate transactions going back in time
    for (let i = mockSub.occurrences - 1; i >= 0; i--) {
      const transactionDate = new Date(mockSub.startDate);
      
      if (mockSub.interval === 'monthly') {
        transactionDate.setMonth(transactionDate.getMonth() - i);
      } else if (mockSub.interval === 'yearly') {
        transactionDate.setFullYear(transactionDate.getFullYear() - i);
      }

      // Ensure date is in the past
      if (transactionDate > now) {
        transactionDate.setMonth(transactionDate.getMonth() - 1);
      }

      transactions.push({
        userId,
        bankAccountId,
        amount: -Math.abs(mockSub.amount), // Negative for expenses
        currency: 'USD',
        date: transactionDate,
        description: `[MOCK] ${mockSub.name} Subscription`,
        merchant: mockSub.merchant,
        normalizedMerchant: mockSub.merchant.toLowerCase(),
        category: mockSub.name === 'Netflix' || mockSub.name === 'Spotify' || mockSub.name === 'Disney+' 
          ? 'Streaming' 
          : 'Software',
        isRecurring: true,
      });
    }

    // Insert transactions
    try {
      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true,
      });
      totalCreated += transactions.length;
      console.log(`  ✅ Created ${transactions.length} mock transactions for ${mockSub.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to create mock transactions for ${mockSub.name}:`, error);
    }
  }

  console.log(`🎭 Created ${totalCreated} total mock transactions\n`);
  return totalCreated;
}

/**
 * Checks if mock transactions should be generated
 */
export async function shouldGenerateMockTransactions(userId: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Check if user has any auto-detected subscriptions
  const subscriptionCount = await prisma.subscription.count({
    where: {
      userId,
      isAutoDetected: true,
      status: 'active',
    },
  });

  // Check if mock transactions already exist
  const mockTransactionCount = await prisma.transaction.count({
    where: {
      userId,
      description: {
        contains: '[MOCK]',
      },
    },
  });

  return subscriptionCount === 0 && mockTransactionCount === 0;
}

