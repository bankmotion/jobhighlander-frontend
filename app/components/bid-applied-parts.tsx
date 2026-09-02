'use client';

import { useMemo, useState } from 'react';
import { siteLabel } from '@/lib/stats';
import { useAppliedJobPanel } from './applied-job-panel';
import type { AppliedRow } from '@/lib/applied';

// Distinct enough to tell four or five bidders apart without being a rainbow.
// Ordinal, matching the "who bid the most" ordering of the legend.
const RAMP = ['#6c5cff', '#3987e5', '#22a06b', '#d1913c', '#b0578d', '#5a6b8c'] as const;

export interface WhoBidSlice {
  key: string;
  label: string;
  count: number;
  sublabel?: string;
}

/**
 * Who submitted these applications, as a donut plus a ranked legend.
 *
 * SVG rather than a chart library: it is one ring of arcs, and the app already
 * draws its other charts by hand. Percentages are computed from the same total
 * the KPI cards show, so the two can never disagree.
 */
export function WhoBid({
  slices,
  total,
  note,
}: {
  slices: WhoBidSlice[];
  total: number;
  note?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const ranked = useMemo(
    () => slices.filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    [slices],
  );

  if (total === 0 || ranked.length === 0) {
    return (
      <Card title="Who bid" note={note}>
        <p className="py-6 text-center text-sm text-[var(--muted)]">
          No applications in this range, so there is nobody to attribute them to.
        </p>
      </Card>
    );
  }

  // Geometry: a stroked circle whose dash pattern walks the circumference. Each
  // arc is one slice, offset by everything before it.
  //
  // The running total is accumulated HERE rather than inside the JSX map. React
  // Compiler rejects reassigning a render-scoped variable from a callback —
  // reasonably, since the order those callbacks run in is not the component's
  // to promise. Precomputing keeps the arithmetic in one obvious place too.
  const R = 54;
  const C = 2 * Math.PI * R;
  const arcs: { key: string; dash: string; offset: number; color: string }[] = [];
  let walked = 0;
  for (let i = 0; i < ranked.length; i++) {
    const len = (ranked[i].count / total) * C;
    arcs.push({
      key: ranked[i].key,
      dash: `${len} ${C - len}`,
      offset: -walked,
      color: RAMP[i % RAMP.length],
    });
    walked += len;
  }

  return (
    <Card title="Who bid" note={note}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <svg viewBox="0 0 140 140" className="h-[150px] w-[150px] -rotate-90" role="img"
            aria-label={`Applications by bidder: ${ranked.map((s) => `${s.label} ${s.count}`).join(', ')}`}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="20" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="20"
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                opacity={hover !== null && hover !== a.key ? 0.35 : 1}
                className="transition-opacity"
              />
            ))}
          </svg>
          {/* Centred over the ring rather than inside the SVG, so it is real
              text that can be selected and does not rotate with the group. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-white">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Applied
            </span>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2.5">
          {ranked.map((s, i) => {
            const share = Math.round((s.count / total) * 1000) / 10;
            return (
              <li
                key={s.key}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: RAMP[i % RAMP.length] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-[var(--text)]">{s.label}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                      {s.count.toLocaleString()} · {share}%
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <span
                      className="block h-full rounded-full transition-opacity"
                      style={{
                        width: `${share}%`,
                        background: RAMP[i % RAMP.length],
                        opacity: hover !== null && hover !== s.key ? 0.35 : 1,
                      }}
                    />
                  </span>
                  {s.sublabel && (
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{s.sublabel}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Every application in the range, with the links needed to act on one.
 *
 * Filtering is client-side and deliberately so: the rows are already loaded for
 * the charts above, and a round trip per keystroke would be slower and no more
 * correct.
 */
export function AppliedApplications({
  rows,
  total,
  showProfile = false,
}: {
  rows: AppliedRow[];
  // The true count for the range. When it exceeds `rows.length` the list was
  // capped, and saying so beats presenting a short list as the whole story.
  total: number;
  // The team view spans profiles, so it needs the column; the personal one
  // would just repeat the same name on every line.
  showProfile?: boolean;
}) {
  const [query, setQuery] = useState('');
  const panel = useAppliedJobPanel();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.jobTitle.toLowerCase().includes(q) ||
        (r.jobCompany ?? '').toLowerCase().includes(q) ||
        r.byEmail.toLowerCase().includes(q) ||
        (r.site ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  function exportCsv() {
    const header = [
      'applied_at', 'job_id', 'job_title', 'company', 'site', 'location', 'applied_by', 'profile',
    ];
    const body = shown.map((r) => [
      r.appliedAt,
      r.jobId ?? '',
      r.jobTitle,
      r.jobCompany ?? '',
      r.site ?? '',
      r.location ?? '',
      r.byEmail,
      r.profileName,
    ]);
    // Quote everything and double inner quotes: titles routinely contain commas
    // and the occasional quotation mark, either of which would shift columns.
    const csv = [header, ...body]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    // A BOM so Excel reads it as UTF-8 rather than mangling accented names.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const capped = total > rows.length;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Applied applications</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {query
              ? `${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} shown`
              : `${rows.length.toLocaleString()} in this range`}
            {capped && ` · list capped, ${total.toLocaleString()} sent in total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title, company, site or bidder"
            className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={shown.length === 0}
            title="Download the rows currently shown"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--muted)]">
          {rows.length === 0
            ? 'No applications were sent in this range.'
            : `Nothing matches “${query}”.`}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text)]">
                    {r.jobTitle}
                  </span>
                  {r.jobId && (
                    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                      #{r.jobId}
                    </span>
                  )}
                  {r.site && (
                    <span className="rounded-md bg-[var(--blue)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      {siteLabel(r.site)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {[r.jobCompany, r.location].filter(Boolean).join(' · ') || 'Company not recorded'}
                  {' · '}
                  {fmtWhen(r.appliedAt)}
                  {' · '}
                  <span className="text-[var(--text)]/70">{r.byEmail}</span>
                  {showProfile && <> · {r.profileName}</>}
                </p>
              </div>
              {/* Opens beside the list rather than in a new tab: reading one
                  posting should not cost the filters, scroll position and
                  range that were set up to find it. Only when the job still
                  exists — a deduplicated or deleted one has nothing to show. */}
              {r.jobId ? (
                <button
                  type="button"
                  onClick={() => panel.open(r.jobId as number, r.jobTitle)}
                  title="Open this posting beside the list"
                  className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text)] transition hover:border-[var(--border-strong)]"
                >
                  View job
                </button>
              ) : (
                <span className="shrink-0 text-xs text-[var(--muted)]">posting removed</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
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
