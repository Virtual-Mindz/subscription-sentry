export interface Recommendation {
  id: string;
  type: 'optimization' | 'alternative' | 'consolidation' | 'cancellation' | 'upgrade' | 'downgrade';
  title: string;
  description: string;
  impact: {
    type: 'savings' | 'improvement' | 'efficiency';
    value: number;
    period: 'monthly' | 'yearly' | 'one-time';
  };
  confidence: number; // 0-100
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionText?: string;
  reasoning: string[];
  alternatives?: AlternativeService[];
}

export interface AlternativeService {
  name: string;
  price: number;
  features: string[];
  pros: string[];
  cons: string[];
  savings: number;
  rating: number; // 1-5
  category: string;
}

export interface UsagePattern {
  subscriptionId: string;
  merchant: string;
  usageFrequency: 'high' | 'medium' | 'low';
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern?: 'summer' | 'winter' | 'holiday' | 'none';
  peakUsageMonths: string[];
  lowUsageMonths: string[];
  averageUsagePerMonth: number;
  lastUsed: string;
}

export interface SpendingPrediction {
  currentMonthly: number;
  predictedMonthly: number;
  predictedYearly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  factors: string[];
  recommendations: string[];
}

/**
 * Analyzes usage patterns to identify optimization opportunities
 */
export function analyzeUsagePatterns(
  subscriptions: any[],
  transactions: any[]
): UsagePattern[] {
  const patterns: UsagePattern[] = [];

  for (const subscription of subscriptions) {
    const merchantTransactions = transactions.filter(t => 
      t.merchant?.toLowerCase().includes(subscription.merchant.toLowerCase())
    );

    // Calculate usage frequency
    const usageFrequency = merchantTransactions.length >= 6 ? 'high' : 
                          merchantTransactions.length >= 3 ? 'medium' : 'low';

    // Analyze usage trend (last 3 months vs previous 3 months)
    const recentTransactions = merchantTransactions.slice(-3);
    const previousTransactions = merchantTransactions.slice(-6, -3);
    const usageTrend = recentTransactions.length > previousTransactions.length ? 'increasing' :
                      recentTransactions.length < previousTransactions.length ? 'decreasing' : 'stable';

    // Identify seasonal patterns
    const monthlyUsage = new Array(12).fill(0);
    merchantTransactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      monthlyUsage[month]++;
    });

    const peakUsage = Math.max(...monthlyUsage);
    const peakMonths = monthlyUsage
      .map((count, month) => ({ count, month }))
      .filter(({ count }) => count === peakUsage)
      .map(({ month }) => new Date(2024, month).toLocaleDateString('en-US', { month: 'long' }));

    const lowUsage = Math.min(...monthlyUsage);
    const lowMonths = monthlyUsage
      .map((count, month) => ({ count, month }))
      .filter(({ count }) => count === lowUsage)
      .map(({ month }) => new Date(2024, month).toLocaleDateString('en-US', { month: 'long' }));

    // Determine seasonal pattern
    let seasonalPattern: 'summer' | 'winter' | 'holiday' | 'none' = 'none';
    if (peakMonths.some(m => ['June', 'July', 'August'].includes(m))) seasonalPattern = 'summer';
    else if (peakMonths.some(m => ['December', 'January', 'February'].includes(m))) seasonalPattern = 'winter';
    else if (peakMonths.some(m => ['November', 'December'].includes(m))) seasonalPattern = 'holiday';

    patterns.push({
      subscriptionId: subscription.id || subscription.merchant,
      merchant: subscription.merchant,
      usageFrequency,
      usageTrend,
      seasonalPattern,
      peakUsageMonths: peakMonths,
      lowUsageMonths: lowMonths,
      averageUsagePerMonth: merchantTransactions.length / 12,
      lastUsed: merchantTransactions[merchantTransactions.length - 1]?.date || subscription.lastPayment
    });
  }

  return patterns;
}

