import { fetchBidPerformance } from '@/lib/stats.server';
import { fetchProfiles } from '@/lib/profiles';
import { getSession } from '@/lib/auth';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';
import { QueryPrefsRestore } from '@/app/components/query-prefs-restore';
import { bidPrefs } from '@/lib/view-prefs';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function BidPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    preset?: string;
    from?: string;
    to?: string;
    profile?: string;
    user?: string;
  }>;
}) {
  const sp = await searchParams;

  const custom =
    sp.from && sp.to && ISO_DATE.test(sp.from) && ISO_DATE.test(sp.to) && sp.from <= sp.to
      ? { from: sp.from, to: sp.to }
      : null;

  // The calendar day so far, distinct from `days=1` which is a rolling 24h.
  const today = sp.preset === 'today';

  const parsedDays = Number(sp.days);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(parsedDays, 365) : 1;

  const parsedProfile = Number(sp.profile);
  const wantedProfile = Number.isInteger(parsedProfile) && parsedProfile > 0 ? parsedProfile : null;

  // Absent means EVERYONE. A specific person is named by id — including the
  // viewer themselves, which is what "Just me" now selects — so the default
  // needs no sentinel of its own. `user=all` is still accepted so links saved
  // before this change keep working.
  const parsedUser = Number(sp.user);
  const bidder: number | 'all' =
    Number.isInteger(parsedUser) && parsedUser > 0 ? parsedUser : 'all';

  const [profiles, session, data] = await Promise.all([
    fetchProfiles().catch(() => []),
    getSession().catch(() => null),
    fetchBidPerformance(
      custom ? { from: custom.from, to: custom.to } : today ? { preset: 'today' } : { days },
      wantedProfile ?? undefined,
      bidder ?? undefined,
    ),
  ]);

  // A profile id that is not in the viewer's list is dropped rather than passed
  // on: the backend would return zeroes for it, which reads as "no activity"
  // instead of "not yours".
  const profileId = profiles.some((p) => p.id === wantedProfile) ? wantedProfile : null;

  return (
    <div>
      <QueryPrefsRestore prefs={bidPrefs} path="/statistics/bid-performance" />
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Bid performance</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        What happened to the jobs applied to — volume, conversion to interviews, and which sources
        and employers are worth the effort. Shows the whole team by default; use the bidder filter
        to narrow to yourself or one teammate.
      </p>

      {data ? (
        <BidPerformanceDashboard
          data={data}
          profiles={profiles}
          profileId={profileId}
          bidder={bidder}
          viewerId={session?.sub ?? null}
          custom={custom}
          todayPreset={today}
        />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Statistics could not be loaded. Check that the API server is running and try again.
        </p>
      )}
    </div>
  );
}
