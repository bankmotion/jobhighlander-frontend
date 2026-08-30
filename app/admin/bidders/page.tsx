import Link from 'next/link';
import { fetchSharedProfiles } from '@/lib/profiles';
import { BiddersManager } from '@/app/components/bidders-manager';

export const dynamic = 'force-dynamic';

export default async function BiddersPage() {
  const profiles = await fetchSharedProfiles();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Bidders</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Invite someone by email to use one of your profiles — a bidder, another admin, or a super
        admin. They can view it and generate resumes from it; only you can edit it.
      </p>

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
