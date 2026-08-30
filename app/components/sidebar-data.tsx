import { fetchProfiles } from '@/lib/profiles';
import { Sidebar } from './sidebar';
import type { Role } from '@/lib/session';

export async function SidebarData({ role }: { role: Role }) {
  const profiles = await fetchProfiles().catch(() => []);
  return <Sidebar role={role} profiles={profiles} />;
}
