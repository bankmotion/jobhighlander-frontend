'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every open dialog, outermost first.
 *
 * Modals nest — the provider picker opens over the Ask AI dialog, which is
 * itself a modal — and each one listens for keys on the DOCUMENT so focus
 * escaping the panel does not break Escape and Tab. Two listeners on the same
 * target both fire regardless of `stopPropagation`, so without this every
 * dialog in the stack would close on a single Escape and the two focus traps
 * would fight over Tab. Only the top of the stack acts.
 */
const openDialogs: symbol[] = [];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  busy = false,
  restoreFocusTo,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  size?: keyof typeof SIZES;
  busy?: boolean;
  restoreFocusTo?: () => HTMLElement | null;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Keep the handler in a ref so the key listener binds once instead of
  // re-subscribing on every parent render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const restoreFocusRef = useRef(restoreFocusTo);
  useEffect(() => {
    restoreFocusRef.current = restoreFocusTo;
  }, [restoreFocusTo]);

  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Remember the trigger before the dialog steals focus, and hand it back on
  // close — including when the modal unmounts while still open.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      // Prefer the caller's live lookup: the node captured on open may have
      // been detached by a re-render, and focusing a detached node does nothing
      // at all, leaving the page with focus on <body>.
      const fresh = restoreFocusRef.current?.() ?? null;
      const target = fresh ?? returnFocusRef.current;
      if (target && document.contains(target)) target.focus?.();
    };
  }, [open]);

  // Keys are handled on the DOCUMENT, not on the panel.
  //
  // A React onKeyDown on the panel only fires while focus is inside it — and
  // focus leaves on its own the moment a focused control unmounts (dismissing
  // an inline confirm, a button that disappears when its state changes). Focus
  // falls back to <body>, and from there Escape and Tab silently stop working
  // with the dialog still on screen. Listening on the document keeps both
  // working, and lets Tab pull escaped focus back in.
  useEffect(() => {
    if (!open) return;

    const id = Symbol('modal');
    openDialogs.push(id);

    const onKey = (e: KeyboardEvent) => {
      // Not the topmost dialog: a nested one is on screen and owns the keyboard.
      if (openDialogs[openDialogs.length - 1] !== id) return;

      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      const active = document.activeElement;

      // Focus escaped the dialog (or there is nothing to focus) — bring it back
      // rather than letting Tab walk into the page behind the overlay.
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = openDialogs.indexOf(id);
      if (i >= 0) openDialogs.splice(i, 1);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        // mousedown, not click: a click that STARTS inside the panel and ends on
        // the backdrop (selecting text, dragging a scrollbar) would otherwise
        // dismiss the dialog out from under the user.
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} title={title} className="truncate text-base font-semibold text-white">
              {title}
            </h3>
            {subtitle && <div className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
