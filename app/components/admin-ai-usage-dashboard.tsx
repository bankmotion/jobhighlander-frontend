'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { allAiUsagePrefs } from '@/lib/view-prefs';
import {
  CALL_PAGE_SIZE,
  NO_FILTER,
  tokens,
  usageQuery,
  usd,
  when,
  type AdminUsageSummary,
  type FilterOption,
  type UsageBucket,
  type UsageCallPage,
  type UsageFilter,
} from '@/lib/ai-usage';
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

export function AdminAiUsageDashboard({
  initial,
  initialCalls,
}: {
  initial: AdminUsageSummary;
  initialCalls: UsageCallPage | null;
}) {
  const [data, setData] = useState(initial);
  const [calls, setCalls] = useState(initialCalls);
  const [days, setDays] = useState(initial.days);
  const [filter, setFilter] = useState<UsageFilter>(NO_FILTER);
  const [pending, startTransition] = useTransition();
  const [callsPending, startCallsTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [callsFailed, setCallsFailed] = useState(initialCalls === null);

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = allAiUsagePrefs.stored();
    if (!saved) return;
    const same =
      saved.days === initial.days && saved.userId === null && saved.profileId === null;
    if (same) return;
    load(saved.days, { userId: saved.userId, profileId: saved.profileId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.days]);

  function load(nextDays: number, nextFilter: UsageFilter) {
    if (pending) return;
    setFailed(false);
    setCallsFailed(false);
    startTransition(async () => {
      try {
        const [summary, page] = await Promise.all([
          getJson<AdminUsageSummary>(`/api/admin/ai-usage?${usageQuery(nextDays, nextFilter)}`),
          // Caught separately: a failed call log must not discard a summary
          // that loaded fine, since the totals are the more important half.
          getJson<UsageCallPage>(callsUrl(nextDays, nextFilter, 0)).catch(() => null),
        ]);
        setData(summary);
        setDays(nextDays);
        setFilter(nextFilter);
        allAiUsagePrefs.set({
          days: nextDays,
          userId: nextFilter.userId,
          profileId: nextFilter.profileId,
        });
        if (page) setCalls(page);
        setCallsFailed(page === null);
      } catch {
        setFailed(true);
      }
    });
  }

  function loadCalls(offset: number) {
    if (callsPending) return;
    setCallsFailed(false);
    startCallsTransition(async () => {
      try {
        setCalls(await getJson<UsageCallPage>(callsUrl(days, filter, offset)));
      } catch {
        // Keep the page that is on screen. Blanking the table would read as
        // "no calls here" when the truth is "this request did not arrive".
        setCallsFailed(true);
      }
    });
  }

  const apply = (next: Partial<UsageFilter>) => load(days, { ...filter, ...next });

  const t = data.totals;
  const totalInput = t.inputTokens + t.cacheWriteTokens + t.cacheReadTokens;
  const filtered = data.scope.userId != null || data.scope.profileId != null;

  // Read from `scope`, not from `filter`: after a failed request the two differ,
  // and the caption has to describe the figures actually on screen.
  const scopedUser = data.filters.users.find((u) => u.id === data.scope.userId);
  const scopedProfile = data.filters.profiles.find((p) => p.id === data.scope.profileId);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RangeTabs days={days} pending={pending} onChange={(d) => load(d, filter)} />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {data.from} to {data.to} (UTC)
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <Picker
          label="User"
          options={data.filters.users}
          value={data.scope.userId}
          allLabel="All users"
          disabled={pending}
          onChange={(userId) => apply({ userId })}
        />
        <Picker
          label="Profile"
          options={data.filters.profiles}
          value={data.scope.profileId}
          allLabel="All profiles"
          disabled={pending}
          onChange={(profileId) => apply({ profileId })}
        />
        {filtered && (
          <button
            onClick={() => load(days, NO_FILTER)}
            disabled={pending}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white disabled:cursor-wait"
          >
            Clear filter
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--muted)]">
          {filtered
            ? `Showing ${scopedUser?.label ?? 'all users'}${scopedProfile ? ` · ${scopedProfile.label}` : ''}`
            : `${data.filters.users.length} user${data.filters.users.length === 1 ? '' : 's'} and ${data.filters.profiles.length} profile${data.filters.profiles.length === 1 ? '' : 's'} spent in this range`}
        </span>
      </div>

      <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {failed && (
          <Notice>
            Could not load that view. The figures below are the last ones that loaded, not the
            selection above.
          </Notice>
        )}

        <UnpricedNotice count={data.unpricedCalls} />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Total spend" value={usd(t.costUsd)} hint={`over ${data.days} days`} primary />
          <Stat
            label="Generations"
            value={String(t.calls)}
            hint={t.calls ? `${usd(t.costUsd / t.calls)} each on average` : 'none yet'}
          />
          <Stat
            label="Users"
            value={String(data.byUser.length)}
            hint={data.byUser.length ? `top: ${data.byUser[0].label}` : 'nobody spent anything'}
          />
          <Stat
            label="Profiles"
            value={String(data.byProfile.length)}
            hint={data.byProfile.length ? `top: ${data.byProfile[0].label}` : 'none used'}
          />
          <Stat label="Input tokens" value={tokens(totalInput)} hint="prompts sent, incl. cached" />
          <Stat label="Output tokens" value={tokens(t.outputTokens)} hint="documents written" />
        </div>

        <CostChart
          daily={data.daily}
          title={
            filtered
              ? `Daily spend — ${[scopedUser?.label, scopedProfile?.label].filter(Boolean).join(' · ')}`
              : 'Daily spend, everyone'
          }
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <BreakdownTable
            title="By user"
            rows={data.byUser}
            firstHeader="User"
            share
            selectedKey={data.scope.userId != null ? `u${data.scope.userId}` : null}
            onSelect={(row) => apply({ userId: idFromKey(row, 'u') })}
          />
          <BreakdownTable
            title="By profile"
            rows={data.byProfile}
            firstHeader="Profile (candidate)"
            share
            selectedKey={data.scope.profileId != null ? `p${data.scope.profileId}` : null}
            onSelect={(row) => apply({ profileId: idFromKey(row, 'p') })}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <BreakdownTable title="By generator" rows={data.byFeature} firstHeader="Generator" />
          <BreakdownTable
            title="By provider"
            rows={data.byProvider}
            firstHeader="Provider"
            share
          />
          <BreakdownTable title="By model" rows={data.byModel} firstHeader="Model" share />
        </div>

        <div className="mt-5">
          <DailyTable rows={data.daily} />
        </div>

        <div className="mt-5">
          <CallLog
            page={calls}
            pending={callsPending || pending}
            failed={callsFailed}
            onPage={loadCalls}
          />
        </div>

        <RateCard rates={data.rates} />
      </div>
    </div>
  );
}

