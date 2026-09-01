'use client';

import Link from 'next/link';
import type { Job } from '@/lib/types';
import { formatPostedRelative } from '@/lib/format';
import { ApplicationAction } from './application-action';
import { AppliedAction, AppliedBadge, PreviouslyAppliedBadge } from './applied-action';
import { JobDescription } from './job-description';
import { DiscardAction, DiscardedBadge } from './discard-action';
import { CopyLinkButton } from './copy-link-button';
import { InterviewAction, InterviewBadge, type InterviewCardStatus } from './interview-action';
import { JobQueryAction } from './job-query-action';
import { JobPanel } from './job-panel';
import { useJobPanel } from './job-detail-panel';

export function JobCard({
  job,
  profileId,
  keywords,
  interview,
  queryCount,
}: {
  job: Job;
  profileId: number | null;
  keywords: string[];
  interview: InterviewCardStatus | null;
  queryCount: number;
}) {
  const detailHref = profileId ? `/jobs/${job.id}?profile=${profileId}` : `/jobs/${job.id}`;
  const panel = useJobPanel();

  const posted = formatPostedRelative(job.postedAt);
  const scraped = formatPostedRelative(job.createdAt);
  const applyHref = job.applyUrl ?? job.jobUrl;
  const meta = [job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
    Boolean,
  ) as string[];

  return (
    <JobPanel jobId={job.id}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
              {job.site}
            </span>
            <AppliedBadge jobId={job.id} />
            <PreviouslyAppliedBadge jobId={job.id} />
            <InterviewBadge jobId={job.id} profileId={profileId} interview={interview} />
            <DiscardedBadge jobId={job.id} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => panel.open(job)}
              title="Open the details beside the list"
              className="text-left text-[17px] font-semibold text-white transition hover:text-[var(--primary)]"
            >
              {job.title}
            </button>
            <a
              href={detailHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the full detail page in a new tab"
              className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--muted)] transition hover:text-white"
            >
              #{job.id} ↗
            </a>
          </div>
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
          {(job.remote || job.jobType || job.salary) && (
            <div className="mt-2 flex flex-wrap gap-2">
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
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          >
            Apply Now <span aria-hidden>↗</span>
          </a>
          {/* The same href the button opens, so what is pasted is what Apply
              would have gone to. */}
          <CopyLinkButton url={applyHref} jobId={job.id} />
          <DiscardAction jobId={job.id} />
        </div>
      </div>

      {job.description && <JobDescription text={job.description} keywords={keywords} />}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-sm">
        <Link
          href={detailHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--text)] transition hover:border-[var(--border-strong)]"
        >
          JD Details
        </Link>
        <ApplicationAction jobId={job.id} title={job.title} company={job.company} />
        <InterviewAction jobId={job.id} interview={interview} />
        <JobQueryAction
          jobId={job.id}
          profileId={profileId}
          title={job.title}
          company={job.company}
          count={queryCount}
        />
        <AppliedAction jobId={job.id} />
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[var(--muted)] transition hover:text-white"
        >
          Original posting ↗
        </a>
      </div>
    </JobPanel>
  );
}
