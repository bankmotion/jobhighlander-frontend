'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type {
  DiscardCompanyHistory,
  DiscardCompanyHistoryMap,
  DiscardStatus,
  DiscardStatusMap,
} from '@/lib/discards';
import { Toast, useToast } from './toast';

interface Ctx {
  profileId: number | null;
  viewerEmail: string | null;
  discardedOn: (jobId: number) => DiscardStatus | undefined;
  companyHistoryOn: (jobId: number) => DiscardCompanyHistory | undefined;
  isBusy: (jobId: number) => boolean;
  toggle: (jobId: number) => void;
}

const DiscardCtx = createContext<Ctx | null>(null);

export function useDiscard(): Ctx {
  const ctx = useContext(DiscardCtx);
  if (!ctx) throw new Error('useDiscard must be used inside <DiscardProvider>');
  return ctx;
}

export function DiscardProvider({
  profileId,
  initial,
  companyHistory = {},
  viewerEmail = null,
  children,
}: {
  profileId: number | null;
  initial: DiscardStatusMap;
  /**
   * Resolved on the server with the page. Not refreshed as the user discards
   * things: the badge answers "before you got here", and having it appear the
   * instant you dismiss a sibling posting would be noise, not history.
   */
  companyHistory?: DiscardCompanyHistoryMap;
  viewerEmail?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [discarded, setDiscarded] = useState<DiscardStatusMap>(initial);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const { toast, show, dismiss } = useToast();

  const [seededFrom, setSeededFrom] = useState<DiscardStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setDiscarded(initial);
  }

  const discardedOn = useCallback((jobId: number) => discarded[jobId], [discarded]);
  const companyHistoryOn = useCallback(
    (jobId: number) => companyHistory[jobId],
    [companyHistory],
  );
  const isBusy = useCallback((jobId: number) => busy.has(jobId), [busy]);

  const setBusyFor = useCallback((jobId: number, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const toggle = useCallback(
    async (jobId: number) => {
      if (!profileId || busy.has(jobId)) return;
      const wasDiscarded = Boolean(discarded[jobId]);
      setBusyFor(jobId, true);

      try {
        const res = wasDiscarded
          ? await fetch(`/api/discards?jobId=${jobId}&profileId=${profileId}`, { method: 'DELETE' })
          : await fetch('/api/discards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId, profileId }),
            });

        if (!res.ok) {
          const d = await res.json().catch(() => null);
          show(d?.error ?? `Could not update (${res.status})`, 'error');
          return;
        }

        // The server's own record, not a guess: `discardedAt` and who dismissed
        // it are decided there, and a locally invented timestamp would disagree
        // with the one the next page load shows.
        const row = wasDiscarded ? null : ((await res.json()) as DiscardStatus | null);
        setDiscarded((prev) => {
          const next = { ...prev };
          if (row) next[jobId] = row;
          else delete next[jobId];
          return next;
        });
        show(wasDiscarded ? 'Restored to the list' : 'Discarded for this profile');

        // While a discarded/not-discarded filter is active, the job that just
        // changed no longer belongs on this page — refresh so the list and its
        // pagination come back consistent instead of showing a row that
        // contradicts the filter above it.
        router.refresh();
      } catch {
        show('Could not reach the server.', 'error');
      } finally {
        setBusyFor(jobId, false);
      }
    },
    [busy, discarded, profileId, router, setBusyFor, show],
  );

  return (
    <DiscardCtx.Provider value={{ profileId, viewerEmail, discardedOn, companyHistoryOn, isBusy, toggle }}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </DiscardCtx.Provider>
  );
}
