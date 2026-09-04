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
 * The badge for an already-generated document.
 *
 * Falls back to the raw model string when the server could not classify it —
 * an unknown model is still information, and "Unknown provider" alone is not.
 */
export function stampLabel(stamp: ProviderStamp | null | undefined): string | null {
  if (!stamp?.model) return null;
  return stamp.providerLabel && stamp.provider
    ? `${stamp.providerLabel} · ${stamp.model}`
    : stamp.model;
}
