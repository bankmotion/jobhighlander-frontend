'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface JobTab {
  key: string;
  label: string;
  content: ReactNode;
  badge?: string;
}

export function JobTabs({ tabs, initialTab }: { tabs: JobTab[]; initialTab?: string }) {
  // The server resolves the tab from `?tab=`, so the first paint is already
  // correct and there is no hydration mismatch from reading `window` here.
  const initial = Math.max(0, tabs.findIndex((t) => t.key === initialTab));
  const [active, setActive] = useState(initial);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(i: number) {
    setActive(i);
    // history.replaceState, NOT router.replace: this page is force-dynamic, so
    // a Next navigation would refetch the RSC payload on every tab click. The
    // tab is a purely client-side concern — the URL just needs to say so.
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabs[i].key);
    window.history.replaceState(null, '', url);
  }

  // Returning to the page via back/forward restores whatever tab the URL names.
  useEffect(() => {
    const onPop = () => {
      const key = new URL(window.location.href).searchParams.get('tab');
      const i = tabs.findIndex((t) => t.key === key);
      setActive(i >= 0 ? i : 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [tabs]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
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
              onClick={() => select(i)}
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
