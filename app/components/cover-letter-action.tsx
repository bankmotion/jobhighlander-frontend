'use client';

import { useCoverLetters } from './cover-letter-provider';
import { useResumeList } from './resume-list-provider';
import { BOX, ICON_BOX, TONE } from './resume-action';

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
 * Built from the SAME `BOX` / `TONE` / `ICON_BOX` the resume control uses, and
 * laid out the same way: one fixed-width chip carrying the state, then separate
 * icon buttons for what you actually do with it. The two groups sit next to
 * each other in one row, so any difference in height, radius, colour weight or
 * grouping reads as two unrelated designs rather than two instances of one.
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

  if (!profileId) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Cover letters are written for a profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot write a cover letter for posting ${jobId}: no profile yet`}
        className={`${BOX} ${TONE.disabled}`}
      >
        <IconMail />
        Cover letter
      </span>
    );
  }

  const busy = isBusy(jobId);

  if (!statusOf(jobId)) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Write the resume first — the letter is written from it, so the two agree"
        aria-label={`Cannot write a cover letter for posting ${jobId} until its resume exists`}
        className={`${BOX} ${TONE.disabled}`}
      >
        <IconMail />
        Resume first
      </span>
    );
  }

  if (hasLetter(jobId)) {
    const copying = isCopying(jobId);
    return (
      // Chip + icon at the same 1.5 gap as the resume group beside it.
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => open(jobId)}
          disabled={busy}
          aria-label={`Open the cover letter for posting ${jobId}`}
          className={`${BOX} ${TONE.ready}`}
        >
          <IconMail />
          Cover letter
        </button>

        <button
          type="button"
          onClick={() => copyLetter(jobId)}
          disabled={copying}
          // The whole point of a cover letter is to be pasted somewhere, so the
          // common case gets its own affordance instead of open-select-copy.
          title={copying ? 'Loading the letter…' : 'Copy the letter to the clipboard'}
          aria-label={`Copy the cover letter for posting ${jobId} to the clipboard`}
          className={ICON_BOX}
        >
          {copying ? (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none"
            />
          ) : (
            <IconClipboard className="h-4 w-4" />
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
      className={`${BOX} ${TONE.none}`}
    >
      <IconMail />
      {busy ? 'Writing…' : 'Write letter'}
    </button>
  );
}
