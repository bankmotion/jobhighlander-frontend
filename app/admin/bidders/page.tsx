import Link from 'next/link';
import { fetchSharedProfiles } from '@/lib/profiles';
import { fetchPendingUsers } from '@/lib/admin';
import { BiddersManager } from '@/app/components/bidders-manager';
import { CreateBidder } from '@/app/components/create-bidder';
import { PendingSignups } from '@/app/components/pending-signups';

export const dynamic = 'force-dynamic';

export default async function BiddersPage() {
  // Failing soft: a sign-up queue that cannot be read is a reason to hide that
  // panel, not to take down the page that shares profiles.
  const [profiles, pending] = await Promise.all([
    fetchSharedProfiles(),
    fetchPendingUsers().catch(() => []),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Bidders</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Invite someone by email to use one of your profiles — a bidder, another admin, or a super
        admin. They can view it and generate resumes from it; only you can edit it.
      </p>

      {/* Above the create form on purpose: someone who has already signed up
          needs a role, not a second account, and offering the form first
          invites making a duplicate of an account that exists. */}
      <PendingSignups initial={pending} />

      {/* Creating an account and sharing a profile with them are two steps of
          the same job, so they live on one page. Shown even with no profiles —
          the account is useful before there is anything to share. */}
      <CreateBidder />

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          You have no profiles to share yet.{' '}
          <Link href="/profiles" className="text-[var(--text)] underline hover:text-white">
            Create one first
          </Link>
          .
        </div>
      ) : (
        <BiddersManager initial={profiles} />
      )}
    </div>
  );
}