/**
 * Generates smart recommendations based on usage patterns and spending
 */
export function generateRecommendations(
  subscriptions: any[],
  usagePatterns: UsagePattern[],
  spendingLimit?: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Low usage subscription recommendations
  const lowUsageSubs = usagePatterns.filter(p => p.usageFrequency === 'low');
  for (const pattern of lowUsageSubs) {
    const subscription = subscriptions.find(s => s.merchant === pattern.merchant);
    if (subscription) {
      const annualSavings = subscription.amount * 12;
      recommendations.push({
        id: `cancel-${pattern.subscriptionId}`,
        type: 'cancellation',
        title: `Consider Canceling ${pattern.merchant}`,
        description: `Your ${pattern.merchant} subscription shows low usage. You could save $${annualSavings.toFixed(2)}/year by canceling it.`,
        impact: {
          type: 'savings',
          value: annualSavings,
          period: 'yearly'
        },
        confidence: 85,
        priority: 'high',
        actionUrl: `/dashboard/subscriptions/${pattern.subscriptionId}`,
        actionText: 'Cancel Subscription',
        reasoning: [
          `Low usage frequency (${pattern.usageFrequency})`,
          `Last used: ${new Date(pattern.lastUsed).toLocaleDateString()}`,
          `Average usage: ${pattern.averageUsagePerMonth.toFixed(1)} times per month`
        ]
      });
    }
  }

  // 2. Annual plan savings recommendations
  const monthlySubs = subscriptions.filter(s => s.interval === 'monthly' && s.amount > 10);
  for (const subscription of monthlySubs) {
    const annualSavings = subscription.amount * 12 * 0.15; // 15% savings
    recommendations.push({
      id: `annual-${subscription.merchant}`,
      type: 'optimization',
      title: `Switch to Annual Billing for ${subscription.merchant}`,
      description: `Switch from monthly to annual billing to save approximately $${annualSavings.toFixed(2)}/year.`,
      impact: {
        type: 'savings',
        value: annualSavings,
        period: 'yearly'
      },
      confidence: 90,
      priority: 'medium',
      actionUrl: `/dashboard/subscriptions/${subscription.merchant}`,
      actionText: 'Change Plan',
      reasoning: [
        'Annual plans typically offer 10-20% discount',
        'Reduces monthly payment frequency',
        'Better value for long-term usage'
      ]
    });
  }

  // 3. Family plan recommendations
  const individualStreaming = subscriptions.filter(s => 
    s.category === 'streaming' && s.amount < 20
  );
  for (const subscription of individualStreaming) {
    const familySavings = subscription.amount * 0.5; // 50% savings per person
    recommendations.push({
      id: `family-${subscription.merchant}`,
      type: 'optimization',
      title: `Consider Family Plan for ${subscription.merchant}`,
      description: `A family plan could save you $${familySavings.toFixed(2)}/month per person while sharing with family members.`,
      impact: {
        type: 'savings',
        value: familySavings * 12,
        period: 'yearly'
      },
      confidence: 75,
      priority: 'medium',
      actionUrl: `/dashboard/subscriptions/${subscription.merchant}`,
      actionText: 'View Family Plans',
      reasoning: [
        'Family plans offer better value per person',
        'Shared access with multiple users',
        'Reduced overall household spending'
      ]
    });
  }

  // 4. Spending limit recommendations
  if (spendingLimit) {
    const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
    if (totalMonthly > spendingLimit) {
      const overage = totalMonthly - spendingLimit;
      recommendations.push({
        id: 'spending-limit',
        type: 'optimization',
        title: 'Reduce Monthly Spending',
        description: `Your monthly spending of $${totalMonthly.toFixed(2)} exceeds your limit of $${spendingLimit.toFixed(2)} by $${overage.toFixed(2)}.`,
        impact: {
          type: 'savings',
          value: overage * 12,
          period: 'yearly'
        },
        confidence: 95,
        priority: 'high',
        actionUrl: '/dashboard/subscriptions',
        actionText: 'Review Subscriptions',
        reasoning: [
          `Current spending: $${totalMonthly.toFixed(2)}/month`,
          `Spending limit: $${spendingLimit.toFixed(2)}/month`,
          `Potential annual savings: $${(overage * 12).toFixed(2)}`
        ]
      });
    }
  }

  // 5. Duplicate service recommendations
  const duplicates = subscriptions.filter(s => s.isDuplicate);
  for (const duplicate of duplicates) {
    const annualSavings = duplicate.amount * 12;
    recommendations.push({
      id: `duplicate-${duplicate.merchant}`,
      type: 'consolidation',
      title: `Consolidate Duplicate ${duplicate.merchant} Subscriptions`,
      description: `You have duplicate subscriptions for ${duplicate.merchant}. Consolidate to save $${annualSavings.toFixed(2)}/year.`,
      impact: {
        type: 'savings',
        value: annualSavings,
        period: 'yearly'
      },
      confidence: 95,
      priority: 'high',
      actionUrl: `/dashboard/subscriptions/${duplicate.merchant}`,
      actionText: 'Review Duplicates',
      reasoning: [
        'Duplicate subscriptions detected',
        'Same service, multiple accounts',
        'Immediate savings opportunity'
      ]
    });
  }

  return recommendations.sort((a, b) => {
    // Sort by priority and impact
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.impact.value - a.impact.value;
  });
}

