'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AppliedStatus, AppliedStatusMap } from '@/lib/applications';
import { Toast, useToast } from './toast';

interface Ctx {
  /** Null when there is no usable profile — applying needs one to apply AS. */
  profileId: number | null;
  /** The signed-in user, so "someone else marked this" can be told apart. */
  viewerEmail: string | null;
  appliedOn: (jobId: number) => AppliedStatus | undefined;
  isBusy: (jobId: number) => boolean;
  toggle: (jobId: number) => void;
}

const AppliedCtx = createContext<Ctx | null>(null);

/**
 * Applied state for the jobs on screen.
 *
 * Present on both the list and the detail page, so one card component works in
 * both places. Returns a null-profile context rather than throwing when it is
 * absent, because the detail page renders for users who have no profile at all.
 */
export function useApplied(): Ctx {
  const ctx = useContext(AppliedCtx);
  if (!ctx) throw new Error('useApplied must be used inside <AppliedProvider>');
  return ctx;
}

export function AppliedProvider({
  profileId,
  initial,
  viewerEmail = null,
  children,
}: {
  profileId: number | null;
  initial: AppliedStatusMap;
  /**
   * Who is looking. A profile shared with a team collects marks from several
   * people: "applied by you" is noise, "applied by someone else" is the thing
   * worth reading, and telling them apart needs the viewer's identity.
   */
  viewerEmail?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [applied, setApplied] = useState<AppliedStatusMap>(initial);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const { toast, show, dismiss } = useToast();

  /**
   * Re-seed when the server sends a new snapshot.
   *
   * `initial` is a fresh object per RSC payload and stable across client
   * re-renders, so its identity is the signal for "the server just told us
   * something new". Without this, a client navigation — switching profile,
   * changing a filter, paging — would keep the previous page's badges, which
   * is the same class of bug the resume badges had.
   */
  const [seededFrom, setSeededFrom] = useState<AppliedStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setApplied(initial);
  }

  const appliedOn = useCallback((jobId: number) => applied[jobId], [applied]);
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
      const wasApplied = Boolean(applied[jobId]);
      setBusyFor(jobId, true);

      try {
        const res = wasApplied
          ? await fetch(`/api/applications?jobId=${jobId}&profileId=${profileId}`, {
              method: 'DELETE',
            })
          : await fetch('/api/applications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId, profileId }),
            });

        if (!res.ok) {
          const d = await res.json().catch(() => null);
          show(d?.error ?? `Could not update (${res.status})`, 'error');
          return;
        }

        // The server's own record, not a guess: `appliedAt` and who marked it
        // are decided there, and a locally invented timestamp would disagree
        // with the one the next page load shows.
        const row = wasApplied ? null : ((await res.json()) as AppliedStatus | null);
        setApplied((prev) => {
          const next = { ...prev };
          if (row) next[jobId] = row;
          else delete next[jobId];
          return next;
        });
        show(wasApplied ? 'Marked as not applied' : 'Marked as applied');

        // While an applied/unapplied filter is active, the job that just
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
    [applied, busy, profileId, router, setBusyFor, show],
  );

  return (
    <AppliedCtx.Provider value={{ profileId, viewerEmail, appliedOn, isBusy, toggle }}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </AppliedCtx.Provider>
  );
}
