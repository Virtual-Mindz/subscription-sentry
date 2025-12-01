'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

const AIChatAssistant = dynamic(() => import('@/components/features/AIChatAssistant'), { ssr: false });

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  subscriptionId?: string;
  impact: {
    type: string;
    value: number;
    period: string;
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionText?: string;
  reasoning: string[];
  alternatives?: Array<{
    name: string;
    price: number;
    features: string[];
    pros: string[];
    cons: string[];
    savings: number;
  }>;
  cancellationSteps?: string[];
  supportTemplate?: string;
}

interface UnusedSubscription {
  subscriptionId: string;
  name: string;
  amount: number;
  daysSinceLastTransaction: number;
  reasoning: string;
}

interface DuplicateService {
  serviceName: string;
  subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  totalWaste: number;
  recommendation: string;
}

interface AnnualSavings {
  subscriptionId: string;
  name: string;
  monthlyAmount: number;
  annualAmount: number;
  savings: number;
  savingsPercentage: number;
}

interface CancellationMetadata {
  directCancelUrl?: string;
  phone?: string;
  email?: string;
  estimatedMinutes?: number;
  tips?: string[];
}

const CANCELLATION_DIRECTORY: Record<string, CancellationMetadata> = {
  netflix: {
    directCancelUrl: 'https://www.netflix.com/cancelplan',
    phone: '1-866-579-7172',
    email: 'support@netflix.com',
    estimatedMinutes: 5,
    tips: [
      'You can continue watching until the end of your billing cycle even after cancelling.',
      'Take a screenshot of the cancellation confirmation page for your records.',
    ],
  },
  spotify: {
    directCancelUrl: 'https://www.spotify.com/account/subscription',
    phone: '1-800-952-5210',
    email: 'support@spotify.com',
    estimatedMinutes: 4,
    tips: [
      'If you subscribed via Apple or Google, you must cancel through that store.',
      'Downgrading to the free tier keeps playlists intact without billing.',
    ],
  },
  amazonprime: {
    directCancelUrl: 'https://www.amazon.com/gp/primecentral',
    phone: '1-888-280-4331',
    email: 'cs-reply@amazon.com',
    estimatedMinutes: 7,
    tips: [
      'Choose “End membership” and confirm on the final review screen.',
      'Amazon sometimes offers prorated refunds when benefits were not used recently.',
    ],
  },
  hulu: {
    directCancelUrl: 'https://secure.hulu.com/account',
    phone: '1-888-265-6650',
    email: 'support@hulu.com',
    estimatedMinutes: 6,
    tips: [
      'Hulu may offer a pause option—make sure to select “Cancel” to stop billing.',
      'If you’re billed through a bundle (Disney+/Hulu/ESPN+), cancel at the bundle provider.',
    ],
  },
  adobecreativecloud: {
    directCancelUrl: 'https://account.adobe.com/plans',
    phone: '1-800-833-6687',
    email: 'care@adobe.com',
    estimatedMinutes: 10,
    tips: [
      'Annual plans often have early termination fees—chat with support to ask for a waiver.',
      'Downgrading to the Photography plan can sometimes reduce costs without full cancellation.',
    ],
  },
};

