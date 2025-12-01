'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from "next/dynamic";
import SubscriptionCard from "@/components/features/SubscriptionCard";
import { useUser } from "@clerk/nextjs";
import { DetectedSubscription } from '@/lib/subscriptionDetection';
import toast from 'react-hot-toast';

const PlaidLink = dynamic(() => import("@/components/integrations/PlaidLink"), { ssr: false });

interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewalDate: string;
  merchant: string | null;
  status: string;
  currency?: string | null;
  interval?: string | null;
  confidenceScore?: number | null;
  category?: string | null;
  isAutoDetected?: boolean;
  lastPaymentDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function SubscriptionsPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    amount: "",
    renewalDate: "",
    merchant: "",
    status: "active",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('active');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSubscriptions();
    }
  }, [user]);

  // Listen for subscription updates from other pages
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      fetchSubscriptions();
    };
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  // Auto-open form if 'add' query parameter is present
  useEffect(() => {
    const addParam = searchParams.get('add');
    if (addParam === 'true') {
      setIsFormOpen(true);
      // Scroll to form after a brief delay to ensure it's rendered
      setTimeout(() => {
        const formElement = document.querySelector('[data-form-section]');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [searchParams]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/subscriptions');
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.details || data.error || 'Failed to fetch subscriptions';
        console.error('API Error:', { status: response.status, error: data });
        throw new Error(errorMsg);
      }
      
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateSubscription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);

    const amount = parseFloat(formState.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setFormMessage({ type: "error", text: "Please enter a valid monthly amount greater than 0." });
      return;
    }

    if (!formState.renewalDate) {
      setFormMessage({ type: "error", text: "Please choose a renewal date." });
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          amount,
          renewalDate: formState.renewalDate,
          merchant: formState.merchant.trim() || undefined,
          status: formState.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create subscription");
      }

      setFormMessage({ type: "success", text: "Subscription added successfully." });
      setFormState({
        name: "",
        amount: "",
        renewalDate: "",
        merchant: "",
        status: "active",
      });
      await fetchSubscriptions();
      // Trigger refresh on other pages
      window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
    } catch (err) {
      console.error("Error creating subscription:", err);
      setFormMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create subscription.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const handleDetectSubscriptions = async () => {
    setIsDetecting(true);
    setDetectionMessage(null);
    
    try {
      // First sync transactions, then detect subscriptions
      const syncResponse = await fetch('/api/plaid/sync-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!syncResponse.ok) {
        const syncData = await syncResponse.json();
        throw new Error(syncData.error || 'Failed to sync transactions');
      }

      // Then run subscription detection
      const response = await fetch('/api/plaid/subscription-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to detect subscriptions');
      }

      const newCount = data.detected?.filter((s: any) => s.wasCreated).length || 0;
      const totalSpend = data.totalMonthlySpend ? formatCurrency(data.totalMonthlySpend) : '';
      const mostExpensive = data.mostExpensiveSubscription?.name || '';
      
      setDetectionMessage({
        type: 'success',
        text: `Detected ${data.subscriptions || data.count || 0} subscription${(data.subscriptions || data.count || 0) !== 1 ? 's' : ''} from ${data.transactions || 0} transactions. ${newCount} new subscription${newCount !== 1 ? 's' : ''} created.${totalSpend ? ` Total monthly spend: ${totalSpend}` : ''}`,
      });
      
      let toastMessage = `Detected ${data.subscriptions || data.count || 0} subscriptions`;
      if (totalSpend) {
        toastMessage += ` • ${totalSpend}/month`;
      }
      if (mostExpensive) {
        toastMessage += ` • Most expensive: ${mostExpensive}`;
      }
      toast.success(toastMessage);
      
      // Refresh subscriptions list to show new ones
      await fetchSubscriptions();
      
      // Trigger refresh on other pages
      window.dispatchEvent(new CustomEvent('subscriptionUpdated'));

      // Refresh subscriptions list
      await fetchSubscriptions();
      
      // Trigger refresh on other pages
      window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
    } catch (err) {
      console.error('Error detecting subscriptions:', err);
      setDetectionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to detect subscriptions.',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const getConfidenceBadgeColor = (score: number | null | undefined): string => {
    if (!score) return 'bg-slate-500';
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceLabel = (score: number | null | undefined): string => {
    if (!score) return 'Unknown';
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const toCardSubscription = (sub: Subscription): DetectedSubscription & { id?: string; status?: string } => {
    const renewalDate = new Date(sub.renewalDate);
    const lastPaymentDate = sub.lastPaymentDate ? new Date(sub.lastPaymentDate) : new Date(renewalDate);
    if (!sub.lastPaymentDate) {
      lastPaymentDate.setMonth(lastPaymentDate.getMonth() - 1);
    }

    return {
      id: sub.id,
      status: sub.status,
      merchant: sub.merchant || sub.name,
      amount: sub.amount,
      interval: (sub.interval || 'monthly') as any,
      lastPayment: lastPaymentDate.toISOString().split('T')[0],
      nextRenewal: sub.renewalDate,
      category: (sub.category || categorizeSubscription(sub.merchant || sub.name)).toLowerCase(),
      healthScore: 75,
      isDuplicate: false,
      usageFrequency: 'medium' as const,
      priceHistory: [],
      duplicateOf: undefined,
      savingsOpportunity: undefined,
    } as DetectedSubscription & { id?: string; status?: string };
  };

  // Filter subscriptions based on status
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled');

  // Get filtered subscriptions based on current filter
  const getFilteredSubscriptions = () => {
    switch (filter) {
      case 'active':
        return activeSubscriptions;
      case 'cancelled':
        return cancelledSubscriptions;
      case 'all':
      default:
        return subscriptions;
    }
  };

  const filteredSubscriptions = getFilteredSubscriptions();

  // Group filtered subscriptions by category (only for active/all view)
  const groupedSubscriptions = (filter === 'active' || filter === 'all' 
    ? filteredSubscriptions.filter(sub => sub.status === 'active')
    : []
  ).reduce((groups, subscription) => {
    const category = categorizeSubscription(subscription.merchant || subscription.name);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(subscription);
    return groups;
  }, {} as Record<string, Subscription[]>);

  // Calculations exclude cancelled subscriptions
  const totalMonthlySpending = activeSubscriptions.reduce((sum, sub) => {
    // Convert to monthly if needed
    let monthlyAmount = sub.amount;
    if (sub.interval === 'yearly') {
      monthlyAmount = sub.amount / 12;
    } else if (sub.interval === 'quarterly') {
      monthlyAmount = sub.amount / 3;
    } else if (sub.interval === 'bi-weekly') {
      monthlyAmount = (sub.amount * 26) / 12;
    } else if (sub.interval === 'weekly') {
      monthlyAmount = (sub.amount * 52) / 12;
    }
    return sum + monthlyAmount;
  }, 0);
  const totalYearlySpending = totalMonthlySpending * 12;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cancelledThisMonthCount = cancelledSubscriptions.filter(sub => {
    if (!sub.updatedAt) return false;
    return new Date(sub.updatedAt) >= startOfMonth;
  }).length;

  // Calculate upcoming renewals (next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = activeSubscriptions.filter(sub => {
    const renewalDate = new Date(sub.renewalDate);
    return renewalDate >= now && renewalDate <= sevenDaysFromNow;
  }).sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  // Find most expensive subscription
  const mostExpensiveSubscription = activeSubscriptions.length > 0
    ? activeSubscriptions.reduce((max, sub) => {
        const subMonthly = sub.interval === 'yearly' ? sub.amount / 12 :
                          sub.interval === 'quarterly' ? sub.amount / 3 :
                          sub.interval === 'bi-weekly' ? (sub.amount * 26) / 12 :
                          sub.interval === 'weekly' ? (sub.amount * 52) / 12 :
                          sub.amount;
        const maxMonthly = max.interval === 'yearly' ? max.amount / 12 :
                          max.interval === 'quarterly' ? max.amount / 3 :
                          max.interval === 'bi-weekly' ? (max.amount * 26) / 12 :
                          max.interval === 'weekly' ? (max.amount * 52) / 12 :
                          max.amount;
        return subMonthly > maxMonthly ? sub : max;
      })
    : null;

  if (!user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 mt-1">Please log in to view your subscriptions</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 mt-1">Loading your subscriptions...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 animate-pulse shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
              <div className="h-4 bg-[#13213a] rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-[#13213a] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-red-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 mt-1">Manage and optimize your subscription spending</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'cancelled')}
            className="rounded-full border border-[#1e2b45] bg-[#0d182d] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#294064] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ff8b3d]"
          >
            <option value="active">Active Only</option>
            <option value="all">All</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
          <button
            onClick={handleDetectSubscriptions}
            disabled={isDetecting}
            className="inline-flex items-center gap-2 rounded-full border border-[#1e2b45] bg-[#0d182d] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#294064] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDetecting ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Detecting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Detect Subscriptions
              </>
            )}
          </button>
          <Link
            href="/dashboard/analytics"
            className="hidden rounded-full border border-[#1e2b45] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#294064] hover:text-white md:inline-flex"
          >
            View analytics
          </Link>
          <PlaidLink 
            onSuccess={async () => {
              // Show success message
              toast.success('Bank account connected! Syncing transactions...');
              
              // Wait a moment for backend to process
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Refresh subscriptions list
              await fetchSubscriptions();
              
              // Trigger refresh on other pages
              window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
              
              // Show completion message
              toast.success('Transactions synced! Check for auto-detected subscriptions.');
            }}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-[#1b2740] bg-[#0d172c] shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]" data-form-section>
        <button
          type="button"
          className={`flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold transition ${
            isFormOpen 
              ? "text-[#ff8b3d] bg-[#1a1f2e] border-b border-[#1b2740]" 
              : "text-white hover:text-[#ff8b3d] hover:bg-[#121f38]"
          }`}
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manually add a subscription
          </span>
          <svg className={`h-4 w-4 transition-transform ${isFormOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isFormOpen && (
          <div className="border-t border-[#1b2740] px-6 pb-6">
            <form className="space-y-5 pt-5" onSubmit={handleCreateSubscription}>
              {formMessage && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    formMessage.type === "success"
                      ? "border-[#1d3b2d] bg-[#12281d] text-[#4ade80]"
                      : "border-[#452125] bg-[#2d1416] text-[#fb7185]"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Subscription name"
                  id="name"
                  placeholder="e.g. Netflix Premium"
                  value={formState.name}
                  onChange={handleInputChange}
                  required
                />
                <Field
                  label="Monthly amount (USD)"
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="9.99"
                  value={formState.amount}
                  onChange={handleInputChange}
                  required
                />
                <Field
                  label="Next renewal date"
                  id="renewalDate"
                  type="date"
                  value={formState.renewalDate}
                  onChange={handleInputChange}
                  required
                />
                <Field
                  label="Merchant (optional)"
                  id="merchant"
                  placeholder="Merchant name"
                  value={formState.merchant}
                  onChange={handleInputChange}
                />
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formState.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-3 py-2 text-sm text-white focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  onClick={() => {
                    setIsFormOpen(false);
                    setFormMessage(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8b3d] to-[#ff6d2f] px-5 py-2 text-xs font-semibold text-[#050d1a] transition hover:from-[#ffa15c] hover:to-[#ff8250] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {formLoading && (
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  )}
                  Save subscription
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {detectionMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            detectionMessage.type === "success"
              ? "border-[#1d3b2d] bg-[#12281d] text-[#4ade80]"
              : "border-[#452125] bg-[#2d1416] text-[#fb7185]"
          }`}
        >
          {detectionMessage.text}
        </div>
      )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Active subscriptions" value={activeSubscriptions.length.toString()} accent="text-[#ff8b3d]" />
            <SummaryCard label="Cancelled this month" value={cancelledThisMonthCount.toString()} accent="text-[#fb7185]" />
            <SummaryCard 
              label="Monthly spend" 
              value={formatCurrency(totalMonthlySpending)} 
              accent="text-[#4ade80]" 
            />
            <SummaryCard 
              label="Yearly spend" 
              value={formatCurrency(totalYearlySpending)} 
              accent="text-[#a78bfa]" 
            />
          </section>

          {/* Renewal Reminder Widget */}
          {upcomingRenewals.length > 0 && (
            <section className="rounded-2xl border border-[#fbbf24]/30 bg-gradient-to-br from-[#2a1f0f] via-[#1f1709] to-[#1a1307] p-6 shadow-[0_20px_45px_-35px_rgba(251,191,36,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-[#fbbf24]/20 p-2">
                    <svg className="h-5 w-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">⏰ Upcoming Renewals</h2>
                    <p className="text-xs text-slate-400">Subscriptions renewing in the next 7 days</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#fbbf24]/20 px-3 py-1 text-xs font-semibold text-[#fbbf24]">
                  {upcomingRenewals.length} {upcomingRenewals.length === 1 ? 'renewal' : 'renewals'}
                </span>
              </div>
              <div className="space-y-2">
                {upcomingRenewals.slice(0, 3).map((sub) => {
                  const renewalDate = new Date(sub.renewalDate);
                  const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border border-[#fbbf24]/20 bg-[#1a1307] p-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{sub.name || sub.merchant}</p>
                        <p className="text-xs text-slate-400">
                          {daysUntil === 0 ? 'Renews today' : daysUntil === 1 ? 'Renews tomorrow' : `Renews in ${daysUntil} days`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#fbbf24]">{formatCurrency(sub.amount)}</p>
                        <p className="text-xs text-slate-500">{sub.interval || 'monthly'}</p>
                      </div>
                    </div>
                  );
                })}
                {upcomingRenewals.length > 3 && (
                  <p className="text-xs text-center text-slate-400 pt-2">
                    +{upcomingRenewals.length - 3} more renewal{upcomingRenewals.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Most Expensive Subscription */}
          {mostExpensiveSubscription && (
            <section className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">🔝 Most Expensive Subscription</h2>
                  <p className="text-sm text-slate-400 mt-1">{mostExpensiveSubscription.name || mostExpensiveSubscription.merchant}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#fb7185]">
                    {formatCurrency(
                      mostExpensiveSubscription.interval === 'yearly' ? mostExpensiveSubscription.amount / 12 :
                      mostExpensiveSubscription.interval === 'quarterly' ? mostExpensiveSubscription.amount / 3 :
                      mostExpensiveSubscription.interval === 'bi-weekly' ? (mostExpensiveSubscription.amount * 26) / 12 :
                      mostExpensiveSubscription.interval === 'weekly' ? (mostExpensiveSubscription.amount * 52) / 12 :
                      mostExpensiveSubscription.amount
                    )}
                  </p>
                  <p className="text-xs text-slate-400">per month</p>
                </div>
              </div>
            </section>
          )}

      {/* Cancelled Subscriptions Section - Only shown when filter is 'cancelled' or 'all' */}
      {(filter === 'cancelled' || filter === 'all') && cancelledSubscriptions.length > 0 && (
        <section className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-300">Cancelled Subscriptions ({cancelledSubscriptions.length})</h2>
            <span className="text-xs text-slate-500">Historical log</span>
          </div>
          <div className="space-y-4 opacity-80">
            {cancelledSubscriptions.map((sub) => (
              <SubscriptionCard key={sub.id} subscription={toCardSubscription(sub)} />
            ))}
          </div>
        </section>
      )}

      {/* Active Subscriptions - Only shown when filter is 'active' or 'all' */}
      {(filter === 'active' || filter === 'all') && activeSubscriptions.length === 0 && cancelledSubscriptions.length === 0 ? (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-10 text-center shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h3 className="text-lg font-semibold text-white">No subscriptions detected yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            Connect a bank account or use the manual form above to start building your dashboard.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            If you've connected a bank account, try syncing transactions.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-[#20314f] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-[#2e4471] hover:text-white"
              onClick={() => setIsFormOpen(true)}
            >
              Add manually
            </button>
          </div>
        </div>
      ) : (filter === 'active' || filter === 'all') && Object.keys(groupedSubscriptions).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedSubscriptions).map(([category, categorySubs]) => {
            const totalCategorySpend = categorySubs.reduce((sum, sub) => sum + sub.amount, 0);
            return (
              <section key={category} className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white capitalize">{category} subscriptions</h2>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{categorySubs.length} active services</p>
                  </div>
                  <span className="rounded-full bg-[#131f37] px-4 py-1 text-xs font-semibold text-[#ff8b3d]">
                    {formatCurrency(totalCategorySpend, categorySubs[0]?.currency || 'USD')}/month
                  </span>
                </div>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {categorySubs.map((sub) => (
                      <div key={sub.id} className="relative">
                      <SubscriptionCard subscription={toCardSubscription(sub)} />
                        {(sub.isAutoDetected || (sub.confidenceScore !== null && sub.confidenceScore !== undefined)) && (
                          <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                            {sub.isAutoDetected && (
                              <span className="rounded-full bg-[#1a1f2e] border border-[#294064] px-2 py-1 text-xs font-semibold text-[#60a5fa]">
                                Auto
                              </span>
                            )}
                            {sub.confidenceScore !== null && sub.confidenceScore !== undefined && (
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${getConfidenceBadgeColor(sub.confidenceScore)}`}
                                title={`Confidence: ${(sub.confidenceScore * 100).toFixed(0)}%`}
                              >
                                {getConfidenceLabel(sub.confidenceScore)} ({Math.round(sub.confidenceScore * 100)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : filter === 'cancelled' && cancelledSubscriptions.length === 0 ? (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-10 text-center shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h3 className="text-lg font-semibold text-white">No cancelled subscriptions</h3>
          <p className="mt-2 text-sm text-slate-400">
            You don't have any cancelled subscriptions yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// Helper function to categorize subscriptions
function categorizeSubscription(merchant: string | null): string {
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
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
  min,
  step,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: string | number;
  step?: string | number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
      />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-5 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
