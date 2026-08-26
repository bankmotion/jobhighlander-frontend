'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { SidePanel } from './side-panel';
import { StageChip } from './stage-badge';
import { MeetingTime } from './meeting-time';
import { StatusChip } from './interview-timeline';
import { eventColor } from './calendar-event';
import type { TailoredResume } from './resume-generator';
import { STEP_RESULT_LABELS, type CalendarPanel, type InterviewDetail } from '@/lib/interviews';
import type { CoverLetter } from '@/lib/cover-letters';
import type { JobQuery } from '@/lib/job-queries';
import type { Job } from '@/lib/types';

/** The one stored resume for a pairing, as `/api/resumes/saved` returns it. */
interface SavedResume {
  id: number;
  data: TailoredResume;
  templateKey: string;
  model: string;
  updatedAt: string;
}

interface Loaded {
  /** Which panel this data belongs to, so a stale response cannot be shown. */
  panelId: number;
  job: Job | null;
  interview: InterviewDetail | null;
  resume: SavedResume | null;
  letter: CoverLetter | null;
  queries: JobQuery[];
}

const json = <T,>(url: string): Promise<T | null> =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

/**
 * The calendar's slide-over: everything the app holds about one pairing.
 *
 * Clicking an entry used to navigate to the job page, which threw away the
 * month you were reading. This answers the question in place — and answers more
 * of it than that page does in any one tab, because here the posting, the
 * interview, the resume, the letter and the AI log sit in one column.
 *
 * EVERYTHING BELOW THE SITTING IS A `<details>`, closed by default. Five full
 * documents in a 40%-wide column is a scroll with no landmarks; collapsed, the
 * headers ARE the summary — each says whether that thing exists before you open
 * it. Native disclosure rather than state, so it costs no JavaScript and keeps
 * its keyboard behaviour for free.
 *
 * FETCHED ON OPEN, not prefetched: a month grid holds dozens of panels and this
 * is five requests each.
 */
