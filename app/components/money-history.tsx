'use client';

import { useMemo, useState } from 'react';
import { KIND_LABEL, signedUsdt, usdt, type CreditEntry, type CreditKind } from '@/lib/billing';

const when = (iso: string) => new Date(iso).toLocaleString();

/**
 * One kind of balance movement, on its own.
 *
 * Split by kind rather than one table with filter tabs: a manual deposit, an
 * AI charge and a credited claim are three different questions, and a reader
 * scanning for one of them should not have to first exclude the other two.
 *
 * Filtered in the browser — the server already sends the most recent slice, and
 * a round trip per keystroke would make scanning slower than reading.
 */
export function MoneyHistory({
  entries,
  kind,
  title,
  empty,
}: {
  entries: CreditEntry[];
  kind: CreditKind;
  title: string;
  empty: string;
}) {
  const [query, setQuery] = useState('');

  const all = useMemo(() => entries.filter((e) => e.kind === kind), [entries, kind]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        (e.user?.email ?? '').toLowerCase().includes(q) ||
        (e.note ?? '').toLowerCase().includes(q),
    );
  }, [all, query]);

  // Only over what is on screen, so the figure always describes the rows below
  // it rather than a wider set the filter has hidden.
  const net = rows.reduce((n, e) => n + e.amountMicroUsd, 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by account or note"
          className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {rows.length} of {all.length} · net{' '}
          <span className={net > 0 ? 'text-green-300' : 'text-[var(--text)]'}>
            {signedUsdt(net)}
          </span>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
          {all.length === 0 ? empty : 'Nothing matches that filter.'}
        </div>
      ) : (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 pb-2 pt-3 font-medium">When</th>
                <th className="px-4 pb-2 pt-3 font-medium">Account</th>
                <th className="px-4 pb-2 pt-3 font-medium">Detail</th>
                <th className="px-4 pb-2 pt-3 text-right font-medium">Amount</th>
                <th className="px-4 pb-2 pt-3 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                    {when(e.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text)]">{e.user?.email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="block text-[var(--text)]">
                      {e.note ?? KIND_LABEL[e.kind]}
                    </span>
                    {/* Only credits have an author; an AI charge is the system,
                        and saying so on every row would be noise. */}
                    {e.createdBy && (
                      <span className="block text-xs text-[var(--muted)]">
                        by {e.createdBy.email}
                      </span>
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
      )}
    </section>
  );
}
