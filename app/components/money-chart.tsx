'use client';

import { useState } from 'react';
import { usdt, type MoneyDay } from '@/lib/billing';

/**
 * Money in and money out, per day, as SMALL MULTIPLES.
 *
 * Two panels rather than two lines on one plot. Deposits arrive in hundreds and
 * AI spend in fractions of a dollar — roughly 400x apart on live data — so a
 * shared axis would flatten the spend line onto the baseline and say nothing.
 *
 * The fix is deliberately not a second y-axis. A dual-scale chart makes two
 * unrelated magnitudes look comparable and invites reading a crossing point
 * that has no meaning. Each panel keeps its own scale, states its own peak, and
 * shares only the time axis — which is the one thing the two series genuinely
 * have in common.
 *
 * Colours are categorical slots 1 and 2, validated against this app's light and
 * dark surfaces (CVD ΔE 26.8 dark / 24.7 light, both well over the gates).
 */

const W = 760;
const ROW_H = 74;
const PAD = { top: 10, right: 12, bottom: 18, left: 58 };

const short = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

interface Panel {
  label: string;
  color: string;
  pick: (d: MoneyDay) => number;
}

const PANELS: Panel[] = [
  { label: 'Credited in', color: 'var(--viz-in)', pick: (d) => d.creditedMicroUsd },
  { label: 'AI spend', color: 'var(--viz-out)', pick: (d) => d.spentMicroUsd },
];

export function MoneyChart({ series }: { series: MoneyDay[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const x = (i: number) =>
    PAD.left + (series.length < 2 ? plotW / 2 : (i / (series.length - 1)) * plotW);

  const active = hover != null ? series[hover] : null;
  const empty = series.every((d) => d.creditedMicroUsd === 0 && d.spentMicroUsd === 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Money in and out</h2>
        <span className="text-xs text-[var(--muted)]">
          {active ? (
            <span className="tabular-nums text-[var(--text)]">
              {active.day} · in {usdt(active.creditedMicroUsd)} · out{' '}
              {usdt(active.spentMicroUsd)}
            </span>
          ) : (
            'last 30 days (UTC) · separate scales'
          )}
        </span>
      </div>

      {empty ? (
        <div className="flex h-[168px] items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] text-sm text-[var(--muted)]">
          No money has moved in the last 30 days.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${PANELS.length * ROW_H + 16}`}
          className="w-full"
          role="img"
          aria-label="Daily credits and AI spend over the last 30 days, on separate scales"
          onMouseLeave={() => setHover(null)}
        >
          {PANELS.map((panel, row) => {
            const top = row * ROW_H;
            const plotH = ROW_H - PAD.top - PAD.bottom;
            // Each panel scales to its own peak. A floor of 1 keeps an all-zero
            // panel flat on the baseline instead of dividing by zero.
            const peak = Math.max(...series.map(panel.pick), 1);
            const y = (v: number) => top + PAD.top + plotH - (v / peak) * plotH;
            const d = series
              .map((pt, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(panel.pick(pt)).toFixed(1)}`)
              .join(' ');

            return (
              <g key={panel.label}>
                {/* The panel is named on the plot itself, so identity never
                    depends on matching a colour to a legend elsewhere. */}
                <text x={PAD.left} y={top + 8} className="fill-[var(--muted)] text-[10px]">
                  {panel.label}
                </text>
                <text
                  x={PAD.left - 8}
                  y={top + PAD.top + 4}
                  textAnchor="end"
                  className="fill-[var(--muted)] text-[9px] tabular-nums"
                >
                  {usdt(peak)}
                </text>
                <text
                  x={PAD.left - 8}
                  y={top + PAD.top + plotH + 3}
                  textAnchor="end"
                  className="fill-[var(--muted)] text-[9px]"
                >
                  $0
                </text>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={top + PAD.top + plotH}
                  y2={top + PAD.top + plotH}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={panel.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hover != null && (
                  <>
                    <line
                      x1={x(hover)}
                      x2={x(hover)}
                      y1={top + PAD.top}
                      y2={top + PAD.top + plotH}
                      stroke="var(--border-strong)"
                      strokeWidth={1}
                    />
                    {/* 2px surface ring so the marker stays legible wherever it
                        lands on the line. */}
                    <circle
                      cx={x(hover)}
                      cy={y(panel.pick(series[hover]))}
                      r={4}
                      fill={panel.color}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  </>
                )}
              </g>
            );
          })}

          {series.map((d, i) =>
            i % 7 === 0 || i === series.length - 1 ? (
              <text
                key={`t${d.day}`}
                x={x(i)}
                y={PANELS.length * ROW_H + 8}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[9px] tabular-nums"
              >
                {short(d.day)}
              </text>
            ) : null,
          )}

          {/* One hit target per day spanning both panels, so hovering either
              row reads the same date on both. */}
          {series.map((d, i) => (
            <rect
              key={d.day}
              x={x(i) - plotW / series.length / 2}
              y={0}
              width={plotW / series.length}
              height={PANELS.length * ROW_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
