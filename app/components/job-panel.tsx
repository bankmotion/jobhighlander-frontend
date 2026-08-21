'use client';

import type { ReactNode } from 'react';
import { useDiscard } from './discard-provider';

/**
 * The card's outer panel, greyed out while the job is discarded.
 *
 * A client shell around server-rendered children: `JobCard` stays a server
 * component and hands its markup in as `children`, so nothing extra is shipped
 * to the browser except the class decision made here.
 *
 * The dimming is what makes the "All" view legible. Without it, a discarded
 * card is identical to every other one except for a chip near the top, and the
 * whole point of discarding — never spending attention on this posting twice —
 * is lost the moment two of them sit side by side. Hover restores full opacity
 * so a card can still be read when someone goes looking for it.
 */
export function JobPanel({ jobId, children }: { jobId: number; children: ReactNode }) {
  const { discardedOn } = useDiscard();
  const discarded = Boolean(discardedOn(jobId));

  return (
    <li
      data-discarded={discarded || undefined}
      className={`rounded-xl border bg-[var(--surface)] p-5 transition ${
        discarded
          ? 'border-[var(--border)]/60 opacity-45 saturate-50 hover:opacity-100 hover:saturate-100'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
      }`}
    >
      {children}
    </li>
  );
}
