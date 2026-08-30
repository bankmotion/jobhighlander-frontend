'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // In a ref so the key listener binds once rather than re-subscribing on every
  // parent render — the calendar re-renders this on each selection change.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());

    // The page behind must not scroll under the drawer; the drawer scrolls its
    // own body instead.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey, true);
      // Hand focus back to whatever opened it — otherwise closing drops the
      // user at the top of the page with nothing focused.
      const target = returnFocusRef.current;
      if (target && document.contains(target)) target.focus?.();
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden
        onMouseDown={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // React 19 renders this as the real `inert` attribute, which removes the
        // subtree from the tab order and from the accessibility tree entirely.
        inert={!open}
        className={`fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-300 ease-out focus:outline-none md:w-[40%] md:min-w-[26rem] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} title={title} className="truncate text-base font-semibold text-white">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
