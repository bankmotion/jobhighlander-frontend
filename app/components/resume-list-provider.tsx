'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import type { ResumeStatus, ResumeStatusMap } from '@/lib/resumes';
import type { Preset } from '@/lib/templates';
import {
  activeRunCount,
  cacheDoc,
  clearRun,
  drainSettled,
  evictDoc,
  failRun,
  finishRun,
  getDoc,
  getRun,
  runsServerVersion,
  runsVersion,
  startRun,
  subscribeRuns,
  type Run,
} from '@/lib/resume-runs';
import { Modal } from './modal';
import { Toast, useToast } from './toast';

/** Notes the user typed on a job detail page, shared across postings. */
const NOTES_KEY = 'jh:resume-notes';

/** Concurrent generations allowed from one tab. Each is a paid model call. */
const MAX_CONCURRENT = 3;

/** Client-side ceiling on a run; matches the store's own stale-run timeout. */
const REQUEST_TIMEOUT_MS = 180_000;

/** Two failures of the same job usually means a third will fail identically. */
const MAX_ATTEMPTS = 2;

export interface ResumeTarget {
  jobId: number;
  title: string;
  company: string | null;
}

interface Ctx {
  /** Null when there is no usable profile — the action renders a prompt. */
  profileId: number | null;
  statusOf: (jobId: number) => ResumeStatus | undefined;
  runOf: (jobId: number) => Run | undefined;
  generate: (t: ResumeTarget) => void;
  /**
   * Generate without opening the preview dialog.
   *
   * The card's Generate button uses this: a modal popping open the moment you
   * click interrupts a scan of the list to show something you have not asked to
   * read. The button carries the wait, and View opens the dialog when you want
   * it.
   */
  generateQuiet: (t: ResumeTarget) => void;
  view: (t: ResumeTarget) => void;
  /** Renders and saves the PDF without opening the dialog. */
  download: (t: ResumeTarget) => void;
  /** So the card can show the wait — a render is a round trip, not instant. */
  isDownloading: (jobId: number) => boolean;
}

const ResumeCtx = createContext<Ctx | null>(null);

export function useResumeList(): Ctx {
  const ctx = useContext(ResumeCtx);
  if (!ctx) throw new Error('useResumeList must be used inside <ResumeListProvider>');
  return ctx;
}

type ResumeDoc = Record<string, unknown>;

/**
 * Company and job id, not just the headline: every resume written for the same
 * role would otherwise land in the downloads folder under an identical name.
 */
function fileNameFor(t: ResumeTarget): string {
  return (
    [t.company, t.title, t.jobId]
      .filter(Boolean)
      .join('-')
      .replace(/[^\w.-]+/g, '_')
      .slice(0, 80) || 'resume'
  );
}

/** Seed state with anything that finished while nothing was mounted. */
function mergeSettled(initial: ResumeStatusMap, settled: Run[]): ResumeStatusMap {
  const out = { ...initial };
  for (const r of settled) {
    if (r.state === 'done' && r.status) out[r.jobId] = r.status;
  }
  return out;
}

