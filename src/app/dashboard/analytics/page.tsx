'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f97316', '#a78bfa', '#f472b6'];

export default function AnalyticsPage() {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
      fetchSubscriptions();
    }
  }, [user]);

  // Listen for subscription updates
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      fetchAnalytics();
      fetchSubscriptions();
    };
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  // Helper function to categorize subscriptions
  const categorizeSubscription = (merchant: string | null): string => {
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
  };

  // Separate active and cancelled subscriptions
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled');

  // Group active subscriptions by category
  const groupedByCategory = activeSubscriptions.reduce((groups: Record<string, any[]>, sub) => {
    const category = categorizeSubscription(sub.merchant || sub.name);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(sub);
    return groups;
  }, {});

  // Group cancelled subscriptions by category for historical chart
  const cancelledByCategory = cancelledSubscriptions.reduce((groups: Record<string, any[]>, sub) => {
    const category = categorizeSubscription(sub.merchant || sub.name);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(sub);
    return groups;
  }, {});

  // Calculate historical spending from cancelled subscriptions
  const historicalMonthlySpending = cancelledSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const historicalData = Object.entries(cancelledByCategory).map(([category, subs]) => ({
    name: category,
    value: subs.reduce((sum, sub) => sum + sub.amount, 0),
    count: subs.length,
  }));

  // Detect user's country/currency from subscriptions
  const userCurrency = subscriptions.length > 0 && subscriptions[0].currency 
    ? subscriptions[0].currency 
    : 'USD';
  const userCountry = userCurrency === 'GBP' ? 'UK' : 'US';

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || userCurrency;
    const locale = curr === 'GBP' ? 'en-GB' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!user?.id) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400">Please log in to view your analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 animate-pulse shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]"
            >
              <div className="h-4 bg-[#13213a] rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-[#13213a] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <div className="rounded-2xl border border-dashed border-[#1b2740] bg-[#0d182d] p-10 text-center text-sm text-slate-400 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <p>No analytics data available yet. Connect your bank account to see analytics.</p>
        </div>
      </div>
    );
  }

  // Format monthly spending data for chart
  const monthlySpendingData = analytics.monthlySpending?.map((item: any) => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    spending: Math.round(item.spending * 100) / 100,
  })) || [];

  // Format category data for pie chart
  const categoryData = analytics.categorySpending?.map((item: any) => ({
    name: item.name,
    value: Math.round(item.value * 100) / 100,
  })) || [];

  // Format trend data for bar chart
  const trendData = analytics.topMerchants?.map((item: any) => ({
    name: item.name,
    count: item.count,
  })) || [];

  const totalSpending = monthlySpendingData.reduce((sum: number, m: any) => sum + m.spending, 0);
  const mostExpensive = categoryData.length > 0 
    ? categoryData.reduce((max: any, c: any) => c.value > max.value ? c : max, categoryData[0])
    : { name: 'N/A', value: 0 };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryTile title="Total Spending (6 months)" value={formatCurrency(totalSpending)} />
        <SummaryTile
          title="Most Expensive Category"
          value={mostExpensive.name}
          subValue={formatCurrency(mostExpensive.value)}
        />
        <SummaryTile title="Total Subscriptions" value={`${analytics.totalSubscriptions || 0}`} />
      </div>

      {(monthlySpendingData.length > 0 || categoryData.length > 0) ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {monthlySpendingData.length > 0 && (
            <ChartCard title="Monthly Spending" description="Track recurring spend momentum">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlySpendingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#16253d" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#273b5d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#273b5d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="#60a5fa"
                    strokeWidth={3}
                    dot={{ stroke: '#60a5fa', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {categoryData.length > 0 && (
            <ChartCard title="Spending by Category" description="Understand where budgets go">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      ) : (
        <PlaceholderCard message="No spending data yet. Connect your bank account to power analytics." />
      )}

      {trendData.length > 0 && (
        <ChartCard title="Top merchants" description="Recurring transactions detected">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#16253d" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#273b5d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#273b5d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value} transactions`} />
              <Bar dataKey="count" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Historical/Cancelled Subscriptions Chart */}
      {cancelledSubscriptions.length > 0 && historicalData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Historical Subscriptions" description="Cancelled subscriptions by category">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={historicalData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {historicalData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.6} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `$${value}/mo`} />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
            <h3 className="text-lg font-semibold text-white mb-4">Historical Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Cancelled</span>
                <span className="text-lg font-semibold text-slate-300">{cancelledSubscriptions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Historical Monthly Spend</span>
                <span className="text-lg font-semibold text-slate-300">{formatCurrency(historicalMonthlySpending)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Historical Yearly Spend</span>
                <span className="text-lg font-semibold text-slate-300">{formatCurrency(historicalMonthlySpending * 12)}</span>
              </div>
              <div className="pt-4 border-t border-[#1b2740]">
                <p className="text-xs text-slate-500 mb-2">Top Cancelled Categories:</p>
                <div className="space-y-2">
                  {historicalData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{item.name}</span>
                        <span className="text-slate-300 font-medium">{formatCurrency(item.value)}/mo</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions by Category */}
      {Object.keys(groupedByCategory).length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Subscriptions by Category</h2>
            <p className="text-sm text-slate-400 mt-1">View and manage your subscriptions organized by category</p>
          </div>
          
          {Object.entries(groupedByCategory).map(([category, categorySubs]) => {
            const totalCategorySpend = categorySubs.reduce((sum, sub) => sum + sub.amount, 0);
            const categoryIcon = getCategoryIcon(category);
            
            return (
              <div key={category} className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryIcon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{category} Subscriptions</h3>
                      <p className="text-sm text-slate-400">{categorySubs.length} {categorySubs.length === 1 ? 'service' : 'services'}</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-[#ff8b3d]">
                    {formatCurrency(totalCategorySpend)}/month
                  </span>
                </div>
                
                <div className="space-y-3">
                  {categorySubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg border border-[#1b2740] bg-[#101b30] p-4 hover:border-[#26375a] transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-white">{sub.merchant || sub.name}</h4>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            sub.status === 'active' 
                              ? 'bg-[#1d3b2d] text-[#4ade80]' 
                              : 'bg-[#2d1b1b] text-[#fb7185]'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          Next renewal: {new Date(sub.renewalDate).toLocaleDateString(
                            userCountry === 'UK' ? 'en-GB' : 'en-US',
                            { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">{formatCurrency(sub.amount, sub.currency || undefined)}</p>
                        <p className="text-xs text-slate-400">Monthly</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(groupedByCategory).length === 0 && subscriptions.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-[#1b2740] bg-[#0d182d] p-10 text-center text-sm text-slate-400 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <p>No subscriptions found. Add subscriptions to see them organized by category.</p>
          <Link
            href="/dashboard/subscriptions"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ff8b3d] px-4 py-2 text-sm font-semibold text-[#041024] hover:bg-[#ffa056] transition-colors"
          >
            Add Subscription
          </Link>
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Streaming': '📺',
    'Software': '💻',
    'Fitness': '💪',
    'Gaming': '🎮',
    'Other': '📦',
  };
  return icons[category] || '📦';
}

const tooltipStyle = {
  backgroundColor: '#0f1c32',
  borderRadius: '12px',
  border: '1px solid #1e2c46',
  color: '#e2e8f0',
  fontSize: '12px',
  padding: '8px 12px',
};

function SummaryTile({ title, value, subValue }: { title: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-5 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {subValue && <p className="text-sm text-slate-400">{subValue}</p>}
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function PlaceholderCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#1b2740] bg-[#0d182d] p-10 text-center text-sm text-slate-400 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
      {message}
    </div>
  );
}
