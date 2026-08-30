'use client';

import { useState } from 'react';
import { HighlightedText } from './highlighted-text';

const PREVIEW_CHARS = 400;

const CLAMP_CHARS = 180;

type CopyState = 'idle' | 'copied' | 'failed';

const PILL =
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition';

const COPY_TONE: Record<CopyState, string> = {
  idle: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20',
  copied: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500/50 bg-red-500/10 text-red-300',
};

export function JobDescription({ text, keywords }: { text: string; keywords: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [copy, setCopy] = useState<CopyState>('idle');
  const expandable = text.length > CLAMP_CHARS;

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
        <p className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm leading-relaxed text-[var(--muted)]">
          <HighlightedText text={text} words={keywords} />
        </p>
      ) : (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
          <HighlightedText text={text.slice(0, PREVIEW_CHARS)} words={keywords} />
        </p>
      )}

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
