import { fetchTeamBidPerformance } from '@/lib/stats.server';
import { fetchProfiles } from '@/lib/profiles';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminBidPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; profile?: string; user?: string }>;
}) {
  const sp = await searchParams;

  const custom =
    sp.from && sp.to && ISO_DATE.test(sp.from) && ISO_DATE.test(sp.to) && sp.from <= sp.to
      ? { from: sp.from, to: sp.to }
      : null;

  const parsedDays = Number(sp.days);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(parsedDays, 365) : 90;

  const parsedProfile = Number(sp.profile);
  const wantedProfile = Number.isInteger(parsedProfile) && parsedProfile > 0 ? parsedProfile : null;

  const parsedUser = Number(sp.user);
  const userId = Number.isInteger(parsedUser) && parsedUser > 0 ? parsedUser : null;

  const [profiles, data] = await Promise.all([
    fetchProfiles().catch(() => []),
    fetchTeamBidPerformance(
      custom ? { from: custom.from, to: custom.to } : { days },
      wantedProfile ?? undefined,
      userId ?? undefined,
    ),
  ]);

  const profileId = profiles.some((p) => p.id === wantedProfile) ? wantedProfile : null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Team bid performance</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Every bidder&apos;s applications on the profiles you run — volume, conversion to interviews,
        and who is sending what. Scoped to profiles you own or were invited to.
      </p>

      {data ? (
        <BidPerformanceDashboard
          data={data}
          profiles={profiles}
          profileId={profileId}
          userId={userId}
          custom={custom}
        />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Statistics could not be loaded. Check that the API server is running and try again.
        </p>
      )}
    </div>
  );
}
