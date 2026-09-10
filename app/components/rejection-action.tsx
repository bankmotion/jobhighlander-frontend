'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { useRejection } from './rejection-provider';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const BASE =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition disabled:opacity-50';

/**
 * Mark a posting as rejected by the employer.
 *
 * A modal rather than a one-click toggle, which is the opposite of how Discard
 * works next to it — and deliberately. The reason is mandatory here, so there is
 * something to collect before the state can exist at all. It also makes the two
 * controls hard to confuse: one dismisses instantly, the other stops and asks.
 */
export function RejectAction({ jobId, where }: { jobId: number; where: string }) {
  const { profileId, rejectedOn, isBusy, reject } = useRejection();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!profileId) return null;
  const status = rejectedOn(jobId);
  const busy = isBusy(jobId);

  // Already rejected: the badge carries the state and the reason, and a second
  // control beside it would only offer to do what is done. Undo lives on the
  // badge, where the state it undoes is visible.
  if (status) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError('A reason is required.');
      return;
    }
    const ok = await reject(jobId, note);
    if (ok) {
      setOpen(false);
      setNote('');
      setError(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label={`Mark ${where} as rejected`}
        title="They said no — record the rejection and why"
        className={`${BASE} border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300`}
      >
        <IconSlash />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Mark as rejected">
        <form onSubmit={submit}>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Records that the employer said no to this application. This is separate from
            discarding, which is you deciding a posting is not a fit.
          </p>
          <label className="mb-1.5 block text-xs text-[var(--muted)]" htmlFor="reject-note">
            Reason
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            autoFocus
            maxLength={2000}
            placeholder="e.g. no reply after the take-home, or rejected at screening — too few years in Go"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)]"
          />
          {/* Said plainly rather than enforced by a disabled button: a control
              that does nothing and does not say why is the worse of the two. */}
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Required — it is what makes the record worth keeping.
          </p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="jh-cta rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Mark rejected'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * "Rejected", with the reason on hover.
 *
 * Its own status badge, sitting with the others — not part of the interview
 * badge. A rejection can land before any interview timeline exists, so hanging
 * it off one would hide the commonest case entirely.
 */
export function RejectedBadge({ jobId }: { jobId: number }) {
  const { rejectedOn, isBusy, clear } = useRejection();
  const status = rejectedOn(jobId);
  if (!status) return null;

  const busy = isBusy(jobId);
  const stamp = when(status.rejectedAt);

  return (
    <span
      // The reason leads. Someone hovering a "Rejected" badge wants to know
      // why, not to be told again that it is rejected.
      title={[status.note, `Rejected${stamp ? ` ${stamp}` : ''} · marked by ${status.rejectedBy}`]
        .filter(Boolean)
        .join('\n\n')}
      className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300"
    >
      <IconSlash className="h-3 w-3" />
      Rejected
      <button
        type="button"
        onClick={() => clear(jobId)}
        disabled={busy}
        title="Not actually rejected — put it back to active"
        aria-label={`Clear the rejection on posting ${jobId}`}
        className="-mr-0.5 ml-0.5 rounded px-1 opacity-70 transition hover:bg-white/10 hover:opacity-100 disabled:opacity-40"
      >
        ×
      </button>
    </span>
  );
}

function IconSlash({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}
