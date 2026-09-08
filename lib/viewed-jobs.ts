'use client';

import { createJsonLocalStore } from './local-store';

export const VIEWED_JOBS_KEY = 'jh.viewedJobs';

/**
 * Cap on remembered postings. At roughly 20 bytes an entry this is ~200KB,
 * comfortably inside the 5MB localStorage budget, and past a few thousand the
 * oldest marks have stopped being useful anyway — those listings have long
 * since dropped off the board.
 */
const MAX_TRACKED = 8000;

/** How many to drop when the cap is hit, so pruning is not a per-view cost. */
const PRUNE_TO = 6000;

interface Viewed {
  /** Whose marks these are. See `claim`. */
  owner: string;
  /** Job id (string, because JSON object keys always are) to epoch ms. */
  seen: Record<string, number>;
}

const empty = (): Viewed => ({ owner: '', seen: {} });

function isViewed(value: unknown): value is Viewed {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.owner !== 'string') return false;
  if (typeof v.seen !== 'object' || v.seen === null || Array.isArray(v.seen)) return false;
  return true;
}

export const viewedJobsStore = createJsonLocalStore<Viewed>({
  key: VIEWED_JOBS_KEY,
  validate: isViewed,
  fallback: empty,
});

/**
 * Point the store at whoever is signed in now.
 *
 * localStorage belongs to the browser, not the account. Without this, signing
 * out and back in as somebody else inherits their predecessor's marks — and
 * "already viewed" is a claim about the reader, so showing one person's history
 * to another is worse than showing none: it hides postings they have never
 * actually seen.
 *
 * Clearing rather than partitioning by key. Keeping every past user's history
 * around forever would grow without bound on a shared machine, and the marks
 * are cheap to rebuild by simply reading the board again.
 */
export function claimViewed(owner: string): void {
  const current = viewedJobsStore.read();
  if (current.owner === owner) return;
  viewedJobsStore.set({ owner, seen: {} });
}

/**
 * Record that a posting has been looked at.
 *
 * Idempotent on purpose: the panel remounts, the detail page reloads, and a
 * second visit must not rewrite the whole map for no change — that would spread
 * a re-serialise across every consumer's render for nothing.
 */
export function markViewed(jobId: number): void {
  if (!Number.isInteger(jobId) || jobId < 1) return;
  const current = viewedJobsStore.read();
  const key = String(jobId);
  if (current.seen[key]) return;

  const seen: Record<string, number> = { ...current.seen, [key]: Date.now() };
  viewedJobsStore.set({ owner: current.owner, seen: prune(seen) });
}

/** Drop the oldest marks once the map outgrows its cap. */
function prune(seen: Record<string, number>): Record<string, number> {
  const keys = Object.keys(seen);
  if (keys.length <= MAX_TRACKED) return seen;
  const kept = keys
    .sort((a, b) => seen[b] - seen[a])
    .slice(0, PRUNE_TO);
  const out: Record<string, number> = {};
  for (const k of kept) out[k] = seen[k];
  return out;
}

/** Forget everything, for a "mark all as unviewed" control. */
export function clearViewed(): void {
  viewedJobsStore.set({ owner: viewedJobsStore.read().owner, seen: {} });
}

/**
 * Subscribe to the marks.
 *
 * Returns the map rather than a per-job boolean so a card does not need its own
 * subscription: `useSyncExternalStore` gives every consumer the same cached
 * object, and identity only changes when a mark is actually added.
 *
 * Null before hydration — the server cannot read localStorage, and rendering a
 * card as viewed on the server and unviewed on the client is a mismatch React
 * would report. Consumers treat null as "nothing viewed yet".
 */
export function useViewedJobs(): Record<string, number> | null {
  return viewedJobsStore.useValue()?.seen ?? null;
}
