'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ToastState {
  message: string;
  tone: 'success' | 'error';
  /** Distinguishes consecutive identical messages so the timer restarts. */
  id: number;
}

/**
 * Minimal toast. Deliberately not a provider/portal: one component owns one
 * toast, which is all any screen here needs, and it avoids threading context
 * through the tree for a two-second confirmation.
 */
export function useToast(ms = 2600) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(t);
  }, [toast, ms]);

  return { toast, show, dismiss: useCallback(() => setToast(null), []) };
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) return null;
  const ok = toast.tone === 'success';
  return (
    <div
      // `status` rather than `alert`: a save confirmation should be announced
      // politely, not interrupt whatever a screen reader is already saying.
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-xl backdrop-blur ${
          ok
            ? 'border-green-500/40 bg-green-500/15 text-green-200'
            : 'border-red-500/40 bg-red-500/15 text-red-200'
        }`}
      >
        <span aria-hidden>{ok ? '✓' : '!'}</span>
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 opacity-60 transition hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
