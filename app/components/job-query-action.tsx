'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { JobQueryPanel } from './job-query-panel';

export function JobQueryAction({
  jobId,
  profileId,
  title,
  company,
  count = 0,
}: {
  jobId: number;
  profileId: number | null;
  title: string;
  company: string | null;
  count?: number;
}) {
  const [open, setOpen] = useState(false);

  // Without a profile there is no candidate record to answer against, so the
  // control is shown disabled rather than removed — same treatment the resume
  // and applied buttons give the same situation.
  if (!profileId) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Asking is tracked per profile — create one, or ask an admin to invite you to theirs"
        className="cursor-not-allowed rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[var(--muted)]"
      >
        ✨ Query AI
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--text)] transition hover:border-[var(--primary)]/60 hover:text-white"
      >
        ✨ Query AI
        {count > 0 && (
          <span className="ml-1.5 rounded bg-[var(--primary)]/20 px-1.5 py-px text-[11px] font-semibold text-[var(--primary)]">
            {count}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Query AI about this job"
        subtitle={[company, title].filter(Boolean).join(' · ')}
      >
        <div className="px-5 py-4">
          <JobQueryPanel jobId={jobId} profileId={profileId} initial={null} compact />
        </div>
      </Modal>
    </>
  );
}
