import { InboxMenu } from './inbox-menu';
import { RefreshButton } from './refresh-button';
import { ThemeToggle } from './theme-toggle';
import { NavToggle } from './nav-toggle';
import { AccountMenu } from './account-menu';
import { BalanceChip } from './balance-chip';
import { fetchMyInvitations } from '@/lib/profiles';
import { fetchBalance } from '@/lib/billing.server';
import type { Session } from '@/lib/session';

/**
 * The bar is grouped by what each control is FOR, with a divider between
 * groups, rather than being one undifferentiated row of ten items:
 *
 *   1. view controls  — sidebar, theme, refresh. Icon-only and recessive;
 *                       they change how the page looks, never what it says.
 *   2. state          — balance and inbox. The two things that change on their
 *                       own and that the user may need to act on.
 *   3. identity       — one avatar, opening everything about the account.
 *
 * Before this, identity spent four slots (email, "Signed in", role chip, a
 * Logout button) plus a time-zone dropdown, all at the same visual weight as
 * the balance — so the one number that decides whether the AI works at all
 * was competing with a caption that never changes.
 */
export async function Topbar({ session }: { session: Session }) {
  // Both in parallel — neither depends on the other, and the bar is on the
  // critical path of every page.
  const [invitations, balance] = await Promise.all([
    fetchMyInvitations().catch(() => []),
    fetchBalance().catch(() => null),
  ]);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-2.5">
        <span className="text-lg font-semibold tracking-tight md:hidden">
          Job<span className="text-[var(--primary)]">HighLander</span>
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <NavToggle />
          <ThemeToggle />
          <RefreshButton />

          <span aria-hidden className="mx-1.5 h-5 w-px bg-[var(--border)]" />

          <BalanceChip balance={balance} />
          <InboxMenu invitations={invitations} />

          <span aria-hidden className="mx-1.5 h-5 w-px bg-[var(--border)]" />

          <AccountMenu session={session} />
        </div>
      </div>
    </header>
  );
}
