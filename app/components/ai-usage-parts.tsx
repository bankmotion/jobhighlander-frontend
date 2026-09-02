'use client';

import { RANGES, tokens, usd, type UsageBucket, type UsageSummary } from '@/lib/ai-usage';

export function Stat({
  label,
  value,
  hint,
  primary,
}: {
  label: string;
  value: string;
  hint: string;
  primary?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${primary ? 'text-[var(--primary)]' : 'text-white'}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}

export function RangeTabs({
  days,
  pending,
  onChange,
}: {
  days: number;
  pending: boolean;
  onChange: (days: number) => void;
}) {
  return (
    <>
      {RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => onChange(r.days)}
          disabled={pending}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-wait ${
            r.days === days
              ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-white'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
    </>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
      {children}
    </p>
  );
}

export function UnpricedNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Notice>
      {count} call{count === 1 ? '' : 's'} ran on a model with no published rate on this server and
      counted as $0. Every total below understates the real bill by that much.
    </Notice>
  );
}

export function CostChart({ daily, title = 'Daily spend' }: { daily: UsageBucket[]; title?: string }) {
  const peak = Math.max(...daily.map((d) => d.costUsd), 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-xs text-[var(--muted)]">peak {usd(peak)}</span>
      </div>

      {peak === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] text-sm text-[var(--muted)]">
          No generations in this range.
        </div>
      ) : (
        <>
          <div className="flex h-40 items-end gap-px" role="img" aria-label="Daily spend chart">
            {daily.map((d) => (
              <div
                key={d.key}
                // A day with spend always gets at least a sliver of height:
                // a bar rounded to zero pixels is indistinguishable from a day
                // that cost nothing, which is the one thing this must not do.
                style={{ height: d.costUsd ? `${Math.max((d.costUsd / peak) * 100, 2)}%` : '1px' }}
                title={`${d.key}: ${usd(d.costUsd)} · ${d.calls} generation${d.calls === 1 ? '' : 's'}`}
                className={`min-w-[2px] flex-1 rounded-sm transition ${
                  d.costUsd ? 'bg-[var(--primary)] hover:bg-white' : 'bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
            <span>{daily[0]?.key}</span>
            <span>{daily[daily.length - 1]?.key}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function BreakdownTable({
  title,
  rows,
  firstHeader,
  onSelect,
  selectedKey,
  share,
}: {
  title: string;
  rows: UsageBucket[];
  firstHeader: string;
  onSelect?: (row: UsageBucket) => void;
  selectedKey?: string | null;
  share?: boolean;
}) {
  const total = share ? rows.reduce((sum, r) => sum + r.costUsd, 0) : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nothing in this range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">{firstHeader}</th>
                <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                <th className="pb-2 pr-4 text-right font-medium">In</th>
                <th className="pb-2 pr-4 text-right font-medium">Out</th>
                <th className="pb-2 text-right font-medium">Cost</th>
                {share && <th className="pb-2 pl-4 text-right font-medium">Share</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const selected = selectedKey != null && selectedKey === r.key;
                return (
                  <tr
                    key={r.key}
                    onClick={onSelect ? () => onSelect(r) : undefined}
                    className={`border-t border-[var(--border)] ${
                      onSelect ? 'cursor-pointer hover:bg-white/5' : ''
                    } ${selected ? 'bg-[var(--primary)]/10' : ''}`}
                  >
                    <td className="max-w-[240px] py-2.5 pr-4">
                      <span className="block truncate font-medium text-white" title={r.label}>
                        {r.label}
                      </span>
                      {r.sub && (
                        <span className="block truncate text-xs text-[var(--muted)]" title={r.sub}>
                          {r.sub}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[var(--muted)]">{r.calls}</td>
                    <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                      {tokens(r.inputTokens + r.cacheWriteTokens + r.cacheReadTokens)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                      {tokens(r.outputTokens)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-white">{usd(r.costUsd)}</td>
                    {share && (
                      <td className="py-2.5 pl-4 text-right text-[var(--muted)]">
                        {total > 0 ? `${((r.costUsd / total) * 100).toFixed(1)}%` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DailyTable({ rows }: { rows: UsageBucket[] }) {
  const active = rows.filter((r) => r.calls > 0).reverse();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-white">By day</h2>
        <span className="text-xs text-[var(--muted)]">
          {active.length} day{active.length === 1 ? '' : 's'} with activity
        </span>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No generations in this range.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">Date (UTC)</th>
                <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                <th className="pb-2 pr-4 text-right font-medium">Fresh in</th>
                <th className="pb-2 pr-4 text-right font-medium">Cache write</th>
                <th className="pb-2 pr-4 text-right font-medium">Cache read</th>
                <th className="pb-2 pr-4 text-right font-medium">Out</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.key} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 font-medium text-white">{r.key}</td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">{r.calls}</td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.inputTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.cacheWriteTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.cacheReadTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.outputTokens)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-white">{usd(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** One rate cell: what you are billed, with the vendor's price under it when they differ. */
function Rate({ billed, list, last }: { billed: number; list: number; last?: boolean }) {
  const marked = Math.abs(billed - list) > 1e-9;
  return (
    <td className={`py-2 text-right text-[var(--muted)] ${last ? '' : 'pr-4'}`}>
      <span className={marked ? 'block text-[var(--text)]' : 'block'}>${billed.toFixed(2)}</span>
      {marked && <span className="block text-xs line-through opacity-60">${list.toFixed(2)}</span>}
    </td>
  );
}

export function RateCard({ rates }: { rates: UsageSummary['rates'] }) {
  return (
    <details className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white">
        How these figures are calculated
      </summary>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Each generation is priced when it runs and stored. Later changes — to the vendor&apos;s
        rates or to the markup below — do not rewrite past totals. Cached prompt text is billed at
        a premium the first time it is written and at a tenth of the input rate every time it is
        read afterwards, which is why a repeat application costs a fraction of the first one.
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        <span className="text-[var(--text)]">Billed</span> is what you are charged: the vendor&apos;s
        list price multiplied by this deployment&apos;s markup. Every total on this page is built
        from the billed column.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 pr-4 font-medium">Model</th>
              <th className="pb-2 pr-4 font-medium">Provider</th>
              <th className="pb-2 pr-4 text-right font-medium">Markup</th>
              <th className="pb-2 pr-4 text-right font-medium">Input / MTok</th>
              <th className="pb-2 pr-4 text-right font-medium">Cache write</th>
              <th className="pb-2 pr-4 text-right font-medium">Cache read</th>
              <th className="pb-2 text-right font-medium">Output / MTok</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.model} className="border-t border-[var(--border)]">
                <td className="py-2 pr-4 font-medium text-white">{r.model}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{r.providerLabel}</td>
                <td className="py-2 pr-4 text-right text-[var(--muted)]">
                  {r.multiplier === 1 ? 'list' : `×${Number(r.multiplier.toFixed(4))}`}
                </td>
                {/* Billed above, the vendor's own price struck through beneath
                    it — so the markup is legible on the row it applies to
                    rather than only in a column of ratios. */}
                <Rate billed={r.inputPerMTok} list={r.listInputPerMTok} />
                <Rate billed={r.cacheWritePerMTok} list={r.listInputPerMTok * 1.25} />
                <Rate billed={r.cacheReadPerMTok} list={r.listInputPerMTok * 0.1} />
                <Rate billed={r.outputPerMTok} list={r.listOutputPerMTok} last />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
