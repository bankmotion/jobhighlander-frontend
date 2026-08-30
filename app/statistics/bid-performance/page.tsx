import { fetchBidPerformance } from '@/lib/stats.server';
import { fetchProfiles } from '@/lib/profiles';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How the bids are actually doing.
 *
 * Scoped in the backend to the profiles the viewer may use, so a bidder sees the
 * pipeline they work and nothing else — the same rule that governs marking an
 * application in the first place. `profile` narrows that further; omitting it
 * aggregates every profile the viewer can see.
 *
 * The window lives in the URL so a particular view is shareable and the first
 * paint is already correct. An explicit `from`/`to` wins over `days`, matching
 * how the API resolves the same pair.
 */
export default async function BidPerformancePage({
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
        What happened to the jobs you applied to — volume, conversion to interviews, and which
        sources and employers are worth the effort.
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
