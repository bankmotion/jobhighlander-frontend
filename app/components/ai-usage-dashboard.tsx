'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { myAiUsagePrefs } from '@/lib/view-prefs';
import {
  DEFAULT_RANGE,
  isSameRange,
  usageQuery,
  usd,
  type UsageRange,
  type UsageSummary,
} from '@/lib/ai-usage';
import {
  BreakdownTable,
  CostChart,
  Notice,
  RangeTabs,
  Stat,
  UnpricedNotice,
} from './ai-usage-parts';

export function AiUsageDashboard({ initial }: { initial: UsageSummary }) {
  const [data, setData] = useState(initial);
  const [range, setRange] = useState<UsageRange>(DEFAULT_RANGE);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  // The page is server-rendered at a fixed range, so a remembered one has to be
  // fetched on arrival. Once per mount, and skipped when it already matches, so
  // the common case costs nothing.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = myAiUsagePrefs.stored();
    if (saved && !isSameRange(saved.range, range)) changeRange(saved.range);
    // `changeRange` is stable for this purpose: it closes over `days`, and the
    // guard above means this runs before anything can change it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.days]);

  function changeRange(next: UsageRange) {
    if (isSameRange(next, range) || pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const qs = usageQuery(next, { userId: null, profileId: null });
        const res = await fetch(`/api/ai-usage?${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
        setRange(next);
        myAiUsagePrefs.set({ range: next, userId: null, profileId: null });
      } catch {
        // Leave the previous range on screen and say so. Blanking the page
        // would replace real numbers with nothing, which reads as "you spent
        // nothing" rather than "this did not load".
        setFailed(true);
      }
    });
  }

  const t = data.totals;

  return (
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RangeTabs range={range} summary={data} pending={pending} onChange={changeRange} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="ml-auto text-xs text-[var(--muted)]">
          {data.from} to {data.to} (UTC)
        </span>
      </div>

      {failed && (
        <Notice>Could not load that range. The figures below are still the previous one.</Notice>
      )}

      <UnpricedNotice count={data.unpricedCalls} />

      {/* Cost and how many generations produced it. Token counts are left to
          the admin view: they are a unit nobody bidding can act on, and pricing
          already turns them into the number that matters. */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat label="Spend" value={usd(t.costUsd)} hint={`over ${data.rangeLabel}`} primary />
        <Stat
          label="Generations"
          value={String(t.calls)}
          hint={t.calls ? `${usd(t.costUsd / t.calls)} each on average` : 'none yet'}
        />
      </div>

      <CostChart
        daily={data.daily}
        title={data.granularity === 'hour' ? 'Spend by hour' : 'Daily spend'}
      />

      {/* "By model" is deliberately absent — which engine ran is not something
          the reader chose or can change, and it moves under them as providers
          ship new versions. Generator and provider are both actionable. */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <BreakdownTable title="By generator" rows={data.byFeature} firstHeader="Generator" costOnly />
        <BreakdownTable title="By provider" rows={data.byProvider} firstHeader="Provider" costOnly />
      </div>

      {/* DailyTable and RateCard stay in the admin view: one is mostly token
          columns, the other is a per-model price list. The chart above already
          answers "what did I spend, and when". */}
    </div>
  );
}
