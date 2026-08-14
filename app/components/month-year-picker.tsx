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

  useEffect(() => {
    if (norm) setYear(Number(norm.split('-')[0]));
  }, [norm]);

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
