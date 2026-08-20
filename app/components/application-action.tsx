'use client';

import { useEffect } from 'react';
import { useResumeList, type ResumeTarget } from './resume-list-provider';
import { useCoverLetters } from './cover-letter-provider';
import { BOX, ICON_BOX, TONE } from './resume-action';

/**
 * The one generation control on a job card.
 *
 * ONE BUTTON, NOT TWO, because there is no longer anything to sequence: a
 * single model call writes the resume and the cover letter together, so a card
 * offering them separately would be describing a shape the backend no longer
 * has — and a second click would pay for the whole pair again.
 *
 * NO DIALOG WHILE GENERATING. The button itself carries the wait — a modal
 * opening the moment you click interrupts a scan of the list to show something
 * you have not asked to read yet. Viewing is a separate, deliberate click.
 *
 * Once both documents exist the card offers all four things you want from them
 * without leaving the list: view (the PDF and the letter, tabbed in one
 * dialog), download the PDF, and copy the letter.
 */
function IconSparkle() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
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

function IconAlert() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none"
    />
  );
}

export function ApplicationAction({ jobId, title, company }: ResumeTarget) {
  const { profileId, statusOf, runOf, generateQuiet, view, download, isDownloading } =
    useResumeList();
  const { hasLetter, noteLetterWritten, copyLetter, isCopying } = useCoverLetters();

  const target: ResumeTarget = { jobId, title, company };
  const status = statusOf(jobId);
  const run = runOf(jobId);
  // The posting number is part of the label because duplicate listings are
  // common — the same role at the same company scraped from two boards yields
  // an identical title and company, and a screen-reader element list would then
  // show several indistinguishable buttons.
  const where = `${company ? `${title} at ${company}` : title}, posting ${jobId}`;

  /**
   * The resume's arrival is also the letter's.
   *
   * One call wrote both, but only the resume provider watched that request, so
   * this is what tells the cover letter provider its own state changed. Without
   * it the copy icon would stay hidden until a reload, and the card would go on
   * offering to write a letter that already exists.
   */
  useEffect(() => {
    if (status) noteLetterWritten(jobId);
  }, [status, jobId, noteLetterWritten]);

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
        title="Generating needs a profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot generate an application for ${where}: no profile yet`}
        className={`${BOX} ${TONE.disabled}`}
      >
        <IconSparkle />
        Generate
      </span>
    );
  }

  if (run?.state === 'running') {
    return (
      <span
        data-resume-trigger={jobId}
        role="status"
        aria-label={`Writing the resume and cover letter for ${where}`}
        className={`${BOX} ${TONE.busy}`}
      >
        <Spinner />
        <span aria-hidden>Generating…</span>
      </span>
    );
  }

  if (status) {
    const saving = isDownloading(jobId);
    const copying = isCopying(jobId);
    const letterReady = hasLetter(jobId);
    // A resume carrying AI-drafted content is a draft, and saying so on the
    // card is the difference between "done" and "done, but check it".
    const draft = status.inferredCount > 0;

    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          data-resume-trigger={jobId}
          onClick={() => view(target)}
          aria-label={`View the resume and cover letter for ${where}`}
          className={`${BOX} ${TONE.ready}`}
        >
          <IconCheck />
          {draft ? 'Draft' : 'Ready'}
          {draft && (
            <span
              aria-hidden
              title="Contains AI-drafted content — check it before sending"
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
            />
          )}
        </button>

        {/* The chip opens the viewer too, but a coloured word does not read as
            a control at a glance, so the thing you most often want gets its own
            affordance beside the download and copy icons. */}
        <button
          type="button"
          onClick={() => view(target)}
          title="View the resume PDF and the cover letter"
          aria-label={`View the resume and cover letter for ${where}`}
          className={ICON_BOX}
        >
          <IconEye />
        </button>

        <button
          type="button"
          onClick={() => download(target)}
          disabled={saving}
          // Says it is not instant: the PDF is rendered server-side on demand,
          // so a click with no feedback reads as a click that did nothing and
          // gets repeated.
          title={saving ? 'Rendering the PDF…' : 'Download the resume as a PDF'}
          aria-label={
            saving ? `Rendering the PDF for ${where}` : `Download the resume for ${where} as a PDF`
          }
          className={ICON_BOX}
        >
          {saving ? <Spinner /> : <IconDownload />}
        </button>

        <button
          type="button"
          onClick={() => copyLetter(jobId)}
          disabled={copying || !letterReady}
          title={
            !letterReady
              ? 'No cover letter saved for this posting'
              : copying
                ? 'Loading the letter…'
                : 'Copy the cover letter to the clipboard'
          }
          aria-label={`Copy the cover letter for ${where} to the clipboard`}
          className={ICON_BOX}
        >
          {copying ? <Spinner /> : <IconClipboard />}
        </button>
      </span>
    );
  }

  if (run?.state === 'error') {
    return (
      <button
        type="button"
        data-resume-trigger={jobId}
        onClick={() => generateQuiet(target)}
        aria-label={`Generation failed for ${where}. Try again.`}
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
      onClick={() => generateQuiet(target)}
      // Names the job and the cost of waiting: a screen-reader element list
      // would otherwise show twenty identical "Generate" buttons.
      aria-label={`Write a tailored resume and cover letter for ${where}. Takes 20 to 60 seconds.`}
      className={`${BOX} ${TONE.none}`}
    >
      <IconSparkle />
      Generate
    </button>
  );
}
