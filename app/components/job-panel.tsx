'use client';

import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { useDiscard } from './discard-provider';
import { lastJobStore } from '@/lib/last-job';

// Anything that represents "doing something to this job". Deliberately broad:
// copying the link, generating, downloading, marking applied, asking the AI and
// opening the panel are all work the user would want to come back to.
const ACTION_SELECTOR = 'button, a, select, input, [role="button"], summary';

export function JobPanel({ jobId, children }: { jobId: number; children: ReactNode }) {
  const { discardedOn } = useDiscard();
  const discarded = Boolean(discardedOn(jobId));
  const lastJob = lastJobStore.useValue();
  const isLast = lastJob === jobId;

  // One capture-phase listener on the card instead of a call inside every
  // action component. Those live in six files and more get added; a wrapper
  // that watches for any interactive click cannot fall out of step with them.
  //
  // Capture phase because some handlers stop propagation, and `closest` because
  // the click usually lands on an icon inside the button rather than the button.
  const markWorked = useCallback(
    (e: MouseEvent<HTMLLIElement>) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(ACTION_SELECTOR)) lastJobStore.set(jobId);
    },
    [jobId],
  );

  return (
    <li
      onClickCapture={markWorked}
      data-discarded={discarded || undefined}
      data-last-worked={isLast || undefined}
      // `relative` so the marker's glow can be positioned against this card.
      className={`jh-job-card relative rounded-xl border bg-[var(--surface)] p-5 transition ${
        discarded
          ? 'border-[var(--border)]/60 opacity-45 saturate-50 hover:opacity-100 hover:saturate-100'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
      }`}
    >
      {isLast && (
        <span
          // Announced once, politely: returning to the tab should say where you
          // were without interrupting anything being read.
          role="status"
          className="sr-only"
        >
          Last job you worked on
        </span>
      )}
      {children}
    </li>
  );
}
