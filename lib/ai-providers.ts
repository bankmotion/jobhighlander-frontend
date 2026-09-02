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

const REMEMBERED_KEY = 'jh:ai-provider';

export const isAiProvider = (v: unknown): v is AiProvider =>
  typeof v === 'string' && (AI_PROVIDERS as readonly string[]).includes(v);

/**
 * The provider chosen last time, so the picker opens on it instead of resetting
 * to a default on every generation. Purely a convenience — the server still
 * validates, and a stored value for a provider that has since lost its key is
 * dropped by the caller against the live catalogue.
 */
export function rememberedProvider(): AiProvider | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(REMEMBERED_KEY);
    return isAiProvider(v) ? v : null;
  } catch {
    // Private-mode and blocked-storage browsers throw on read. Forgetting the
    // preference is a fine outcome; crashing the generate button is not.
    return null;
  }
}

export function rememberProvider(provider: AiProvider): void {
  try {
    window.localStorage.setItem(REMEMBERED_KEY, provider);
  } catch {}
}

/**
 * Which providers this deployment can actually call.
 *
 * Never guessed client-side: only the server knows which keys are set, and
 * offering a provider it cannot reach turns a confirm modal into a 503.
 */
export async function fetchProviders(): Promise<ProviderInfo[]> {
  try {
    const res = await fetch('/api/ai/providers', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: ProviderInfo[] };
    return data.providers ?? [];
  } catch {
    return [];
  }
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
