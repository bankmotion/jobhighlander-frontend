'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProfileSummary } from '@/lib/types';
import type { Preset } from '@/lib/templates';
import { stampLabel, type AiProvider, type ProviderStamp } from '@/lib/ai-providers';
import { GenerateModal, ProviderBadge } from './generate-modal';
import { Toast, useToast } from './toast';

interface Flagged {
  text: string;
  inferred: boolean;
}

export interface TailoredResume {
  headline: string;
  summary: string;
  skills: { name: string; category?: string; inferred: boolean }[];
  experience: {
    title: string;
    titleInferred: boolean;
    company: string;
    period: string;
    location: string;
    bullets: Flagged[];
  }[];
  education: { institution: string; degree: string; period: string }[];
  gaps: string[];
  reviewNotes: string[];
}

interface SavedResume extends ProviderStamp {
  id: number;
  data: TailoredResume;
  templateKey: string;
  model: string;
  updatedAt: string;
}

/** `/preview` returns the draft with the model that wrote it stamped on. */
type GeneratedResume = TailoredResume & ProviderStamp;

const NOTES_KEY = 'jh:resume-notes';

function Inferred({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <span
      title="Drafted by AI — verify before sending"
      className="decoration-amber-400/50 decoration-dotted underline-offset-4 [text-decoration-line:underline]"
    >
      {children}
    </span>
  );
}

