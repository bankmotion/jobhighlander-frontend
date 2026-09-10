/**
 * Types and constants ONLY — no server imports.
 *
 * The manager component is a client component and needs the character cap and
 * the label maps at runtime, so this module must stay reachable from the
 * browser bundle. The fetch that needs the session cookie lives in
 * `profile-prompts.server.ts`, the same split `admin-profiles` uses.
 */

/** How the application prompt treats one instruction the admin wrote. */
export type PromptFindingEffect = 'ignored' | 'weakened' | 'reinterpreted';

export interface PromptCheckFinding {
  quote: string;
  effect: PromptFindingEffect;
  reason: string;
  fix: string;
}

export type PromptVerdict = 'clean' | 'partial' | 'conflicts';

export interface PromptCheckView {
  verdict: PromptVerdict | string;
  summary: string;
  findings: PromptCheckFinding[];
  model: string;
  provider: string | null;
  providerLabel: string;
  checkedBy: string | null;
  checkedAt: string;
  /** The prompt has been edited since this review ran, so it no longer applies. */
  stale: boolean;
}

export interface ProfilePromptView {
  profileId: number;
  profileName: string;
  content: string;
  updatedAt: string | null;
  check: PromptCheckView | null;
}

export const CUSTOM_PROMPT_MAX = 4_000;

export const VERDICT_LABEL: Record<string, string> = {
  clean: 'Clean',
  partial: 'Partial',
  conflicts: 'Conflicts',
};

export const EFFECT_LABEL: Record<string, string> = {
  ignored: 'Ignored',
  weakened: 'Weakened',
  reinterpreted: 'Reinterpreted',
};
