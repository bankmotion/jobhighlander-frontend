'use client';

import { useEffect, useRef, useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 'YYYY-MM' (or a full ISO date) → 'May 2024'. Empty string for null. */
export function formatMonthYear(v: string | null | undefined): string {
  if (!v) return '';
  const [y, m] = v.slice(0, 7).split('-');
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return v;
  return `${MONTHS_FULL[mi]} ${y}`;
}

/** A dark-themed month + year picker. Value is 'YYYY-MM' (or null). */
export function MonthYearPicker({
  value,
  onChange,
  placeholder = 'Select month',
  disabled = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const norm = value ? value.slice(0, 7) : null; // tolerate ISO input
  const selYear = norm ? Number(norm.split('-')[0]) : -1;
  const selMonth = norm ? Number(norm.split('-')[1]) - 1 : -1;
  const [year, setYear] = useState(selYear > 0 ? selYear : new Date().getFullYear());

  // Follow the value when the PARENT changes it, without an effect: writing
  // state from an effect costs a second render pass on every keystroke upstream,
  // and the lint rule that flags it is right. Same shape as AppliedProvider's
  // re-seed — compare against what we last synced from, adjust during render.
  const [syncedFrom, setSyncedFrom] = useState(norm);
  if (syncedFrom !== norm) {
    setSyncedFrom(norm);
    if (norm) setYear(Number(norm.split('-')[0]));
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(mi: number) {
    onChange(`${year}-${String(mi + 1).padStart(2, '0')}`);
    setOpen(false);
  }

  const chevron =
    'flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-white';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        }`}
      >
        <span className={norm ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
          {norm ? formatMonthYear(norm) : placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 z-30 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} className={chevron} aria-label="Previous year">
              ‹
            </button>
            <span className="text-sm font-semibold text-white">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} className={chevron} aria-label="Next year">
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isSel = i === selMonth && year === selYear;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(i)}
                  className={`rounded-md px-2 py-2 text-sm transition ${
                    isSel
                      ? 'bg-[var(--primary)] font-medium text-white'
                      : 'text-[var(--text)] hover:bg-white/5'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {norm && (
            <div className="mt-2 border-t border-[var(--border)] pt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs text-[var(--muted)] transition hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 'YYYY' (or any longer ISO date) → '2024'. Empty string for null. */
export function formatYear(v: string | null | undefined): string {
  return v ? v.slice(0, 4) : '';
}

/**
 * A year-only picker, for education.
 *
 * Separate from `MonthYearPicker` rather than a `granularity` prop on it: the
 * two disagree about almost everything — what a click means, what the popup
 * contains, what the trigger reads — so one component doing both would be two
 * components sharing a name.
 *
 * Emits a bare 'YYYY'. Tolerates a stored 'YYYY-MM-DD' on the way in, because
 * education rows written before the switch to year granularity still carry a
 * month and a day.
 */
export function YearPicker({
  value,
  onChange,
  placeholder = 'Select year',
  disabled = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = value ? Number(value.slice(0, 4)) : null;
  const thisYear = new Date().getFullYear();
  // The decade the grid is showing. Anchored on the selected year so reopening
  // a 1998 entry lands on the 1990s rather than making you page back three
  // decades to see what is already selected.
  const [decade, setDecade] = useState(() => Math.floor((selected ?? thisYear) / 10) * 10);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chevron =
    'flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-white';
  // Twelve cells: the decade plus one year either side, so a year on a boundary
  // is reachable without paging.
  const years = Array.from({ length: 12 }, (_, i) => decade - 1 + i);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? 'border-[var(--primary)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        }`}
      >
        <span className={selected ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
          {selected ? String(selected) : placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-[var(--muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 z-30 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDecade((d) => d - 10)}
              className={chevron}
              aria-label="Previous decade"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-white">
              {decade}–{decade + 9}
            </span>
            <button
              type="button"
              onClick={() => setDecade((d) => d + 10)}
              className={chevron}
              aria-label="Next decade"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(String(y));
                  setOpen(false);
                }}
                className={`rounded-md px-2 py-2 text-sm transition ${
                  y === selected
                    ? 'bg-[var(--primary)] font-medium text-white'
                    : y < decade || y > decade + 9
                      ? 'text-[var(--muted)] hover:bg-white/5'
                      : 'text-[var(--text)] hover:bg-white/5'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {selected && (
            <div className="mt-2 border-t border-[var(--border)] pt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs text-[var(--muted)] transition hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
