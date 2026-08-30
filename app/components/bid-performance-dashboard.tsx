'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  bucketDaily,
  pctText,
  siteLabel,
  FUNNEL_RAMP,
  RANGES,
  SERIES,
  type BidPerformance,
} from '@/lib/stats';

/**
 * Bid performance.
 *
 * Every form here was picked from the data's job, not from what looks busy:
 * headline numbers are stat tiles rather than one-bar charts, magnitude
 * comparisons are bars in a single hue (length already encodes the value, so a
 * second colour channel would be decoration), and the funnel uses an ordinal
 * one-hue ramp because its stages are ordered, not distinct identities.
 *
 * There is no categorical palette anywhere on this page, which is deliberate:
 * nothing here needs the reader to tell series apart by colour, so every mark
 * carries a text label and colour stays a single validated hue.
 */
export function BidPerformanceDashboard({ data }: { data: BidPerformance }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(data.range.days);

  const series = useMemo(() => bucketDaily(data.daily), [data.daily]);
  const weekly = data.daily.length > 31;

  function setRange(next: number) {
    setDays(next);
    // `days` is the only query this page carries, so the URL can be written
    // outright. That also avoids useSearchParams, which the Next 16 docs say
    // needs a Suspense boundary to keep the tree prerenderable.
    startTransition(() => router.push(`?days=${next}`, { scroll: false }));
  }

  const empty = data.totals.applications === 0;

  return (
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* Filters sit in one row above the charts. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setRange(r.days)}
            aria-pressed={days === r.days}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              days === r.days
                ? 'bg-[var(--primary)] font-medium text-white'
                : 'border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
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

/* ------------------------------- chrome --------------------------------- */

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

/** A headline number. The right form for one value — not a one-bar chart. */
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

/* -------------------------------- charts -------------------------------- */

/**
 * Applications over time. One series, so no legend — the card title names it.
 * Columns rather than a line: the values are counts of discrete events, and a
 * line between two sparse days implies a rate that was never measured.
 */
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
              {/* Direct label on the peak only — a number on every mark is noise. */}
              {peak && (
                <span className="mb-1 text-xs font-semibold tabular-nums text-[var(--text)]">
                  {d.applications}
                </span>
              )}
              {/* Capped at 24px: a sparse range must not render as giant slabs.
                  The band's leftover is air, not mark. */}
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

/**
 * A ranked list that only draws bars when they say something.
 *
 * When every value is identical the bars are all full width and encode nothing —
 * ten equal bars read as a chart while carrying strictly less information than
 * the numbers beside them. In that case the list drops to plain rows.
 */
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

/**
 * The pipeline. An ordinal ramp (one hue, light→dark) because the stages are
 * ordered; a categorical palette here would imply they are unrelated classes.
 */
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

/** Magnitude by category → bars, single hue. Length is the encoding. */
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

/** More than a handful of dimensions per row → a table, not more marks. */
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
