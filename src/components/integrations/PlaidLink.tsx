'use client';

import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface PlaidLinkProps {
  onSuccess?: () => void;
  country?: 'US' | 'UK'; // Optional country override
}

export default function PlaidLink({ onSuccess, country }: PlaidLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata: any) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          publicToken: public_token,
        }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to connect bank account');
        }

        const result = await response.json();
        console.log('Plaid connection result:', result);
        
        // Call success callback
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
        setLinkToken(null); // Clear token after use
      }
    },
    onExit: (err: any, metadata: any) => {
      if (err) {
        setError('Connection was cancelled');
      }
      setLinkToken(null);
    },
  });

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(country && { country }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to create link token';
        console.error('Plaid link token error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.link_token) {
        throw new Error('No link token received from server');
      }
      
      setLinkToken(data.link_token);
      setIsLoading(false); // Reset loading state after getting token
    } catch (err) {
      console.error('Plaid connection error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  // Open when link token is ready and hook is ready
  useEffect(() => {
    if (linkToken && ready && !isLoading) {
      console.log('Opening Plaid Link modal...');
      // Small delay to ensure Plaid script is fully loaded
      const timer = setTimeout(() => {
        open();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [linkToken, ready, isLoading, open]);

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#ff8b3d] px-4 py-2 text-sm font-semibold text-[#041024] hover:bg-[#ffa056] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        {isLoading ? 'Connecting...' : 'Connect Bank Account'}
      </button>
      
      {error && (
        <div className="mt-2 rounded-lg border border-[#452125] bg-[#2d1416] px-3 py-2 text-sm text-[#fb7185]">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 