'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { CoverLetter, CoverLetterStatusMap } from '@/lib/cover-letters';
import { Modal } from './modal';
import { Toast, useToast } from './toast';

interface Ctx {
  profileId: number | null;
  hasLetter: (jobId: number) => boolean;
  noteLetterWritten: (jobId: number) => void;
  isBusy: (jobId: number) => boolean;
  write: (jobId: number) => void;
  open: (jobId: number) => void;
  copyLetter: (jobId: number) => void;
  isCopying: (jobId: number) => boolean;
}

const CoverLetterCtx = createContext<Ctx | null>(null);

export function useCoverLetters(): Ctx {
  const ctx = useContext(CoverLetterCtx);
  if (!ctx) throw new Error('useCoverLetters must be used inside <CoverLetterProvider>');
  return ctx;
}

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
  const bodies = useRef<Map<number, string>>(new Map());
  const { toast, show, dismiss } = useToast();

  const [seededFrom, setSeededFrom] = useState<CoverLetterStatusMap>(initial);
  if (seededFrom !== initial) {
    setSeededFrom(initial);
    setStatus(initial);
  }

  const hasLetter = useCallback((jobId: number) => Boolean(status[jobId]), [status]);
  const isBusy = useCallback((jobId: number) => busy.has(jobId), [busy]);

  const noteLetterWritten = useCallback((jobId: number) => {
    setStatus((prev) =>
      prev[jobId]
        ? prev
        : { ...prev, [jobId]: { jobId, edited: false, updatedAt: new Date().toISOString() } },
    );
  }, []);

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
      value={{ profileId, hasLetter, noteLetterWritten, isBusy, write, open, copyLetter, isCopying }}
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
            <pre className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--text)]">
              {letter.body}
            </pre>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--muted)]">No letter to show.</p>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={dismiss} />
    </CoverLetterCtx.Provider>
  );
}