export function CalendarDetailPanel({
  panel,
  onClose,
}: {
  panel: CalendarPanel | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);

  // DERIVED, never a flag set inside the effect: still loading whenever what we
  // hold does not belong to the panel currently open. A synchronous setState in
  // an effect body is the cascading render the compiler lint rejects.
  const loading = panel !== null && data?.panelId !== panel.panelId;

  useEffect(() => {
    if (!panel) return;
    let live = true;
    const { jobId, profileId, interviewId, panelId } = panel;

    Promise.all([
      jobId ? json<Job>(`/api/jobs/${jobId}`) : Promise.resolve(null),
      json<InterviewDetail>(`/api/interviews/${interviewId}`),
      jobId ? json<SavedResume>(`/api/resumes/saved?jobId=${jobId}&profileId=${profileId}`) : Promise.resolve(null),
      jobId ? json<CoverLetter>(`/api/cover-letters?jobId=${jobId}&profileId=${profileId}`) : Promise.resolve(null),
      jobId ? json<JobQuery[]>(`/api/job-queries?jobId=${jobId}&profileId=${profileId}`) : Promise.resolve(null),
    ]).then(([job, interview, resume, letter, queries]) => {
      // Guarded: clicking a second entry before the first lands must not paint
      // the first one's documents under the second one's heading.
      if (live) setData({ panelId, job, interview, resume, letter, queries: queries ?? [] });
    });

    return () => {
      live = false;
    };
  }, [panel]);

  const shown = data?.panelId === panel?.panelId ? data : null;
  const { job = null, interview = null, resume = null, letter = null } = shown ?? {};
  const queries = shown?.queries ?? [];

  // Found by the panel, not by position: a step can hold several sittings.
  const step = interview?.steps.find((s) => s.panels.some((p) => p.id === panel?.panelId)) ?? null;
  const thisPanel = step?.panels.find((p) => p.id === panel?.panelId) ?? null;

  const jobHref = panel?.jobId ? `/jobs/${panel.jobId}?profile=${panel.profileId}` : null;

  return (
    <SidePanel
      open={panel !== null}
      onClose={onClose}
      title={panel?.jobCompany ?? panel?.jobTitle ?? ''}
      subtitle={panel?.jobTitle}
      footer={
        jobHref ? (
          <>
            <Link
              href={`${jobHref}&tab=interview`}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
            >
              Open timeline →
            </Link>
            <Link
              href={jobHref}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]"
            >
              Job page
            </Link>
            {job?.jobUrl && (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-[var(--muted)] transition hover:text-white"
              >
                Original ↗
              </a>
            )}
          </>
        ) : (
          <span className="text-xs text-[var(--muted)]">
            The original posting has been removed, so there is no page to open.
          </span>
        )
      }
    >
      {panel && (
        <div className="space-y-3 px-5 py-4">
          {/* ── this sitting: never collapsed, it is why the drawer opened ── */}
          <section
            style={{ borderLeftColor: eventColor(panel) }}
            className="rounded-lg border border-l-[3px] border-[var(--border)] bg-[var(--surface-2)] p-3"
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {panel.stages.map((s) => (
                <StageChip key={s.id} stage={s} size="md" />
              ))}
              {panel.stepResult !== 'pending' && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                  {STEP_RESULT_LABELS[panel.stepResult]}
                </span>
              )}
            </div>

            {(thisPanel?.title ?? panel.stepTitle) && (
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                {thisPanel?.title ?? panel.stepTitle}
              </h3>
            )}

            <MeetingTime
              iso={panel.scheduledAt}
              timezone={panel.timezone}
              durationMin={panel.durationMin}
              size="md"
            />

            {panel.meetingUrl && (
              <a
                href={panel.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block max-w-full truncate text-xs font-medium text-[var(--primary)] transition hover:underline"
              >
                {panel.meetingUrl} ↗
              </a>
            )}

            {thisPanel?.note && (
              <p className="mt-2 whitespace-pre-wrap border-t border-[var(--border)] pt-2 text-xs leading-relaxed text-[var(--text)]/85">
                {thisPanel.note}
              </p>
            )}

            <p className="mt-2 text-[11px] text-[var(--muted)]">{panel.profileName}</p>
          </section>

          <Fold
            title="Interview"
            status={interview ? `${interview.steps.length} steps` : loading ? '…' : '—'}
            defaultOpen
          >
            {interview ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={interview.status} />
                  <span className="text-xs text-[var(--muted)]">opened by {interview.openedBy}</span>
                </div>
                <ol className="space-y-1">
                  {interview.steps.map((s) => (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center gap-1.5 rounded px-2 py-1 text-xs ${
                        s.id === step?.id ? 'bg-[var(--primary)]/10' : ''
                      }`}
                    >
                      <span className="text-[var(--muted)]">{s.sortOrder + 1}.</span>
                      {s.stages.map((b) => (
                        <StageChip key={b.id} stage={b} />
                      ))}
                      {s.title && <span className="truncate text-[var(--text)]">{s.title}</span>}
                      <span className="ml-auto shrink-0 text-[var(--muted)]">
                        {STEP_RESULT_LABELS[s.result]}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <Placeholder loading={loading} empty="Could not load the timeline." />
            )}
          </Fold>

          <Fold title="Job" status={job ? job.site : loading ? '…' : '—'}>
            {job ? (
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
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
                  {job.location && (
                    <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {job.location}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)]/85">
                  {job.description || 'No description captured.'}
                </p>
              </div>
            ) : (
              <Placeholder loading={loading} empty="The posting is no longer in the database." />
            )}
          </Fold>

          <Fold
            title="Resume"
            status={resume ? 'generated' : loading ? '…' : 'not generated'}
          >
            {resume ? (
              <ResumeSummary resume={resume} />
            ) : (
              <Placeholder
                loading={loading}
                empty="No tailored resume for this pairing yet — generate one from the job page."
              />
            )}
          </Fold>

          <Fold
            title="Cover letter"
            status={letter ? (letter.edited ? 'edited' : 'generated') : loading ? '…' : 'not generated'}
          >
            {letter ? (
              <LetterView letter={letter} />
            ) : (
              <Placeholder
                loading={loading}
                empty="No cover letter yet. It is written from the resume, so that comes first."
              />
            )}
          </Fold>

          <Fold
            title="Asked AI"
            status={queries.length > 0 ? String(queries.length) : loading ? '…' : '—'}
          >
            {queries.length > 0 ? (
              <ul className="space-y-2">
                {queries.map((q) => (
                  <li key={q.id} className="rounded border border-[var(--border)] p-2">
                    <p className="text-xs font-medium text-white">{q.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)]/80">
                      {q.answer}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder
                loading={loading}
                empty="Nothing asked about this job yet — the job page has an Ask AI tab."
              />
            )}
          </Fold>
        </div>
      )}
    </SidePanel>
  );
}

/**
 * The tailored resume, readable in a narrow column.
 *
 * REVIEW NOTES AND GAPS COME FIRST, not last as they do in the document itself.
 * They are the only part that asks the candidate to DO something before this
 * goes anywhere, and burying them under the prose is how they get skipped.
 */
function ResumeSummary({ resume }: { resume: SavedResume }) {
  const r = resume.data;
  // Grouped under the category the model assigned, falling back to one
  // unlabelled group — older rows predate the category and would otherwise
  // render under the word "undefined".
  const byCategory = new Map<string, string[]>();
  for (const s of r.skills) {
    const key = s.category?.trim() || '';
    const list = byCategory.get(key);
    if (list) list.push(s.name);
    else byCategory.set(key, [s.name]);
  }

  return (
    <div className="space-y-3 text-xs">
      {(r.reviewNotes.length > 0 || r.gaps.length > 0) && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
          {r.reviewNotes.length > 0 && (
            <>
              <p className="mb-1 font-semibold text-amber-200">Check before sending</p>
              <ul className="mb-2 list-disc space-y-0.5 pl-4 text-amber-100/90">
                {r.reviewNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </>
          )}
          {r.gaps.length > 0 && (
            <>
              <p className="mb-1 font-semibold text-amber-200">Gaps against the posting</p>
              <ul className="list-disc space-y-0.5 pl-4 text-amber-100/90">
                {r.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {r.headline && <p className="font-semibold text-white">{r.headline}</p>}
      {r.summary && (
        // The model marks its highest-value terms with <b>; stripped rather
        // than rendered, because injecting stored HTML here to gain bold text
        // is a bad trade.
        <p className="leading-relaxed text-[var(--text)]/85">{stripTags(r.summary)}</p>
      )}

      {byCategory.size > 0 && (
        <div>
          {[...byCategory].map(([cat, names]) => (
            <p key={cat} className="text-[var(--text)]/85">
              {cat && <span className="font-semibold text-white">{cat}: </span>}
              {names.join(' · ')}
            </p>
          ))}
        </div>
      )}

      {r.experience.map((e, i) => (
        <div key={i} className="border-t border-[var(--border)] pt-2">
          <p className="font-semibold text-white">
            {e.title} — {e.company}
          </p>
          <p className="mb-1 text-[var(--muted)]">
            {e.period}
            {e.location ? ` · ${e.location}` : ''}
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-[var(--text)]/85">
            {e.bullets.map((b, j) => (
              <li key={j}>{stripTags(b.text)}</li>
            ))}
          </ul>
        </div>
      ))}

      <p className="border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
        {resume.templateKey} · {resume.model}
      </p>
    </div>
  );
}

function LetterView({ letter }: { letter: CoverLetter }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2 text-xs">
      {letter.reviewNotes.length > 0 && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
          <p className="mb-1 font-semibold text-amber-200">Claims your record does not state</p>
          <ul className="list-disc space-y-0.5 pl-4 text-amber-100/90">
            {letter.reviewNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(letter.body)
            // Reset in a timer, not on the next render: the label has to stay
            // long enough to be read.
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => undefined);
        }}
        className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--text)] transition hover:border-[var(--border-strong)]"
      >
        {copied ? 'Copied' : 'Copy letter'}
      </button>

      <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]/85">{letter.body}</p>
    </div>
  );
}

/** A collapsed section. Native `<details>`, so it needs no state at all. */
function Fold({
  title,
  status,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Shown in the header, so the section says what it holds before opening. */
  status: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-[var(--border)] bg-[var(--surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] transition hover:text-white [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="transition-transform group-open:rotate-90">
          ›
        </span>
        {title}
        <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
          {status}
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-3 py-2.5">{children}</div>
    </details>
  );
}

function Placeholder({ loading, empty }: { loading: boolean; empty: string }) {
  return loading ? (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--surface-2)]" />
      ))}
    </div>
  ) : (
    <p className="text-xs text-[var(--muted)]">{empty}</p>
  );
}

/**
 * Drop the `<b>` markers the resume prompt asks for.
 *
 * The document stores them so the PDF can render emphasis. Here the choice is
 * between plain text and `dangerouslySetInnerHTML` over stored model output —
 * bold is not worth that.
 */
const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '');
