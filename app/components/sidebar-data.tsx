import { fetchProfiles } from '@/lib/profiles';
import { fetchPendingTopUpCount } from '@/lib/billing.server';
import { Sidebar } from './sidebar';
import type { Role } from '@/lib/session';

export async function SidebarData({ role }: { role: Role }) {
  // The claim count is only fetched for the people who can act on it. Everyone
  // else would get a 403 on every page load for a badge they never see.
  const [profiles, pendingPayments] = await Promise.all([
    fetchProfiles().catch(() => []),
    role === 'super_admin' ? fetchPendingTopUpCount().catch(() => 0) : Promise.resolve(0),
  ]);
  return <Sidebar role={role} profiles={profiles} pendingPayments={pendingPayments} />;
}
