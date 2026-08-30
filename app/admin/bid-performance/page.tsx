import { fetchTeamBidPerformance } from '@/lib/stats.server';
import { fetchProfiles } from '@/lib/profiles';
import { BidPerformanceDashboard } from '@/app/components/bid-performance-dashboard';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The team's bids, across every profile this admin runs.
 *
 * ADMIN LEVEL, deliberately unlike `/admin/ai-usage`, which is super-admin only.
 * The AI page exposes the shared API key's whole bill — a billing question that
 * belongs to whoever owns the key. This one answers "how is my team doing",
 * which is an admin's actual job, so it sits with Bidders and Resume Templates
 * in the admin tier.
 *
 * It stays bounded by profile access: an admin sees every bidder working the
 * profiles they own or were invited to, not every profile in the database.
 * Middleware gates the path and the backend re-checks the role — the path is
 * the first gate, not the only one.
 *
 * Distinct from `/statistics/bid-performance`, which every role reaches and
 * which counts only the caller's own bids. Two pages rather than one that
 * changes shape by role: "how am I doing" and "how is the team doing" have
 * different answers and different audiences.
 */
export default async function AdminBidPerformancePage({
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
    fetchTeamBidPerformance(
      custom ? { from: custom.from, to: custom.to } : { days },
      wantedProfile ?? undefined,
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
