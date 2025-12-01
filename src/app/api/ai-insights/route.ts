import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  analyzeSpendingPatterns, 
  generateSmartRecommendations,
  type SubscriptionData,
  type TransactionData,
} from '@/lib/gemini';

// GET - Fetch AI insights for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
    });

    // Fetch transactions from the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const dbTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: twelveMonthsAgo,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Map to Gemini format
    const subscriptionData: SubscriptionData[] = subscriptions.map(sub => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      renewalDate: sub.renewalDate,
      merchant: sub.merchant,
      status: sub.status,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    const transactionData: TransactionData[] = dbTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date,
      merchant: tx.merchant,
      description: tx.description,
      subscriptionId: tx.subscriptionId,
    }));

    // Use Gemini AI for analysis
    const analysis = await analyzeSpendingPatterns(subscriptionData, transactionData);
    const recommendations = await generateSmartRecommendations(
      subscriptionData,
      transactionData,
      analysis
    );

    // Format spending prediction from analysis
    const spendingPrediction = {
      currentMonthly: analysis.spendingPattern.totalMonthly,
      predictedMonthly: analysis.spendingPattern.totalMonthly,
      predictedYearly: analysis.spendingPattern.totalYearly,
      trend: analysis.spendingPattern.trend,
      confidence: 85,
      factors: analysis.spendingPattern.insights,
      recommendations: recommendations.slice(0, 3).map(r => r.title),
    };

    // Format insights
    const insights = [
      ...analysis.spendingPattern.insights,
      ...(analysis.unusedSubscriptions.length > 0 
        ? [`You have ${analysis.unusedSubscriptions.length} unused subscription${analysis.unusedSubscriptions.length > 1 ? 's' : ''} that could be canceled`]
        : []),
      ...(analysis.duplicateServices.length > 0
        ? [`Found ${analysis.duplicateServices.length} duplicate service${analysis.duplicateServices.length > 1 ? 's' : ''} - potential savings available`]
        : []),
    ];

    return NextResponse.json({
      analysis,
      recommendations,
      spendingPrediction,
      insights,
      unusedSubscriptions: analysis.unusedSubscriptions,
      duplicateServices: analysis.duplicateServices,
      downgradeOpportunities: analysis.downgradeOpportunities,
      annualVsMonthlySavings: analysis.annualVsMonthlySavings,
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}

