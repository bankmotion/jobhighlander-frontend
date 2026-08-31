import { fetchBidPerformance } from '@/lib/stats.server';
import { fetchProfiles } from '@/lib/profiles';
import { getSession } from '@/lib/auth';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function BidPerformancePage({
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

  const [profiles, data] = await Promise.all([
    fetchProfiles().catch(() => []),
    fetchBidPerformance(
      custom ? { from: custom.from, to: custom.to } : { days },
      wantedProfile ?? undefined,
    ),
  ]);

  // A profile id that is not in the viewer's list is dropped rather than passed
  // on: the backend would return zeroes for it, which reads as "no activity"
  // instead of "not yours".
  const profileId = profiles.some((p) => p.id === wantedProfile) ? wantedProfile : null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Bid performance</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        What happened to the jobs <strong className="font-medium text-[var(--text)]">you</strong>{' '}
        applied to — volume, conversion to interviews, and which sources and employers are worth
        the effort. On a shared profile these are your own bids, not the whole team&apos;s.
      </p>

      {data ? (
        <BidPerformanceDashboard
          data={data}
          profiles={profiles}
          profileId={profileId}
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