/**
 * Finds alternative services for existing subscriptions
 */
export function findAlternatives(subscription: any): AlternativeService[] {
  const alternatives: Record<string, AlternativeService[]> = {
    'netflix': [
      {
        name: 'Disney+',
        price: 7.99,
        features: ['4K streaming', 'Family profiles', 'Offline downloads'],
        pros: ['Lower price', 'Family-friendly content', 'Bundle options'],
        cons: ['Smaller library', 'Limited new releases'],
        savings: 2.00,
        rating: 4.2,
        category: 'streaming'
      },
      {
        name: 'Hulu',
        price: 7.99,
        features: ['Current TV shows', 'Movies', 'Original content'],
        pros: ['Current TV episodes', 'Lower price', 'Bundle with Disney+'],
        cons: ['Ads in basic plan', 'Limited movies'],
        savings: 2.00,
        rating: 4.0,
        category: 'streaming'
      }
    ],
    'spotify': [
      {
        name: 'Apple Music',
        price: 9.99,
        features: ['Lossless audio', 'Spatial audio', 'Lyrics'],
        pros: ['Better audio quality', 'Integration with Apple ecosystem'],
        cons: ['Higher price', 'Limited free tier'],
        savings: -5.00,
        rating: 4.3,
        category: 'music'
      },
      {
        name: 'YouTube Music',
        price: 9.99,
        features: ['Music videos', 'Background play', 'Offline downloads'],
        pros: ['Music videos included', 'YouTube Premium included'],
        cons: ['Same price', 'Different interface'],
        savings: 0,
        rating: 4.1,
        category: 'music'
      }
    ],
    'adobe creative cloud': [
      {
        name: 'Affinity Suite',
        price: 49.99,
        features: ['Photo editing', 'Vector graphics', 'Page layout'],
        pros: ['One-time purchase', 'No subscription', 'Professional features'],
        cons: ['Different interface', 'Limited cloud features'],
        savings: 189.89,
        rating: 4.4,
        category: 'software'
      },
      {
        name: 'Canva Pro',
        price: 12.99,
        features: ['Design templates', 'Brand kit', 'Team collaboration'],
        pros: ['Easier to use', 'Lower price', 'Templates included'],
        cons: ['Less powerful', 'Web-based only'],
        savings: 7.00,
        rating: 4.2,
        category: 'software'
      }
    ]
  };

  const merchantKey = subscription.merchant.toLowerCase().replace(/\s+/g, '');
  return alternatives[merchantKey] || [];
}

