'use client';

import type { ReactNode } from 'react';
import { useDiscard } from './discard-provider';

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
