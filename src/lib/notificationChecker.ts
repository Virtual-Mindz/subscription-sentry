/**
 * Notification Checker
 * 
 * Checks for upcoming bills, price changes, and other subscription events
 * that require user notifications
 */

import { prisma } from './prisma';
import {
  sendUpcomingBillEmail,
  sendNewSubscriptionDetectedEmail,
  sendPriceChangeDetectedEmail,
} from './emailService';

const RENEWAL_REMINDER_DAYS = 3; // Send reminder 3 days before renewal

/**
 * Checks for upcoming bills and sends email notifications
 * 
 * @param userId - Optional user ID to check for specific user, otherwise checks all users
 * @returns Number of notifications sent
 */
export async function checkUpcomingBills(userId?: string): Promise<number> {
  try {
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + RENEWAL_REMINDER_DAYS);

    // Find subscriptions that need reminders
    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(userId && { userId }),
        status: 'active',
        renewalDate: {
          gte: now,
          lte: reminderDate,
        },
        // Only send if not notified in the last 24 hours
        OR: [
          { lastNotifiedAt: null },
          { lastNotifiedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    let notificationsSent = 0;

    for (const subscription of subscriptions) {
      const renewalDate = new Date(subscription.renewalDate);
      const daysUntilRenewal = Math.ceil(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only send if within the reminder window
      if (daysUntilRenewal > 0 && daysUntilRenewal <= RENEWAL_REMINDER_DAYS) {
        try {
          await sendUpcomingBillEmail({
            to: subscription.user.email,
            subscriptionName: subscription.name,
            merchant: subscription.merchant || subscription.name,
            amount: subscription.amount,
            currency: subscription.currency || 'USD',
            renewalDate: subscription.renewalDate,
            daysUntilRenewal,
            userName: subscription.user.name || undefined,
          });

          // Update last notified timestamp
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { lastNotifiedAt: new Date() },
          });

          notificationsSent++;
        } catch (error) {
          console.error(
            `Failed to send upcoming bill email for subscription ${subscription.id}:`,
            error
          );
          // Continue with other subscriptions
        }
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('Error checking upcoming bills:', error);
    throw error;
  }
}

/**
 * Checks for price changes in subscriptions
 * Compares recent transaction amounts to stored subscription amounts
 * 
 * @param userId - Optional user ID to check for specific user
 * @returns Number of price change notifications sent
 */
export async function checkPriceChanges(userId?: string): Promise<number> {
  try {
    // Find active subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(userId && { userId }),
        status: 'active',
        isAutoDetected: true, // Only check auto-detected subscriptions
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        transactions: {
          where: {
            date: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 3, // Check last 3 transactions
        },
      },
    });

    let notificationsSent = 0;
    const PRICE_CHANGE_THRESHOLD = 0.05; // 5% change threshold

    for (const subscription of subscriptions) {
      if (subscription.transactions.length < 2) continue;

      // Calculate average of recent transactions
      const recentAmounts = subscription.transactions.map((tx) => Math.abs(tx.amount));
      const averageRecentAmount = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;

      // Compare to stored subscription amount
      const storedAmount = subscription.amount;
      const changePercentage = Math.abs((averageRecentAmount - storedAmount) / storedAmount);

      // If price changed significantly and we haven't notified recently
      if (changePercentage >= PRICE_CHANGE_THRESHOLD) {
        const lastNotified = subscription.lastNotifiedAt;
        const shouldNotify =
          !lastNotified ||
          new Date(lastNotified).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000; // Not notified in last 7 days

        if (shouldNotify) {
          try {
            await sendPriceChangeDetectedEmail({
              to: subscription.user.email,
              subscriptionName: subscription.name,
              merchant: subscription.merchant || subscription.name,
              oldAmount: storedAmount,
              newAmount: averageRecentAmount,
              currency: subscription.currency || 'USD',
              changeDate: subscription.transactions[0].date,
              userName: subscription.user.name || undefined,
            });

            // Update subscription amount and notification timestamp
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                amount: averageRecentAmount,
                lastNotifiedAt: new Date(),
              },
            });

            notificationsSent++;
          } catch (error) {
            console.error(
              `Failed to send price change email for subscription ${subscription.id}:`,
              error
            );
            // Continue with other subscriptions
          }
        }
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('Error checking price changes:', error);
    throw error;
  }
}

/**
 * Checks for newly detected subscriptions and sends notification
 * This is typically called after transaction sync
 * 
 * @param userId - User ID
 * @param subscriptionIds - Array of newly created subscription IDs
 */
export async function notifyNewSubscriptions(
  userId: string,
  subscriptionIds: string[]
): Promise<void> {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        id: { in: subscriptionIds },
        userId,
        isAutoDetected: true,
        status: 'active',
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    for (const subscription of subscriptions) {
      try {
        await sendNewSubscriptionDetectedEmail({
          to: subscription.user.email,
          subscriptionName: subscription.name,
          merchant: subscription.merchant || subscription.name,
          amount: subscription.amount,
          currency: subscription.currency || 'USD',
          interval: subscription.interval || 'monthly',
          confidenceScore: subscription.confidenceScore
            ? Number(subscription.confidenceScore)
            : undefined,
          category: subscription.category || undefined,
          userName: subscription.user.name || undefined,
        });
      } catch (error) {
        console.error(
          `Failed to send new subscription email for ${subscription.id}:`,
          error
        );
        // Continue with other subscriptions
      }
    }
  } catch (error) {
    console.error('Error notifying new subscriptions:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Runs all notification checks for a user or all users
 * 
 * @param userId - Optional user ID, if not provided checks all users
 */
export async function runAllNotificationChecks(userId?: string): Promise<{
  upcomingBills: number;
  priceChanges: number;
}> {
  const upcomingBills = await checkUpcomingBills(userId);
  const priceChanges = await checkPriceChanges(userId);

  return {
    upcomingBills,
    priceChanges,
  };
}

