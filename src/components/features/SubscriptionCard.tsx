'use client';

import { DetectedSubscription, SUBSCRIPTION_CATEGORIES } from '@/lib/subscriptionDetection';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MarkAsCancelledDialog from '@/components/MarkAsCancelledDialog';
import toast from 'react-hot-toast';

interface SubscriptionCardProps {
  subscription: DetectedSubscription & {
    id?: string;
    status?: string;
  };
}

export default function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [localStatus, setLocalStatus] = useState(subscription.status || 'active');
  const router = useRouter();

  // Use a consistent date format to avoid hydration errors
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilRenewal = (dateString: string) => {
    const renewalDate = new Date(dateString);
    const now = new Date();
    const diffTime = renewalDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRenewalStatus = (daysUntil: number) => {
    if (daysUntil <= 7) {
      return { color: 'text-[#fb7185]', bg: 'bg-[#2b191d]', border: 'border-[#fb7185]/30', text: 'Renewing Soon' };
    }
    if (daysUntil <= 14) {
      return { color: 'text-[#fbbf24]', bg: 'bg-[#2d2413]', border: 'border-[#fbbf24]/30', text: 'Upcoming' };
    }
    return { color: 'text-[#34d399]', bg: 'bg-[#12261f]', border: 'border-[#34d399]/30', text: 'Active' };
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#34d399]';
    if (score >= 60) return 'text-[#fbbf24]';
    return 'text-[#fb7185]';
  };

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  const getCategoryInfo = (categoryName: string) => {
    return SUBSCRIPTION_CATEGORIES.find(cat => cat.name === categoryName) || {
      name: 'other',
      color: 'bg-gray-500',
      icon: '📦'
    };
  };

  const daysUntil = getDaysUntilRenewal(subscription.nextRenewal);
  const isCancelled = localStatus === 'cancelled';
  const status = isCancelled
    ? { color: 'text-slate-400', bg: 'bg-[#1b2740]/50', border: 'border-[#1b2740]/50', text: 'Cancelled' }
    : getRenewalStatus(daysUntil);
  const categoryInfo = getCategoryInfo(subscription.category);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const hasSubscriptionId = Boolean(subscription.id);

  const handleNavigateToGuide = () => {
    if (!hasSubscriptionId) return;
    router.push(`/dashboard/ai-insights?subscription=${subscription.id}&action=cancel`);
  };

  const handleConfirmMarkCancelled = async () => {
    if (!subscription.id) return;
    setIsMarking(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subscription');
      }

      setLocalStatus('cancelled');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
      }
      
      // Extract subscription name from merchant or subscription name
      const subscriptionName = subscription.merchant || subscription.name || 'this service';
      toast.success(`Marked as cancelled. Don't forget to cancel with ${subscriptionName}!`);
    } catch (error) {
      console.error('Error marking subscription as cancelled:', error);
      toast.error('Unable to update subscription right now. Please try again.');
    } finally {
      setIsMarking(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
      subscription.isDuplicate
        ? 'border-[#fb7185]/40 bg-[#2a161a]'
          : isCancelled
          ? 'border-[#1b2740]/40 bg-[#0c1426] opacity-75'
        : 'border-[#1b2740] bg-[#101b30] hover:border-[#26375a]'
      }`}
    >
      {/* Header */}
      <div className="border-b border-[#1b2740] p-6">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{subscription.merchant}</h3>
              {isCancelled && (
                <span className="rounded-full border border-[#475569] px-2 py-1 text-xs font-medium text-slate-300">
                  Cancelled
                </span>
              )}
              {subscription.isDuplicate && (
                <span className="rounded-full bg-[#34161b] px-2 py-1 text-xs font-medium text-[#fb7185]">
                  Duplicate
                </span>
              )}
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${status.bg} ${status.color} ${status.border}`}>
                {status.text}
              </span>
              <span className="text-sm text-slate-400">
                {daysUntil > 0 ? `${daysUntil} days until renewal` : 'Renews today'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="rounded-full bg-[#17253d] px-2 py-1 text-xs font-medium text-white">
                {categoryInfo.icon} {categoryInfo.name}
              </span>
              <span className={`text-sm font-medium ${getHealthScoreColor(subscription.healthScore)}`}>
                {getHealthScoreIcon(subscription.healthScore)} Health: {subscription.healthScore}
              </span>
            </div>
          </div>
          <div className="text-right text-slate-300">
            <p className="text-2xl font-bold text-white">{formatCurrency(subscription.amount)}</p>
            <p className="text-sm capitalize text-slate-400">{subscription.interval}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Last Payment</p>
            <p className="mt-1 font-medium text-white">{formatDate(subscription.lastPayment)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Next Renewal</p>
            <p className="mt-1 font-medium text-white">{formatDate(subscription.nextRenewal)}</p>
          </div>
        </div>

        {/* Savings Opportunity Alert */}
        {subscription.savingsOpportunity && (
          <div className="mt-4 rounded-lg border border-[#1e3a2b] bg-[#13251b] p-3 text-sm text-[#4ade80]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#22c55e]">
              <span>💰 Savings opportunity</span>
            </div>
            <p className="mt-2 text-slate-200">
                {subscription.savingsOpportunity.description}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 rounded-lg border border-[#20314f] bg-[#131f34] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#2e4471]"
          >
            {isExpanded ? 'Show Less' : 'Show Details'}
          </button>
          <button
            onClick={() => hasSubscriptionId && setIsDialogOpen(true)}
            disabled={!hasSubscriptionId || isCancelled}
            className="flex-1 rounded-lg border border-[#334155] bg-[#151d2c] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#475569] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark as Cancelled
          </button>
          <button
            onClick={handleNavigateToGuide}
            disabled={!hasSubscriptionId}
            className="flex-1 rounded-lg border border-[#ff8b3d] bg-[#ff8b3d] px-4 py-2 text-sm font-semibold text-[#050d1a] transition hover:bg-[#ffa15c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Get Cancellation Help →
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-[#1b2740] pt-4 text-sm text-slate-300">
            {subscription.id && (
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">Subscription ID</span>
                <span className="font-mono text-white text-xs">{subscription.id.slice(0, 8)}...</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">Billing Cycle</span>
              <span className="text-white capitalize">{subscription.interval}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">Usage Frequency</span>
              <span
                className={`text-sm font-semibold ${
                  subscription.usageFrequency === 'high'
                    ? 'text-[#34d399]'
                    : subscription.usageFrequency === 'medium'
                    ? 'text-[#fbbf24]'
                    : 'text-[#fb7185]'
                }`}
              >
                {subscription.usageFrequency.charAt(0).toUpperCase() + subscription.usageFrequency.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">Total Paid (last 3 months)</span>
              <span className="font-semibold text-white">
                {formatCurrency(subscription.amount * 3)} (3 payments)
              </span>
            </div>
            
            {/* Price History */}
            {subscription.priceHistory.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-white">Price History</p>
                <div className="space-y-1 text-xs text-slate-300">
                  {subscription.priceHistory.slice(-3).map((price, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-slate-500">{formatDate(price.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{formatCurrency(price.amount)}</span>
                        {price.change && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              price.change > 0
                                ? 'bg-[#35171b] text-[#fb7185]'
                                : 'bg-[#13261d] text-[#34d399]'
                            }`}
                          >
                            {price.change > 0 ? '+' : ''}{formatCurrency(price.change)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate Warning */}
            {subscription.isDuplicate && (
              <div className="mt-4 rounded-lg border border-[#fb7185]/30 bg-[#2a161a] p-3 text-sm text-[#fb7185]">
                <div className="flex items-center gap-2 font-semibold">
                  <span>⚠️ Duplicate detected</span>
                </div>
                <p className="mt-2 text-slate-200">
                    Potential duplicate of <strong>{subscription.duplicateOf}</strong>. Consider canceling one.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
      <MarkAsCancelledDialog
        isOpen={isDialogOpen}
        serviceName={subscription.merchant}
        onCancel={() => !isMarking && setIsDialogOpen(false)}
        onConfirm={handleConfirmMarkCancelled}
        isSubmitting={isMarking}
      />
    </div>
  );
} 