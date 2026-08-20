'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { CoverLetter, CoverLetterStatusMap } from '@/lib/cover-letters';
import { Modal } from './modal';
import { Toast, useToast } from './toast';

interface Ctx {
  /** Null when there is no usable profile — a letter is written FOR someone. */
  profileId: number | null;
  hasLetter: (jobId: number) => boolean;
  isBusy: (jobId: number) => boolean;
  /** Generate (or regenerate) and open the letter. */
  write: (jobId: number) => void;
  /** Open an already-written letter without spending a generation. */
  open: (jobId: number) => void;
  /** Copy an already-written letter straight to the clipboard. */
  copyLetter: (jobId: number) => void;
  isCopying: (jobId: number) => boolean;
}

const CoverLetterCtx = createContext<Ctx | null>(null);

export function useCoverLetters(): Ctx {
  const ctx = useContext(CoverLetterCtx);
  if (!ctx) throw new Error('useCoverLetters must be used inside <CoverLetterProvider>');
  return ctx;
}

/**
 * Cover letter state for the jobs on screen, plus the modal that shows one.
 *
 * The list only ever holds a per-job "does one exist" flag; the letter body is
 * fetched when a card is opened. A page of twenty letters would be tens of
 * kilobytes fetched to render a one-word badge, and most of them never opened.
 */
export function CoverLetterProvider({
  profileId,
  initial,
  children,
}: {
  profileId: number | null;
  initial: CoverLetterStatusMap;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<CoverLetterStatusMap>(initial);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const [openJob, setOpenJob] = useState<number | null>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState<Set<number>>(() => new Set());
  /**
   * Bodies already fetched, so copying the same letter twice costs one request.
   * A ref rather than state: nothing renders from it, and re-rendering twenty
   * cards because one letter was cached would be pure waste.
   */
  const bodies = useRef<Map<number, string>>(new Map());
  const { toast, show, dismiss } = useToast();

  /**
   * Re-seed when the server sends a new snapshot — a different profile, filter
   * or page. Same reasoning as the resume and applied providers: `useState`
   * seeds once, and a client navigation reconciles this component in place
   * rather than remounting it.
   */
  const [seededFrom, setSeededFrom] = useState<CoverLetterStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setStatus(initial);
  }

  const hasLetter = useCallback((jobId: number) => Boolean(status[jobId]), [status]);
  const isBusy = useCallback((jobId: number) => busy.has(jobId), [busy]);

  const mark = useCallback((jobId: number, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const load = useCallback(
    async (jobId: number) => {
      if (!profileId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/cover-letters?jobId=${jobId}&profileId=${profileId}`, {
          cache: 'no-store',
        });
        const row = res.ok ? ((await res.json()) as CoverLetter | null) : null;
        if (row) bodies.current.set(jobId, row.body);
        setLetter(row);
      } catch {
        setLetter(null);
      } finally {
        setLoading(false);
      }
    },
    [profileId],
  );

  const open = useCallback(
    (jobId: number) => {
      setOpenJob(jobId);
      setLetter(null);
      void load(jobId);
    },
    [load],
  );

  const write = useCallback(
    async (jobId: number) => {
      if (!profileId || busy.has(jobId)) return;
      mark(jobId, true);
      setOpenJob(jobId);
      setLetter(null);
      try {
        const res = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, profileId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          show(data?.error ?? `Could not write the letter (${res.status})`, 'error');
          setOpenJob(null);
          return;
        }
        setLetter(data);
        bodies.current.set(jobId, data.body);
        setStatus((prev) => ({
          ...prev,
          [jobId]: { jobId, edited: false, updatedAt: data.updatedAt },
        }));
      } catch {
        show('Could not reach the server.', 'error');
        setOpenJob(null);
      } finally {
        mark(jobId, false);
      }
    },
    [busy, mark, profileId, show],
  );

  const toClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        show('Copied to clipboard');
      } catch {
        // Clipboard access is refused under some browser/permission
        // combinations, and a silent no-op would look like a broken button.
        show('Could not copy — open the letter and copy manually.', 'error');
      }
    },
    [show],
  );

  async function copy() {
    if (letter) await toClipboard(letter.body);
  }

  const isCopying = useCallback((jobId: number) => copying.has(jobId), [copying]);

  /**
   * Copy a letter without opening it.
   *
   * The list holds only "a letter exists", so the body is fetched on first use
   * and cached. The fetch happens BEFORE the clipboard write on purpose — some
   * browsers drop the user-activation that permits a write once an await has
   * resolved, so the failure path has to say what to do instead of silently
   * doing nothing.
   */
  const copyLetter = useCallback(
    async (jobId: number) => {
      if (!profileId || copying.has(jobId)) return;
      const cached = bodies.current.get(jobId);
      if (cached) {
        await toClipboard(cached);
        return;
      }
      setCopying((prev) => new Set(prev).add(jobId));
      try {
        const res = await fetch(`/api/cover-letters?jobId=${jobId}&profileId=${profileId}`, {
          cache: 'no-store',
        });
        const row = res.ok ? ((await res.json()) as CoverLetter | null) : null;
        if (!row) {
          show('Could not load that letter.', 'error');
          return;
        }
        bodies.current.set(jobId, row.body);
        await toClipboard(row.body);
      } catch {
        show('Could not reach the server.', 'error');
      } finally {
        setCopying((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    [copying, profileId, show, toClipboard],
  );

  return (
    <CoverLetterCtx.Provider
      value={{ profileId, hasLetter, isBusy, write, open, copyLetter, isCopying }}
    >
      {children}

      <Modal
        open={openJob !== null}
        onClose={() => setOpenJob(null)}
        title="Cover letter"
        footer={
          <>
            {openJob !== null && (
              <a
                href={`/jobs/${openJob}?tab=cover-letter${profileId ? `&profile=${profileId}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto text-sm text-[var(--muted)] underline transition hover:text-white"
              >
                Edit on the job page ↗
              </a>
            )}
            <button
              onClick={copy}
              disabled={!letter}
              className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              Copy to clipboard
            </button>
          </>
        }
      >
        {loading || (openJob !== null && busy.has(openJob)) ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            {busy.has(openJob ?? -1) ? 'Writing the letter…' : 'Loading…'}
          </p>
        ) : letter ? (
          <div>
            {/* Monospace and pre-wrap: this is the text as it will be pasted,
                and a proportional font hides the blank-line structure that makes
                a letter read as a letter. */}
            <pre className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--text)]">
              {letter.body}
            </pre>
            {letter.reviewNotes.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <h3 className="mb-2 text-sm font-semibold text-amber-300">
                  Check before sending ({letter.reviewNotes.length})
                </h3>
                <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                  {letter.reviewNotes.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-amber-400">
                        •
                      </span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--muted)]">No letter to show.</p>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={dismiss} />
    </CoverLetterCtx.Provider>
  );
}
