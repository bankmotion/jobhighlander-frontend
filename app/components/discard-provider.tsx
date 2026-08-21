'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscardStatus, DiscardStatusMap } from '@/lib/discards';
import { Toast, useToast } from './toast';

interface Ctx {
  /** Null when there is no usable profile — discarding needs one to discard FOR. */
  profileId: number | null;
  /** The signed-in user, so "someone else dismissed this" can be told apart. */
  viewerEmail: string | null;
  discardedOn: (jobId: number) => DiscardStatus | undefined;
  isBusy: (jobId: number) => boolean;
  toggle: (jobId: number) => void;
}

const DiscardCtx = createContext<Ctx | null>(null);

export function useDiscard(): Ctx {
  const ctx = useContext(DiscardCtx);
  if (!ctx) throw new Error('useDiscard must be used inside <DiscardProvider>');
  return ctx;
}

/**
 * Discard state for the jobs on screen.
 *
 * A deliberate twin of `AppliedProvider` — same optimistic-toggle shape, same
 * re-seed-on-new-snapshot rule, same router.refresh() after a change. The two
 * are kept structurally identical because they are the same interaction on
 * opposite judgements, and a reader who has understood one should not have to
 * re-learn the other.
 */
export function DiscardProvider({
  profileId,
  initial,
  viewerEmail = null,
  children,
}: {
  profileId: number | null;
  initial: DiscardStatusMap;
  /**
   * Who is looking. On a profile shared with a team, "you dismissed this" is
   * noise and "a colleague dismissed this" is the thing worth reading before
   * spending an hour on the posting they already rejected.
   */
  viewerEmail?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [discarded, setDiscarded] = useState<DiscardStatusMap>(initial);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const { toast, show, dismiss } = useToast();

  /**
   * Re-seed when the server sends a new snapshot.
   *
   * `initial` is a fresh object per RSC payload and stable across client
   * re-renders, so its identity is the signal for "the server just told us
   * something new". Without this, a client navigation — switching profile,
   * changing a filter, paging — would keep the previous page's marks.
   */
  const [seededFrom, setSeededFrom] = useState<DiscardStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setDiscarded(initial);
  }

  const discardedOn = useCallback((jobId: number) => discarded[jobId], [discarded]);
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
    <DiscardCtx.Provider value={{ profileId, viewerEmail, discardedOn, isBusy, toggle }}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </DiscardCtx.Provider>
  );
}
