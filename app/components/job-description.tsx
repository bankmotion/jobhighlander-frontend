'use client';

import { useState } from 'react';
import { HighlightedText } from './highlighted-text';

/**
 * How much of the description reaches the DOM while collapsed.
 *
 * Only two lines are visible, so shipping the whole thing is waste that scales:
 * the median description here is ~3,600 characters and the 90th percentile is
 * ~8,000, times a page of twenty cards. Four hundred characters is comfortably
 * more than two lines fill at any card width, so the clamp still decides where
 * the text ends — this only decides how much it had to read to get there.
 *
 * The COPY button still copies the full text, not this slice.
 */
const PREVIEW_CHARS = 400;

/**
 * Below this length, two lines hold the whole description and there is nothing
 * to expand, so no button is offered.
 *
 * A character count rather than a measured `scrollHeight > clientHeight`:
 * measuring means an effect that writes state on mount, which fires for every
 * card on the page and cascades a second render for no visible gain. The cost
 * of the heuristic is a button reading "show more" on a description that fills
 * two lines almost exactly — of 3,758 jobs in this database, exactly one is
 * short enough for that to even be in question.
 */
const CLAMP_CHARS = 180;

type CopyState = 'idle' | 'copied' | 'failed';

/** Shared shape for both controls, so only the colour distinguishes them. */
const PILL =
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition';

/**
 * Cyan rather than the green family the card already spends on salary and
 * Remote, and clear of the amber the keyword marks use — a copy button that
 * borrowed the salary badge's colour would read as another piece of job data.
 */
const COPY_TONE: Record<CopyState, string> = {
  idle: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20',
  copied: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500/50 bg-red-500/10 text-red-300',
};

/**
 * A job description that starts clamped to two lines, expands in place, and can
 * be copied whole.
 *
 * Keywords are highlighted in both states with the same marks the detail page
 * uses, so a card can be scanned for the words that matter without opening it.
 */
export function JobDescription({ text, keywords }: { text: string; keywords: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [copy, setCopy] = useState<CopyState>('idle');
  const expandable = text.length > CLAMP_CHARS;

  /**
   * Copy the WHOLE description, never what is on screen.
   *
   * Someone copying from a collapsed card wants the posting, not the two lines
   * they can already see — and a button that silently copied a 400-character
   * preview would be discovered only after pasting it somewhere that mattered.
   */
  async function copyAll() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopy('copied');
    } catch {
      // Blocked permission or an insecure origin. Say so rather than flashing
      // "Copied" over an empty clipboard.
      setCopy('failed');
    }
    setTimeout(() => setCopy('idle'), 2000);
  }

  return (
    <div className="mt-3">
      {expanded ? (
        /**
         * Capped and scrollable rather than free-growing. A p90 description is
         * eight thousand characters: expanded in full, one card would stand
         * taller than the screen and push the next twenty jobs out of reach,
         * turning a list into a single posting. `whitespace-pre-wrap` matches
         * the detail page — 3,756 of these descriptions carry their own
         * newlines, and flowing them into a paragraph loses every bullet.
         */
        <p className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm leading-relaxed text-[var(--muted)]">
          <HighlightedText text={text} words={keywords} />
        </p>
      ) : (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
          <HighlightedText text={text.slice(0, PREVIEW_CHARS)} words={keywords} />
        </p>
      )}

      {/* Right-aligned, so the two controls sit on the ragged edge of the text
          instead of under its first words — and land in the same column on
          every card, which is what makes them findable down a list of twenty.
          Each carries its own colour: they do different things, and at this
          size shape alone does not separate them. */}
      <div className="mt-2 flex items-center justify-end gap-2">
        {expandable && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className={`${PILL} border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/20`}
          >
            {expanded ? 'Show less' : 'Show more'}
            <span aria-hidden className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={copyAll}
          title="Copy the full job description"
          aria-label="Copy the full job description to the clipboard"
          className={`${PILL} ${COPY_TONE[copy]}`}
        >
          {copy === 'copied' ? <IconCheck /> : <IconClipboard />}
          {copy === 'copied' ? 'Copied' : copy === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function IconClipboard() {
  return (
    <svg
      aria-hidden
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      aria-hidden
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
