import Link from 'next/link';
import { fetchProfiles } from '@/lib/profiles';
import { fetchInterviews, fetchUpcoming } from '@/lib/interviews.server';
import type { CalendarPanel, InterviewSummary, UpcomingPanel } from '@/lib/interviews';
import { StageChip } from '@/app/components/stage-badge';
import { MeetingTime } from '@/app/components/meeting-time';
import { InterviewAgendaList } from '@/app/components/interview-agenda-list';
import { StatusChip } from '@/app/components/interview-timeline';

export const dynamic = 'force-dynamic';

export default async function InterviewsPage({
  searchParams,
}: {
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
          <InterviewAgendaList
            agenda={toCalendarPanels(agenda, interviews)}
            timelineHrefFor={Object.fromEntries(
              agenda.map((p) => [
                p.panelId,
                p.jobId ? timelineHref(p.jobId, interviewProfile(interviews, p.interviewId)) : null,
              ]),
            )}
          />
        )}
      </section>

      <Section title={`Active (${live.length})`} rows={live} empty="No live processes." />
      {closed.length > 0 && <Section title={`Closed (${closed.length})`} rows={closed} />}
    </div>
  );
}

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

const timelineHref = (jobId: number, profileId: number | null) =>
  `/jobs/${jobId}?tab=interview${profileId ? `&profile=${profileId}` : ''}`;

// Upcoming meetings carry no profile or status of their own, so they are
// joined onto the interview they belong to. `stepResult` is 'pending' by
// definition here — these are meetings that have not happened yet, and the
// panel only renders a result label when it is something else.
function toCalendarPanels(
  panels: UpcomingPanel[],
  rows: InterviewSummary[],
): CalendarPanel[] {
  return panels.flatMap((p) => {
    const row = rows.find((r) => r.id === p.interviewId);
    if (!row) return [];
    return [{
      ...p,
      profileId: row.profileId,
      profileName: row.profileName,
      interviewStatus: row.status,
      stepResult: 'pending' as const,
    }];
  });
}

function interviewProfile(rows: InterviewSummary[], interviewId: number): number | null {
  return rows.find((r) => r.id === interviewId)?.profileId ?? null;
}

function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const profileName = (p: {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
