export const AI_PROVIDERS = ['claude', 'openai'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface ProviderInfo {
  id: AiProvider;
  label: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  inputPerMTok: number | null;
  outputPerMTok: number | null;
}

/**
 * Anything the server has already labelled. The backend derives these from the
 * stored model string, so they are present on documents written long before
 * there was a choice to make.
 */
export interface ProviderStamp {
  model?: string | null;
  provider?: AiProvider | null;
  providerLabel?: string | null;
}

export const isAiProvider = (v: unknown): v is AiProvider =>
  typeof v === 'string' && (AI_PROVIDERS as readonly string[]).includes(v);

/**
 * The outcome of asking the server which providers it can call.
 *
 * A failure is NOT an empty list. Collapsing the two lets the picker tell
 * someone their keys are missing when the real problem was a stale route or an
 * expired session — a confident wrong answer that sends them to edit a correct
 * .env file. The two states are kept apart so each can name its own fix.
 */
export type ProviderLoad =
  | { ok: true; providers: ProviderInfo[] }
  | { ok: false; reason: string };

/**
 * Which providers this deployment can actually call.
 *
 * Never guessed client-side: only the server knows which keys are set, and
 * offering a provider it cannot reach turns a confirm modal into a 503.
 */
export async function fetchProviders(): Promise<ProviderLoad> {
  try {
    const res = await fetch('/api/ai/providers', { cache: 'no-store' });
    if (!res.ok) {
      // 404 is the one worth naming: it means the route is not deployed, which
      // is a restart or a rebuild, not a credentials problem.
      return {
        ok: false,
        reason:
          res.status === 404
            ? 'The provider endpoint is not deployed on this server (404). Restart the app after updating it.'
            : `The server returned HTTP ${res.status} when asked which AI providers are available.`,
      };
    }
    const data = (await res.json()) as { providers?: ProviderInfo[] };
    if (!Array.isArray(data.providers)) {
      // Reached something, but not this endpoint — most often a login redirect
      // followed to an HTML page, which parses as JSON-shaped nothing.
      return { ok: false, reason: 'The server sent an unexpected reply. Your session may have expired — try reloading.' };
    }
    return { ok: true, providers: data.providers };
  } catch {
    return { ok: false, reason: 'Could not reach the server to list AI providers.' };
  }
}

/**
 * The catalogue is one row per configured key and changes only when the server
 * is redeployed, so a successful answer is fetched once per page load and
 * shared by every caller on it. Without this, opening the picker on twenty job
 * cards would mean twenty identical round trips.
 *
 * FAILURES ARE NOT MEMOIZED. Caching one would pin a transient error — a
 * restart mid-session, a redeploy — for the life of the tab, so Retry could
 * never do anything.
 */
let catalogue: Promise<ProviderLoad> | null = null;

export function loadProviders(): Promise<ProviderLoad> {
  catalogue ??= fetchProviders().then((r) => {
    if (!r.ok) catalogue = null;
    return r;
  });
  return catalogue;
}

/** "$0.20 / $1.20 per 1M tokens" — what this choice costs, at the point of choosing. */
export function priceHint(p: ProviderInfo): string | null {
  if (p.inputPerMTok == null || p.outputPerMTok == null) return null;
  const fmt = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${n}`);
  return `${fmt(p.inputPerMTok)} in / ${fmt(p.outputPerMTok)} out per 1M tokens`;
}

/**
 * The shape of a typical generation, used to compare providers.
 *
 * Taken from what real calls actually look like on this deployment — a resume
 * plus cover letter runs roughly 6k tokens in and 3k out. It matters that
 * OUTPUT is weighted heavily: output is where the vendors differ most, and
 * comparing input rates alone would understate the gap by a wide margin.
 */
const TYPICAL_INPUT_TOKENS = 6_000;
const TYPICAL_OUTPUT_TOKENS = 3_200;

/** What one typical generation costs with this provider, or null if unpriced. */
function typicalCost(p: ProviderInfo): number | null {
  if (p.inputPerMTok == null || p.outputPerMTok == null) return null;
  return (
    (TYPICAL_INPUT_TOKENS * p.inputPerMTok + TYPICAL_OUTPUT_TOKENS * p.outputPerMTok) / 1_000_000
  );
}

export interface Recommendation {
  id: AiProvider;
  /** How many times cheaper than the next-cheapest usable provider. */
  timesCheaper: number;
}

/**
 * Which provider to recommend, and by how much — worked out from the rates the
 * server reports, never hardcoded.
 *
 * Those rates are what this deployment BILLS (list price times its markup), so
 * the multiple is the one the reader actually pays, not the vendors' list-price
 * difference. If the markups change so that Claude becomes the cheaper choice,
 * this follows; a badge that always said "OpenAI" would quietly become a lie.
 *
 * Returns null when there is nothing useful to say: fewer than two usable
 * providers, missing rates, or a gap too small to be worth a badge. Below that
 * threshold the recommendation is noise, and noise on a paid action costs more
 * attention than it saves money.
 */
export function recommendProvider(providers: ProviderInfo[]): Recommendation | null {
  const priced = providers
    .filter((p) => p.enabled)
    .map((p) => ({ p, cost: typicalCost(p) }))
    .filter((x): x is { p: ProviderInfo; cost: number } => x.cost != null && x.cost > 0)
    .sort((a, b) => a.cost - b.cost);
  if (priced.length < 2) return null;

  const ratio = priced[1].cost / priced[0].cost;
  if (ratio < 1.25) return null;
  return { id: priced[0].p.id, timesCheaper: ratio };
}

/** "4x" / "1.5x" — trimmed so a whole multiple does not read as "4.0x". */
export function timesLabel(times: number): string {
  return `${times >= 10 ? Math.round(times) : Number(times.toFixed(1))}x`;
}

/**
 * The badge for an already-generated document: the PROVIDER only.
 *
 * The model id used to be appended ("OpenAI · gpt-5.6-luna"). It is deliberately
 * gone: the reader did not choose the engine, cannot change it, and it moves
 * under them as providers ship new versions — so it was noise on every
 * generated document. Which provider wrote it is the part that stays true and
 * that someone might act on.
 *
 * `model` is still what decides whether there is a stamp at all, because a
 * record with no model is one that never ran. When the server could not
 * classify the provider there is nothing honest to name, so no badge shows.
 */
export function stampLabel(stamp: ProviderStamp | null | undefined): string | null {
  if (!stamp?.model) return null;
  return stamp.providerLabel && stamp.provider ? stamp.providerLabel : null;
}
