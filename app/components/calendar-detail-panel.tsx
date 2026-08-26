'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SidePanel } from './side-panel';
import { StageChip } from './stage-badge';
import { MeetingTime } from './meeting-time';
import { StatusChip } from './interview-timeline';
import { eventColor } from './calendar-event';
import { STEP_RESULT_LABELS, type CalendarPanel, type InterviewDetail } from '@/lib/interviews';
import type { Job } from '@/lib/types';

interface Loaded {
  /** Which panel this data belongs to, so a stale response cannot be shown. */
  panelId: number;
  job: Job | null;
  interview: InterviewDetail | null;
}

/**
 * The calendar's slide-over: one sitting, in full, without leaving the grid.
 *
 * Clicking an entry used to navigate to the job page, which threw away the
 * month you were reading to answer a question — "what is this one?" — that does
 * not need a new page. The drawer answers it in place and still offers the
 * navigation as a button, so nothing is lost.
 *
 * FETCHED ON OPEN, not prefetched. A month grid can hold dozens of panels and
 * each job carries a full description; loading them all to render a grid of
 * time chips would cost far more than it saves.
 */
export function CalendarDetailPanel({
  panel,
  onClose,
}: {
  /** The clicked sitting, or null when the drawer is closed. */
  panel: CalendarPanel | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);

  // DERIVED, never a flag set inside the effect: still loading whenever what we
  // hold does not belong to the panel currently open. A synchronous setState in
  // the effect body is the cascading render the compiler lint rejects.
  const loading = panel !== null && data?.panelId !== panel.panelId;

  useEffect(() => {
    if (!panel) return;
    let live = true;

    const job = panel.jobId
      ? fetch(`/api/jobs/${panel.jobId}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);
    const interview = fetch(`/api/interviews/${panel.interviewId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    Promise.all([job, interview]).then(([j, iv]) => {
      // Guarded: clicking a second entry before the first lands must not paint
      // the first one's job under the second one's heading.
      if (live) setData({ panelId: panel.panelId, job: j, interview: iv });
    });

    return () => {
      live = false;
    };
  }, [panel]);

  const shown = data?.panelId === panel?.panelId ? data : null;
  const job = shown?.job ?? null;
  const interview = shown?.interview ?? null;

  // The step this sitting belongs to — found by the panel, not by position,
  // because a step can hold several sittings.
  const step = interview?.steps.find((s) => s.panels.some((p) => p.id === panel?.panelId)) ?? null;
  const thisPanel = step?.panels.find((p) => p.id === panel?.panelId) ?? null;

  const jobHref = panel?.jobId
    ? `/jobs/${panel.jobId}?profile=${panel.profileId}`
    : null;

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
              Open interview timeline →
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
                Original posting ↗
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
        <div className="space-y-5 px-5 py-4">
          {/* ── this sitting ─────────────────────────────────────────── */}
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

          {/* ── the process around it ────────────────────────────────── */}
          <Section title="Interview">
            {loading && !interview ? (
              <Skeleton rows={3} />
            ) : interview ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={interview.status} />
                  <span className="text-xs text-[var(--muted)]">
                    {interview.steps.length} {interview.steps.length === 1 ? 'step' : 'steps'} ·
                    opened by {interview.openedBy}
                  </span>
                </div>
                <ol className="space-y-1">
                  {interview.steps.map((s) => {
                    const current = s.id === step?.id;
                    return (
                      <li
                        key={s.id}
                        className={`flex flex-wrap items-center gap-1.5 rounded px-2 py-1 text-xs ${
                          current ? 'bg-[var(--primary)]/10' : ''
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
                    );
                  })}
                </ol>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">Could not load the timeline.</p>
            )}
          </Section>

          {/* ── the posting ──────────────────────────────────────────── */}
          <Section title="Job">
            {loading && !job ? (
              <Skeleton rows={5} />
            ) : job ? (
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-[var(--blue)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
                    {job.site}
                  </span>
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
                {job.location && (
                  <p className="mb-2 text-xs text-[var(--muted)]">{job.location}</p>
                )}
                {/* Capped rather than scrolled inside its own box: the drawer
                    already scrolls, and a nested scroller in a 40%-wide column
                    is a trap. The full text is one click away in the footer. */}
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)]/85">
                  {job.description || 'No description captured.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                The posting is no longer in the database.
              </p>
            )}
          </Section>
        </div>
      )}
    </SidePanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--surface-2)]" />
      ))}
    </div>
  );
}
