'use client';

import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies a short piece of text — a company name, an id — from inside a line of
 * running text.
 *
 * Separate from `CopyLinkButton` because of where it lives, not what it does:
 * that one is an 8x8 control in the card's action row, and dropping the same
 * footprint into a 14px meta line would make the line jump and swamp the name
 * it sits beside. This one is sized to the text and stays quiet until hovered.
 *
 * The state is local and self-clearing rather than a toast: a list may have
 * dozens of these, and a stack of identical toasts is noise. The icon IS the
 * feedback.
 */
export function CopyTextButton({
  value,
  what = 'text',
  withLabel = false,
  className = '',
}: {
  value: string;
  /** Named in the tooltip and for screen readers: "Copy company name". */
  what?: string;
  /**
   * Show the wording beside the icon, in a bordered control.
   *
   * For a block of text rather than a word inside a line. A 20px icon reads as
   * belonging to the thing it touches, which is right next to a company name
   * and wrong under a paragraph — there it is just a mark floating in
   * whitespace with nothing to attach itself to.
   */
  withLabel?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>('idle');

  // A press landing just before the card unmounts (discard, filter change,
  // paging) would otherwise set state on a dead component.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy(e: React.MouseEvent) {
    // The company can sit inside a link to the employer's page, and the card
    // itself opens a panel on click — neither should fire because someone
    // wanted the name on their clipboard.
    e.preventDefault();
    e.stopPropagation();

    let next: CopyState = 'copied';
    try {
      // Absent on an insecure origin — this app over plain http on a LAN
      // address is exactly that case, so it is a real path, not a paranoid one.
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
    } catch {
      // Say so rather than flashing "Copied" over an unchanged clipboard.
      next = 'failed';
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  }

  const label =
    state === 'copied' ? `Copied` : state === 'failed' ? `Could not copy` : `Copy ${what}`;

  return (
    <button
      type="button"
      onClick={copy}
      // The full value in the tooltip is useful for a name and absurd for a
      // page of prose, so the labelled form names the kind of thing instead.
      title={withLabel ? label : state === 'idle' ? `${label} — “${value}”` : label}
      aria-label={withLabel ? label : `${label}: ${value}`}
      className={`inline-flex shrink-0 items-center justify-center rounded align-middle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 ${
        withLabel
          ? 'gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1 text-xs'
          : 'h-5 w-5'
      } ${
        state === 'copied'
          ? 'text-emerald-300'
          : state === 'failed'
            ? 'text-red-300'
            : withLabel
              ? 'text-[var(--muted)] hover:border-[var(--primary)] hover:text-white'
              : 'text-[var(--muted)] opacity-60 hover:bg-white/5 hover:text-[var(--text)] hover:opacity-100'
      } ${className}`}
    >
      {state === 'copied' ? <IconCheck /> : state === 'failed' ? <IconWarn /> : <IconCopy />}
      {withLabel && <span>{label}</span>}
      {/* Announced when the state changes; the icon swap alone is silent. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'idle' ? '' : label}
      </span>
    </button>
  );
}

function IconCopy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
