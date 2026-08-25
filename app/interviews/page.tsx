import Link from 'next/link';
import { fetchProfiles } from '@/lib/profiles';
import { fetchInterviews, fetchUpcoming } from '@/lib/interviews.server';
import type { InterviewSummary } from '@/lib/interviews';
import { StageChip } from '@/app/components/stage-badge';
import { MeetingTime } from '@/app/components/meeting-time';
import { StatusChip } from '@/app/components/interview-timeline';

export const dynamic = 'force-dynamic';

/**
 * The cross-job interview view.
 *
 * The timeline itself lives on the job page, where the description sits one tab
 * away and is worth having open while preparing. This page answers the two
 * questions that page cannot, because both span processes: "what is coming up
 * this week" and "which of these has gone quiet".
 *
 * Every row therefore LINKS BACK to the job page's Interview tab rather than
 * duplicating the timeline — one editor, one place, no second implementation to
 * keep in step.
 */
export default async function InterviewsPage({
  searchParams,
}: {
  /** `profile` mirrors the sidebar submenu; absent means every profile. */
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile: profileParam } = await searchParams;
  const profiles = await fetchProfiles();

  // Resolved against profiles the caller can actually use, so a hand-typed id
  // for someone else's profile falls back to "all" rather than rendering an
  // empty page that looks like a candidate with no interviews.
  const activeProfile = profiles.find((p) => p.id === Number(profileParam)) ?? null;
  const profileId = activeProfile?.id;

  const [upcoming, interviews] = await Promise.all([
    fetchUpcoming(7),
    fetchInterviews(profileId),
  ]);

  // The agenda endpoint spans every process, so it is narrowed here to match
  // the filter the list is showing.
  const visible = new Set(interviews.map((i) => i.id));
  const agenda = profileId ? upcoming.filter((p) => visible.has(p.interviewId)) : upcoming;

  const live = interviews.filter((i) => OPEN_STATUSES.has(i.status));
  const closed = interviews.filter((i) => !OPEN_STATUSES.has(i.status));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Interviews</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {activeProfile
          ? `Processes for ${profileName(activeProfile)}. Open one to edit its timeline.`
          : 'Every process across the profiles you can use. Open one to edit its timeline.'}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Next 7 days
        </h2>
        {agenda.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            Nothing scheduled in the next week.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {agenda.map((p) => (
              <li
                key={p.panelId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {p.stages.map((s) => (
                    <StageChip key={s.id} stage={s} />
                  ))}
                </div>
                <p className="truncate text-sm font-semibold text-white">
                  {p.jobCompany ?? 'Unknown company'}
                </p>
                <p className="mb-2 truncate text-xs text-[var(--muted)]">{p.jobTitle}</p>
                <MeetingTime
                  iso={p.scheduledAt}
                  timezone={p.timezone}
                  durationMin={p.durationMin}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {p.meetingUrl && (
                    <a
                      href={p.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[var(--primary)] transition hover:underline"
                    >
                      Join ↗
                    </a>
                  )}
                  {p.jobId && (
                    <Link
                      href={timelineHref(p.jobId, interviewProfile(interviews, p.interviewId))}
                      className="text-xs text-[var(--muted)] transition hover:text-white"
                    >
                      Open timeline →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Section title={`Active (${live.length})`} rows={live} empty="No live processes." />
      {closed.length > 0 && <Section title={`Closed (${closed.length})`} rows={closed} />}
    </div>
  );
}

/** Statuses that still need attention; the rest are history. */
const OPEN_STATUSES = new Set(['active', 'offer', 'on_hold']);

function Section({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: InterviewSummary[];
  empty?: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          {empty ?? 'Nothing here.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Row row={r} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ row }: { row: InterviewSummary }) {
  const body = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--border-strong)]">
      <StatusChip status={row.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {row.jobCompany ?? 'Unknown company'}
        </p>
        <p className="truncate text-xs text-[var(--muted)]">
          {row.jobTitle} · {row.profileName}
        </p>
      </div>
      {/* Not a status the user set — a hint, so a silently-dropped application
          surfaces instead of sitting here looking healthy forever. */}
      {row.stale && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
          No movement in 3 weeks
        </span>
      )}
      <span className="text-xs text-[var(--muted)]">
        {row.steps} {row.steps === 1 ? 'step' : 'steps'}
      </span>
      <span className="text-xs text-[var(--muted)]">{relative(row.lastActivityAt)}</span>
    </div>
  );

  // A pruned job leaves `jobId` null. The record still reads — that is why the
  // title and company are denormalised onto it — but there is nowhere to link.
  return row.jobId ? (
    <Link href={timelineHref(row.jobId, row.profileId)} className="block">
      {body}
    </Link>
  ) : (
    <div title="The original posting has been removed">{body}</div>
  );
}

/** Straight to the Interview tab, on the profile the process belongs to. */
const timelineHref = (jobId: number, profileId: number | null) =>
  `/jobs/${jobId}?tab=interview${profileId ? `&profile=${profileId}` : ''}`;

/** The agenda carries no profile id, so borrow it from the matching summary. */
function interviewProfile(rows: InterviewSummary[], interviewId: number): number | null {
  return rows.find((r) => r.id === interviewId)?.profileId ?? null;
}

/**
 * "3 days ago". Computed on the server against a `force-dynamic` render, so it
 * is correct at request time and never hydration-mismatches.
 */
function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Same label rule the sidebar and the profiles page use. */
const profileName = (p: {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
