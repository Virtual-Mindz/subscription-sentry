declare module 'react-plaid-link' {
  import * as React from 'react';

  export interface PlaidLinkOptions {
    token: string | null;
    onSuccess: (public_token: string, metadata: any) => void;
    onExit?: (err: any, metadata: any) => void;
    // Add other options as needed
  }

  export function usePlaidLink(options: PlaidLinkOptions): {
    open: () => void;
    ready: boolean;
    error: any;
  };
} 