import { fetchMyInvitations, fetchProfiles } from '@/lib/profiles';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/session';
import { ProfilesManager } from '@/app/components/profiles-manager';

export const dynamic = 'force-dynamic';

export default async function ProfilesPage() {
  const [profiles, invitations, session] = await Promise.all([
    fetchProfiles(),
    fetchMyInvitations(),
    getSession(),
  ]);
  const canCreate = isAdminRole(session?.role);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Profiles</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        {canCreate
          ? 'Candidate profiles — personal information, work experience, and education. Share one with a bidder from the Bidders page.'
          : 'Candidate profiles you can use for resumes. An admin has to invite you to theirs.'}
      </p>
      <ProfilesManager initial={profiles} invitations={invitations} canCreate={canCreate} />
    </div>
  );
}
