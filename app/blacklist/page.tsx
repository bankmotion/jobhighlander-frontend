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
        are never hidden, so you can still see and act on them. Add a company for every profile, or
        only for the ones it applies to.
      </p>
      <BlacklistManager profiles={profiles} initial={initial} />
    </div>
  );
}
