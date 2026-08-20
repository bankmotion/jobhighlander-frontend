'use client';

import type { ResumeStatus } from './resumes';

/**
 * In-flight resume generations, held OUTSIDE React.
 *
 * A generation takes 20-60 seconds. React state would not survive it, because
 * `app/loading.tsx` sits at the app root: every filter toggle and page click
 * swaps the whole list for the loading view and unmounts the provider. The run
 * would look like it vanished while the server was still working. A
 * module-level store keeps it alive for the client session; a hard reload loses
 * the tracking but not the work, since the backend upserts regardless of who is
 * listening.
 *
 * Everything here is keyed on `${profileId}:${jobId}`, never on jobId alone.
 * Two profiles can each have a resume for the same posting, and mixing them up
 * means rendering one person's history under another person's name.
 */

export type RunKey = string;

export function runKey(profileId: number, jobId: number): RunKey {
  return `${profileId}:${jobId}`;
}

export interface Run {
  jobId: number;
  profileId: number;
  /** Epoch ms, for the elapsed counter. */
  startedAt: number;
  state: 'running' | 'done' | 'error';
  /** Present once done — lets a remounted list know the resume now exists. */
  status?: ResumeStatus;
  error?: string;
  /** Whether retrying is worth the money. A refusal or a truncated response
   *  will reproduce exactly; a network blip or a 429 will not. */
  retryable?: boolean;
  /** Failed attempts so far, so a deterministic failure cannot be clicked into
   *  a loop of paid calls. */
  attempts: number;
}

/**
 * A run left 'running' for longer than this is treated as dead.
 *
 * Nothing else can free it: the fetch may never settle (a backend restart mid
 * generation leaves the socket hanging), and without this a stuck run holds its
 * concurrency slot and pins the card on "Generating…" for the rest of the
 * session with no way to clear it.
 */
export const RUN_TIMEOUT_MS = 180_000;

const runs = new Map<RunKey, Run>();
const listeners = new Set<() => void>();

/** Bumped on every mutation so `useSyncExternalStore` sees a new snapshot. */
let version = 0;

function emit(): void {
  version += 1;
  for (const l of listeners) l();
}

export function subscribeRuns(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * The snapshot is the version counter, not the map: `useSyncExternalStore`
 * compares snapshots with Object.is, and the map itself would compare equal
 * after every in-place mutation and never re-render.
 */
export function runsVersion(): number {
  return version;
}

/** Server snapshot — no run can be in flight during SSR. */
export function runsServerVersion(): number {
  return 0;
}

/** A run is only 'running' if it also has not outlived the timeout. */
function isLive(r: Run, at: number): boolean {
  return r.state === 'running' && at - r.startedAt < RUN_TIMEOUT_MS;
}

/**
 * The run for this pairing, with a timed-out one reported as an error rather
 * than as perpetually running.
 */
export function getRun(profileId: number, jobId: number, at: number): Run | undefined {
  const r = runs.get(runKey(profileId, jobId));
  if (!r) return undefined;
  if (r.state === 'running' && !isLive(r, at)) {
    return { ...r, state: 'error', error: 'Generation timed out. Try again.', retryable: true };
  }
  return r;
}

/** Live runs only — a stuck one must not hold a concurrency slot forever. */
export function activeRunCount(at: number): number {
  let n = 0;
  for (const r of runs.values()) if (isLive(r, at)) n += 1;
  return n;
}

/**
 * Begin a run unless one is already live for this pairing.
 *
 * Returns false when one is in flight — the guard against a double-click
 * spending twice. Each generation is a paid model call, so this is correctness
 * rather than polish.
 */
export function startRun(profileId: number, jobId: number, at: number): boolean {
  const k = runKey(profileId, jobId);
  const existing = runs.get(k);
  if (existing && isLive(existing, at)) return false;
  runs.set(k, {
    jobId,
    profileId,
    startedAt: at,
    state: 'running',
    // Retries carry the failure count forward so a deterministic failure cannot
    // be clicked into an unbounded run of paid calls.
    attempts: existing?.attempts ?? 0,
  });
  emit();
  return true;
}

export function finishRun(profileId: number, jobId: number, status: ResumeStatus): void {
  const k = runKey(profileId, jobId);
  const r = runs.get(k);
  if (!r) return;
  runs.set(k, { ...r, state: 'done', status, error: undefined, attempts: 0 });
  emit();
}

export function failRun(profileId: number, jobId: number, error: string, retryable = true): void {
  const k = runKey(profileId, jobId);
  const r = runs.get(k);
  if (!r) return;
  runs.set(k, { ...r, state: 'error', error, retryable, attempts: r.attempts + 1 });
  emit();
}

/** Drop a settled run once the UI has absorbed it. */
export function clearRun(profileId: number, jobId: number): void {
  if (runs.delete(runKey(profileId, jobId))) emit();
}

/**
 * Runs for THIS profile that settled while nothing was mounted.
 *
 * Profile-scoped deliberately: merging every settled run by job id would write
 * one profile's resume status onto another profile's card, which then offers to
 * open a row that does not exist for them.
 */
export function drainSettled(profileId: number): Run[] {
  const out: Run[] = [];
  for (const r of runs.values()) {
    if (r.profileId === profileId && r.state !== 'running') out.push(r);
  }
  return out;
}

// ── Generated documents ──────────────────────────────────────────────────────

/**
 * Documents already fetched or generated, so paginating away and back does not
 * refetch. Keyed by profile as well as job: the same posting can have a
 * different resume per profile, and serving the wrong one puts one person's
 * employment history under another person's name and contact details.
 */
const DOC_CACHE_LIMIT = 30;
const docs = new Map<RunKey, unknown>();

export function cacheDoc(profileId: number, jobId: number, doc: unknown): void {
  const k = runKey(profileId, jobId);
  // Re-insert so the key moves to the end; Map preserves insertion order, which
  // makes the oldest entry the first one iterated.
  docs.delete(k);
  docs.set(k, doc);
  while (docs.size > DOC_CACHE_LIMIT) {
    const oldest = docs.keys().next();
    if (oldest.done) break;
    docs.delete(oldest.value);
  }
}

export function getDoc(profileId: number, jobId: number): unknown {
  return docs.get(runKey(profileId, jobId));
}

/** Forget one document — used when its stored form may have changed. */
export function evictDoc(profileId: number, jobId: number): void {
  docs.delete(runKey(profileId, jobId));
}
