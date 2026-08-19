import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchJob } from '@/lib/api';
import { fetchKeywords } from '@/lib/keywords';
import { fetchProfiles } from '@/lib/profiles';
import { formatPostedRelative } from '@/lib/format';
import { HighlightedText } from '@/app/components/highlighted-text';
import { ResumeGenerator } from '@/app/components/resume-generator';
import { JobTabs } from '@/app/components/job-tabs';

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const job = await fetchJob(numId);
  if (!job) notFound();

  const [keywords, profiles] = await Promise.all([
    fetchKeywords().then((ks) => ks.map((k) => k.word)),
    fetchProfiles(),
  ]);

  const posted = formatPostedRelative(job.postedAt);
  const scraped = formatPostedRelative(job.createdAt);
  const meta = [job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
    Boolean,
  ) as string[];

  const words = job.description ? job.description.trim().split(/\s+/).length : 0;

  return (
    <article>
      <Link href="/" className="text-sm text-[var(--muted)] transition hover:text-white">
        ← Back to jobs
      </Link>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
              {job.site}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{job.title}</h1>
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
          </div>

          <a
            href={job.applyUrl ?? job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          >
            Apply Now <span aria-hidden>↗</span>
          </a>
        </div>

        <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            {job.site} id: {job.siteJobId} ↗
          </a>{' '}
          · #{job.id}
        </p>
      </div>

      <JobTabs
        tabs={[
          {
            key: 'description',
            label: 'Description',
            badge: words > 0 ? `${words.toLocaleString()} words` : undefined,
            content: (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]/90">
                {job.description ? (
                  <HighlightedText text={job.description} words={keywords} />
                ) : (
                  'No description captured.'
                )}
              </p>
            ),
          },
          {
            key: 'resume',
            label: 'Tailored Resume',
            content: <ResumeGenerator jobId={job.id} profiles={profiles} />,
          },
        ]}
      />
    </article>
  );
}
