'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import type { Job, ProfileSummary } from '@/lib/types';
import type { Preset } from '@/lib/templates';
import type { CoverLetter } from '@/lib/cover-letters';
import type { JobQuery } from '@/lib/job-queries';
import type { InterviewDetail } from '@/lib/interviews';
import type { StageType } from '@/lib/stage-types';
import { formatPostedRelative } from '@/lib/format';
import { SidePanel } from './side-panel';
import { JobTabs } from './job-tabs';
import { AppliedAction, AppliedBadge, PreviouslyAppliedBadge } from './applied-action';
import { PreviouslyDiscardedBadge } from './discard-action';
import { HighlightedText } from './highlighted-text';
import { ResumeGenerator } from './resume-generator';
import { CoverLetterGenerator } from './cover-letter-generator';
import { JobQueryPanel } from './job-query-panel';
import { InterviewTimeline } from './interview-timeline';
import { useApplied } from './applied-provider';

// The job detail, in the same right-to-left drawer the calendar uses, carrying
// the same five tabs as the full page.
//
// The posting itself comes from the card, so the Description tab is readable
// the instant the drawer opens. Everything else — saved resume, cover letter,
// AI log, interview timeline — belongs to a (job, profile) pairing and is
// fetched on open, exactly as CalendarDetailPanel does for a meeting. Loading
// them with the list instead would mean five requests per card for panels most
// cards never open.
interface Ctx {
  open: (job: Job) => void;
}

const JobPanelCtx = createContext<Ctx | null>(null);

export function useJobPanel(): Ctx {
  const ctx = useContext(JobPanelCtx);
  // Cards also render on the detail page, outside this provider, so a missing
  // context degrades to a no-op rather than throwing.
  return ctx ?? { open: () => {} };
}

interface Loaded {
  jobId: number;
  hasResume: boolean;
  letter: CoverLetter | null;
  queries: JobQuery[];
  interview: InterviewDetail | null;
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function JobDetailPanelProvider({
  keywords,
  profileId,
  profiles,
  presets,
  stageTypes,
  children,
}: {
  keywords: string[];
  profileId: number | null;
  profiles: ProfileSummary[];
  presets: Preset[];
  stageTypes: StageType[];
  children: ReactNode;
}) {
  const { appliedOn } = useApplied();
  const [job, setJob] = useState<Job | null>(null);
  const [data, setData] = useState<Loaded | null>(null);

  const open = useCallback((next: Job) => setJob(next), []);
  const close = useCallback(() => setJob(null), []);

  useEffect(() => {
    if (!job || !profileId) return;
    let live = true;
    const jobId = job.id;

    Promise.all([
      json<{ [id: number]: unknown }>(`/api/resumes/status?profileId=${profileId}&jobIds=${jobId}`),
      json<CoverLetter>(`/api/cover-letters?jobId=${jobId}&profileId=${profileId}`),
      json<JobQuery[]>(`/api/job-queries?jobId=${jobId}&profileId=${profileId}`),
      json<InterviewDetail>(`/api/interviews/for-job?jobId=${jobId}&profileId=${profileId}`),
    ]).then(([status, letter, queries, interview]) => {
      // Guarded on the job id: opening a second card before the first lands
      // must not paint the first one's documents under the second one's title.
      if (live) {
        setData({
          jobId,
          hasResume: Boolean(status && (status as Record<number, unknown>)[jobId]),
          letter,
          queries: queries ?? [],
          interview,
        });
      }
    });

    return () => {
      live = false;
    };
  }, [job, profileId]);

  const shown = data?.jobId === job?.id ? data : null;
  const activeProfile = profiles.find((p) => p.id === profileId) ?? null;

  const detailHref = job
    ? profileId
      ? `/jobs/${job.id}?profile=${profileId}`
      : `/jobs/${job.id}`
    : '#';

  const posted = job ? formatPostedRelative(job.postedAt) : null;
  const scraped = job ? formatPostedRelative(job.createdAt) : null;
  const meta = job
    ? ([job.location, posted && `Posted ${posted}`, scraped && `Scraped ${scraped}`].filter(
        Boolean,
      ) as string[])
    : [];
  const words = job?.description ? job.description.trim().split(/\s+/).length : 0;

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
              {/* Both history badges together: they answer the same question
                  about this employer, and splitting them would make the pair
                  read as unrelated facts. */}
              <PreviouslyDiscardedBadge jobId={job.id} />
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

            {!profileId ? (
              <p className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                Choose a profile to generate a resume, cover letter or interview timeline for this
                job.
              </p>
            ) : (
              <JobTabs
                key={job.id}
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
                    content: (
                      <ResumeGenerator
                        jobId={job.id}
                        profiles={profiles}
                        presets={presets}
                        initialProfileId={profileId}
                      />
                    ),
                  },
                  {
                    key: 'cover-letter',
                    label: 'Cover Letter',
                    badge: shown?.hasResume ? undefined : 'Resume first',
                    content: (
                      <CoverLetterGenerator
                        key={shown ? `letter-${job.id}` : 'letter-loading'}
                        jobId={job.id}
                        profileId={profileId}
                        profile={activeProfile}
                        hasResume={Boolean(shown?.hasResume)}
                        initial={shown?.letter ?? null}
                      />
                    ),
                  },
                  {
                    key: 'ask-ai',
                    label: 'Ask AI',
                    badge: shown && shown.queries.length > 0 ? String(shown.queries.length) : undefined,
                    content: (
                      <JobQueryPanel
                        key={shown ? `ai-${job.id}-${profileId}` : 'ai-loading'}
                        jobId={job.id}
                        profileId={profileId}
                        initial={shown?.queries ?? []}
                      />
                    ),
                  },
                  {
                    key: 'interview',
                    label: 'Interview',
                    badge: shown?.interview
                      ? `${shown.interview.steps.length} ${
                          shown.interview.steps.length === 1 ? 'step' : 'steps'
                        }`
                      : undefined,
                    content: (
                      <InterviewTimeline
                        key={shown ? `iv-${job.id}-${profileId}` : 'iv-loading'}
                        jobId={job.id}
                        profileId={profileId}
                        applied={Boolean(appliedOn(job.id))}
                        initial={shown?.interview ?? null}
                        stageTypes={stageTypes}
                      />
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SidePanel>
    </JobPanelCtx.Provider>
  );
}
