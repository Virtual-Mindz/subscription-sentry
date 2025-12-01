import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch analytics data for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
    });

    // Get all transactions from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        subscription: true,
      },
    });

    // Calculate monthly spending
    const monthlySpending: Record<string, number> = {};
    transactions.forEach((transaction) => {
      const month = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      monthlySpending[month] = (monthlySpending[month] || 0) + Math.abs(transaction.amount);
    });

    // Calculate category spending
    const categorySpending: Record<string, number> = {};
    subscriptions.forEach((sub) => {
      // You might want to add a category field to Subscription model
      // For now, we'll use a simple categorization based on merchant name
      const category = categorizeSubscription(sub.merchant || sub.name);
      categorySpending[category] = (categorySpending[category] || 0) + sub.amount;
    });

    // Calculate total monthly spending from active subscriptions
    const totalMonthlySpending = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    const totalYearlySpending = totalMonthlySpending * 12;

    // Get subscription trends (merchants with most transactions)
    const merchantCounts: Record<string, number> = {};
    transactions.forEach((transaction) => {
      const merchant = transaction.merchant || transaction.subscription?.merchant || 'Unknown';
      merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
    });

    const topMerchants = Object.entries(merchantCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      monthlySpending: Object.entries(monthlySpending).map(([month, spending]) => ({
        month,
        spending,
      })),
      categorySpending: Object.entries(categorySpending).map(([name, value]) => ({
        name,
        value,
      })),
      totalMonthlySpending,
      totalYearlySpending,
      totalSubscriptions: subscriptions.length,
      topMerchants,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper function to categorize subscriptions
function categorizeSubscription(merchant: string | null): string {
  if (!merchant) return 'Other';
  
  const lower = merchant.toLowerCase();
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('hulu') || 
      lower.includes('disney') || lower.includes('prime') || lower.includes('youtube')) {
    return 'Streaming';
  }
  if (lower.includes('adobe') || lower.includes('microsoft') || lower.includes('office') || 
      lower.includes('creative') || lower.includes('cloud')) {
    return 'Software';
  }
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('peloton')) {
    return 'Fitness';
  }
  if (lower.includes('game') || lower.includes('xbox') || lower.includes('playstation')) {
    return 'Gaming';
  }
  return 'Other';
}

