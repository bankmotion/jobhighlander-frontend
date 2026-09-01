import { LogoutButton } from './logout-button';
import { InboxMenu } from './inbox-menu';
import { RefreshButton } from './refresh-button';
import { TimezonePicker } from './timezone-picker';
import { ThemeToggle } from './theme-toggle';
import { NavToggle } from './nav-toggle';
import { fetchMyInvitations } from '@/lib/profiles';
import type { Session } from '@/lib/session';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-500/15 text-purple-300',
  admin: 'bg-blue-500/15 text-blue-300',
  bidder: 'bg-green-500/15 text-green-300',
  guest: 'bg-amber-500/15 text-amber-300',
};

export async function Topbar({ session }: { session: Session }) {
  const initial = session.email.charAt(0).toUpperCase();
  // Fetched here rather than in the menu so the badge count is correct on the
  // first paint — a client fetch would render "no invitations" and then pop.
  const invitations = await fetchMyInvitations().catch(() => []);
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <span className="text-lg font-semibold tracking-tight md:hidden">
          Job<span className="text-[var(--primary)]">HighLander</span>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <NavToggle />
          <TimezonePicker />
          <ThemeToggle />
          <RefreshButton />
          <InboxMenu invitations={invitations} />
          <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline ${ROLE_BADGE[session.role]}`}>
            {session.role}
          </span>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-semibold text-[var(--text)]">
              {initial}
            </span>
            <div className="leading-tight">
              <div className="text-sm">{session.email}</div>
              <div className="text-xs text-[var(--muted)]">Signed in</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
