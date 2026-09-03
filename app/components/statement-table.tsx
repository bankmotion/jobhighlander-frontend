'use client';

import { useMemo, useState } from 'react';
import { KIND_LABEL, signedUsdt, usdt, type CreditEntry, type CreditKind } from '@/lib/billing';

const PAGE_SIZE = 15;

const when = (iso: string) => new Date(iso).toLocaleString();

const FILTERS: { key: CreditKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'topup', label: 'Deposits' },
  { key: 'usage', label: 'AI usage' },
  { key: 'adjustment', label: 'Adjustments' },
];

/**
 * The user's own statement, paged.
 *
 * Paged in the browser: the server already sends a bounded slice, and every
 * row is a few dozen bytes, so a round trip per page would be slower than the
 * render it replaces. If the ledger ever outgrows that slice this needs to
 * become a server query — the page size here is a display concern, not a
 * pretence that the whole history is loaded.
 *
 * A user with one AI charge per generation accumulates rows fast, so an
 * unpaged table was going to become a thousand-row wall on the one screen
 * where someone is checking a number.
 */
export function StatementTable({ entries }: { entries: CreditEntry[] }) {
  const [kind, setKind] = useState<CreditKind | 'all'>('all');
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () => (kind === 'all' ? entries : entries.filter((e) => e.kind === kind)),
    [entries, kind],
  );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamped rather than trusted: switching filters can shrink the list under a
  // page number that was valid a moment ago, which would render an empty table.
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function pick(next: CreditKind | 'all') {
    setKind(next);
    setPage(0);
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
        Nothing yet. Credits and AI charges both show up here.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => pick(f.key)}
              aria-pressed={kind === f.key}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                kind === f.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
          Nothing of that kind yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 pb-2 pt-3 font-medium">When</th>
                  <th className="px-4 pb-2 pt-3 font-medium">What</th>
                  <th className="px-4 pb-2 pt-3 text-right font-medium">Amount</th>
                  <th className="px-4 pb-2 pt-3 text-right font-medium">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                      {when(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block text-[var(--text)]">{KIND_LABEL[e.kind]}</span>
                      {e.note && (
                        <span className="block text-xs text-[var(--muted)]">{e.note}</span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${
                        e.amountMicroUsd > 0 ? 'text-green-300' : 'text-[var(--text)]'
                      }`}
                    >
                      {signedUsdt(e.amountMicroUsd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[var(--muted)]">
                      {usdt(e.balanceAfterMicroUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hidden at a single page — controls that can never do anything are
              just something else to read past. */}
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                className="jh-press rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Newer
              </button>
              <span className="text-xs tabular-nums text-[var(--muted)]">
                Page {current + 1} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages - 1}
                className="jh-press rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Older →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
