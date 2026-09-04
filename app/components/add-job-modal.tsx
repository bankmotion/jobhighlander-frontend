'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal } from './modal';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]';

const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]';

interface Draft {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  jobType: string;
  salary: string;
  postedOn: string;
  description: string;
  remote: boolean;
}

const EMPTY: Draft = {
  title: '',
  company: '',
  location: '',
  jobUrl: '',
  jobType: '',
  salary: '',
  postedOn: '',
  description: '',
  remote: false,
};

// Mirrors the backend's `manualJobSchema`. Checked here too so a typo is caught
// before a round trip, not instead of one — the server still decides.
const MIN_DESCRIPTION = 20;

/**
 * Register a job that is not on any site we scrape.
 *
 * The row lands in the same shared table as everything scraped, so it is
 * immediately visible to every profile and every teammate, and the resume and
 * cover-letter generators treat it identically. Nothing here is profile-scoped.
 *
 * The description is the one field that carries real weight: it is the text the
 * AI writes against, so a placeholder produces a placeholder resume. That is
 * why it is the largest input and the only one with a length floor.
 */
export function AddJobModal({
  open,
  onClose,
  todayInZone,
}: {
  open: boolean;
  onClose: () => void;
  /** Today on the VIEWER's calendar, so the date cannot be set to their tomorrow. */
  todayInZone: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);

  // Cleared on each opening rather than on close, so a failed submit keeps what
  // was typed while the dialog is still up.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setDraft(EMPTY);
      setError(null);
      setDuplicateId(null);
    }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const titleOk = draft.title.trim().length >= 2;
  const descriptionOk = draft.description.trim().length >= MIN_DESCRIPTION;
  const ready = titleOk && descriptionOk && !busy;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setDuplicateId(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          company: draft.company.trim() || undefined,
          location: draft.location.trim() || undefined,
          jobUrl: draft.jobUrl.trim() || '',
          jobType: draft.jobType.trim() || undefined,
          salary: draft.salary.trim() || undefined,
          postedOn: draft.postedOn || '',
          description: draft.description.trim(),
          remote: draft.remote,
        }),
      });

      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as { jobId?: number };
        // Not an error to recover from by editing — the job is already there, so
        // the useful response is a way to go and look at it.
        setDuplicateId(data.jobId ?? null);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Could not add the job (HTTP ${res.status}).`);
        return;
      }

      onClose();
      // The list is server-rendered, so the new row appears only after the
      // server re-runs the query.
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Add a job"
      subtitle="For a posting that is not on any of the sites we scrape. Everyone on the team will see it."
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add job'}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {duplicateId != null && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <p>Someone has already added this job.</p>
            <Link
              href={`/jobs/${duplicateId}`}
              className="mt-1 inline-block font-medium text-amber-100 underline underline-offset-2"
            >
              Open it →
            </Link>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="mj-title">
              Job title <span className="text-red-400">*</span>
            </label>
            <input
              id="mj-title"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Senior Backend Engineer"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="mj-company">
              Company
            </label>
            <input
              id="mj-company"
              value={draft.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder="Acme Inc."
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="mj-location">
              Location
            </label>
            <input
              id="mj-location"
              value={draft.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Berlin, Germany"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="mj-url">
              Link to the posting
            </label>
            <input
              id="mj-url"
              type="url"
              value={draft.jobUrl}
              onChange={(e) => set('jobUrl', e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="mj-type">
              Job type
            </label>
            <input
              id="mj-type"
              value={draft.jobType}
              onChange={(e) => set('jobType', e.target.value)}
              placeholder="Full-time"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="mj-salary">
              Salary
            </label>
            <input
              id="mj-salary"
              value={draft.salary}
              onChange={(e) => set('salary', e.target.value)}
              placeholder="€90k – €110k"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="mj-posted">
              Date posted
            </label>
            <input
              id="mj-posted"
              type="date"
              value={draft.postedOn}
              max={todayInZone}
              onChange={(e) => set('postedOn', e.target.value)}
              className={inputCls}
            />
            {/* Says what the blank means, so it does not read as a field that
                was forgotten. */}
            <p className="mt-1 text-[11px] text-[var(--muted)]">Defaults to today.</p>
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer select-none items-center gap-2 pb-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={draft.remote}
                onChange={(e) => set('remote', e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Remote
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="mj-description">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="mj-description"
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              rows={9}
              placeholder="Paste the full job description here."
              className={`${inputCls} resize-y font-normal`}
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {/* The reason for the floor, not just the rule. */}
              This is what the AI writes your resume against — paste the whole posting.
              {!descriptionOk && draft.description.length > 0 && (
                <span className="text-amber-300">
                  {' '}
                  At least {MIN_DESCRIPTION} characters ({draft.description.trim().length} so far).
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
