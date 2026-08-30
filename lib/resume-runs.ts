'use client';

import type { ResumeStatus } from './resumes';

export type RunKey = string;

export function runKey(profileId: number, jobId: number): RunKey {
  return `${profileId}:${jobId}`;
}

export interface Run {
  jobId: number;
  profileId: number;
  startedAt: number;
  state: 'running' | 'done' | 'error';
  status?: ResumeStatus;
  error?: string;
  retryable?: boolean;
  attempts: number;
}

export const RUN_TIMEOUT_MS = 180_000;

const runs = new Map<RunKey, Run>();
const listeners = new Set<() => void>();

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

export function runsVersion(): number {
  return version;
}

export function runsServerVersion(): number {
  return 0;
}

function isLive(r: Run, at: number): boolean {
  return r.state === 'running' && at - r.startedAt < RUN_TIMEOUT_MS;
}

export function getRun(profileId: number, jobId: number, at: number): Run | undefined {
  const r = runs.get(runKey(profileId, jobId));
  if (!r) return undefined;
  if (r.state === 'running' && !isLive(r, at)) {
    return { ...r, state: 'error', error: 'Generation timed out. Try again.', retryable: true };
  }
  return r;
}

export function activeRunCount(at: number): number {
  let n = 0;
  for (const r of runs.values()) if (isLive(r, at)) n += 1;
  return n;
}

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

export function clearRun(profileId: number, jobId: number): void {
  if (runs.delete(runKey(profileId, jobId))) emit();
}

export function drainSettled(profileId: number): Run[] {
  const out: Run[] = [];
  for (const r of runs.values()) {
    if (r.profileId === profileId && r.state !== 'running') out.push(r);
  }
  return out;
}

// ── Generated documents ──────────────────────────────────────────────────────

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

export function evictDoc(profileId: number, jobId: number): void {
  docs.delete(runKey(profileId, jobId));
}
