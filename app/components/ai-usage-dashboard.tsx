'use client';

import { useState, useTransition } from 'react';
import { tokens, usd, type UsageSummary } from '@/lib/ai-usage';
import {
  BreakdownTable,
  CostChart,
  DailyTable,
  Notice,
  RangeTabs,
  RateCard,
  Stat,
  UnpricedNotice,
} from './ai-usage-parts';

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
        <RangeTabs days={days} pending={pending} onChange={changeRange} />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {data.from} to {data.to} (UTC)
        </span>
      </div>

      {failed && (
        <Notice>Could not load that range. The figures below are still the previous one.</Notice>
      )}

      <UnpricedNotice count={data.unpricedCalls} />

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
