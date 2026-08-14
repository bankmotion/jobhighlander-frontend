import { fetchProfiles } from '@/lib/profiles';
import { ProfilesManager } from '@/app/components/profiles-manager';

export const dynamic = 'force-dynamic';

export default async function ProfilesPage() {
  const profiles = await fetchProfiles();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Profiles</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Manage candidate profiles — personal information, work experience, and education.
      </p>
      <ProfilesManager initial={profiles} />
    </div>
  );
}
