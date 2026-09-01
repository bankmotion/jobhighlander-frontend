'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileSummary } from '@/lib/types';
import { AppliedApplications, WhoBid } from './bid-applied-parts';
import { bidPrefs } from '@/lib/view-prefs';
import {
  bucketDaily,
  dateInputValue,
  pctText,
  siteLabel,
  FUNNEL_RAMP,
  RANGES,
  SERIES,
  type BidPerformance,
} from '@/lib/stats';

export function BidPerformanceDashboard({
  data,
  profiles,
  profileId,
  bidder = null,
  viewerId = null,
  custom,
}: {
  data: BidPerformance;
  profiles: ProfileSummary[];
  profileId: number | null;
  // null = the viewer's own bids, 'all' = everyone, a number = that teammate.
  bidder?: number | 'all' | null;
  // Needed so the viewer's own row can be labelled rather than shown twice.
  viewerId?: number | null;
  custom: { from: string; to: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(data.range.days);
  const [from, setFrom] = useState(custom?.from ?? dateInputValue(new Date(data.range.from)));
  const [to, setTo] = useState(custom?.to ?? dateInputValue(new Date(data.range.to)));
  const today = dateInputValue(new Date());
  const rangeInvalid = from > to;

  const series = useMemo(() => bucketDaily(data.daily), [data.daily]);
  const weekly = data.daily.length > 31;

  function navigate(
    next: {
      days?: number;
      from?: string;
      to?: string;
      profile?: string | null;
      bidder?: string | null;
    } = {},
  ) {
    const q = new URLSearchParams();
    const useCustom = next.from && next.to ? true : next.days ? false : Boolean(custom);
    if (useCustom) {
      q.set('from', next.from ?? custom!.from);
      q.set('to', next.to ?? custom!.to);
    } else {
      q.set('days', String(next.days ?? days));
    }
    const p = next.profile !== undefined ? next.profile : profileId ? String(profileId) : null;
    if (p) q.set('profile', p);
    const b = next.bidder !== undefined ? next.bidder : bidder != null ? String(bidder) : null;
    if (b) q.set('user', b);
    // Remembered for the next visit. Written here rather than in an effect so
    // it records what the user chose, not whatever a restore happened to load.
    bidPrefs.save(q.toString());
    startTransition(() => router.push(`?${q}`, { scroll: false }));
  }

  function setRange(next: number) {
    setDays(next);
    // Clearing from/to is what makes a preset click override a custom range.
    navigate({ days: next, from: undefined, to: undefined });
  }

  const empty = data.totals.applications === 0;

  return (
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              aria-pressed={!custom && days === r.days}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                !custom && days === r.days
                  ? 'bg-[var(--primary)] font-medium text-white'
                  : 'border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">From</span>
            <input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">To</span>
            <input
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <button
            type="button"
            onClick={() => navigate({ from, to })}
            disabled={rangeInvalid}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-50"
          >
            Apply range
          </button>
          {custom && (
            <button
              type="button"
              onClick={() => setRange(1)}
              className="rounded-lg px-2 py-1.5 text-sm text-[var(--muted)] underline transition hover:text-white"
            >
              Clear
            </button>
          )}

          {profiles.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Profile
              </span>
              <select
                value={profileId ?? ''}
                onChange={(e) => navigate({ profile: e.target.value || null, bidder: null })}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">All profiles</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {data.bidders.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Bidder
              </span>
              <select
                value={bidder ?? ''}
                onChange={(e) => navigate({ bidder: e.target.value || null })}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">Just me</option>
                <option value="all">All team members</option>
                {data.bidders
                  .filter((b) => b.userId !== viewerId)
                  .map((b) => (
                  <option key={b.userId} value={b.userId}>
                    {b.email}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {rangeInvalid && (
          <p className="text-xs text-red-400">The start date must be on or before the end date.</p>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applications" value={data.totals.applications} hint={`${data.totals.companies} companies`} />
        <Stat
          label="Interview rate"
          value={pctText(data.rates.interview)}
          hint={`${data.totals.interviews} of ${data.totals.applications} reached an interview`}
        />
        <Stat label="Offers" value={data.totals.offers} hint={`${pctText(data.rates.offer)} of applications`} />
        <Stat label="Live interviews" value={data.totals.activeInterviews} hint="Currently in progress" />
      </div>

      {empty ? (
        <Card title="No applications yet">
          <p className="text-sm text-[var(--muted)]">
            Nothing was marked as applied in this window. Mark a job as applied from the jobs list
            and its progress will show up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card
            title={weekly ? 'Applications per week' : 'Applications per day'}
            note={weekly ? 'Bucketed weekly — a year of daily marks is unreadable' : undefined}
          >
            <TrendChart series={series} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Pipeline" note="Each stage is a subset of the one above it">
              <Funnel stages={data.funnel} />
            </Card>
            <Card title="Where the bids came from">
              <SiteBars rows={data.bySite} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Most-applied companies" note="Top 10 by application count">
              <BarList
                rows={data.byCompany.map((c) => ({
                  key: c.company,
                  label: c.company,
                  value: c.applications,
                  note: c.interviews > 0 ? `${c.interviews} interviewed` : undefined,
                }))}
              />
            </Card>
            <Card title="Interview outcomes" note="All interviews, not only this window">
              <BarList
                rows={data.outcomes.map((o) => ({ key: o.status, label: o.label, value: o.count }))}
              />
            </Card>
          </div>

          <WhoBid
            total={data.totals.applications}
            note="Who submitted these applications — the profile owner and any teammate with access."
            slices={data.byUser.map((u) => ({
              key: String(u.userId),
              label: u.userId === viewerId ? `${u.email} (you)` : u.email,
              count: u.applications,
              sublabel: u.interviews > 0 ? `${u.interviews} reached an interview` : undefined,
            }))}
          />

          <AppliedApplications rows={data.applied} total={data.totals.applications} />

          {data.byUser.length > 1 && (
            <Card title="By bidder" note="Who sent the bids on these profiles">
              <BidderTable rows={data.byUser} />
            </Card>
          )}

          {data.byProfile.length > 1 && (
            <Card title="By profile">
              <ProfileTable rows={data.byProfile} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-[var(--muted)]">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-[var(--muted)]">{children}</p>;
}


function TrendChart({
  series,
}: {
  series: { key: string; label: string; applications: number; interviews: number }[];
}) {
  const max = Math.max(1, ...series.map((d) => d.applications));
  const H = 132;
  return (
    <div>
      <div className="flex h-[132px] items-end gap-[2px]" role="img" aria-label="Applications over time">
        {series.map((d) => {
          const h = d.applications === 0 ? 0 : Math.max(3, Math.round((d.applications / max) * H));
          const peak = d.applications === max && max > 0;
          return (
            <div key={d.key} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: H }}>
              {peak && (
                <span className="mb-1 text-xs font-semibold tabular-nums text-[var(--text)]">
                  {d.applications}
                </span>
              )}
              <div
                className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: h, background: SERIES, minWidth: 2 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text)] shadow-lg group-hover:block">
                {d.label}: <strong>{d.applications}</strong> applied
                {d.interviews > 0 && <> · {d.interviews} interviewed</>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function BarList({
  rows,
}: {
  rows: { key: string; label: string; value: number; note?: string; title?: string }[];
}) {
  const values = rows.map((r) => r.value);
  const max = Math.max(1, ...values);
  const varies = rows.length > 1 && Math.min(...values) !== Math.max(...values);
  return (
    <ul className={varies ? 'space-y-2.5' : 'divide-y divide-[var(--border)]'}>
      {rows.map((r) => (
        <li key={r.key} className={varies ? undefined : 'flex items-baseline justify-between gap-3 py-1.5'}>
          {varies ? (
            <>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-[var(--text)]" title={r.title ?? r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">
                  <strong className="text-white">{r.value}</strong>
                  {r.note && <> · {r.note}</>}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.value / max) * 100}%`, background: SERIES }}
                />
              </div>
            </>
          ) : (
            <>
              <span className="truncate text-sm text-[var(--text)]" title={r.title ?? r.label}>
                {r.label}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">
                <strong className="text-white">{r.value}</strong>
                {r.note && <> · {r.note}</>}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Funnel({ stages }: { stages: BidPerformance['funnel'] }) {
  const top = Math.max(1, stages[0]?.count ?? 1);
  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => {
        const share = (s.count / top) * 100;
        return (
          <li key={s.stage}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-[var(--text)]">{s.label}</span>
              <span className="tabular-nums text-[var(--muted)]">
                <strong className="text-white">{s.count}</strong>
                {i > 0 && <> · {pctText(top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0)}</>}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(share, s.count > 0 ? 2 : 0)}%`, background: FUNNEL_RAMP[i] }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SiteBars({ rows }: { rows: BidPerformance['bySite'] }) {
  if (rows.length === 0) return <Empty>No sources yet.</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.applications));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.site}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-[var(--text)]">{siteLabel(r.site)}</span>
            <span className="tabular-nums text-[var(--muted)]">
              <strong className="text-white">{r.applications}</strong>
              {r.interviews > 0 && <> · {pctText(r.rate)} interviewed</>}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.applications / max) * 100}%`, background: SERIES }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProfileTable({ rows }: { rows: BidPerformance['byProfile'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="pb-2 font-medium">Profile</th>
            <th className="pb-2 text-right font-medium">Applied</th>
            <th className="pb-2 text-right font-medium">Interviews</th>
            <th className="pb-2 text-right font-medium">Offers</th>
            <th className="pb-2 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.profileId} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2 text-[var(--text)]">{r.name}</td>
              <td className="py-2 text-right tabular-nums text-white">{r.applications}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">{r.interviews}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">{r.offers}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">
                {pctText(r.applications ? Math.round((r.interviews / r.applications) * 1000) / 10 : 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BidderTable({ rows }: { rows: BidPerformance['byUser'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="pb-2 font-medium">Bidder</th>
            <th className="pb-2 text-right font-medium">Applied</th>
            <th className="pb-2 text-right font-medium">Interviews</th>
            <th className="pb-2 text-right font-medium">Offers</th>
            <th className="pb-2 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2 text-[var(--text)]">{r.email}</td>
              <td className="py-2 text-right tabular-nums text-white">{r.applications}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">{r.interviews}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">{r.offers}</td>
              <td className="py-2 text-right tabular-nums text-[var(--muted)]">
                {pctText(r.applications ? Math.round((r.interviews / r.applications) * 1000) / 10 : 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
