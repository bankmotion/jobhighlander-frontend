import Link from 'next/link';
import type { Job } from '@/lib/types';
import { formatPostedRelative } from '@/lib/format';

export function JobCard({ job }: { job: Job }) {
  const posted = formatPostedRelative(job.postedAt);
  const scraped = formatPostedRelative(job.createdAt);
  const applyHref = job.applyUrl ?? job.jobUrl;
  const meta = [job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
    Boolean,
  ) as string[];

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
            {job.site}
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/jobs/${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[17px] font-semibold text-white transition hover:text-[var(--primary)]"
            >
              {job.title}
            </Link>
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the posting on the source site"
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

        <a
          href={applyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
        >
          Apply Now <span aria-hidden>↗</span>
        </a>
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{job.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-sm">
        <Link
          href={`/jobs/${job.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--text)] transition hover:border-[var(--border-strong)]"
        >
          JD Details
        </Link>
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--muted)] transition hover:text-white"
        >
          Original posting ↗
        </a>
      </div>
    </li>
  );
}
