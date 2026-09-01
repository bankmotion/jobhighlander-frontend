'use client';

import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

// Same 8x8 icon-button footprint as DiscardAction, which sits beside it.
const BASE =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60';

// Tones match JobDescription's copy control: cyan at rest, emerald on success,
// red on failure.
const TONE: Record<CopyState, string> = {
  idle: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20',
  copied: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500/50 bg-red-500/10 text-red-300',
};

const LABEL: Record<CopyState, string> = {
  idle: 'Copy the application link',
  copied: 'Link copied',
  failed: 'Could not copy — copy it from the posting instead',
};

function IconCopy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
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
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/**
 * Copies a posting's link to the clipboard.
 *
 * The state is local and self-clearing rather than a toast: the button sits in
 * a list where several may be pressed in a row, and a stack of toasts saying
 * the same thing is noise. The icon IS the feedback.
 */
export function CopyLinkButton({ url, jobId }: { url: string; jobId: number }) {
  const [state, setState] = useState<CopyState>('idle');

  // A press that lands just before the card unmounts (discard, filter change,
  // navigating to page 2) would otherwise set state on a dead component.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    let next: CopyState = 'copied';
    try {
      // Absent on an insecure origin — the app over plain http on a LAN address
      // is exactly that case, so this is a real path, not a paranoid one.
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
    } catch {
      // Say so rather than flashing "Copied" over an unchanged clipboard.
      next = 'failed';
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={LABEL[state]}
      aria-label={`${LABEL[state]} for posting ${jobId}`}
      className={`${BASE} ${TONE[state]}`}
    >
      {state === 'copied' ? <IconCheck /> : state === 'failed' ? <IconWarn /> : <IconCopy />}
      {/* Announced to screen readers when the state changes; the icon swap
          alone is silent. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'idle' ? '' : LABEL[state]}
      </span>
    </button>
  );
}
