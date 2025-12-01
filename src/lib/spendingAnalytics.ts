export interface SpendingTrend {
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendDirection: 'up' | 'down' | 'stable';
}

export interface MonthlySpending {
  month: string; // YYYY-MM format
  amount: number;
  subscriptionCount: number;
  categories: Record<string, number>;
}

export interface SpendingInsight {
  type: 'increase' | 'decrease' | 'stable' | 'new_subscription' | 'cancelled_subscription';
  message: string;
  impact: number;
  severity: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Calculate month-over-month spending trends
 */
export function calculateSpendingTrends(
  transactions: any[],
  currentDate: Date = new Date()
): SpendingTrend {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get current month spending
  const currentMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
  
  // Get previous month spending
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const previousMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate.getMonth() === previousMonth && txDate.getFullYear() === previousYear;
  });
  
  const currentMonthSpending = Math.abs(currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
  const previousMonthSpending = Math.abs(previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0));
  
  const change = currentMonthSpending - previousMonthSpending;
  const changePercentage = previousMonthSpending > 0 ? (change / previousMonthSpending) * 100 : 0;
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  let trendDirection: 'up' | 'down' | 'stable';
  
  if (Math.abs(changePercentage) < 5) {
    trend = 'stable';
    trendDirection = 'stable';
  } else if (changePercentage > 0) {
    trend = 'increasing';
    trendDirection = 'up';
  } else {
    trend = 'decreasing';
    trendDirection = 'down';
  }
  
  return {
    currentMonth: currentMonthSpending,
    previousMonth: previousMonthSpending,
    change,
    changePercentage,
    trend,
    trendDirection
  };
}

/**
 * Get monthly spending breakdown for the last 6 months
 */
export function getMonthlySpendingBreakdown(
  transactions: any[],
  months: number = 6
): MonthlySpending[] {
  const monthlyData: Record<string, MonthlySpending> = {};
  const currentDate = new Date();
  
  // Initialize last 6 months
  for (let i = 0; i < months; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    
    monthlyData[monthKey] = {
      month: monthKey,
      amount: 0,
      subscriptionCount: 0,
      categories: {}
    };
  }
  
  // Process transactions
  transactions.forEach(transaction => {
    const txDate = new Date(transaction.date);
    const monthKey = txDate.toISOString().slice(0, 7);
    
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].amount += Math.abs(transaction.amount);
      monthlyData[monthKey].subscriptionCount++;
      
      // Track by category if available
      const category = transaction.category || 'unknown';
      monthlyData[monthKey].categories[category] = 
        (monthlyData[monthKey].categories[category] || 0) + Math.abs(transaction.amount);
    }
  });
  
  // Convert to array and sort by month (newest first)
  return Object.values(monthlyData)
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Generate spending insights based on trends
 */
export function generateSpendingInsights(
  spendingTrend: SpendingTrend,
  subscriptions: any[],
  monthlyBreakdown: MonthlySpending[]
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  
  // Trend-based insights
  if (spendingTrend.trend === 'increasing' && spendingTrend.changePercentage > 10) {
    insights.push({
      type: 'increase',
      message: `Your spending increased by ${spendingTrend.changePercentage.toFixed(1)}% from last month`,
      impact: spendingTrend.change,
      severity: spendingTrend.changePercentage > 20 ? 'high' : 'medium',
      actionable: true,
      actionUrl: '/dashboard/subscriptions',
      actionText: 'Review Subscriptions'
    });
  } else if (spendingTrend.trend === 'decreasing' && spendingTrend.changePercentage < -10) {
    insights.push({
      type: 'decrease',
      message: `Great! Your spending decreased by ${Math.abs(spendingTrend.changePercentage).toFixed(1)}% from last month`,
      impact: Math.abs(spendingTrend.change),
      severity: 'low',
      actionable: false
    });
  }
  
  // New subscriptions insight
  const currentMonthSubs = subscriptions.filter(sub => {
    const subDate = new Date(sub.lastPayment);
    const currentDate = new Date();
    return subDate.getMonth() === currentDate.getMonth() && 
           subDate.getFullYear() === currentDate.getFullYear();
  });
  
  if (currentMonthSubs.length > 0) {
    const newSubsTotal = currentMonthSubs.reduce((sum, sub) => sum + sub.amount, 0);
    insights.push({
      type: 'new_subscription',
      message: `You added ${currentMonthSubs.length} new subscription${currentMonthSubs.length > 1 ? 's' : ''} this month`,
      impact: newSubsTotal,
      severity: 'medium',
      actionable: true,
      actionUrl: '/dashboard/subscriptions',
      actionText: 'View New Subscriptions'
    });
  }
  
  // High spending category insight
  if (monthlyBreakdown.length > 0) {
    const currentMonth = monthlyBreakdown[0];
    const topCategory = Object.entries(currentMonth.categories)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && topCategory[1] > currentMonth.amount * 0.5) {
      insights.push({
        type: 'increase',
        message: `${topCategory[0]} accounts for ${((topCategory[1] / currentMonth.amount) * 100).toFixed(1)}% of your spending`,
        impact: topCategory[1],
        severity: 'medium',
        actionable: true,
        actionUrl: '/dashboard/ai-insights',
        actionText: 'Get Optimization Tips'
      });
    }
  }
  
  return insights;
}

/**
 * Calculate spending velocity (rate of change)
 */
export function calculateSpendingVelocity(
  monthlyBreakdown: MonthlySpending[]
): number {
  if (monthlyBreakdown.length < 2) return 0;
  
  const recentMonths = monthlyBreakdown.slice(0, 3);
  const totalChange = recentMonths.reduce((sum, month, index) => {
    if (index === 0) return sum;
    return sum + (month.amount - recentMonths[index - 1].amount);
  }, 0);
  
  return totalChange / (recentMonths.length - 1);
}

/**
 * Predict next month's spending
 */
export function predictNextMonthSpending(
  monthlyBreakdown: MonthlySpending[],
  currentSubscriptions: any[]
): number {
  if (monthlyBreakdown.length === 0) return 0;
  
  // Simple prediction based on current subscriptions
  const basePrediction = currentSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  
  // Adjust based on recent trend
  const velocity = calculateSpendingVelocity(monthlyBreakdown);
  const trendAdjustment = velocity * 0.5; // Conservative adjustment
  
  return Math.max(0, basePrediction + trendAdjustment);
}

/**
 * Get spending summary for dashboard
 */
export function getSpendingSummary(
  transactions: any[],
  subscriptions: any[]
): {
  currentMonth: number;
  previousMonth: number;
  trend: SpendingTrend;
  insights: SpendingInsight[];
  monthlyBreakdown: MonthlySpending[];
  prediction: number;
} {
  const trend = calculateSpendingTrends(transactions);
  const monthlyBreakdown = getMonthlySpendingBreakdown(transactions);
  const insights = generateSpendingInsights(trend, subscriptions, monthlyBreakdown);
  const prediction = predictNextMonthSpending(monthlyBreakdown, subscriptions);
  
  return {
    currentMonth: trend.currentMonth,
    previousMonth: trend.previousMonth,
    trend,
    insights,
    monthlyBreakdown,
    prediction
  };
} 