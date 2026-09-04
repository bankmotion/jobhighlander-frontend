'use client';

import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import {
  loadProviders,
  priceHint,
  type AiProvider,
  type ProviderInfo,
} from '@/lib/ai-providers';
import {
  autoProvider,
  readAiPreference,
  setPreferredProvider,
  setSkipConfirm,
  skipActive,
  SKIP_HOURS,
} from '@/lib/ai-preference';
import { Modal } from './modal';

function pick(list: ProviderInfo[]): AiProvider | null {
  const usable = list.filter((p) => p.enabled);
  if (usable.length === 0) return null;
  // Last choice wins, but only while it is still usable — a key removed since
  // the preference was stored must not preselect a provider that 503s.
  const remembered = readAiPreference().provider;
  if (remembered && usable.some((p) => p.id === remembered)) return remembered;
  return (usable.find((p) => p.isDefault) ?? usable[0]).id;
}

/**
 * Confirm a billable generation, and choose who is billed.
 *
 * Every path into this modal spends real money on a call that takes 20–60
 * seconds, so the choice and the confirmation are deliberately the same step:
 * a separate "are you sure?" after picking a provider would be two dialogs
 * asking one question.
 *
 * It can also be switched off for a day. Someone working through a list of jobs
 * answers the same question twenty times, and a prompt that is always answered
 * the same way stops being a decision and becomes a keystroke. When suppressed
 * this component renders NOTHING and confirms on its own — the callers are
 * unchanged, so there is exactly one place that decides whether to ask.
 */
export function GenerateModal({
  open,
  title,
  description,
  warning,
  confirmLabel = 'Generate',
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Shown in amber above the choices — e.g. "this overwrites your edits". */
  warning?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (provider: AiProvider) => void;
}) {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<AiProvider | null>(null);
  const [dontAsk, setDontAsk] = useState(false);

  // Read once per opening, synchronously: whether to ask is a localStorage
  // question, so deciding it before the first paint is what keeps a suppressed
  // dialog from flashing on screen before it confirms itself.
  const [silent, setSilent] = useState(false);

  // The confirm callback changes identity on every parent render, and the
  // effect below must not re-run when it does — re-running is what would fire a
  // second silent generation for one click. useEffectEvent lets the effect call
  // the LATEST callback while staying out of its dependency list.
  const fireConfirm = useEffectEvent((provider: AiProvider) => onConfirm(provider));

  // Loaded on open rather than on mount: these pickers are rendered once per
  // job card, and fetching for all of them up front would be wasted work for
  // the ones nobody opens.
  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadProviders().then((result) => {
      if (!live) return;
      if (!result.ok) {
        // A silent open cannot stay silent through an error: with no dialog on
        // screen there is nothing to show the failure in, so it falls back to
        // asking and the normal error branch explains itself.
        setSilent(false);
        setLoadError(result.reason);
        setProviders(null);
        return;
      }

      // Re-checked against the live catalogue rather than trusted from storage:
      // the remembered provider may have lost its key since.
      const auto = silent ? autoProvider(result.providers) : null;
      if (auto) {
        fireConfirm(auto);
        return;
      }

      setSilent(false);
      setLoadError(null);
      setProviders(result.providers);
      // Only seed a choice the user has not already made in this dialog, so a
      // slow catalogue cannot overwrite a click that landed first.
      setChosen((prev) => prev ?? pick(result.providers));
    });
    return () => {
      live = false;
    };
    // `attempt` is the Retry trigger — bumping it re-runs the load.
  }, [open, attempt, silent]);

  // Reset between openings so the next generation starts from the remembered
  // preference rather than whatever was clicked and then cancelled. Adjusted
  // during render against the previous `open` rather than in an effect — a
  // synchronous setState in an effect body is the cascading render this repo's
  // lint rules reject.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setSilent(skipActive(readAiPreference()));
    } else {
      setChosen(null);
      setDontAsk(false);
      setSilent(false);
    }
  }

  const usable = (providers ?? []).filter((p) => p.enabled);
  const ready = chosen != null && !busy;

  function confirm() {
    if (!chosen) return;
    setPreferredProvider(chosen);
    // Written on confirm, never on tick: ticking the box and then cancelling is
    // not consent to stop asking.
    if (dontAsk) setSkipConfirm(true, chosen);
    onConfirm(chosen);
  }

  // Nothing is drawn while a suppressed opening resolves. The alternative is a
  // dialog that appears and dismisses itself, which is worse than the dialog
  // the user asked to be rid of.
  if (silent) return null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      title={title}
      size="md"
      footer={
        <>
          {/* Left of the buttons and inside the footer, so the thing that
              changes what this dialog does in future sits with the controls
              that act on it now. Disabled until there is a choice to remember —
              suppressing the question without an answer is not a valid state. */}
          <label
            className={`mr-auto flex select-none items-center gap-2 text-xs ${
              ready ? 'cursor-pointer text-[var(--muted)]' : 'cursor-not-allowed opacity-50'
            }`}
          >
            <input
              type="checkbox"
              checked={dontAsk}
              disabled={!ready}
              onChange={(e) => setDontAsk(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--primary)]"
            />
            Don&rsquo;t ask again for {SKIP_HOURS} hours
          </label>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready}
            className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Generating…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {description && <p className="text-sm text-[var(--muted)]">{description}</p>}

        {warning && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {warning}
          </p>
        )}

        <fieldset disabled={busy}>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Generate with
          </legend>

          {loadError ? (
            // Deliberately NOT the "no keys are set" message: this branch means
            // the question never got an answer, so the credentials are not
            // known to be the problem and must not be blamed.
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <p>Could not load the list of AI providers.</p>
              <p className="mt-1 text-amber-200/80">{loadError}</p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-2 rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15"
              >
                Retry
              </button>
            </div>
          ) : providers === null ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">Loading providers…</p>
          ) : usable.length === 0 ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              The server replied, and neither key is set. Ask an admin to set{' '}
              <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code> and restart the backend.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {providers.map((p) => {
                const selected = chosen === p.id;
                const hint = priceHint(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!p.enabled || busy}
                    onClick={() => setChosen(p.id)}
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      selected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{p.label}</span>
                      {selected && <span className="text-xs text-[var(--primary)]">Selected</span>}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-[var(--muted)]">
                      {p.model}
                    </span>
                    {/* The price is the whole reason this choice is offered, so
                        it is stated at the point of choosing rather than
                        discovered later on the usage page. */}
                    {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
                    {!p.enabled && (
                      <span className="mt-1 block text-xs text-amber-300/80">Not configured</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}

/** The small "written by X" badge that sits on an already-generated document. */
export function ProviderBadge({
  provider,
  label,
  className = '',
}: {
  provider?: AiProvider | null;
  label: string;
  className?: string;
}) {
  const tone =
    provider === 'openai'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : provider === 'claude'
        ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]';

  return (
    <span
      title={`Generated by ${label}`}
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
