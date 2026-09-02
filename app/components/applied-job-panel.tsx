'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Job } from '@/lib/types';
import { formatPostedRelative } from '@/lib/format';
import { siteLabel } from '@/lib/stats';
import { SidePanel } from './side-panel';

interface Ctx {
  open: (jobId: number, fallbackTitle: string) => void;
}

const AppliedJobCtx = createContext<Ctx | null>(null);

export function useAppliedJobPanel(): Ctx {
  // A no-op outside the provider rather than a throw: the row renders in more
  // than one place and a missing panel should degrade, not crash the page.
  return useContext(AppliedJobCtx) ?? { open: () => {} };
}

/**
 * The posting behind an application, in the same right-to-left drawer the job
 * list uses.
 *
 * Read-only on purpose. The job list's panel carries the resume, cover letter
 * and interview tabs, all of which belong to a (job, profile) pairing the
 * VIEWER can act on. Here a row may belong to a colleague's profile — on the
 * super-admin page it usually does — so those tabs would either be empty or be
 * showing someone else's documents. What this view is for is "what was the job
 * they applied to", and that is what it shows.
 */
export function AppliedJobPanelProvider({ children }: { children: ReactNode }) {
  const [jobId, setJobId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((id: number, fallbackTitle: string) => {
    setJobId(id);
    setTitle(fallbackTitle);
    setJob(null);
    setError(null);
  }, []);
  const close = useCallback(() => setJobId(null), []);

  useEffect(() => {
    if (jobId === null) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        if (!live) return;
        if (!res.ok) {
          // The posting may have been deduplicated or deleted since the
          // application was recorded; say so rather than showing a blank panel.
          setError(res.status === 404 ? 'This posting is no longer in the database.' : 'Could not load this posting.');
          return;
        }
        const data = (await res.json()) as Job;
        // Guarded on the id: opening a second row before the first lands must
        // not paint the first posting under the second one's title.
        if (live && data?.id === jobId) setJob(data);
      } catch {
        if (live) setError('Could not reach the server.');
      }
    })();
    return () => {
      live = false;
    };
  }, [jobId]);

  const posted = job ? formatPostedRelative(job.postedAt) : null;
  const scraped = job ? formatPostedRelative(job.createdAt) : null;
  const meta = job
    ? ([job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
        Boolean,
      ) as string[])
    : [];

  return (
    <AppliedJobCtx.Provider value={{ open }}>
      {children}

      <SidePanel
        open={jobId !== null}
        onClose={close}
        title={job?.title ?? title}
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
                Open posting <span aria-hidden>↗</span>
              </a>
              <a
                href={`/jobs/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
              >
                Full detail page ↗
              </a>
            </>
          ) : null
        }
      >
        <div className="px-5 py-4">
          {error ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
              {error}
            </p>
          ) : !job ? (
            <div className="space-y-3" aria-hidden>
              <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-40 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
                  {siteLabel(job.site)}
                </span>
                {job.remote && (
                  <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
                    Remote
                  </span>
                )}
                {job.salary && (
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {job.salary}
                  </span>
                )}
                {job.jobType && (
                  <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                    {job.jobType}
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-xl font-bold tracking-tight text-white">{job.title}</h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                {job.company && <span className="font-medium text-[var(--text)]">{job.company}</span>}
                {job.company && meta.length > 0 && <span aria-hidden>·</span>}
                {meta.length > 0 && <span>{meta.join(' · ')}</span>}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]/90">
                {job.description || 'No description captured.'}
              </p>
            </>
          )}
        </div>
      </SidePanel>
    </AppliedJobCtx.Provider>
  );
}
