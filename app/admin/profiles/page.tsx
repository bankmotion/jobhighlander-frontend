import { fetchAllProfiles } from '@/lib/admin-profiles.server';
import { AdminProfilesTable } from '@/app/components/admin-profiles-table';

export const dynamic = 'force-dynamic';

// Super-admin only. Under /admin, so middleware gates the route; the backend
// gates the data, which is what actually protects it.
export default async function AdminProfilesPage() {
  const profiles = await fetchAllProfiles();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Profiles</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Every profile in the system, and whether it may spend AI credit. Switching a profile off
        stops resume generation, cover letters and Ask AI for it immediately — for every member,
        not just its owner. New profiles start disabled.
      </p>

      {profiles ? (
        <AdminProfilesTable initial={profiles} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Profiles could not be loaded. Check that the API server is running, and that your account
          still holds the super admin role.
        </p>
      )}
    </div>
  );
}
