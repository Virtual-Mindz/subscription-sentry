'use client';

import { useEffect } from 'react';

interface MarkAsCancelledDialogProps {
  isOpen: boolean;
  serviceName?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export default function MarkAsCancelledDialog({
  isOpen,
  serviceName,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: MarkAsCancelledDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-[#1b2740] bg-[#0d182d] p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f97316]">
          <span aria-hidden="true">⚠️</span>
          <span>Heads up</span>
        </div>
        <h3 className="mt-3 text-xl font-semibold text-white">Mark as Cancelled?</h3>
        <p className="mt-3 text-sm text-slate-300">
          ⚠️ Important: This only updates your tracking in SubscriptionSentry. To actually stop being charged,
          you need to cancel directly with {serviceName || 'this service'}.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Need help canceling? Use the &quot;Get Cancellation Help&quot; button for guided steps.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-transparent bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white sm:w-auto"
            disabled={isSubmitting}
          >
            Keep Tracking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-[#050d1a] transition hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? 'Marking...' : 'Yes, Mark as Cancelled'}
          </button>
        </div>
      </div>
    </div>
  );
}

