import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAllNotifications, NotificationPreferences } from '@/lib/notifications';

// GET - Fetch all notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Fetch user's subscriptions
    const dbSubscriptions = await prisma.subscription.findMany({
      where: { 
        userId: user.id,
        status: 'active' // Only active subscriptions
      },
      orderBy: { renewalDate: 'asc' }
    });

    // Map Prisma subscriptions to format expected by notification functions
    // The notification functions expect 'nextRenewal' but Prisma uses 'renewalDate'
    const subscriptions = dbSubscriptions.map((sub: typeof dbSubscriptions[0]) => ({
      ...sub,
      nextRenewal: sub.renewalDate.toISOString(),
      // Add any other fields that notification functions might need
      priceHistory: [], // Can be enhanced later with actual price history
    }));

    // Default notification preferences (can be enhanced later with user preferences)
    const preferences: NotificationPreferences = {
      userId: user.id,
      renewalReminders: true,
      priceIncreaseAlerts: true,
      spendingLimitAlerts: true,
      unusedSubscriptionWarnings: true,
      duplicateDetection: true,
      savingsOpportunities: true,
      emailNotifications: false,
      pushNotifications: false,
      reminderDays: 7,
      spendingLimit: 100
    };

    // Generate notifications from subscriptions
    let notifications = generateAllNotifications(subscriptions, user.id, preferences);

    // Filter unread only if requested
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    // Get read/dismissed notification IDs from a simple storage mechanism
    // For now, we'll use a simple approach: check localStorage on client side
    // In a full implementation, you'd store this in a database table

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

