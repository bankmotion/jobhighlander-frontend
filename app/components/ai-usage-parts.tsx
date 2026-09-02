'use client';

import { useState } from 'react';
import {
  RANGES,
  dateInputValue,
  rangeId,
  tokens,
  usd,
  type UsageBucket,
  type UsageRange,
  type UsageSummary,
} from '@/lib/ai-usage';

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

/**
 * Preset tabs plus a custom from/to range.
 *
 * The date inputs are always visible rather than hidden behind a "Custom"
 * tab: reaching a date range should not cost a click to discover, and the
 * inputs double as a readout of what any preset actually resolved to.
 */
export function RangeTabs({
  range,
  summary,
  pending,
  onChange,
}: {
  range: UsageRange;
  /** The window the server actually served, used to seed the date inputs. */
  summary: Pick<UsageSummary, 'from' | 'to'>;
  pending: boolean;
  onChange: (range: UsageRange) => void;
}) {
  const active = rangeId(range);
  const custom = range.kind === 'custom';
  const today = dateInputValue(new Date());

  // Seeded from whichever range is showing, so switching to a custom range
  // starts from the dates on screen instead of an empty pair of boxes. The
  // server sends "YYYY-MM-DD" or "YYYY-MM-DD HH:00"; both slice to the date.
  const [from, setFrom] = useState(range.kind === 'custom' ? range.from : summary.from.slice(0, 10));
  const [to, setTo] = useState(range.kind === 'custom' ? range.to : summary.to.slice(0, 10));

  // Follow the served window when a preset is clicked, so the inputs never
  // describe a range that is no longer on screen.
  const [seen, setSeen] = useState(summary);
  if (seen !== summary) {
    setSeen(summary);
    if (!custom) {
      setFrom(summary.from.slice(0, 10));
      setTo(summary.to.slice(0, 10));
    }
  }

  const invalid = !from || !to || from > to;

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {RANGES.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.range)}
          disabled={pending}
          aria-pressed={!custom && active === r.id}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-wait ${
            !custom && active === r.id
              ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-white'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}

      <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden />

      <label className="sr-only" htmlFor="range-from">
        From date
      </label>
      <input
        id="range-from"
        type="date"
        value={from}
        max={today}
        disabled={pending}
        onChange={(e) => setFrom(e.target.value)}
        className={`rounded-lg border bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60 ${
          custom ? 'border-[var(--primary)]' : 'border-[var(--border)]'
        }`}
      />
      <span className="text-xs text-[var(--muted)]">to</span>
      <label className="sr-only" htmlFor="range-to">
        To date
      </label>
      <input
        id="range-to"
        type="date"
        value={to}
        max={today}
        disabled={pending}
        onChange={(e) => setTo(e.target.value)}
        className={`rounded-lg border bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60 ${
          custom ? 'border-[var(--primary)]' : 'border-[var(--border)]'
        }`}
      />
      <button
        onClick={() => onChange({ kind: 'custom', from, to })}
        disabled={pending || invalid}
        title={invalid ? 'Pick a start date on or before the end date' : undefined}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Apply
      </button>
    </div>
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

export function CostChart({
  daily,
  title = 'Daily spend',
}: {
  daily: UsageBucket[];
  title?: string;
}) {
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
                title={`${d.label}: ${usd(d.costUsd)} · ${d.calls} generation${d.calls === 1 ? '' : 's'}`}
                className={`min-w-[2px] flex-1 rounded-sm transition ${
                  d.costUsd ? 'bg-[var(--primary)] hover:bg-white' : 'bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
            <span>{daily[0]?.label}</span>
            <span>{daily[daily.length - 1]?.label}</span>
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

export function DailyTable({
  rows,
  unit = 'day',
}: {
  rows: UsageBucket[];
  unit?: UsageSummary['granularity'];
}) {
  const active = rows.filter((r) => r.calls > 0).reverse();
  const noun = unit === 'hour' ? 'hour' : 'day';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-white">By {noun}</h2>
        <span className="text-xs text-[var(--muted)]">
          {active.length} {noun}
          {active.length === 1 ? '' : 's'} with activity
        </span>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No generations in this range.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">
                  {unit === 'hour' ? 'Hour (UTC)' : 'Date (UTC)'}
                </th>
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
                  <td className="py-2.5 pr-4 font-medium text-white">{r.label}</td>
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