export function ResumeGenerator({
  jobId,
  profiles,
  presets,
  initialProfileId,
}: {
  jobId: number;
  profiles: ProfileSummary[];
  presets: Preset[];
  initialProfileId?: number | null;
}) {
  const [profileId, setProfileId] = useState<number | ''>(
    initialProfileId ?? profiles[0]?.id ?? '',
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Two keys, deliberately: `templateKey` is what the preview is showing and
  // changes on every pick, `savedTemplateKey` is what the database holds. The
  // gap between them is exactly what the Apply button offers to close.
  const [templateKey, setTemplateKey] = useState<string>('');
  const [savedTemplateKey, setSavedTemplateKey] = useState<string>('');
  const [applying, setApplying] = useState(false);
  // Which vendor wrote the resume currently on screen. Read from the saved row
  // on load and from the generation response afterwards, so the badge is right
  // without a refetch.
  const [stamp, setStamp] = useState<ProviderStamp | null>(null);
  const [picking, setPicking] = useState(false);
  const { toast, show, dismiss } = useToast();

  // Object URLs are leaked memory until revoked, and the iframe still needs the
  // current one — so revoke only when it's replaced, and once on unmount.
  const pdfUrlRef = useRef<string | null>(null);
  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  // Scroll only for a resume the user just asked for. Restoring a saved draft
  // on page load must NOT yank the page around — they came to read the posting.
  const scrollOnNext = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!resume || !resultRef.current || !scrollOnNext.current) return;
    scrollOnNext.current = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [resume]);

  // Restore whatever is stored for this (profile, job). Exactly one row can
  // exist, so there is nothing to choose between.
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/resumes/saved?jobId=${jobId}&profileId=${profileId}`);
        if (cancelled || !res.ok) return;
        const row = (await res.json()) as SavedResume | null;
        if (cancelled) return;
        if (row?.data) {
          setResume(row.data);
          setStamp(row);
          setTemplateKey(row.templateKey);
          setSavedTemplateKey(row.templateKey);
          void renderPdf(row.data, Number(profileId), row.templateKey);
        } else {
          // Switching to a profile with no resume for this job must clear the
          // previous one, or the page shows someone else's document.
          setResume(null);
          setStamp(null);
          setTemplateKey('');
          setSavedTemplateKey('');
          replacePdfUrl(null);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, profileId]);

  function replacePdfUrl(next: string | null) {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  }

  // The notes are the one thing the user has to type, and they are the same for
  // every posting — losing them on navigation would make this unusable.
  function loadSaved() {
    setNotes(localStorage.getItem(NOTES_KEY) ?? '');
  }

  async function generate(provider: AiProvider) {
    if (!profileId) return;
    setPicking(false);
    scrollOnNext.current = true;
    setLoading(true);
    setError(null);
    setResume(null);
    setStamp(null);
    try {
      if (notes.trim()) localStorage.setItem(NOTES_KEY, notes);
      const res = await fetch('/api/resumes/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profileId, notes, provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Generation failed (' + res.status + ')');
        return;
      }
      const generated = data as GeneratedResume;
      setResume(generated);
      setStamp(generated);
      // Read the stored template back BEFORE rendering. The row was just
      // written, and a regenerate now adopts the profile's current default —
      // rendering with the key held in state would show the template this
      // component loaded with, which is the one the user just changed away
      // from.
      const key = await syncSavedTemplate();
      // Generation already cost 20-60s; the render adds ~1s and is cached
      // server-side, so showing the finished document beats making them ask.
      void renderPdf(generated, Number(profileId), key ?? templateKey ?? undefined);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  // Returns the key the server now has, so the caller can render with it
  // instead of the one this component was holding.
  async function syncSavedTemplate(): Promise<string | null> {
    if (!profileId) return null;
    try {
      const res = await fetch(`/api/resumes/saved?jobId=${jobId}&profileId=${profileId}`);
      if (!res.ok) return null;
      const row = (await res.json()) as SavedResume | null;
      if (!row) return null;

      let adopted: string | null = null;
      setTemplateKey((prev) => {
        // A pending choice — picked in the dropdown but not yet applied — still
        // wins, so a regenerate does not throw it away.
        const pending = prev && prev !== savedTemplateKey;
        adopted = pending ? prev : row.templateKey;
        return adopted;
      });
      setSavedTemplateKey(row.templateKey);
      return adopted;
    } catch {
      return null;
    }
  }

  function selectTemplate(key: string) {
    setTemplateKey(key);
    if (resume) void renderPdf(resume, Number(profileId), key);
  }

  async function applyTemplate() {
    if (!profileId || !templateKey) return;
    setApplying(true);
    try {
      const res = await fetch('/api/resumes/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, profileId, templateKey }),
      });
      if (!res.ok) {
        show('Could not save the template choice.', 'error');
        return;
      }
      setSavedTemplateKey(templateKey);
      show(`${presets.find((p) => p.key === templateKey)?.name ?? templateKey} applied`);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setApplying(false);
    }
  }

  async function renderPdf(forResume: TailoredResume, forProfileId: number, forTemplate?: string) {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/resumes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: forResume,
          profileId: forProfileId,
          pageSize: 'letter',
          ...(forTemplate ? { templateKey: forTemplate } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Could not render the PDF (' + res.status + ')');
        replacePdfUrl(null);
        return;
      }
      replacePdfUrl(URL.createObjectURL(await res.blob()));
    } catch {
      setError('Could not render the PDF.');
      replacePdfUrl(null);
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadDocx(forResume: TailoredResume, forProfileId: number, forTemplate?: string) {
    setDocxLoading(true);
    try {
      const res = await fetch('/api/resumes/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: forResume,
          profileId: forProfileId,
          pageSize: 'letter',
          ...(forTemplate ? { templateKey: forTemplate } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Could not render the Word file (' + res.status + ')');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = docxFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not render the Word file.');
    } finally {
      setDocxLoading(false);
    }
  }

  const fileName =
    ((resume?.headline || 'resume').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'resume') + '.pdf';
  const docxFileName = fileName.slice(0, -4) + '.docx';

  if (profiles.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-white">Generate a tailored resume</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create a profile first — it supplies your name, contact details and employment dates.
        </p>
      </div>
    );
  }

  const inferredCount = resume
    ? resume.skills.filter((s) => s.inferred).length +
      resume.experience.reduce(
        (n, e) => n + (e.titleInferred ? 1 : 0) + e.bullets.filter((b) => b.inferred).length,
        0,
      )
    : 0;

  return (
    <div>
      <h2 className="text-sm font-semibold text-white">Generate a tailored resume</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Written against this posting. Leave the notes empty and the draft is built from your
        employment history and the posting alone.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Profile
          </span>
          <select
            value={profileId}
            onChange={(e) => setProfileId(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.firstName, p.lastName].filter(Boolean).join(' ') ||
                  p.email ||
                  'Profile #' + p.id}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <span>
              Your experience <span className="font-normal normal-case">— optional</span>
            </span>
            <button
              type="button"
              onClick={loadSaved}
              className="font-normal normal-case tracking-normal text-[var(--muted)] underline transition hover:text-white"
            >
              load last used
            </button>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Anything you add here is treated as fact and outranks the AI's guesses. Leave it blank and everything is drafted for you to review."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)]/60"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={loading || !profileId}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Generating…' : resume ? 'Regenerate' : 'Generate'}
        </button>
        {loading && <span className="text-sm text-[var(--muted)]">This takes 20–60 seconds.</span>}
      </div>

      <GenerateModal
        open={picking}
        busy={loading}
        title={resume ? 'Regenerate this resume?' : 'Generate a tailored resume'}
        description="This writes the resume and the cover letter together, in one paid call that takes 20–60 seconds."
        warning={
          resume
            ? 'The resume and cover letter already saved for this posting will both be replaced.'
            : undefined
        }
        confirmLabel={resume ? 'Regenerate' : 'Generate'}
        onCancel={() => setPicking(false)}
        onConfirm={generate}
      />

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <Toast toast={toast} onDismiss={dismiss} />

      {resume && (
        <div ref={resultRef} className="mt-6 scroll-mt-6 border-t border-[var(--border)] pt-5">
          {presets.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-[var(--muted)]">Template</span>
                <select
                  value={templateKey}
                  onChange={(e) => selectTemplate(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)]"
                >
                  {presets.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                      {p.atsSafe ? '' : '  (not ATS-safe)'}
                    </option>
                  ))}
                </select>
              </label>

              {templateKey !== savedTemplateKey ? (
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={applying}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? 'Applying…' : 'Apply'}
                </button>
              ) : (
                <span className="text-xs text-[var(--muted)]">Saved</span>
              )}
            </div>
          )}

          {inferredCount > 0 && (
            <p className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <strong className="font-semibold">
                Draft — {inferredCount} items were written by AI.
              </strong>{' '}
              Anything{' '}
              <span className="decoration-amber-400/50 decoration-dotted underline-offset-4 [text-decoration-line:underline]">
                underlined
              </span>{' '}
              is a guess based on your employers and this posting. Check it before you send this to
              anyone.
            </p>
          )}

          <div className="mb-6">
            {pdfLoading && !pdfUrl && (
              <div className="flex h-64 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--muted)]">
                Rendering PDF…
              </div>
            )}

            {pdfUrl && (
              <div className="group relative overflow-hidden rounded-lg border border-[var(--border-strong)] bg-white">
                <iframe src={pdfUrl} title="Resume preview" className="block h-[560px] w-full" />

                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <a
                    href={pdfUrl}
                    download={fileName}
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white shadow-lg transition hover:bg-[var(--primary-hover)] focus:opacity-100"
                  >
                    Download PDF <span aria-hidden>↓</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadDocx(resume, Number(profileId), savedTemplateKey ?? undefined)}
                    disabled={docxLoading}
                    className="pointer-events-auto ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] shadow-lg transition hover:bg-[var(--surface-2)] focus:opacity-100 disabled:opacity-60"
                  >
                    {docxLoading ? 'Preparing…' : 'Download Word'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">{resume.headline}</h3>
            {/* Which vendor wrote this. Two documents for the same posting can
                come from different providers over time, and "who wrote it"
                changes how closely it is worth re-reading. */}
            {stampLabel(stamp) && (
              <ProviderBadge provider={stamp?.provider} label={stampLabel(stamp)!} />
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]/90">{resume.summary}</p>

          {resume.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {resume.skills.map((s) => (
                <span
                  key={s.name}
                  title={s.inferred ? 'Drafted by AI — verify before sending' : undefined}
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    s.inferred
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'bg-[var(--surface-2)] text-[var(--text)]'
                  }`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}

          {resume.experience.map((e, i) => (
            <div key={e.company + '-' + i} className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-white">
                  <Inferred on={e.titleInferred}>{e.title}</Inferred>
                  {e.company && (
                    <span className="font-normal text-[var(--muted)]"> · {e.company}</span>
                  )}
                </span>
                <span className="text-xs text-[var(--muted)]">{e.period}</span>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-[var(--text)]/90">
                {e.bullets.map((b, j) => (
                  <li key={j}>
                    <Inferred on={b.inferred}>{b.text}</Inferred>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {resume.education.length > 0 && (
            <div className="mt-5 text-sm text-[var(--text)]/90">
              {resume.education.map((ed, i) => (
                <div key={i}>
                  <span className="font-medium text-white">{ed.degree}</span>
                  {ed.institution && (
                    <span className="text-[var(--muted)]"> · {ed.institution}</span>
                  )}
                  {ed.period && <span className="text-[var(--muted)]"> · {ed.period}</span>}
                </div>
              ))}
            </div>
          )}

          {resume.gaps.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-red-300">
                This posting wants what your history does not show
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-red-200/90">
                {resume.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
