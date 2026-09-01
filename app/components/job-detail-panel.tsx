'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Job } from '@/lib/types';
import { formatPostedRelative } from '@/lib/format';
import { SidePanel } from './side-panel';
import { AppliedAction, AppliedBadge, PreviouslyAppliedBadge } from './applied-action';
import { HighlightedText } from './highlighted-text';

// Opens the job detail in the same right-to-left drawer the calendar uses.
//
// The job object is handed over from the card rather than refetched: the list
// already carries the full row, description included, so the panel opens with
// no request and no spinner. Anything needing more than the posting itself —
// resume generation, the interview timeline — stays on the full page, which the
// footer links to.
interface Ctx {
  open: (job: Job) => void;
}

const JobPanelCtx = createContext<Ctx | null>(null);

export function useJobPanel(): Ctx {
  const ctx = useContext(JobPanelCtx);
  // A card can render outside the provider (the detail page reuses it), so this
  // degrades to a no-op instead of throwing.
  return ctx ?? { open: () => {} };
}

export function JobDetailPanelProvider({
  keywords,
  profileId,
  children,
}: {
  keywords: string[];
  profileId: number | null;
  children: ReactNode;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const open = useCallback((next: Job) => setJob(next), []);
  const close = useCallback(() => setJob(null), []);

  const detailHref = job ? (profileId ? `/jobs/${job.id}?profile=${profileId}` : `/jobs/${job.id}`) : '#';
  const posted = job ? formatPostedRelative(job.postedAt) : null;
  const scraped = job ? formatPostedRelative(job.createdAt) : null;
  const meta = job
    ? ([job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
        Boolean,
      ) as string[])
    : [];

  return (
    <JobPanelCtx.Provider value={{ open }}>
      {children}

      <SidePanel
        open={job !== null}
        onClose={close}
        title={job?.title ?? ''}
        subtitle={job?.company ?? undefined}
        footer={
          job ? (
            <>
              <a
                href={job.applyUrl ?? job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
              >
                Apply Now <span aria-hidden>↗</span>
              </a>
              <Link
                href={detailHref}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
              >
                Open full page
              </Link>
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-[var(--muted)] transition hover:text-white"
              >
                Original posting ↗
              </a>
            </>
          ) : null
        }
      >
        {job && (
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
                {job.site}
              </span>
              <AppliedBadge jobId={job.id} />
              <PreviouslyAppliedBadge jobId={job.id} />
            </div>

            <h3 className="mt-3 text-xl font-bold tracking-tight text-white">{job.title}</h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
              {job.company &&
                (job.companyUrl ? (
                  <a
                    href={job.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--text)] transition hover:text-[var(--primary)]"
                  >
                    {job.company} ↗
                  </a>
                ) : (
                  <span className="font-medium text-[var(--text)]">{job.company}</span>
                ))}
              {job.company && meta.length > 0 && <span aria-hidden>·</span>}
              {meta.length > 0 && <span>{meta.join(' · ')}</span>}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {job.salary && (
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {job.salary}
                </span>
              )}
              {job.remote && (
                <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
                  Remote
                </span>
              )}
              {job.jobType && (
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                  {job.jobType}
                </span>
              )}
            </div>

            <div className="mt-4">
              <AppliedAction jobId={job.id} />
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Description
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
                <HighlightedText text={job.description} words={keywords} />
              </p>
            </div>
          </div>
        )}
      </SidePanel>
    </JobPanelCtx.Provider>
  );
}
