import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateSubscriptionsFromTransactions } from '@/lib/subscriptionGenerator';

/**
 * POST /api/subscriptions/detect
 * 
 * Manually trigger subscription detection from user's transaction history
 * 
 * Body (optional):
 * {
 *   userId?: string  // Optional, defaults to current user
 *   monthsBack?: number  // Optional, defaults to 24
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId = body.userId || currentUser.id;
    const monthsBack = body.monthsBack || 24;

    // Security: Only allow users to detect their own subscriptions
    // (unless they're an admin, but we don't have that role yet)
    if (targetUserId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only detect subscriptions for your own account' },
        { status: 403 }
      );
    }

    // Validate monthsBack
    if (typeof monthsBack !== 'number' || monthsBack < 1 || monthsBack > 60) {
      return NextResponse.json(
        { error: 'monthsBack must be between 1 and 60' },
        { status: 400 }
      );
    }

    // Generate subscriptions from transactions
    const detected = await generateSubscriptionsFromTransactions(targetUserId, monthsBack);

    return NextResponse.json({
      success: true,
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
      count: detected.length,
      message: `Detected ${detected.length} subscription${detected.length !== 1 ? 's' : ''}`,
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