const normalizeMerchantKey = (value?: string | null) => {
  if (!value) return '';
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getCancellationMetadata = (serviceName?: string | null) => {
  const key = normalizeMerchantKey(serviceName);
  return CANCELLATION_DIRECTORY[key] || null;
};

const DEFAULT_TIPS = [
  'Ask for written confirmation once the cancellation is processed.',
  'Check your statements next month to verify the charge stopped.',
  'If you were charged within the last few days, politely request a courtesy refund.',
];

const buildEmailTemplate = (serviceName: string) => {
  return `Hello ${serviceName} Support,

I am writing to request the cancellation of my ${serviceName} subscription effective immediately.

Account email: [your email]
Billing ID / Reference: [if available]

Please confirm in writing once the cancellation has been completed. If there are any remaining steps I need to take, let me know.

Thank you,
[Your Name]`;
};

export default function AIInsightsPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [spendingPrediction, setSpendingPrediction] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [unusedSubscriptions, setUnusedSubscriptions] = useState<UnusedSubscription[]>([]);
  const [duplicateServices, setDuplicateServices] = useState<DuplicateService[]>([]);
  const [annualSavings, setAnnualSavings] = useState<AnnualSavings[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [showCancellationGuide, setShowCancellationGuide] = useState(false);
  const [cancellationSteps, setCancellationSteps] = useState<string[]>([]);
  const [showSupportTemplate, setShowSupportTemplate] = useState(false);
  const [supportTemplate, setSupportTemplate] = useState('');
  const [guideSubscription, setGuideSubscription] = useState<{ id: string; name: string; merchant?: string | null } | null>(null);
  const [guideMetadata, setGuideMetadata] = useState<CancellationMetadata | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [autoGuideId, setAutoGuideId] = useState<string | null>(null);
  const [guideMarking, setGuideMarking] = useState(false);
  const publicMetadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const privateMetadata = (user?.privateMetadata ?? {}) as Record<string, unknown>;
  const derivedPlan =
    (typeof publicMetadata.plan === 'string' && publicMetadata.plan) ||
    (typeof publicMetadata.tier === 'string' && publicMetadata.tier) ||
    (typeof privateMetadata.plan === 'string' && privateMetadata.plan) ||
    '';
  const isProUser = derivedPlan.toLowerCase().includes('pro');

  const fetchAIInsights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setSpendingPrediction(data.spendingPrediction || null);
      setInsights(data.insights || []);
      setUnusedSubscriptions(data.unusedSubscriptions || []);
      setDuplicateServices(data.duplicateServices || []);
      setAnnualSavings(data.annualVsMonthlySavings || []);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchAIInsights();
    }
  }, [user?.id, fetchAIInsights]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const markSubscriptionAsCancelled = useCallback(
    async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (response.ok) {
        await fetchAIInsights();
        window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
          return { success: true };
        }
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to cancel subscription' };
    } catch (error) {
      console.error('Error marking for cancellation:', error);
        return { success: false, message: 'Failed to cancel subscription. Please try again.' };
      }
    },
    [fetchAIInsights]
  );

  const handleMarkForCancellation = async (subscriptionId: string) => {
    // Fetch subscription details to get the name
    const subscriptionDetails = await fetchSubscriptionDetails(subscriptionId);
    const subscriptionName = subscriptionDetails?.merchant || subscriptionDetails?.name || 'this service';
    
    const result = await markSubscriptionAsCancelled(subscriptionId);
    if (result.success) {
      toast.success(`Marked as cancelled. Don't forget to cancel with ${subscriptionName}!`);
    } else if (result.message) {
      toast.error(result.message);
    }
  };

  const fetchSubscriptionDetails = useCallback(async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      return null;
    }
  }, []);

  const handleGetCancellationGuide = useCallback(
    async (subscriptionId: string, options: { autoFocus?: boolean } = {}) => {
    try {
        setGuideError(null);
        setGuideLoading(true);
      const response = await fetch('/api/ai-insights/cancellation-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate cancellation guide');
        }
        const subscriptionDetails = await fetchSubscriptionDetails(subscriptionId);
        if (subscriptionDetails) {
          const displayName = subscriptionDetails.merchant || subscriptionDetails.name;
          setGuideSubscription({
            id: subscriptionDetails.id,
            name: displayName,
            merchant: subscriptionDetails.merchant,
          });
          setGuideMetadata(getCancellationMetadata(displayName));
        } else {
          setGuideSubscription({ id: subscriptionId, name: 'this service' });
          setGuideMetadata(null);
        }
      setCancellationSteps(data.steps || []);
      setShowCancellationGuide(true);
        if (options.autoFocus) {
          setTimeout(() => {
            document?.getElementById('cancellation-guide-panel')?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 150);
        }
    } catch (error) {
      console.error('Error getting cancellation guide:', error);
        setGuideError('Unable to load cancellation guidance right now. Please try again.');
        setShowCancellationGuide(true);
      } finally {
        setGuideLoading(false);
      }
    },
    [fetchSubscriptionDetails]
  );

  const subscriptionParam = searchParams?.get('subscription');
  const actionParam = searchParams?.get('action');

  useEffect(() => {
    if (!user?.id || !subscriptionParam || actionParam !== 'cancel') {
      return;
    }
    if (autoGuideId === subscriptionParam) {
      return;
    }
    handleGetCancellationGuide(subscriptionParam, { autoFocus: true });
    setAutoGuideId(subscriptionParam);
  }, [user?.id, subscriptionParam, actionParam, autoGuideId, handleGetCancellationGuide]);

  const handleGetSupportTemplate = async (subscriptionId: string, reason: string) => {
    try {
      const response = await fetch('/api/ai-insights/support-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, reason }),
      });
      const data = await response.json();
      setSupportTemplate(data.template || '');
      setShowSupportTemplate(true);
    } catch (error) {
      console.error('Error getting support template:', error);
    }
  };

  const emailTemplate = useMemo(() => {
    return buildEmailTemplate(guideSubscription?.name || 'this service');
  }, [guideSubscription?.name]);

  const displayedTips = guideMetadata?.tips || DEFAULT_TIPS;

  const handleGuideMarkAsCancelled = async () => {
    if (!guideSubscription?.id) return;
    setGuideMarking(true);
    const result = await markSubscriptionAsCancelled(guideSubscription.id);
    setGuideMarking(false);
    if (result.success) {
      const subscriptionName = guideSubscription.name || guideSubscription.merchant || 'this service';
      toast.success(`Marked as cancelled. Don't forget to cancel with ${subscriptionName}!`);
      setShowCancellationGuide(false);
      router.push('/dashboard/subscriptions?filter=cancelled');
    } else if (result.message) {
      toast.error(result.message);
    }
  };

  const handleSetReminder = (subscriptionId: string, date: Date) => {
    // This would integrate with a reminder/notification system
    toast.success(`Reminder set for subscription renewal on ${date.toLocaleDateString()}`);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'cost-cutting': return '💰';
      case 'plan-alternative': return '🔄';
      case 'bundle': return '📦';
      case 'trial-warning': return '⏰';
      case 'price-alert': return '⚠️';
      default: return '💡';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-[#5c1d27]/40 bg-[#2a161c] text-[#fb7185]';
      case 'medium':
        return 'border-[#4d3319]/40 bg-[#24170f] text-[#fbbf24]';
      case 'low':
        return 'border-[#1e3756]/40 bg-[#142136] text-[#60a5fa]';
      default:
        return 'border-[#243352]/40 bg-[#101a2f] text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Insights & Recommendations</h1>
          <p className="mt-1 text-sm text-slate-400">Smart analysis powered by Google Gemini AI</p>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-400">Analyzing your subscriptions with AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Insights & Recommendations</h1>
        <p className="mt-1 text-sm text-slate-400">Smart analysis powered by Google Gemini AI to optimize your subscription spending</p>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="rounded-2xl border border-[#1b2740] bg-gradient-to-br from-[#101d36] via-[#101a2f] to-[#0c1427] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.95)]">
          <h2 className="mb-4 text-lg font-semibold text-white">💡 Key Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-slate-300">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#ff8b3d]"></div>
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Pattern Analysis */}
      {spendingPrediction && (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h2 className="mb-4 text-lg font-semibold text-white">📊 Spending Pattern Analysis</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[#1d2b46] bg-[#121f35] p-4 text-center shadow-inner">
              <p className="text-xs uppercase tracking-wide text-slate-400">Current Monthly</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(spendingPrediction.currentMonthly)}</p>
            </div>
            <div className="rounded-xl border border-[#1d2b46] bg-[#121f35] p-4 text-center shadow-inner">
              <p className="text-xs uppercase tracking-wide text-slate-400">Predicted Monthly</p>
              <p className={`text-2xl font-bold ${
                spendingPrediction.trend === 'increasing' ? 'text-[#fb7185]' :
                spendingPrediction.trend === 'decreasing' ? 'text-[#34d399]' : 'text-white'
              }`}>
                {formatCurrency(spendingPrediction.predictedMonthly)}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {spendingPrediction.trend === 'increasing' ? '↗️ Increasing' :
                 spendingPrediction.trend === 'decreasing' ? '↘️ Decreasing' : '→ Stable'}
              </p>
            </div>
            <div className="rounded-xl border border-[#1d2b46] bg-[#121f35] p-4 text-center shadow-inner">
              <p className="text-xs uppercase tracking-wide text-slate-400">Predicted Yearly</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(spendingPrediction.predictedYearly)}</p>
              <p className="text-xs text-slate-400">{spendingPrediction.confidence}% confidence</p>
            </div>
          </div>
        </div>
      )}

      {/* Unused Subscriptions */}
      {unusedSubscriptions.length > 0 && (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h2 className="mb-4 text-lg font-semibold text-white">🔍 Unused Subscription Detection</h2>
          <p className="text-sm text-slate-400 mb-4">Subscriptions with no transactions in the last 60 days</p>
          <div className="space-y-3">
            {unusedSubscriptions.map((sub) => (
              <div key={sub.subscriptionId} className="rounded-xl border border-[#1b2740] bg-[#121f35] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{sub.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{sub.reasoning}</p>
                    <p className="text-xs text-slate-500 mt-2">No activity for {sub.daysSinceLastTransaction} days</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold text-white">{formatCurrency(sub.amount)}/mo</p>
                    <p className="text-sm text-[#34d399]">Save {formatCurrency(sub.amount * 12)}/yr</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleGetCancellationGuide(sub.subscriptionId)}
                    className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors text-sm"
                  >
                    Get Cancellation Guide
                  </button>
                  <button
                    onClick={() => handleMarkForCancellation(sub.subscriptionId)}
                    className="px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-sm"
                  >
                    Mark for Cancellation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Services */}
      {duplicateServices.length > 0 && (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h2 className="mb-4 text-lg font-semibold text-white">🔄 Duplicate Service Detection</h2>
          <div className="space-y-4">
            {duplicateServices.map((duplicate, index) => (
              <div key={index} className="rounded-xl border border-[#1b2740] bg-[#121f35] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{duplicate.serviceName}</h3>
                    <p className="text-sm text-slate-400 mt-1">{duplicate.recommendation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#fb7185]">Wasting {formatCurrency(duplicate.totalWaste)}/mo</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {duplicate.subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between text-sm bg-[#0d182d] p-2 rounded">
                      <span className="text-slate-300">{sub.name}</span>
                      <span className="text-white font-medium">{formatCurrency(sub.amount)}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual vs Monthly Savings */}
      {annualSavings.length > 0 && (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <h2 className="mb-4 text-lg font-semibold text-white">💵 Annual vs Monthly Savings Calculator</h2>
          <div className="space-y-3">
            {annualSavings.map((saving) => (
              <div key={saving.subscriptionId} className="rounded-xl border border-[#1b2740] bg-[#121f35] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{saving.name}</h3>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-slate-400">Monthly: </span>
                        <span className="text-white">{formatCurrency(saving.monthlyAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Annual: </span>
                        <span className="text-white">{formatCurrency(saving.annualAmount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold text-[#34d399]">Save {formatCurrency(saving.savings)}/yr</p>
                    <p className="text-sm text-slate-400">{saving.savingsPercentage}% discount</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/subscriptions/${saving.subscriptionId}`)}
                  className="mt-3 px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors text-sm"
                >
                  Switch to Annual Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">🤖 Smart Recommendations</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">{recommendations.length} recommendations</span>
          </div>
          
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="rounded-xl border border-[#1b2740] bg-[#121f35] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getRecommendationIcon(recommendation.type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{recommendation.title}</h3>
                    <p className="text-slate-300 mt-1 text-sm">{recommendation.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
                        {recommendation.priority} priority
                      </span>
                      <span className="text-sm font-medium text-[#34d399]">
                        {formatCurrency(recommendation.impact.value)} {recommendation.impact.period}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {recommendation.subscriptionId && (
                        <>
                          <button
                            onClick={() => handleGetCancellationGuide(recommendation.subscriptionId!)}
                            className="px-3 py-1.5 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors text-xs"
                          >
                            Get Cancellation Guide
                          </button>
                          <button
                            onClick={() => handleMarkForCancellation(recommendation.subscriptionId!)}
                            className="px-3 py-1.5 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-xs"
                          >
                            Mark for Cancellation
                          </button>
                          <button
                            onClick={() => handleGetSupportTemplate(recommendation.subscriptionId!, 'Request to cancel subscription')}
                            className="px-3 py-1.5 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c3aed] transition-colors text-xs"
                          >
                            Contact Support
                          </button>
                        </>
                      )}
                      {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                        <button
                          onClick={() => setSelectedRecommendation(recommendation)}
                          className="px-3 py-1.5 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors text-xs"
                        >
                          Compare Plans
                        </button>
                      )}
                    </div>

                    {/* Reasoning */}
                    {recommendation.reasoning && recommendation.reasoning.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1b2740]">
                        <p className="text-xs text-slate-400 mb-2">Why this recommendation:</p>
                        <ul className="space-y-1">
                          {recommendation.reasoning.map((reason, index) => (
                            <li key={index} className="text-xs text-slate-300 flex items-center gap-2">
                              <span className="w-1 h-1 bg-[#ff8b3d] rounded-full"></span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives Modal */}
      {selectedRecommendation && selectedRecommendation.alternatives && selectedRecommendation.alternatives.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d182d] border border-[#1b2740] rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Compare Plans: {selectedRecommendation.title}
              </h3>
              <button
                onClick={() => setSelectedRecommendation(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {(selectedRecommendation.alternatives || []).map((alternative, index) => (
                <div key={index} className="border border-[#1b2740] rounded-xl p-4 bg-[#121f35]">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-white">{alternative.name}</h4>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(alternative.price)}/month</p>
                      {alternative.savings > 0 && (
                        <p className="text-sm text-[#34d399] font-medium">
                          Save {formatCurrency(alternative.savings)}/month
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-white mb-2 text-sm">Features:</h5>
                      <ul className="space-y-1">
                        {(alternative.features || []).map((feature, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                            <span className="w-1 h-1 bg-[#34d399] rounded-full"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-white mb-2 text-sm">Pros:</h5>
                      <ul className="space-y-1">
                        {(alternative.pros || []).map((pro, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                            <span className="w-1 h-1 bg-[#3b82f6] rounded-full"></span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Guide Modal */}
      {showCancellationGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            id="cancellation-guide-panel"
            className="bg-[#0d182d] border border-[#1b2740] rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Cancellation guide</p>
                <h3 className="text-lg font-semibold text-white">
                  How to cancel {guideSubscription?.name || 'this service'}
                </h3>
                <p className="text-xs text-[#f97316] mt-1">
                  We help you through the steps—our platform never cancels services on your behalf.
                </p>
              </div>
              <button
                onClick={() => setShowCancellationGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {guideLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Generating a personalized cancellation guide...
              </div>
            ) : (
              <>
                {guideError && (
                  <div className="mb-4 rounded-lg border border-[#5c1d27] bg-[#2a161c] p-4 text-sm text-[#fb7185]">
                    {guideError}
                  </div>
                )}

                <div className="rounded-lg border border-[#2a3b5f] bg-[#101a2f] p-4 text-sm text-slate-300">
                  ⚠️ This only updates your tracking inside SubscriptionSentry. To stop being charged, finish the
                  cancellation with {guideSubscription?.name || 'the merchant'}.
                </div>

                {guideMetadata && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
                    {guideMetadata.directCancelUrl && (
                      <a
                        href={guideMetadata.directCancelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-3 hover:border-[#ff8b3d] transition"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-500">Direct link</p>
                        <p className="mt-1 text-white font-semibold">Open cancellation page →</p>
                      </a>
                    )}
                    {guideMetadata.phone && (
                      <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Phone support</p>
                        <p className="mt-1 text-white font-semibold">{guideMetadata.phone}</p>
                      </div>
                    )}
                    {guideMetadata.estimatedMinutes && (
                      <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Estimated time</p>
                        <p className="mt-1 text-white font-semibold">{guideMetadata.estimatedMinutes} minutes</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-base font-semibold text-white">
                      Step-by-step instructions {isProUser ? '(AI-enhanced)' : '(Basic)'}
                    </h4>
                    {!isProUser && (
                      <button
                        onClick={() => router.push('/dashboard/settings?tab=billing')}
                        className="rounded-full border border-[#ff8b3d] px-4 py-1 text-xs font-semibold text-[#ff8b3d] hover:bg-[#ff8b3d]/10"
                      >
                        Upgrade to Pro for full concierge help
                      </button>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    {cancellationSteps.length === 0 ? (
                      <p className="text-sm text-slate-400">No steps available yet.</p>
                    ) : (
                      cancellationSteps.map((step, index) => (
                <div key={index} className="flex gap-3 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <p className="pt-0.5">{step}</p>
                </div>
                      ))
                    )}
                  </div>
                </div>

                {isProUser ? (
                  <div className="mt-6 space-y-4">
                    {guideMetadata?.phone && (
                      <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-4">
                        <h5 className="text-sm font-semibold text-white mb-2">Phone script</h5>
                        <p className="text-sm text-slate-300">
                          Call <span className="font-semibold text-white">{guideMetadata.phone}</span> and say:
                          &quot;I need to cancel my {guideSubscription?.name || 'subscription'} effective today. Please
                          confirm there will be no future charges.&quot;
                        </p>
                      </div>
                    )}
                    {guideMetadata?.email && (
                      <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-4 text-sm text-slate-300">
                        <h5 className="text-sm font-semibold text-white mb-2">Direct support email</h5>
                        <p className="font-semibold text-white">{guideMetadata.email}</p>
                        <p className="mt-2">
                          Send a short message with your account email, the last four digits of the card on file, and a
                          request for written confirmation.
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-4">
                      <h5 className="text-sm font-semibold text-white mb-3">Email template</h5>
                      <textarea
                        value={emailTemplate}
                        readOnly
                        className="w-full h-40 rounded-lg border border-[#1b2740] bg-[#0b1527] p-3 text-sm text-slate-200"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(emailTemplate)}
                        className="mt-3 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb]"
                      >
                        Copy email template
                      </button>
                    </div>
                    <div className="rounded-lg border border-[#1b2740] bg-[#101a2f] p-4">
                      <h5 className="text-sm font-semibold text-white mb-2">Negotiation tips</h5>
                      <ul className="space-y-1 text-sm text-slate-300">
                        {displayedTips.map((tip, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ff8b3d]"></span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-lg border border-[#2a3b5f] bg-[#101a2f] p-4 text-sm text-slate-300">
                    <p>
                      You&rsquo;re viewing the basic guide. Pro subscribers unlock direct contact info, ready-to-send
                      scripts, negotiation tips, and priority email support.
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/settings?tab=billing')}
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-[#ff8b3d] px-4 py-2 text-xs font-semibold text-[#050d1a] hover:bg-[#ffa15c]"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                )}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCancellationGuide(false)}
                    className="rounded-lg border border-transparent bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleGuideMarkAsCancelled}
                    disabled={guideMarking || !guideSubscription?.id}
                    className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-[#050d1a] transition hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guideMarking ? 'Updating...' : 'Mark as Cancelled in Dashboard'}
                  </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Support Template Modal */}
      {showSupportTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d182d] border border-[#1b2740] rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Support Email Template</h3>
              <button
                onClick={() => setShowSupportTemplate(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={supportTemplate}
              readOnly
              className="w-full h-64 p-4 bg-[#121f35] border border-[#1b2740] rounded-lg text-slate-200 text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(supportTemplate);
                  toast.success('Template copied to clipboard!');
                }}
                className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  window.location.href = `mailto:?body=${encodeURIComponent(supportTemplate)}`;
                }}
                className="px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors"
              >
                Open in Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Assistant */}
      <AIChatAssistant />
    </div>
  );
}
