import { fetchProfiles } from '@/lib/profiles';
import { Sidebar } from './sidebar';
import type { Role } from '@/lib/session';

/**
 * Server half of the sidebar: fetches the profile list, then hands it to the
 * client nav.
 *
 * Split out so the ROOT LAYOUT never awaits it. Fetching in the layout body
 * blocked the entire shell — header, nav and page alike — behind a backend
 * round trip, so a slow API meant a blank screen rather than a skeleton. Here
 * the await happens inside the Suspense boundary, and the nav streams in behind
 * its own placeholder while everything else is already interactive.
 */
export async function SidebarData({ role }: { role: Role }) {
  const profiles = await fetchProfiles().catch(() => []);
  return <Sidebar role={role} profiles={profiles} />;
}