export function ResumeListProvider({
  profileId,
  initialStatus,
  presets,
  children,
}: {
  profileId: number | null;
  initialStatus: ResumeStatusMap;
  presets: Preset[];
  children: ReactNode;
}) {
  // Merged in the INITIALIZER, not an effect: a generation that settled while
  // the list was unmounted (a filter toggle swaps the whole tree for the
  // loading view) must be reflected before first paint. Doing it in an effect
  // would also be a synchronous setState in an effect body, which this repo's
  // lint rules reject. Reading module state in an initializer is pure.
  const [status, setStatus] = useState<ResumeStatusMap>(() =>
    profileId ? mergeSettled(initialStatus, drainSettled(profileId)) : initialStatus,
  );

  /**
   * Re-seed when the SERVER sends a new snapshot.
   *
   * The initializer above runs once per mount, and a client-side navigation
   * does not remount this provider — React reconciles it in place. So a prop
   * change alone used to leave `status` holding the previous navigation's map:
   * switch profile from the sidebar and every card kept reporting the old
   * profile's resumes until a full reload rebuilt the tree. Prefetched links
   * made it reliable rather than intermittent, because an instant navigation
   * never renders the loading fallback that would otherwise have unmounted us.
   *
   * `initialStatus` is a fresh object per RSC payload and a stable reference
   * across client re-renders, which makes its identity exactly the signal for
   * "the server just told us something new" — profile, filter or page alike.
   *
   * Adjusted during render rather than in an effect: an effect would paint the
   * stale badges and correct them a frame later, which is the same bug with a
   * shorter life. `drainSettled` only reads, so this stays pure.
   */
  const [seededFrom, setSeededFrom] = useState<ResumeStatusMap>(initialStatus);
  if (seededFrom !== initialStatus) {
    setSeededFrom(initialStatus);
    setStatus(profileId ? mergeSettled(initialStatus, drainSettled(profileId)) : initialStatus);
  }

  const [target, setTarget] = useState<ResumeTarget | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  // Card-level downloads, keyed by job. An array rather than a Set in state so
  // each change is a new reference React can actually see.
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const { toast, show, dismiss } = useToast();

  useSyncExternalStore(subscribeRuns, runsVersion, runsServerVersion);

  // Absorbed above; dropping them here is a Map write, legal in an effect.
  useEffect(() => {
    if (!profileId) return;
    for (const r of drainSettled(profileId)) {
      // Errors stay: they are the only record that a paid call failed.
      if (r.state === 'done') clearRun(profileId, r.jobId);
    }
  }, [profileId]);

  // Clock for the elapsed counter. Ticks only while something is generating,
  // and is held in state because reading Date.now() during render is an impure
  // render under React 19.
  const [now, setNow] = useState(0);
  const running = activeRunCount(now || 0) > 0;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Exactly one object URL is alive at a time — the one the open modal shows.
  const pdfUrlRef = useRef<string | null>(null);
  const replacePdfUrl = useCallback((next: string | null) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = next;
    setPdfUrl(next);
  }, []);
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  // Every render is stamped, and a superseded one must not touch any shared
  // state. Without this a slow render that finishes late clears the loading
  // flag of the render that replaced it — or worse, revokes its live blob.
  const renderSeq = useRef(0);

  const renderPdf = useCallback(
    async (doc: ResumeDoc, forProfileId: number, templateKey?: string) => {
      const seq = ++renderSeq.current;
      const current = () => seq === renderSeq.current && mountedRef.current;

      setPdfLoading(true);
      setPdfError(null);
      try {
        const res = await fetch('/api/resumes/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume: doc,
            profileId: forProfileId,
            pageSize: 'letter',
            ...(templateKey ? { templateKey } : {}),
          }),
        });
        if (!current()) return;

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          if (!current()) return;
          setPdfError(err?.error ?? `Could not render the PDF (${res.status})`);
          replacePdfUrl(null);
          return;
        }
        const blob = await res.blob();
        if (!current()) return;
        replacePdfUrl(URL.createObjectURL(blob));
      } catch {
        if (!current()) return;
        setPdfError('Could not render the PDF.');
        replacePdfUrl(null);
      } finally {
        if (current()) setPdfLoading(false);
      }
    },
    [replacePdfUrl],
  );

  /** The stored document for a job, from cache when possible. */
  const loadDoc = useCallback(
    async (jobId: number): Promise<{ doc: ResumeDoc; templateKey: string } | null> => {
      if (!profileId) return null;
      try {
        const res = await fetch(`/api/resumes/saved?jobId=${jobId}&profileId=${profileId}`);
        if (!res.ok) return null;
        const row = await res.json();
        if (!row?.data) return null;
        cacheDoc(profileId, jobId, row.data);
        return { doc: row.data as ResumeDoc, templateKey: row.templateKey };
      } catch {
        return null;
      }
    },
    [profileId],
  );

  const refreshStatus = useCallback(
    async (jobId: number): Promise<ResumeStatus | null> => {
      if (!profileId) return null;
      try {
        const res = await fetch(`/api/resumes/status?profileId=${profileId}&jobIds=${jobId}`);
        if (!res.ok) return null;
        const map = (await res.json()) as ResumeStatusMap;
        return map[jobId] ?? null;
      } catch {
        return null;
      }
    },
    [profileId],
  );

  // The open modal is tracked in a ref so a generation that finishes after the
  // user closed the dialog does not yank a PDF back onto the screen.
  const targetRef = useRef<ResumeTarget | null>(null);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const runGeneration = useCallback(
    async (t: ResumeTarget) => {
      if (!profileId) return;

      const at = Date.now();
      if (activeRunCount(at) >= MAX_CONCURRENT) {
        show(
          `${MAX_CONCURRENT} resumes are already being written. Wait for one to finish.`,
          'error',
        );
        return;
      }
      // Refuses when one is already live — the double-click guard. Each call is
      // a paid model request, so this is correctness, not polish.
      if (!startRun(profileId, t.jobId, at)) return;
      setNow(at);

      // The list has no notes field, but the detail page saves what the user
      // typed. Reusing it means a rewrite is at least as grounded as the
      // original instead of silently discarding their own words.
      let notes = '';
      try {
        notes = localStorage.getItem(NOTES_KEY) ?? '';
      } catch {
        /* private mode — an empty note is the correct fallback */
      }

      try {
        const res = await fetch('/api/resumes/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: t.jobId, profileId, notes }),
          // Without this a hung request never settles, the run stays 'running'
          // forever, and it holds a concurrency slot for the whole session.
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error ?? `Generation failed (${res.status})`;
          // A refusal or a truncated response reproduces exactly; paying again
          // buys the same failure. Rate limits and network errors do not.
          const retryable = res.status === 429 || res.status >= 500;
          failRun(profileId, t.jobId, msg, retryable);
          show(msg, 'error');
          return;
        }

        // /preview answers 200 even when the row could not be written, so the
        // generated text is real but nothing is stored. Presenting that as
        // saved leaves a card that can never be opened.
        if (data?.saved === false) {
          failRun(profileId, t.jobId, 'Generated, but it could not be saved. Try again.', true);
          show('Generated, but it could not be saved.', 'error');
          return;
        }

        cacheDoc(profileId, t.jobId, data);

        // The row IS saved here. If the status refresh fails anyway, fall back
        // to a locally-built entry rather than leaving the card on "no resume"
        // — otherwise the next click pays for the same resume twice.
        const st =
          (await refreshStatus(t.jobId)) ??
          ({
            jobId: t.jobId,
            templateKey: '',
            model: '',
            updatedAt: new Date().toISOString(),
            headline: typeof data?.headline === 'string' ? data.headline : '',
            inferredCount: 0,
            reviewNoteCount: 0,
          } satisfies ResumeStatus);

        finishRun(profileId, t.jobId, st);
        if (mountedRef.current) setStatus((prev) => ({ ...prev, [t.jobId]: st }));

        if (targetRef.current?.jobId === t.jobId) {
          await renderPdf(data as ResumeDoc, profileId, st.templateKey || undefined);
        } else {
          // They closed the dialog or moved on; announce it rather than
          // reopening something they dismissed.
          show(`Resume ready — ${t.title}`);
        }
      } catch (err) {
        const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
        const msg = timedOut
          ? 'Generation timed out after 3 minutes.'
          : 'Could not reach the server.';
        failRun(profileId, t.jobId, msg, true);
        show(msg, 'error');
      }
    },
    [profileId, refreshStatus, renderPdf, show],
  );

  const openFor = useCallback(
    (t: ResumeTarget) => {
      setTarget(t);
      targetRef.current = t;
      setConfirmRegen(false);
      setPdfError(null);
      replacePdfUrl(null);
    },
    [replacePdfUrl],
  );

  const generate = useCallback(
    (t: ResumeTarget) => {
      openFor(t);
      void runGeneration(t);
    },
    [openFor, runGeneration],
  );

  /** Same run as `generate`, no dialog. See the context type. */
  const generateQuiet = useCallback(
    (t: ResumeTarget) => {
      void runGeneration(t);
    },
    [runGeneration],
  );

  const view = useCallback(
    (t: ResumeTarget) => {
      if (!profileId) return;
      // Drop a settled run before opening: a resume that exists must not show
      // the error banner from an earlier failed attempt beside its own PDF.
      const prev = getRun(profileId, t.jobId, Date.now());
      if (prev && prev.state !== 'running') clearRun(profileId, t.jobId);
      openFor(t);

      void (async () => {
        const cached = getDoc(profileId, t.jobId) as ResumeDoc | undefined;
        const known = status[t.jobId];
        if (cached && known) {
          if (targetRef.current?.jobId !== t.jobId) return;
          await renderPdf(cached, profileId, known.templateKey || undefined);
          return;
        }
        const loaded = await loadDoc(t.jobId);
        if (!loaded) {
          if (mountedRef.current && targetRef.current?.jobId === t.jobId) {
            setPdfError('Could not load the saved resume.');
          }
          return;
        }
        if (targetRef.current?.jobId !== t.jobId) return;
        await renderPdf(loaded.doc, profileId, loaded.templateKey || undefined);
      })();
    },
    [loadDoc, openFor, profileId, renderPdf, status],
  );

  /**
   * Live downloads, held in a ref as well as state: the double-click guard has
   * to read the CURRENT set synchronously, and state read inside an async
   * callback is the value captured when the callback was created.
   */
  const downloadingRef = useRef<Set<number>>(new Set());
  const markDownloading = useCallback((jobId: number, on: boolean) => {
    const set = downloadingRef.current;
    if (on) set.add(jobId);
    else set.delete(jobId);
    if (mountedRef.current) setDownloadingIds([...set]);
  }, []);

  /**
   * Save the PDF straight from the card.
   *
   * Deliberately NOT `renderPdf`: that one owns the dialog's blob URL and its
   * loading flag, so reusing it here would blank a preview the user has open
   * beside this card — and revoke the very URL its iframe is showing.
   */
  const download = useCallback(
    async (t: ResumeTarget) => {
      if (!profileId || downloadingRef.current.has(t.jobId)) return;
      markDownloading(t.jobId, true);
      try {
        const known = status[t.jobId] ?? getRun(profileId, t.jobId, Date.now())?.status;
        let doc = getDoc(profileId, t.jobId) as ResumeDoc | undefined;
        let templateKey = known?.templateKey;
        if (!doc) {
          const loaded = await loadDoc(t.jobId);
          if (!loaded) {
            show('Could not load the saved resume.', 'error');
            return;
          }
          doc = loaded.doc;
          // The stored template wins over the status row: it is what the
          // document was actually written against.
          templateKey = loaded.templateKey;
        }

        const res = await fetch('/api/resumes/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume: doc,
            profileId,
            pageSize: 'letter',
            ...(templateKey ? { templateKey } : {}),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          show(err?.error ?? `Could not render the PDF (${res.status})`, 'error');
          return;
        }

        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileNameFor(t)}.pdf`;
        // Appended before clicking: a detached anchor is ignored by Firefox.
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoking on the next line cancels the save in Firefox and Safari,
        // which read the blob asynchronously after the click. A plain timer,
        // not an effect cleanup — a filter toggle unmounts this provider, and
        // tearing the URL down there would kill a download in flight.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        show('Could not download the PDF.', 'error');
      } finally {
        markDownloading(t.jobId, false);
      }
    },
    [loadDoc, markDownloading, profileId, show, status],
  );

  const close = useCallback(() => {
    setTarget(null);
    targetRef.current = null;
    setConfirmRegen(false);
    replacePdfUrl(null);
  }, [replacePdfUrl]);

  const ctx: Ctx = {
    profileId,
    statusOf: (jobId) =>
      status[jobId] ?? (profileId ? getRun(profileId, jobId, now || 0)?.status : undefined),
    runOf: (jobId) => (profileId ? getRun(profileId, jobId, now || 0) : undefined),
    generate,
    generateQuiet,
    view,
    download: (t) => void download(t),
    isDownloading: (jobId) => downloadingIds.includes(jobId),
  };

  const run = target && profileId ? getRun(profileId, target.jobId, now || 0) : undefined;
  const generating = run?.state === 'running';
  // Resolved inline rather than through ctx.statusOf: calling that closure
  // during render trips the refs lint rule, and this is the same lookup.
  const st = target
    ? (status[target.jobId] ??
      (profileId ? getRun(profileId, target.jobId, now || 0)?.status : undefined))
    : undefined;
  const preset = presets.find((p) => p.key === st?.templateKey);
  const failed = run?.state === 'error';
  const exhausted = (run?.attempts ?? 0) >= MAX_ATTEMPTS;

  const fileName = target ? fileNameFor(target) : 'resume';

  return (
    <ResumeCtx.Provider value={ctx}>
      {children}

      <Toast toast={toast} onDismiss={dismiss} />

      <Modal
        open={!!target}
        onClose={close}
        size="xl"
        title={target?.title ?? 'Resume'}
        // The list re-renders while this is open, which detaches the element
        // that opened it; find the live one instead.
        restoreFocusTo={() =>
          target
            ? document.querySelector<HTMLElement>(`[data-resume-trigger="${target.jobId}"]`)
            : null
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {target?.company && <span>{target.company}</span>}
            {target?.company && <span aria-hidden>·</span>}
            {generating ? (
              <span>Writing…</span>
            ) : failed ? (
              <span>Generation failed</span>
            ) : st ? (
              <>
                <span>{preset?.name ?? st.templateKey ?? 'Default template'}</span>
                {st.updatedAt && (
                  <>
                    <span aria-hidden>·</span>
                    {/* Absolute, not "3m ago": a relative label needs the clock
                        during render, which React 19 rejects as impure. */}
                    <time dateTime={st.updatedAt}>{new Date(st.updatedAt).toLocaleString()}</time>
                  </>
                )}
              </>
            ) : null}
          </span>
        }
        footer={
          <>
            {target && (
              <Link
                // Carries the profile for the same reason the card links do:
                // the detail page falls back to the viewer's FIRST profile
                // without it, which is not necessarily this resume's.
                href={
                  profileId
                    ? `/jobs/${target.jobId}?tab=resume&profile=${profileId}`
                    : `/jobs/${target.jobId}?tab=resume`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto text-sm text-[var(--muted)] underline transition hover:text-white"
              >
                Open full editor ↗
              </Link>
            )}
            {/* Offered whenever there is something to replace or recover from,
                not only on the happy path — otherwise a card stuck in a bad
                state cannot be fixed without a reload. */}
            {!generating && (st || pdfError || failed) && !confirmRegen && !exhausted && (
              <button
                type="button"
                onClick={() => (st ? setConfirmRegen(true) : target && void runGeneration(target))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/5"
              >
                {st ? 'Rewrite' : 'Try again'}
              </button>
            )}
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={`${fileName}.pdf`}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
              >
                Download PDF
              </a>
            )}
          </>
        }
      >
        <div className="p-5">
          {confirmRegen && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-100">
                <strong className="font-semibold">Rewrite this resume?</strong> The current wording
                is replaced and cannot be recovered — there is only one resume per job. Your
                template stays. This calls the model again.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRegen(false)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/5"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRegen(false);
                    if (target && profileId) {
                      evictDoc(profileId, target.jobId);
                      replacePdfUrl(null);
                      void runGeneration(target);
                    }
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-500"
                >
                  Rewrite it
                </button>
              </div>
            </div>
          )}

          {generating && (
            <div
              aria-busy="true"
              className="flex h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center"
            >
              <span
                aria-hidden
                className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)] motion-reduce:animate-none"
              />
              <span className="sr-only">Writing a resume. This takes 20 to 60 seconds.</span>
              <p aria-hidden className="text-sm font-medium text-[var(--text)]">
                Writing a resume for this posting… {formatElapsed(elapsedSince(run, now))}
              </p>
              <p className="max-w-sm text-xs text-[var(--muted)]">
                This usually takes 20–60 seconds. You can close this — it keeps running and the card
                updates when it is done.
              </p>
            </div>
          )}

          {!generating && failed && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{run?.error}</p>
              {exhausted ? (
                <p className="mt-2 text-red-300/80">
                  Two attempts failed. Open the full editor to add your own details, or check the
                  job description.
                </p>
              ) : (
                run?.retryable === false && (
                  <p className="mt-2 text-red-300/80">
                    Retrying will produce the same result — this one needs a change first.
                  </p>
                )
              )}
            </div>
          )}

          {!generating && pdfError && !failed && (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {pdfError}
            </p>
          )}

          {!generating && pdfLoading && !pdfUrl && (
            <div className="flex h-[60vh] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--muted)]">
              Rendering PDF…
            </div>
          )}

          {!generating && pdfUrl && (
            <>
              {!!st?.inferredCount && (
                <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  <strong className="font-semibold">
                    {st.inferredCount} item{st.inferredCount === 1 ? ' was' : 's were'} written by
                    AI.
                  </strong>{' '}
                  Check them in the full editor before you send this to anyone.
                </p>
              )}
              <iframe
                src={pdfUrl}
                title={`Resume PDF for ${target?.title ?? 'this job'}`}
                className="block h-[65vh] w-full rounded-lg border border-[var(--border-strong)] bg-white"
              />
              {/* Always rendered: mobile Safari and Android Chrome show nothing
                  at all for a blob: PDF in an iframe, and there is no reliable
                  way to detect that from here. Without this line the whole
                  mobile experience is a blank white box. */}
              <p className="mt-2 text-xs text-[var(--muted)]">
                Not showing?{' '}
                <a
                  href={pdfUrl}
                  download={`${fileName}.pdf`}
                  className="underline hover:text-white"
                >
                  Download the PDF instead.
                </a>
              </p>
            </>
          )}
        </div>
      </Modal>
    </ResumeCtx.Provider>
  );
}

/** Whole seconds a run has been going, against a clock held in state. */
function elapsedSince(run: Run | undefined, now: number): number {
  if (run?.state !== 'running' || !now) return 0;
  return Math.max(0, Math.floor((now - run.startedAt) / 1000));
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
