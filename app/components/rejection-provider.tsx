'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { RejectionStatus, RejectionStatusMap } from '@/lib/rejections';
import { Toast, useToast } from './toast';

interface Ctx {
  profileId: number | null;
  rejectedOn: (jobId: number) => RejectionStatus | undefined;
  isBusy: (jobId: number) => boolean;
  /** Record or amend a rejection. The reason is required by the server. */
  reject: (jobId: number, note: string) => Promise<boolean>;
  /** Back to active. */
  clear: (jobId: number) => void;
}

const RejectionCtx = createContext<Ctx | null>(null);

export function useRejection(): Ctx {
  const ctx = useContext(RejectionCtx);
  if (!ctx) throw new Error('useRejection must be used inside <RejectionProvider>');
  return ctx;
}

/**
 * Sibling of `DiscardProvider`, same shape and same reasons.
 *
 * Separate rather than folded in, because the two states answer different
 * questions and a job can be in both: discarded is "I passed", rejected is
 * "they passed". One provider holding both would need every call site to say
 * which it meant anyway.
 */
export function RejectionProvider({
  profileId,
  initial,
  children,
}: {
  profileId: number | null;
  initial: RejectionStatusMap;
  children: ReactNode;
}) {
  const router = useRouter();
  const [rejected, setRejected] = useState<RejectionStatusMap>(initial);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const { toast, show, dismiss } = useToast();

  // Re-seed when the server sends a new page, the same way the discard provider
  // does: filters and paging replace this map wholesale.
  const [seededFrom, setSeededFrom] = useState<RejectionStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setRejected(initial);
  }

  const rejectedOn = useCallback((jobId: number) => rejected[jobId], [rejected]);
  const isBusy = useCallback((jobId: number) => busy.has(jobId), [busy]);

  const setBusyFor = useCallback((jobId: number, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const reject = useCallback(
    async (jobId: number, note: string): Promise<boolean> => {
      if (!profileId || busy.has(jobId)) return false;
      setBusyFor(jobId, true);
      try {
        const res = await fetch('/api/rejections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, profileId, note }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          show(d?.error ?? `Could not save (${res.status})`, 'error');
          return false;
        }
        // The server's own record: `rejectedAt` and who marked it are decided
        // there, and a locally invented timestamp would disagree with the one
        // the next page load shows.
        const row = (await res.json()) as RejectionStatus | null;
        setRejected((prev) => ({ ...prev, ...(row ? { [jobId]: row } : {}) }));
        show('Marked as rejected');
        router.refresh();
        return true;
      } catch {
        show('Could not reach the server.', 'error');
        return false;
      } finally {
        setBusyFor(jobId, false);
      }
    },
    [busy, profileId, router, setBusyFor, show],
  );

  const clear = useCallback(
    async (jobId: number) => {
      if (!profileId || busy.has(jobId)) return;
      setBusyFor(jobId, true);
      try {
        const res = await fetch(`/api/rejections?jobId=${jobId}&profileId=${profileId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          show(d?.error ?? `Could not update (${res.status})`, 'error');
          return;
        }
        setRejected((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
        show('Back to active');
        router.refresh();
      } catch {
        show('Could not reach the server.', 'error');
      } finally {
        setBusyFor(jobId, false);
      }
    },
    [busy, profileId, router, setBusyFor, show],
  );

  return (
    <RejectionCtx.Provider value={{ profileId, rejectedOn, isBusy, reject, clear }}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </RejectionCtx.Provider>
  );
}
