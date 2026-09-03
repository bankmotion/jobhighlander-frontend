'use client';

import { useMemo, useState } from 'react';
import { usdt, type AccountSummary } from '@/lib/billing';
import { ROLE_TONE } from '@/lib/team-stats';

type Sort = 'balance' | 'spent' | 'deposited' | 'generations' | 'recent';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'balance', label: 'Balance' },
  { key: 'spent', label: 'Spent' },
  { key: 'deposited', label: 'Deposited' },
  { key: 'generations', label: 'Generations' },
  { key: 'recent', label: 'Recent' },
];

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/**
 * Every account, and what it has cost and paid.
 *
 * Sorted by balance ascending by default: the accounts at or below zero are the
 * ones blocked from generating, and they are the reason someone opens this
 * screen. Everything else is context.
 */
export function PaymentAccounts({ accounts }: { accounts: AccountSummary[] }) {
  const [sort, setSort] = useState<Sort>('balance');
  const [query, setQuery] = useState('');
  const [hideIdle, setHideIdle] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = accounts.filter((a) => {
      if (hideIdle && a.generations === 0 && a.balanceMicroUsd === 0) return false;
      return !q || a.email.toLowerCase().includes(q);
    });
    const by: Record<Sort, (a: AccountSummary, b: AccountSummary) => number> = {
      balance: (a, b) => a.balanceMicroUsd - b.balanceMicroUsd,
      spent: (a, b) => b.spentMicroUsd - a.spentMicroUsd,
      deposited: (a, b) => b.depositedMicroUsd - a.depositedMicroUsd,
      generations: (a, b) => b.generations - a.generations,
      recent: (a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''),
    };
    return [...filtered].sort(by[sort]);
  }, [accounts, sort, query, hideIdle]);

  const blocked = accounts.filter((a) => a.balanceMicroUsd <= 0).length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Accounts</h2>
        {blocked > 0 && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
            {blocked} cannot use AI
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={hideIdle}
              onChange={(e) => setHideIdle(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Hide never-used
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by email"
            className="w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-[var(--muted)]">Sort by</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            aria-pressed={sort === s.key}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              sort === s.key
                ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-white'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-3 py-3 text-right font-medium">Balance</th>
              <th className="px-3 py-3 text-right font-medium">Deposited</th>
              <th className="px-3 py-3 text-right font-medium">Adjusted</th>
              <th className="px-3 py-3 text-right font-medium">Spent</th>
              <th className="px-3 py-3 text-right font-medium">Generations</th>
              <th className="px-5 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  No account matches.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--text)]">{a.email}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          ROLE_TONE[a.role] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'
                        }`}
                      >
                        {a.role}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-medium tabular-nums ${
                      a.balanceMicroUsd > 0 ? 'text-[var(--text)]' : 'text-red-300'
                    }`}
                    title={a.balanceMicroUsd > 0 ? 'In credit' : 'Blocked from AI'}
                  >
                    {usdt(a.balanceMicroUsd)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                    {a.depositedMicroUsd ? usdt(a.depositedMicroUsd) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                    {a.adjustedMicroUsd ? usdt(a.adjustedMicroUsd) : '—'}
                  </td>
                  {/* Spent is what left a balance; charged is what the calls
                      cost. They differ for anyone who generated before
                      balances existed, so both are shown rather than one
                      standing in for the other. */}
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className="block text-[var(--text)]">{usdt(a.spentMicroUsd)}</span>
                    {a.chargedMicroUsd !== a.spentMicroUsd && (
                      <span
                        className="block text-[11px] text-[var(--muted)]"
                        title="Total cost of this account's generations, including any made before balances existed"
                        >
                        {usdt(a.chargedMicroUsd)} billed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                    {a.generations || '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--muted)]">
                    {when(a.lastActivityAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
