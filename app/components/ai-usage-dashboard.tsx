'use client';

import { useState, useTransition } from 'react';
import { RANGES, tokens, usd, type UsageBucket, type UsageSummary } from '@/lib/ai-usage';

/**
 * The signed-in user's Anthropic spend, as a chart plus tables.
 *
 * Always one person's figures. The route handler it re-reads forwards only the
 * day count and the backend scopes the rest to the session, so there is no
 * prop, query parameter or code path here that could widen it to someone else.
 */
export function AiUsageDashboard({ initial }: { initial: UsageSummary }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState(initial.days);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function changeRange(next: number) {
    if (next === days || pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/ai-usage?days=${next}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
        setDays(next);
      } catch {
        // Leave the previous range on screen and say so. Blanking the page
        // would replace real numbers with nothing, which reads as "you spent
        // nothing" rather than "this did not load".
        setFailed(true);
      }
    });
  }

  const t = data.totals;
  const totalInput = t.inputTokens + t.cacheWriteTokens + t.cacheReadTokens;

  return (
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => changeRange(r.days)}
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
        <span className="ml-auto text-xs text-[var(--muted)]">
          {data.from} to {data.to} (UTC)
        </span>
      </div>

      {failed && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Could not load that range. The figures below are still the previous one.
        </p>
      )}

      {data.unpricedCalls > 0 && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          {data.unpricedCalls} call{data.unpricedCalls === 1 ? '' : 's'} ran on a model with no
          published rate on this server and counted as $0. Every total below understates the real
          bill by that much.
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Spend" value={usd(t.costUsd)} hint={`over ${data.days} days`} primary />
        <Stat
          label="Generations"
          value={String(t.calls)}
          hint={t.calls ? `${usd(t.costUsd / t.calls)} each on average` : 'none yet'}
        />
        <Stat label="Input tokens" value={tokens(totalInput)} hint="prompts sent, incl. cached" />
        <Stat label="Output tokens" value={tokens(t.outputTokens)} hint="documents written" />
      </div>

      <CostChart daily={data.daily} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <BreakdownTable title="By generator" rows={data.byFeature} firstHeader="Generator" />
        <BreakdownTable title="By model" rows={data.byModel} firstHeader="Model" />
      </div>

      <div className="mt-5">
        <DailyTable rows={data.daily} />
      </div>

      <RateCard rates={data.rates} />
    </div>
  );
}

function Stat({
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
 * Daily spend as bars.
 *
 * Every day in the range gets a bar, including the empty ones — dropping them
 * would compress a quiet fortnight into nothing and make the remaining days
 * look adjacent. Bars are scaled against the busiest day rather than the total,
 * so the shape of a cheap week is still readable.
 */
function CostChart({ daily }: { daily: UsageBucket[] }) {
  const peak = Math.max(...daily.map((d) => d.costUsd), 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-white">Daily spend</h2>
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

/** Shared table shell for the two breakdowns. */
function BreakdownTable({
  title,
  rows,
  firstHeader,
}: {
  title: string;
  rows: UsageBucket[];
  firstHeader: string;
}) {
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
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-[var(--border)]">
                  <td className="max-w-[220px] truncate py-2.5 pr-4 font-medium text-white" title={r.label}>
                    {r.label}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">{r.calls}</td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.inputTokens + r.cacheWriteTokens + r.cacheReadTokens)}
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

/**
 * Day-by-day detail, newest first.
 *
 * Only days that actually cost something are listed. The chart above already
 * carries the empty ones, and a 12-month range would otherwise open with three
 * hundred rows of zeroes before the first real number.
 */
function DailyTable({ rows }: { rows: UsageBucket[] }) {
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

/** The rates the figures were derived from, served by the API so the UI never
 *  hardcodes a price that can drift from the one actually charged. */
function RateCard({ rates }: { rates: UsageSummary['rates'] }) {
  return (
    <details className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white">
        How these figures are calculated
      </summary>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Each generation is priced when it runs, at the published list rate for the model it used,
        and stored. Later price changes do not rewrite past totals. Cached prompt text is billed at
        a premium the first time it is written and at a tenth of the input rate every time it is
        read afterwards, which is why a repeat application costs a fraction of the first one.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 pr-4 font-medium">Model</th>
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
                <td className="py-2 pr-4 text-right text-[var(--muted)]">
                  ${r.inputPerMTok.toFixed(2)}
                </td>
                <td className="py-2 pr-4 text-right text-[var(--muted)]">
                  ${r.cacheWritePerMTok.toFixed(2)}
                </td>
                <td className="py-2 pr-4 text-right text-[var(--muted)]">
                  ${r.cacheReadPerMTok.toFixed(2)}
                </td>
                <td className="py-2 text-right text-[var(--muted)]">
                  ${r.outputPerMTok.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
