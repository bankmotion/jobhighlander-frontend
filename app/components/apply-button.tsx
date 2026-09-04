'use client';

import { applyTarget } from '@/lib/apply-target';

/**
 * The Apply button, labelled for where it actually goes.
 *
 * Shared by the job card and the detail panel so the two cannot disagree about
 * a posting — the same job showing "Easy Apply" in the list and "Apply Now" in
 * the panel would make both untrustworthy.
 */
export function ApplyButton({
  job,
  className = '',
}: {
  job: { jobUrl: string; applyUrl: string | null; site: string };
  className?: string;
}) {
  const apply = applyTarget(job);

  return (
    <a
      href={apply.href}
      target="_blank"
      rel="noopener noreferrer"
      // Where the link goes, spelled out. The label can only carry two words;
      // this is where "you are about to leave for workday.com" fits.
      title={apply.hint}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
        // An in-platform application is the easier one, so it gets the
        // emphasis. Both stay solid buttons — this ranks them, it does not
        // demote either.
        apply.mode === 'onsite'
          ? 'bg-emerald-600 hover:bg-emerald-500'
          : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]'
      } ${className}`}
    >
      {apply.label} <span aria-hidden>↗</span>
    </a>
  );
}
