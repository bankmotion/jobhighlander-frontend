'use client';

import { useState } from 'react';
import { AddJobModal } from './add-job-modal';
import { useDisplayZone } from '@/lib/display-zone';

/**
 * Opens the "add a job" dialog from the job list.
 *
 * Split from the modal so the dialog's markup is not parsed and mounted on
 * every page load for a control most visits never touch.
 */
export function AddJobButton() {
  const [open, setOpen] = useState(false);
  const zone = useDisplayZone();

  // Today on the viewer's calendar, so the date input cannot offer them a
  // tomorrow — `toISOString()` would give the UTC day, which is the wrong one
  // for most of the world for part of every day.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="jh-press inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
      >
        <span aria-hidden className="text-base leading-none">
          ➕
        </span>
        Add a job
      </button>

      <AddJobModal open={open} onClose={() => setOpen(false)} todayInZone={today} />
    </>
  );
}
