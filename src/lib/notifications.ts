export interface Notification {
  id: string;
  userId: string;
  type: 'renewal_reminder' | 'price_increase' | 'spending_limit' | 'unused_subscription' | 'duplicate_detected' | 'savings_opportunity';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  subscriptionId?: string;
  merchant?: string;
  amount?: number;
  dueDate?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
}

export interface NotificationPreferences {
  userId: string;
  renewalReminders: boolean;
  priceIncreaseAlerts: boolean;
  spendingLimitAlerts: boolean;
  unusedSubscriptionWarnings: boolean;
  duplicateDetection: boolean;
  savingsOpportunities: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderDays: number; // Days before renewal to send reminder
  spendingLimit: number; // Monthly spending limit
}

export interface AlertRule {
  id: string;
  userId: string;
  type: 'spending_limit' | 'price_increase' | 'unused_subscription';
  condition: string;
  threshold: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Generates renewal reminder notifications
 */
export function generateRenewalReminders(
  subscriptions: any[],
  userId: string,
  reminderDays: number = 7
): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  for (const subscription of subscriptions) {
    const renewalDate = new Date(subscription.nextRenewal);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Send reminder if within reminder days
    if (daysUntilRenewal <= reminderDays && daysUntilRenewal > 0) {
      const severity = daysUntilRenewal <= 3 ? 'high' : daysUntilRenewal <= 7 ? 'medium' : 'low';
      
      notifications.push({
        id: `renewal-${subscription.merchant}-${subscription.nextRenewal}`,
        userId,
        type: 'renewal_reminder',
        title: `Renewal Reminder: ${subscription.merchant}`,
        message: `Your ${subscription.merchant} subscription will renew in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'} for $${subscription.amount.toFixed(2)}.`,
        severity,
        subscriptionId: subscription.id,
        merchant: subscription.merchant,
        amount: subscription.amount,
        dueDate: subscription.nextRenewal,
        isRead: false,
        createdAt: now.toISOString(),
        expiresAt: new Date(renewalDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        actionUrl: `/dashboard/subscriptions/${subscription.id}`,
        actionText: 'View Subscription'
      });
    }
  }

  return notifications;
}

/**
 * Generates price increase alerts
 */
export function generatePriceIncreaseAlerts(
  subscriptions: any[],
  userId: string
): Notification[] {
  const notifications: Notification[] = [];

  for (const subscription of subscriptions) {
    const priceHistory = subscription.priceHistory || [];
    if (priceHistory.length < 2) continue;

    // Check for recent price increases (last 3 payments)
    const recentPrices = priceHistory.slice(-3);
    const priceIncreases = recentPrices.filter((price: any) => price.change && price.change > 0);

    if (priceIncreases.length > 0) {
      const totalIncrease = priceIncreases.reduce((sum: number, price: any) => sum + (price.change || 0), 0);
      const severity = totalIncrease > 10 ? 'high' : totalIncrease > 5 ? 'medium' : 'low';

      notifications.push({
        id: `price-increase-${subscription.merchant}-${Date.now()}`,
        userId,
        type: 'price_increase',
        title: `Price Increase Alert: ${subscription.merchant}`,
        message: `Your ${subscription.merchant} subscription price has increased by $${totalIncrease.toFixed(2)} in the last 3 months.`,
        severity,
        subscriptionId: subscription.id,
        merchant: subscription.merchant,
        amount: totalIncrease,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/dashboard/subscriptions/${subscription.id}`,
        actionText: 'Review Changes'
      });
    }
  }

  return notifications;
}

/**
 * Generates spending limit alerts
 */
export function generateSpendingLimitAlerts(
  subscriptions: any[],
  userId: string,
  spendingLimit: number
): Notification[] {
  const notifications: Notification[] = [];
  const totalMonthlySpending = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  
  // Check if spending exceeds limit
  if (totalMonthlySpending > spendingLimit) {
    const overage = totalMonthlySpending - spendingLimit;
    const severity = overage > spendingLimit * 0.5 ? 'critical' : overage > spendingLimit * 0.25 ? 'high' : 'medium';

    notifications.push({
      id: `spending-limit-${Date.now()}`,
      userId,
      type: 'spending_limit',
      title: 'Monthly Spending Limit Exceeded',
      message: `Your monthly subscription spending of $${totalMonthlySpending.toFixed(2)} exceeds your limit of $${spendingLimit.toFixed(2)} by $${overage.toFixed(2)}.`,
      severity,
      amount: overage,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/dashboard/subscriptions',
      actionText: 'Review Subscriptions'
    });
  }

  // Warning when approaching limit (80% threshold)
  const warningThreshold = spendingLimit * 0.8;
  if (totalMonthlySpending > warningThreshold && totalMonthlySpending <= spendingLimit) {
    const remaining = spendingLimit - totalMonthlySpending;

    notifications.push({
      id: `spending-warning-${Date.now()}`,
      userId,
      type: 'spending_limit',
      title: 'Approaching Spending Limit',
      message: `You're approaching your monthly spending limit. You have $${remaining.toFixed(2)} remaining out of $${spendingLimit.toFixed(2)}.`,
      severity: 'low',
      amount: remaining,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/dashboard/subscriptions',
      actionText: 'Review Subscriptions'
    });
  }

  return notifications;
}

/**
 * Generates unused subscription warnings
 */
export function generateUnusedSubscriptionWarnings(
  subscriptions: any[],
  userId: string
): Notification[] {
  const notifications: Notification[] = [];

  for (const subscription of subscriptions) {
    if (subscription.usageFrequency === 'low' && subscription.healthScore < 60) {
      const annualSavings = subscription.amount * 12;
      const severity = annualSavings > 100 ? 'high' : annualSavings > 50 ? 'medium' : 'low';

      notifications.push({
        id: `unused-${subscription.merchant}-${Date.now()}`,
        userId,
        type: 'unused_subscription',
        title: `Unused Subscription: ${subscription.merchant}`,
        message: `Your ${subscription.merchant} subscription appears to be unused. You could save $${annualSavings.toFixed(2)}/year by canceling it.`,
        severity,
        subscriptionId: subscription.id,
        merchant: subscription.merchant,
        amount: annualSavings,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/dashboard/subscriptions/${subscription.id}`,
        actionText: 'Cancel Subscription'
      });
    }
  }

  return notifications;
}

/**
 * Generates duplicate detection alerts
 */
export function generateDuplicateAlerts(
  subscriptions: any[],
  userId: string
): Notification[] {
  const notifications: Notification[] = [];

  for (const subscription of subscriptions) {
    if (subscription.isDuplicate && subscription.duplicateOf) {
      const annualSavings = subscription.amount * 12;

      notifications.push({
        id: `duplicate-${subscription.merchant}-${Date.now()}`,
        userId,
        type: 'duplicate_detected',
        title: `Duplicate Subscription Detected: ${subscription.merchant}`,
        message: `You have duplicate subscriptions for ${subscription.merchant} and ${subscription.duplicateOf}. You could save $${annualSavings.toFixed(2)}/year by canceling one.`,
        severity: 'medium',
        subscriptionId: subscription.id,
        merchant: subscription.merchant,
        amount: annualSavings,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/dashboard/subscriptions/${subscription.id}`,
        actionText: 'Review Duplicates'
      });
    }
  }

  return notifications;
}

/**
 * Generates savings opportunity notifications
 */
export function generateSavingsOpportunities(
  subscriptions: any[],
  userId: string
): Notification[] {
  const notifications: Notification[] = [];

  for (const subscription of subscriptions) {
    if (subscription.savingsOpportunity) {
      const severity = subscription.savingsOpportunity.amount > 100 ? 'high' : subscription.savingsOpportunity.amount > 50 ? 'medium' : 'low';

      notifications.push({
        id: `savings-${subscription.merchant}-${Date.now()}`,
        userId,
        type: 'savings_opportunity',
        title: `Savings Opportunity: ${subscription.merchant}`,
        message: subscription.savingsOpportunity.description,
        severity,
        subscriptionId: subscription.id,
        merchant: subscription.merchant,
        amount: subscription.savingsOpportunity.amount,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/dashboard/subscriptions/${subscription.id}`,
        actionText: 'View Opportunity'
      });
    }
  }

  return notifications;
}

/**
 * Generates all notifications for a user
 */
export function generateAllNotifications(
  subscriptions: any[],
  userId: string,
  preferences: NotificationPreferences
): Notification[] {
  const notifications: Notification[] = [];

  if (preferences.renewalReminders) {
    notifications.push(...generateRenewalReminders(subscriptions, userId, preferences.reminderDays));
  }

  if (preferences.priceIncreaseAlerts) {
    notifications.push(...generatePriceIncreaseAlerts(subscriptions, userId));
  }

  if (preferences.spendingLimitAlerts) {
    notifications.push(...generateSpendingLimitAlerts(subscriptions, userId, preferences.spendingLimit));
  }

  if (preferences.unusedSubscriptionWarnings) {
    notifications.push(...generateUnusedSubscriptionWarnings(subscriptions, userId));
  }

  if (preferences.duplicateDetection) {
    notifications.push(...generateDuplicateAlerts(subscriptions, userId));
  }

  if (preferences.savingsOpportunities) {
    notifications.push(...generateSavingsOpportunities(subscriptions, userId));
  }

  // Sort by severity and creation date
  return notifications.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filters notifications based on user preferences
 */
export function filterNotifications(
  notifications: Notification[],
  preferences: NotificationPreferences
): Notification[] {
  return notifications.filter(notification => {
    // Filter by notification type based on preferences
    switch (notification.type) {
      case 'renewal_reminder':
        return preferences.renewalReminders;
      case 'price_increase':
        return preferences.priceIncreaseAlerts;
      case 'spending_limit':
        return preferences.spendingLimitAlerts;
      case 'unused_subscription':
        return preferences.unusedSubscriptionWarnings;
      case 'duplicate_detected':
        return preferences.duplicateDetection;
      case 'savings_opportunity':
        return preferences.savingsOpportunities;
      default:
        return true;
    }
  });
}

/**
 * Gets notification count by severity
 */
export function getNotificationCounts(notifications: Notification[]) {
  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    critical: notifications.filter(n => n.severity === 'critical' && !n.isRead).length,
    high: notifications.filter(n => n.severity === 'high' && !n.isRead).length,
    medium: notifications.filter(n => n.severity === 'medium' && !n.isRead).length,
    low: notifications.filter(n => n.severity === 'low' && !n.isRead).length,
  };
} 