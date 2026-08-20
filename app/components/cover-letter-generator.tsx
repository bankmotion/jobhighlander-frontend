'use client';

import { useState } from 'react';
import type { CoverLetter } from '@/lib/cover-letters';
import type { ProfileSummary } from '@/lib/types';
import { ConfirmModal } from './confirm-modal';
import { Toast, useToast } from './toast';

const label = (p: ProfileSummary) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;

/**
 * The cover letter tab.
 *
 * A cover letter here is TEXT, not a rendered document — the thing you paste
 * into an email or an application form. So the primary action is Copy, the body
 * is directly editable, and there is no preview/download split: what you see is
 * the artifact.
 */
export function CoverLetterGenerator({
  jobId,
  profileId,
  profile,
  hasResume,
  initial,
}: {
  jobId: number;
  profileId: number | null;
  profile: ProfileSummary | null;
  /** The letter is written FROM the tailored resume, so it gates generation. */
  hasResume: boolean;
  initial: CoverLetter | null;
}) {
  const [letter, setLetter] = useState<CoverLetter | null>(initial);
  const [text, setText] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  // Compared against the stored body rather than tracked with a flag, so an
  // edit-then-undo correctly reports nothing to save.
  const dirty = letter !== null && text !== letter.body;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profileId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Could not generate the letter (${res.status})`);
        return;
      }
      setLetter(data);
      setText(data.body);
      show('Cover letter generated');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/cover-letters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profileId, body: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      setLetter(data);
      show('Saved');
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      show('Copied to clipboard');
    } catch {
      // Clipboard access is refused in some browser/permission combinations,
      // and a silent no-op would look like the button is broken.
      show('Could not copy — select the text and copy manually.', 'error');
    }
  }

  if (!profileId) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Cover letters are written for a specific profile. Create one, or ask an admin to invite you
        to theirs.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted)]">
            Written for{' '}
            <span className="text-[var(--text)]">{profile ? label(profile) : 'this profile'}</span>
            {letter && (
              <>
                {' · '}
                <span>{letter.edited ? 'edited by hand' : `generated with ${letter.model}`}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {letter && (
            <button
              onClick={copy}
              className="jh-cta rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
            >
              Copy to clipboard
            </button>
          )}
          <button
            // Regenerating discards hand-edited wording, so an edited letter
            // asks first. A fresh generation has nothing to lose and does not.
            onClick={() => (letter?.edited || dirty ? setConfirming(true) : generate())}
            disabled={busy || !hasResume}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Writing…' : letter ? 'Regenerate' : 'Generate cover letter'}
          </button>
        </div>
      </div>

      {/* The resume is the letter's source material, so its absence is a step to
          take rather than an error to report. */}
      {!hasResume && (
        <p className="mb-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          Generate the <span className="text-[var(--text)]">Tailored Resume</span> for this job
          first — the letter is written from it, so the two say the same thing about you.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {letter ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck
            rows={26}
            aria-label="Cover letter text"
            // Monospace and pre-wrap: this is the text as it will be pasted, and
            // a proportional font would hide the blank-line structure that makes
            // a letter read as a letter.
            className="w-full whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">
              {text.trim().split(/\s+/).filter(Boolean).length} words
              {dirty && ' · unsaved changes'}
            </span>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          No cover letter yet for this profile and job.
        </div>
      )}

      <ConfirmModal
        open={confirming}
        title="Replace this letter?"
        message={
          dirty
            ? 'You have unsaved changes, and regenerating writes a completely new letter over them.'
            : 'You edited this letter by hand. Regenerating writes a completely new one over your wording.'
        }
        confirmLabel="Regenerate"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={generate}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
