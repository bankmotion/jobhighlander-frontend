import { fetchTeamBidPerformance } from '@/lib/team-stats.server';
import { TeamBidPerformanceDashboard } from '@/app/components/team-bid-performance-dashboard';
import { QueryPrefsRestore } from '@/app/components/query-prefs-restore';
import { teamBidPrefs } from '@/lib/view-prefs';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Super-admin only. The path is under /admin, so middleware has already
// enforced that; the backend enforces it again on the endpoint, which is what
// actually protects the data — a route gate only decides what renders.
export default async function TeamBidPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; profile?: string }>;
}) {
  const sp = await searchParams;

  const custom =
    sp.from && sp.to && ISO_DATE.test(sp.from) && ISO_DATE.test(sp.to) && sp.from <= sp.to
      ? { from: sp.from, to: sp.to }
      : null;

  const parsedDays = Number(sp.days);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(parsedDays, 365) : 1;

  // An unparseable or absent profile means "all", which is the default view.
  const parsedProfile = Number(sp.profile);
  const profileId = Number.isInteger(parsedProfile) && parsedProfile > 0 ? parsedProfile : undefined;

  const data = await fetchTeamBidPerformance(custom ? custom : { days }, profileId);

  return (
    <div>
      <QueryPrefsRestore prefs={teamBidPrefs} path="/admin/bid-performance" />
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Team bid performance</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Every profile in the system, who works on it, and what each of them sent. Unlike My
        Statistics, this ignores profile membership — it is the whole organisation, including the
        profiles and people with nothing to show.
      </p>

      {data ? (
        <TeamBidPerformanceDashboard data={data} custom={custom} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Statistics could not be loaded. Check that the API server is running, and that your account
          still holds the super admin role.
        </p>
      )}
    </div>
  );
}
