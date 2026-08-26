'use client';

import { useEffect, useRef, useState } from 'react';
import { ConfirmModal } from './confirm-modal';
import { useDisplayZone } from '@/lib/display-zone';
import {
  QUESTION_MAX_CHARS,
  SUGGESTED_QUESTIONS,
  type JobQuery,
  type QueryContext,
} from '@/lib/job-queries';

/**
 * Ask the model about one posting, and read what has been asked before.
 *
 * ONE COMPONENT, TWO HOSTS. The job list opens it in a modal; the detail page
 * renders it as a tab. Both need the same thing — a box, a button, an answer,
 * and the log — so duplicating it would guarantee the two drifted.
 *
 * `initial` distinguishes them. The detail page fetches the log on the server
 * and passes it, so its first paint is complete. The modal cannot: it does not
 * exist until a click, so it passes null and this component fetches on mount.
 */
export function JobQueryPanel({
  jobId,
  profileId,
  initial,
  compact = false,
}: {
  jobId: number;
  profileId: number | null;
  /** Server-fetched log, or null to load it here. */
  initial: JobQuery[] | null;
  /** Tighter spacing for the modal. */
  compact?: boolean;
}) {
  const [log, setLog] = useState<JobQuery[]>(initial ?? []);
  // DERIVED, not a flag the effect flips on entry. `loaded` starts true when the
  // host already supplied the log, and is set only from the fetch's own
  // callback — a synchronous setState in the effect body is a cascading render
  // the compiler lint rejects.
  const [loaded, setLoaded] = useState(initial !== null);
  const loadingLog = !loaded;
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Only when the host could not fetch it. Not a state sync — the fetch is the
  // external system this effect exists to talk to.
  useEffect(() => {
    // Nothing to load: the host prefetched it, or there is no profile to load
    // against — in which case the panel renders its notice and never gets here.
    if (initial !== null || !profileId) return;
    let live = true;
    fetch(`/api/job-queries?jobId=${jobId}&profileId=${profileId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: JobQuery[]) => {
        // Guarded: the modal can close before this lands, and setting state on
        // a torn-down panel is a warning at best and a stale log at worst.
        if (live) setLog(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [initial, jobId, profileId]);

  async function ask() {
    const q = question.trim();
    if (!q || !profileId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/job-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profileId, question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Surfaced verbatim: the backend distinguishes no-credits, a bad key
        // and a missing prompt row, and each names a different fix. Collapsing
        // them into "failed" would send someone hunting.
        setError(data?.error ?? 'The request failed');
        return;
      }
      // Newest first, matching the API's own ordering.
      setLog((prev) => [data as JobQuery, ...prev]);
      setQuestion('');
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await fetch(`/api/job-queries/${id}`, { method: 'DELETE' });
      setLog((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  }

  if (!profileId) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Asking is tracked per profile — create one, or ask an admin to invite you to theirs.
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <label htmlFor="ai-question" className="sr-only">
          Your question about this job
        </label>
        <textarea
          id="ai-question"
          ref={boxRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter submits. A bare Enter must stay a newline: these
            // questions run to several sentences.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void ask();
            }
          }}
          maxLength={QUESTION_MAX_CHARS}
          rows={compact ? 4 : 5}
          disabled={busy}
          placeholder="Paste an application question to get a pasteable answer, or ask for advice — gaps, what to ask them, whether to apply…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ask}
            disabled={busy || !question.trim()}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Thinking…' : 'Generate'}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Sends your profile, resume and cover letter. Application questions come
            back in first person, ready to paste.
          </span>
          {question.length > QUESTION_MAX_CHARS * 0.75 && (
            <span className="ml-auto text-xs text-[var(--muted)]">
              {question.length.toLocaleString()} / {QUESTION_MAX_CHARS.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* The blank-page problem: this can answer almost anything, which is why
          the first question is the hard one. */}
      {log.length === 0 && !question && !busy && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                boxRef.current?.focus();
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-left text-xs text-[var(--muted)] transition hover:border-[var(--primary)]/50 hover:text-[var(--text)]"
            >
              {s.length > 62 ? `${s.slice(0, 62)}…` : s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {busy && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-6 text-center text-sm text-[var(--muted)]">
          Reading the posting against your record…
        </p>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {loadingLog ? 'Loading…' : log.length === 0 ? 'Nothing asked yet' : `Asked (${log.length})`}
        </h3>
        <ul className="space-y-3">
          {log.map((row, i) => (
            <li key={row.id}>
              <QueryCard
                row={row}
                /* The newest is open; the rest are collapsed. A log of
                   ten full answers is unscrollable, and the one just
                   generated is the one being read. */
                defaultOpen={i === 0}
                busy={busy}
                onDelete={() => setConfirmId(row.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <ConfirmModal
        open={confirmId !== null}
        title="Delete this question?"
        message="The question and its answer are removed from the log. This does not refund the tokens it cost."
        busy={busy}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove(confirmId)}
      />
    </div>
  );
}

function QueryCard({
  row,
  defaultOpen,
  busy,
  onDelete,
}: {
  row: JobQuery;
  defaultOpen: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Null while server-rendering, so the stamp appears a frame late rather than
  // being painted in the server's zone. The detail page passes a server-fetched
  // log, so this component DOES render during SSR and a locale-dependent
  // `toLocaleString` here would tear the node down as a mismatch.
  const zone = useDisplayZone();

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <p className={`text-sm font-medium text-white ${open ? '' : 'truncate'}`}>{row.question}</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {zone ? `${when(row.createdAt, zone)} · ` : ''}
            {row.askedBy} · <ContextNote context={row.context} />
          </p>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete this question"
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
        >
          ×
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--border)] px-3 py-2.5">
          {/* `whitespace-pre-wrap`, not a markdown renderer: the prompt asks for
              plain prose with blank lines between paragraphs, so the paragraph
              breaks are the only structure there is to preserve. */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]/90">
            {row.answer}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * What the model actually had in front of it.
 *
 * Worth a line on every entry: the same question answered before and after the
 * resume existed are different answers, and the log is the only place that
 * distinction survives.
 */
function ContextNote({ context }: { context: QueryContext }) {
  const had = [
    context.profile && 'profile',
    context.resume && 'resume',
    context.coverLetter && 'cover letter',
  ].filter(Boolean) as string[];
  const missing = [!context.resume && 'resume', !context.coverLetter && 'cover letter'].filter(
    Boolean,
  ) as string[];

  return (
    <span title={missing.length ? `No ${missing.join(' or ')} existed when this was asked` : undefined}>
      saw {had.join(' + ')}
      {missing.length > 0 && <span className="text-amber-400/80"> (no {missing.join(', ')})</span>}
    </span>
  );
}

/** Locale pinned and zone explicit, for the reason given in `lib/tz.ts`. */
const when = (iso: string, zone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
