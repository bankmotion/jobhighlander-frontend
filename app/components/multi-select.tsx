'use client';

import { useEffect, useRef, useState } from 'react';

export interface MultiOption {
  value: string;
  label: string;
  dot?: string;
}

const inputCls =
  'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)]';

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  // Hold picks locally while the menu is open. Calling onChange per click
  // navigates, which remounts this component and slams the menu shut after every
  // single tick — so commit once, on close.
  const [draft, setDraft] = useState<string[]>(selected);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-sync whenever the menu opens, or when the URL-driven value changes.
  useEffect(() => {
    if (!open) setDraft(selected);
  }, [selected, open]);

  function close() {
    setOpen(false);
    const changed =
      draft.length !== selected.length || draft.some((v) => !selected.includes(v));
    if (changed) onChange(draft);
  }

  // `close` changes every render; hold it in a ref so the listeners below can
  // stay bound once instead of re-subscribing constantly.
  const closeRef = useRef(close);
  closeRef.current = close;

  // Close on an outside click or Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeRef.current();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const meta = (v: string) => options.find((o) => o.value === v);
  const allSelected = options.length > 0 && draft.length === options.length;

  function toggle(v: string) {
    setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        // Fixed width: sizing to the content made the button (and the menu
        // anchored to it) shift on every pick.
        className={`flex w-[220px] shrink-0 items-center justify-between gap-2 ${inputCls} ${
          open ? 'border-[var(--primary)]' : ''
        }`}
      >
        {draft.length === 0 ? (
          <span className="truncate text-[var(--muted)]">{placeholder}</span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {draft.slice(0, 2).map((v) => {
              const m = meta(v);
              return (
                <span key={v} className="flex min-w-0 items-center gap-1 text-[var(--text)]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: m?.dot ?? 'var(--primary)' }}
                  />
                  <span className="truncate">{m?.label ?? v}</span>
                </span>
              );
            })}
            {draft.length > 2 && (
              <span className="shrink-0 text-[var(--muted)]">+{draft.length - 2}</span>
            )}
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl"
        >
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <button
              type="button"
              onClick={() => setDraft(options.map((o) => o.value))}
              disabled={allSelected}
              className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setDraft([])}
              disabled={draft.length === 0}
              className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />

          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-[var(--muted)]">Nothing to filter yet</p>
          )}
          <div className="max-h-64 overflow-y-auto">
            {options.map((o) => {
              const on = draft.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    on ? 'bg-[var(--primary)]/10 text-white' : 'text-[var(--text)] hover:bg-white/5'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: o.dot ?? 'var(--primary)' }}
                  />
                  <span className="flex-1 text-left">{o.label}</span>
                  {on && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-[var(--primary)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
