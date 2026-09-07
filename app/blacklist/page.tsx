import { fetchProfiles } from '@/lib/profiles';
import { fetchBlacklist } from '@/lib/blacklist.server';
import { BlacklistManager } from '@/app/components/blacklist-manager';

export const dynamic = 'force-dynamic';

export default async function BlacklistPage() {
  const [profiles, initial] = await Promise.all([
    fetchProfiles().catch(() => []),
    fetchBlacklist().catch(() => []),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Company blacklist</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Employers not worth bidding. Jobs from these companies are FLAGGED on the job list — they
        are never hidden, so you can still see and act on them. A blacklist belongs to a profile:
        “All my profiles” covers the ones you own plus any shared with you, and never affects other
        users.
      </p>
      <BlacklistManager profiles={profiles} initial={initial} />
    </div>
  );
}
