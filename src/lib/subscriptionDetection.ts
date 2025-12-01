export interface Transaction {
  id: string;
  userId: string;
  bankAccountId: string;
  amount: number;
  date: string; // ISO string
  description?: string;
  merchant?: string;
}

export interface DetectedSubscription {
  merchant: string;
  amount: number;
  interval: string; // e.g. 'monthly', 'weekly', etc.
  lastPayment: string; // ISO date
  nextRenewal: string; // ISO date
  category?: string;
  healthScore?: number;
  isDuplicate?: boolean;
  usageFrequency?: 'high' | 'medium' | 'low';
  priceHistory?: Array<{ date: string; amount: number; change?: number }>;
  duplicateOf?: string;
  savingsOpportunity?: { description: string; amount: number };
}

export const SUBSCRIPTION_CATEGORIES = [
  { name: 'streaming', color: 'bg-red-500', icon: '📺' },
  { name: 'software', color: 'bg-blue-500', icon: '💻' },
  { name: 'fitness', color: 'bg-green-500', icon: '💪' },
  { name: 'gaming', color: 'bg-purple-500', icon: '🎮' },
  { name: 'other', color: 'bg-gray-500', icon: '📦' },
];

/**
 * Detects recurring subscriptions from a list of transactions.
 * Looks for same merchant, similar amount, and regular interval.
 */
export function detectSubscriptions(transactions: Transaction[]): DetectedSubscription[] {
  // Group by merchant
  const merchantGroups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!tx.merchant) continue;
    if (!merchantGroups[tx.merchant]) merchantGroups[tx.merchant] = [];
    merchantGroups[tx.merchant].push(tx);
  }

  const detected: DetectedSubscription[] = [];

  for (const merchant in merchantGroups) {
    const txs = merchantGroups[merchant].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (txs.length < 3) continue; // Need at least 3 payments to detect a pattern

    // Check for similar amount (within 10%)
    const avgAmount = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0) / txs.length;
    const similarAmounts = txs.every(t => Math.abs(Math.abs(t.amount) - avgAmount) < avgAmount * 0.1);
    if (!similarAmounts) continue;

    // Check for regular interval (monthly or weekly)
    const intervals = txs.slice(1).map((t, i) => {
      const prev = txs[i];
      return Math.abs(new Date(t.date).getTime() - new Date(prev.date).getTime());
    });
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let intervalType = '';
    if (intervals.every(i => Math.abs(i - monthMs) < 5 * 24 * 60 * 60 * 1000)) {
      intervalType = 'monthly';
    } else if (intervals.every(i => Math.abs(i - weekMs) < 2 * 24 * 60 * 60 * 1000)) {
      intervalType = 'weekly';
    } else {
      continue;
    }

    // Predict next renewal
    const lastPayment = txs[txs.length - 1].date;
    let nextRenewal = '';
    if (intervalType === 'monthly') {
      nextRenewal = new Date(new Date(lastPayment).getTime() + monthMs).toISOString();
    } else if (intervalType === 'weekly') {
      nextRenewal = new Date(new Date(lastPayment).getTime() + weekMs).toISOString();
    }

    detected.push({
      merchant,
      amount: Math.round(avgAmount * 100) / 100,
      interval: intervalType,
      lastPayment,
      nextRenewal,
    });
  }

  return detected;
} 