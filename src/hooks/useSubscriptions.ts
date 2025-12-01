import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewalDate: string;
  merchant: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useSubscriptions() {
  const { user } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/subscriptions');
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const updateSubscription = useCallback(async (id: string, updates: Partial<Subscription>) => {
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
      await fetchSubscriptions();
      return true;
    } catch (err) {
      console.error('Error updating subscription:', err);
      return false;
    }
  }, [fetchSubscriptions]);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete subscription');
      }
      await fetchSubscriptions();
      return true;
    } catch (err) {
      console.error('Error deleting subscription:', err);
      return false;
    }
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    refetch: fetchSubscriptions,
    updateSubscription,
    deleteSubscription,
  };
}


