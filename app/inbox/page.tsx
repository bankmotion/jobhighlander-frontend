import { fetchMyInvitations } from '@/lib/profiles';
import { fetchAllTopUps } from '@/lib/billing.server';
import { getSession } from '@/lib/auth';
import { InboxList } from '@/app/components/inbox-list';
import { TopUpReview } from '@/app/components/top-up-review';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const session = await getSession().catch(() => null);
  const isSuperAdmin = session?.role === 'super_admin';

  // The review queue is only fetched for the people allowed to act on it. The
  // endpoint 403s for everyone else anyway, but asking for it would put a
  // failed request on every bidder's inbox load.
  const [invitations, topUps] = await Promise.all([
    fetchMyInvitations(),
    isSuperAdmin ? fetchAllTopUps() : Promise.resolve(null),
  ]);

  const pending = topUps?.filter((r) => r.status === 'pending').length ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Inbox</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Invitations to use other people’s candidate profiles. Accepting one adds it to your
        Profiles page as view-only.
      </p>
      <InboxList initial={invitations} />

      {isSuperAdmin && (
        <section className="mt-8">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
            USDT deposits
            {pending > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                {pending} to review
              </span>
            )}
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Check each transaction hash on the chain it was sent on, then credit what actually
            arrived. The amount you enter is what lands on the user’s balance — the figure they
            submitted is only a claim.
          </p>
          {topUps ? (
            <TopUpReview initial={topUps} />
          ) : (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Deposit claims could not be loaded. Check that the API server is running.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
