'use client';

import Link from 'next/link';
import { useResumeList, type ResumeTarget } from './resume-list-provider';

/**
 * Fixed geometry in every state, so the footer never reflows when one changes
 * and the chip lands in the same column on every card — twenty of them read as
 * a vertical stripe of state you can scan without reading a word.
 */
const BOX =
  'relative inline-flex w-[8.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60';

/**
 * Each state's classes are a COMPLETE literal string. Tailwind v4 scans source
 * statically and there is no theme config here, so `bg-[var(--${tone})]` or a
 * composed `border-${c}-500/40` compiles to no CSS at all — silently, with no
 * build error.
 */
const TONE = {
  none: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)] hover:text-white',
  busy: 'cursor-wait border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--muted)]',
  // Violet, NOT emerald: the card already carries an emerald salary pill and a
  // green Remote pill, and a third green makes the row unreadable at a glance.
  ready: 'border-[var(--primary)] bg-[var(--primary)]/12 font-medium text-white hover:bg-[var(--primary)]/20',
  error: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  // No hover affordance at all: the control is inert, and a border that lights
  // up under the cursor promises a click that does nothing.
  disabled: 'cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]',
} as const;

function IconPlus() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15h6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/**
 * The resume control on a job card.
 *
 * One button carrying every state rather than several controls: the card's only
 * accent action is Apply Now, and a second coloured button beside it would
 * compete. No elapsed counter here — the spinner carries liveness, the number
 * lives in the modal, and a per-second label on twenty cards is both a
 * re-render storm and a width that jumps at 0:09 → 0:10.
 */
export function ResumeAction({ jobId, title, company }: ResumeTarget) {
  const { profileId, statusOf, runOf, generate, view } = useResumeList();

  const target: ResumeTarget = { jobId, title, company };
  const status = statusOf(jobId);
  const run = runOf(jobId);
  // The posting number is part of the name because duplicate listings are
  // common — the same role at the same company scraped from two boards yields
  // an identical title and company, and a screen-reader element list would then
  // show several indistinguishable buttons. The card already shows this as #id.
  const where = `${company ? `${title} at ${company}` : title}, posting ${jobId}`;

  /**
   * Without a profile there is no name, contact or history to build from, so
   * the control is shown DISABLED rather than removed.
   *
   * Removing it kept the footer tidy but cost more than it saved: the row
   * silently lost a column, so the reason had to be inferred from an absence.
   * A disabled control with a title says what is missing at the point of use,
   * and the header notice says how to fix it.
   */
  if (!profileId) {
    return (
      <span
        data-resume-trigger={jobId}
        // Not a <button disabled>: a disabled button is skipped by keyboard
        // navigation and its title never surfaces, which would put the only
        // explanation behind a hover a keyboard user cannot perform.
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Resumes need a profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot write a resume for ${where}: no profile yet`}
        className={`${BOX} ${TONE.disabled}`}
      >
        <IconPlus />
        Write resume
      </span>
    );
  }

  if (run?.state === 'running') {
    return (
      <span
        data-resume-trigger={jobId}
        role="status"
        aria-label={`Writing a resume for ${where}`}
        className={`${BOX} ${TONE.busy}`}
      >
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none"
        />
        <span aria-hidden>Writing…</span>
      </span>
    );
  }

  if (status) {
    // A resume carrying AI-drafted content is a draft, and saying so on the
    // card is the difference between "done" and "done, but check it".
    const draft = status.inferredCount > 0 || status.reviewNoteCount > 0;
    return (
      <button
        type="button"
        data-resume-trigger={jobId}
        onClick={() => view(target)}
        aria-label={`${draft ? 'Review the draft resume' : 'Open the resume'} for ${where}`}
        className={`${BOX} ${TONE.ready}`}
      >
        <IconCheck />
        {draft ? 'Draft' : 'Resume'}
        {draft && (
          <span
            aria-hidden
            title="Contains AI-drafted content"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
          />
        )}
      </button>
    );
  }

  if (run?.state === 'error') {
    return (
      <button
        type="button"
        data-resume-trigger={jobId}
        onClick={() => generate(target)}
        aria-label={`Resume generation failed for ${where}. Try again.`}
        className={`${BOX} ${TONE.error}`}
      >
        <IconAlert />
        Try again
      </button>
    );
  }

  return (
    <button
      type="button"
      data-resume-trigger={jobId}
      onClick={() => generate(target)}
      // Names the job and the cost of waiting: a screen-reader element list
      // would otherwise show twenty identical "Resume" buttons.
      aria-label={`Write a tailored resume for ${where}. Takes 20 to 60 seconds.`}
      className={`${BOX} ${TONE.none}`}
    >
      <IconPlus />
      Write resume
    </button>
  );
}

/** Shown once in the page header instead of on every card. */
export function ResumeProfileNotice({ canManage }: { canManage: boolean }) {
  return (
    <p className="mb-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
      Resumes need a profile — it supplies your name, contact details and employment history.{' '}
      {canManage ? (
        <>
          <Link href="/profiles" className="text-[var(--text)] underline hover:text-white">
            Create one
          </Link>
          .
        </>
      ) : (
        // A bidder cannot create one, but they CAN be invited to an admin's, so
        // the Profiles page is a real destination for them now rather than the
        // dead end it used to be.
        <>
          Your account cannot create one — ask an admin to invite you to theirs, then accept it
          from your{' '}
          <Link href="/inbox" className="text-[var(--text)] underline hover:text-white">
            inbox
          </Link>
          .
        </>
      )}
    </p>
  );
}
