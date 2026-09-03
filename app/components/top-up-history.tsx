'use client';

import { useMemo, useState } from 'react';
import { STATUS_META, shortHash, usdt, type TopUpRequest } from '@/lib/billing';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const EXPLORER: Record<string, string> = {
  bep20: 'https://bscscan.com/tx/',
  erc20: 'https://etherscan.io/tx/',
};

const CHAIN_LABEL: Record<string, string> = { bep20: 'BEP20', erc20: 'ERC20' };

/**
 * Deposit claims that have been ruled on.
 *
 * Kept apart from the ledger tables because a claim is a request with an
 * outcome, not a balance movement. A rejected one never moved any money and so
 * appears in no ledger at all — which is exactly why it needs a history of its
 * own, or rejections would be invisible after the fact.
 */
export function TopUpHistory({ requests }: { requests: TopUpRequest[] }) {
  const [query, setQuery] = useState('');

  const settled = useMemo(() => requests.filter((r) => r.status !== 'pending'), [requests]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settled;
    return settled.filter(
      (r) =>
        (r.user?.email ?? '').toLowerCase().includes(q) ||
        r.txHash.toLowerCase().includes(q) ||
        (r.reviewNote ?? '').toLowerCase().includes(q),
    );
  }, [settled, query]);

  const credited = rows
    .filter((r) => r.status === 'credited')
    .reduce((n, r) => n + (r.creditedMicroUsd ?? 0), 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Credit request history</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by account, hash or note"
          className="w-60 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {rows.length} of {settled.length} · {usdt(credited)} credited
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
          {settled.length === 0
            ? 'No claim has been ruled on yet. Credited and rejected deposits appear here.'
            : 'Nothing matches that filter.'}
        </div>
      ) : (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 pb-2 pt-3 font-medium">Reviewed</th>
                <th className="px-4 pb-2 pt-3 font-medium">Account</th>
                <th className="px-4 pb-2 pt-3 font-medium">Transaction</th>
                <th className="px-4 pb-2 pt-3 font-medium">Outcome</th>
                <th className="px-4 pb-2 pt-3 text-right font-medium">Claimed</th>
                <th className="px-4 pb-2 pt-3 text-right font-medium">Credited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                      {when(r.reviewedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text)]">{r.user?.email ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`${EXPLORER[r.chain] ?? ''}${r.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-[var(--muted)] underline hover:text-white"
                      >
                        {shortHash(r.txHash)}
                      </a>
                      <span className="ml-1.5 text-[11px] text-[var(--muted)]">
                        {CHAIN_LABEL[r.chain] ?? r.chain}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {r.reviewNote && (
                        <span className="block text-xs text-[var(--muted)]">{r.reviewNote}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">
                      {usdt(r.claimedMicroUsd)}
                    </td>
                    {/* Credited sits beside claimed so any gap between what was
                        said and what arrived is visible without opening the
                        chain explorer. */}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">
                      {r.creditedMicroUsd != null ? (
                        <span className="text-green-300">{usdt(r.creditedMicroUsd)}</span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
