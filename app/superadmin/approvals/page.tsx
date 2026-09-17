import { fetchGrants } from '@/lib/grants.server';
import { GrantsManager } from '@/app/components/grants-manager';

export const dynamic = 'force-dynamic';

/**
 * Things a super admin has to say yes to.
 *
 * Deliberately "Approvals" and not "Site access": a paid job source is the
 * first of these, not the only one — the applied-by count is already a second,
 * and more are coming. Anything needing a super admin's decision becomes a
 * registry entry on the server and appears here as a column, rather than
 * becoming another page a reader has to know exists.
 */
export default async function ApprovalsPage() {
  const grants = await fetchGrants();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Approvals</h1>
      <p className="mb-6 max-w-3xl text-sm text-[var(--muted)]">
        Per-profile permissions. Everything here is denied until you grant it, and a profile
        without a grant sees no trace of what it is missing — not in the list, not by direct link,
        and not in any count.
      </p>

      <GrantsManager initial={grants} />
    </div>
  );
}
