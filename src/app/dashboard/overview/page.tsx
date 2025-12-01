'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function OverviewPage() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    monthlySpending: 0,
    activeSubscriptions: 0,
    activeAlerts: 0,
    yearlySpending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchOverviewData();
    }
  }, [user]);

  // Listen for subscription updates
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      fetchOverviewData();
    };
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscriptions
      const subscriptionsRes = await fetch('/api/subscriptions');
      const subscriptionsData = await subscriptionsRes.json();
      const subscriptions = subscriptionsData.subscriptions || [];

      const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
      const monthlySpending = activeSubscriptions.reduce((sum: number, sub: any) => sum + sub.amount, 0);
      const yearlySpending = monthlySpending * 12;

      // Calculate alerts (subscriptions renewing in next 7 days)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const activeAlerts = activeSubscriptions.filter((sub: any) => {
        const renewalDate = new Date(sub.renewalDate);
        return renewalDate >= now && renewalDate <= sevenDaysFromNow;
      }).length;

      setStats({
        monthlySpending,
        activeSubscriptions: activeSubscriptions.length,
        activeAlerts,
        yearlySpending,
      });
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's your subscription summary.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#18253d] bg-[#0d182d] p-6 animate-pulse">
              <div className="h-4 bg-[#13213a] rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-[#13213a] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here's your subscription summary.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Monthly Spending"
          value={formatCurrency(stats.monthlySpending)}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          }
        />
        <MetricCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toString()}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Active Alerts"
          value={stats.activeAlerts.toString()}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          }
        />
        <MetricCard
          title="Yearly Spending"
          value={formatCurrency(stats.yearlySpending)}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#18253d] bg-[#0d182d] shadow-[0_15px_35px_-25px_rgba(15,23,42,0.8)]">
          <div className="border-b border-[#172238] px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="relative px-6 py-5">
            <div className="absolute left-8 top-8 bottom-8 w-px bg-[#1c2942]"></div>
            <div className="space-y-4">
              <QuickAction
                title="View All Subscriptions"
                description="Manage your active subscriptions"
                href="/dashboard/subscriptions"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              />
              <QuickAction
                title="View Analytics"
                description="Analyze your spending patterns"
                href="/dashboard/analytics"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#18253d] bg-[#0d182d] shadow-[0_15px_35px_-25px_rgba(15,23,42,0.8)]">
          <div className="border-b border-[#172238] px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Connect Your Bank</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-400 mb-4">
              Connect your bank account to automatically detect and track your subscriptions.
            </p>
            <Link
              href="/dashboard/subscriptions"
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff8b3d] px-4 py-2 text-sm font-semibold text-[#041024] hover:bg-[#ffa056] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Connect Bank Account
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#18253d] bg-[#0d182d] shadow-[0_15px_35px_-25px_rgba(15,23,42,0.8)]">
          <div className="border-b border-[#172238] px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Add Subscription</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-400 mb-4">
              Manually add a subscription to track and manage it in your dashboard.
            </p>
            <Link
              href="/dashboard/subscriptions?add=true"
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff8b3d] px-4 py-2 text-sm font-semibold text-[#041024] hover:bg-[#ffa056] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Manually
              </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#18253d] bg-[#0d182d] p-6 shadow-[0_15px_35px_-25px_rgba(15,23,42,0.8)]">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {stats.activeAlerts > 0 ? (
            <div className="rounded-lg border border-[#1e3a2b] bg-[#13251b] p-4">
              <p className="text-sm text-[#4ade80]">
                You have {stats.activeAlerts} subscription{stats.activeAlerts > 1 ? 's' : ''} renewing in the next 7 days.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              No recent activity. Your subscriptions are up to date.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#18253d] bg-[#0d182d] p-6 shadow-[0_18px_35px_-30px_rgba(8,47,73,0.9)]">
      <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-[#ff8b3d]/15 to-transparent blur-3xl" />
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8b3d]/25 to-transparent text-[#ff8b3d]">
          {icon}
        </div>
        <span className="rounded-full border border-[#23324e] px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400">
          Live
        </span>
      </div>
      <p className="mt-6 text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 p-4 transition"
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ff8b3d] bg-transparent">
          <div className="text-[#ff8b3d]">
            {icon}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#1c2942] text-[#ff8b3d] transition group-hover:bg-[#ff8b3d] group-hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}


function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
