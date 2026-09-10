import { fetchProfiles } from '@/lib/profiles';
import { fetchPendingTopUpCount } from '@/lib/billing.server';
import { fetchInterviewsSoon } from '@/lib/interviews.server';
import { Sidebar } from './sidebar';
import type { Role } from '@/lib/session';

export async function SidebarData({ role }: { role: Role }) {
  // The claim count is only fetched for the people who can act on it. Everyone
  // else would get a 403 on every page load for a badge they never see.
  const [profiles, pendingPayments, interviewsSoon] = await Promise.all([
    fetchProfiles().catch(() => []),
    role === 'super_admin' ? fetchPendingTopUpCount().catch(() => 0) : Promise.resolve(0),
    // Everyone: an interview tomorrow morning is worth flagging whatever the
    // role. The window itself is computed in the fetcher, not here — reading
    // the clock during a render is what the impure-call rule warns about.
    fetchInterviewsSoon(24).catch(() => 0),
  ]);

  return (
    <Sidebar
      role={role}
      profiles={profiles}
      pendingPayments={pendingPayments}
      interviewsSoon={interviewsSoon}
    />
  );
}
