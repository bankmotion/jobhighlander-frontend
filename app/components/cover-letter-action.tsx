'use client';

import { useCoverLetters } from './cover-letter-provider';
import { useResumeList } from './resume-list-provider';

function IconMail({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function IconClipboard({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

/**
 * The cover letter control on a job card.
 *
 * Three states, and the middle one is the point: the letter is written FROM the
 * tailored resume, so without one this is disabled rather than absent. Hiding
 * it would leave the dependency invisible — you would not know a letter was
 * available at all, let alone what unlocks it.
 */
export function CoverLetterAction({ jobId }: { jobId: number }) {
  const { profileId, hasLetter, isBusy, write, open, copyLetter, isCopying } = useCoverLetters();
  // The resume list already knows which jobs have a resume, so the gate costs
  // no extra request — it reads the map the page fetched for the badges.
  const { statusOf } = useResumeList();

  const BOX =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60';

  if (!profileId) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Cover letters are written for a profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot write a cover letter for posting ${jobId}: no profile yet`}
        className={`${BOX} cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]`}
      >
        <IconMail />
        Cover letter
      </span>
    );
  }

  const busy = isBusy(jobId);
  const hasResume = Boolean(statusOf(jobId));

  if (!hasResume) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Write the resume first — the letter is written from it, so the two agree"
        aria-label={`Cannot write a cover letter for posting ${jobId} until its resume exists`}
        className={`${BOX} cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]`}
      >
        <IconMail />
        Resume first
      </span>
    );
  }

  if (hasLetter(jobId)) {
    const copying = isCopying(jobId);
    return (
      // Joined into one control rather than two loose buttons: they act on the
      // same letter, and a free-floating icon beside four other buttons reads
      // as a fifth unrelated action.
      <span className="inline-flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => open(jobId)}
          disabled={busy}
          aria-label={`Open the cover letter for posting ${jobId}`}
          className={`${BOX} rounded-r-none border-r-0 border-[var(--primary)] bg-[var(--primary)]/12 font-medium text-white transition hover:bg-[var(--primary)]/20 disabled:opacity-60`}
        >
          <IconMail />
          Cover letter
        </button>
        <button
          type="button"
          onClick={() => copyLetter(jobId)}
          disabled={copying}
          // The whole point of a cover letter is to be pasted somewhere, so the
          // common case gets its own control instead of open-scroll-select-copy.
          title="Copy the letter to the clipboard"
          aria-label={`Copy the cover letter for posting ${jobId} to the clipboard`}
          className={`${BOX} rounded-l-none border-[var(--primary)] bg-[var(--primary)]/12 px-2.5 text-white transition hover:bg-[var(--primary)]/25 disabled:opacity-60`}
        >
          {copying ? (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
            />
          ) : (
            <IconClipboard className="h-3.5 w-3.5" />
          )}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => write(jobId)}
      disabled={busy}
      aria-label={`Write a cover letter for posting ${jobId}`}
      className={`${BOX} border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--primary)] hover:text-white disabled:opacity-60`}
    >
      <IconMail />
      {busy ? 'Writing…' : 'Write letter'}
    </button>
  );
}
