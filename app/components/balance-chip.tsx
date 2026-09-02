import Link from 'next/link';
import { usdt, type Balance } from '@/lib/billing';

/**
 * Prepaid balance, in the top bar on every page.
 *
 * Always a link to Billing rather than a plain readout: the moment it matters
 * is the moment it runs out, and that is precisely when the user needs one
 * click to the top-up page, not a hunt through the menu.
 *
 * Server-rendered with the rest of the bar so the figure is right on first
 * paint. A client fetch would show a placeholder and then pop, which for a
 * balance reads as the number changing.
 */
export function BalanceChip({ balance }: { balance: Balance | null }) {
  // Only when the balance genuinely could not be read. Rendering "$0.00" here
  // would tell the user they are broke because a request failed.
  if (!balance) {
    return (
      <span
        title="Your balance could not be loaded"
        className="hidden rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--muted)] sm:inline"
      >
        Balance unavailable
      </span>
    );
  }

  const empty = !balance.canSpend;

  return (
    <Link
      href="/billing"
      title={
        empty
          ? 'Your balance is spent — top up with USDT to keep using the AI'
          : 'USDT balance — click to top up'
      }
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
        empty
          ? 'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25'
          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--primary)]'
      }`}
    >
      {usdt(balance.balanceMicroUsd)}
      <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">USDT</span>
      {empty && <span className="ml-1.5">· Top up</span>}
    </Link>
  );
}
