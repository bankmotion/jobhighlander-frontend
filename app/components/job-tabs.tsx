'use client';

import { useRef, useState, type ReactNode } from 'react';

export interface JobTab {
  key: string;
  label: string;
  /** Rendered on the server and passed down, so switching never refetches. */
  content: ReactNode;
  /** Small count or hint shown beside the label. */
  badge?: string;
}

/**
 * Tabs for the job detail page. Every panel is rendered up front and hidden with
 * `hidden` rather than unmounted — switching back to the resume tab must not
 * discard a generated result or the notes the user typed.
 */
export function JobTabs({ tabs }: { tabs: JobTab[] }) {
  const [active, setActive] = useState(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    btnRefs.current[next]?.focus();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div
        role="tablist"
        aria-label="Job detail sections"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-3 pt-3"
      >
        {tabs.map((t, i) => {
          const selected = i === active;
          return (
            <button
              key={t.key}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`relative whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--surface-2)] text-white'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-normal text-[var(--muted)]">
                  {t.badge}
                </span>
              )}
              {selected && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--primary)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`panel-${t.key}`}
          aria-labelledby={`tab-${t.key}`}
          hidden={i !== active}
          tabIndex={0}
          className="p-6 focus:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