/**
 * Predicts future spending based on current patterns
 */
export function predictSpending(
  subscriptions: any[],
  usagePatterns: UsagePattern[],
  months: number = 12
): SpendingPrediction {
  const currentMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  
  // Analyze trends
  const increasingSubs = usagePatterns.filter(p => p.usageTrend === 'increasing').length;
  const decreasingSubs = usagePatterns.filter(p => p.usageTrend === 'decreasing').length;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendFactor = 1.0;
  
  if (increasingSubs > decreasingSubs) {
    trend = 'increasing';
    trendFactor = 1.05; // 5% increase
  } else if (decreasingSubs > increasingSubs) {
    trend = 'decreasing';
    trendFactor = 0.95; // 5% decrease
  }
  
  const predictedMonthly = currentMonthly * trendFactor;
  const predictedYearly = predictedMonthly * months;
  
  // Calculate confidence based on data quality
  const confidence = Math.min(95, 70 + (subscriptions.length * 2) + (usagePatterns.length * 3));
  
  const factors = [];
  if (increasingSubs > 0) factors.push(`${increasingSubs} subscriptions showing increased usage`);
  if (decreasingSubs > 0) factors.push(`${decreasingSubs} subscriptions showing decreased usage`);
  if (subscriptions.some(s => s.isDuplicate)) factors.push('Duplicate subscriptions detected');
  if (subscriptions.some(s => s.usageFrequency === 'low')) factors.push('Low-usage subscriptions present');
  
  const recommendations = [];
  if (trend === 'increasing') {
    recommendations.push('Consider setting spending limits');
    recommendations.push('Review high-usage subscriptions');
  } else if (trend === 'decreasing') {
    recommendations.push('Consider canceling unused subscriptions');
    recommendations.push('Look for consolidation opportunities');
  }
  
  return {
    currentMonthly,
    predictedMonthly,
    predictedYearly,
    trend,
    confidence,
    factors,
    recommendations
  };
}

/**
 * Generates personalized insights based on user data
 */
export function generateInsights(
  subscriptions: any[],
  usagePatterns: UsagePattern[],
  recommendations: Recommendation[]
): string[] {
  const insights: string[] = [];
  
  // Spending insights
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const totalYearly = totalMonthly * 12;
  
  insights.push(`You're spending $${totalMonthly.toFixed(2)}/month on subscriptions, totaling $${totalYearly.toFixed(2)}/year.`);
  
  // Category insights
  const categorySpending = subscriptions.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + s.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topCategory) {
    insights.push(`Your highest spending category is ${topCategory[0]} at $${topCategory[1].toFixed(2)}/month.`);
  }
  
  // Usage insights
  const lowUsageCount = usagePatterns.filter(p => p.usageFrequency === 'low').length;
  if (lowUsageCount > 0) {
    insights.push(`You have ${lowUsageCount} subscription${lowUsageCount > 1 ? 's' : ''} with low usage that could be optimized.`);
  }
  
  // Savings potential
  const totalSavings = recommendations
    .filter(r => r.impact.type === 'savings')
    .reduce((sum, r) => sum + r.impact.value, 0);
  
  if (totalSavings > 0) {
    insights.push(`You could save up to $${totalSavings.toFixed(2)}/year by following our recommendations.`);
  }
  
  // Health insights
  const avgHealthScore = subscriptions.reduce((sum, s) => sum + s.healthScore, 0) / subscriptions.length;
  if (avgHealthScore >= 80) {
    insights.push('Your subscription portfolio is in excellent health!');
  } else if (avgHealthScore >= 60) {
    insights.push('Your subscription portfolio has room for improvement.');
  } else {
    insights.push('Your subscription portfolio needs attention - consider our optimization recommendations.');
  }
  
  return insights;
} 