const SHORT_FEATURE: Record<string, string> = {
  application: 'Resume + letter',
  resume: 'Resume',
  cover_letter: 'Cover letter',
};

const shortFeature = (feature: string, fallback: string): string =>
  SHORT_FEATURE[feature] ?? fallback;

const callsUrl = (days: number, filter: UsageFilter, offset: number): string =>
  `/api/admin/ai-usage/calls?${usageQuery(days, filter, { limit: CALL_PAGE_SIZE, offset })}`;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

function idFromKey(row: UsageBucket, prefix: 'u' | 'p'): number | null {
  if (!row.key.startsWith(prefix)) return null;
  const id = Number(row.key.slice(prefix.length));
  return Number.isInteger(id) ? id : null;
}

function Picker({
  label,
  options,
  value,
  allLabel,
  disabled,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: number | null;
  allLabel: string;
  disabled: boolean;
  onChange: (id: number | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
      {label}
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="max-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-white outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--primary)] disabled:cursor-wait"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
            {o.sub ? ` — ${o.sub}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

function CallLog({
  page,
  pending,
  failed,
  onPage,
}: {
  page: UsageCallPage | null;
  pending: boolean;
  failed: boolean;
  onPage: (offset: number) => void;
}) {
  const rows = page?.rows ?? [];
  const total = page?.total ?? 0;
  const offset = page?.offset ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + rows.length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Every call</h2>
        <span className="text-xs text-[var(--muted)]">
          {total === 0 ? 'nothing in this range' : `${from}–${to} of ${total}`}
        </span>
      </div>

      {failed && (
        <Notice>
          The call log did not load. Any rows below are from the last request that succeeded; the
          totals above are unaffected.
        </Notice>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {failed ? 'Nothing to show.' : 'No generations match this range and filter.'}
        </p>
      ) : (
        <div
          className={`overflow-x-auto ${pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}
        >
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">When (UTC)</th>
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Profile</th>
                <th className="pb-2 pr-4 font-medium">Job</th>
                <th className="pb-2 pr-4 font-medium">Generator</th>
                <th className="pb-2 pr-4 font-medium">Model</th>
                <th className="pb-2 pr-4 text-right font-medium">In</th>
                <th className="pb-2 pr-4 text-right font-medium">Out</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap py-2.5 pr-4 text-[var(--muted)]">{when(r.at)}</td>
                  <td className="max-w-[170px] truncate py-2.5 pr-4 text-white" title={r.userLabel}>
                    {r.userLabel}
                  </td>
                  <td
                    className="max-w-[130px] truncate py-2.5 pr-4 text-[var(--muted)]"
                    title={r.profileLabel ?? undefined}
                  >
                    {r.profileLabel ?? '—'}
                  </td>
                  <td
                    className="max-w-[190px] truncate py-2.5 pr-4 text-[var(--muted)]"
                    title={r.jobLabel ?? undefined}
                  >
                    {r.jobId != null && r.jobLabel && !r.jobLabel.endsWith('(pruned)') ? (
                      <a href={`/jobs/${r.jobId}`} className="underline hover:text-white">
                        {r.jobLabel}
                      </a>
                    ) : (
                      (r.jobLabel ?? '—')
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap py-2.5 pr-4 text-[var(--muted)]"
                    title={r.featureLabel}
                  >
                    {shortFeature(r.feature, r.featureLabel)}
                  </td>
                  {/* Model and vendor together: the same feature can now be
                      billed to either account, and the per-call log is where
                      an unexpected line on one invoice gets traced. */}
                  <td className="whitespace-nowrap py-2.5 pr-4 text-[var(--muted)]" title={r.model}>
                    <span className="block text-[var(--text)]">{r.model}</span>
                    <span className="block text-xs">
                      {r.providerLabel}
                      {/* The markup this row was billed at. Rows predating the
                          markup — or the backfill — read as list, which is the
                          audit trail for what has and has not been lifted. */}
                      {r.multiplier !== 1 && ` · ×${Number(r.multiplier.toFixed(4))}`}
                    </span>
                  </td>
                  <td
                    className="py-2.5 pr-4 text-right text-[var(--muted)]"
                    title={`${r.inputTokens} fresh · ${r.cacheWriteTokens} cache write · ${r.cacheReadTokens} cache read`}
                  >
                    {tokens(r.inputTokens + r.cacheWriteTokens + r.cacheReadTokens)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted)]">
                    {tokens(r.outputTokens)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-white">
                    {r.priced ? (
                      usd(r.costUsd)
                    ) : (
                      <span className="text-amber-300" title="No published rate for this model">
                        unpriced
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > CALL_PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <PageButton
            disabled={offset === 0 || pending}
            onClick={() => onPage(Math.max(offset - CALL_PAGE_SIZE, 0))}
          >
            ‹ Newer
          </PageButton>
          <PageButton disabled={to >= total || pending} onClick={() => onPage(offset + CALL_PAGE_SIZE)}>
            Older ›
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
