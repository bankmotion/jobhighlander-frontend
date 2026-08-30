import { fetchBidPerformance } from '@/lib/stats.server';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';

export const dynamic = 'force-dynamic';

/**
 * How the bids are actually doing.
 *
 * Scoped in the backend to the profiles the viewer may use, so a bidder sees the
 * pipeline they work and nothing else — the same rule that governs marking an
 * application in the first place.
 */
export default async function BidPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const parsed = Number(days);
  const window = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 90;
  const data = await fetchBidPerformance(window);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Bid performance</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        What happened to the jobs you applied to — volume, conversion to interviews, and which
        sources and employers are worth the effort.
      </p>

      {data ? (
        <BidPerformanceDashboard data={data} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Statistics could not be loaded. Check that the API server is running and try again.
        </p>
      )}
    </div>
  );
}
