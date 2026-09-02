'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  fetchProviders,
  priceHint,
  rememberProvider,
  rememberedProvider,
  type AiProvider,
  type ProviderInfo,
} from '@/lib/ai-providers';
import { Modal } from './modal';

/**
 * The catalogue is one row per configured key and changes only when the server
 * is redeployed, so it is fetched once per page load and shared by every
 * picker on it. Without this, opening the modal on twenty job cards would mean
 * twenty identical round trips.
 */
let catalogue: Promise<ProviderInfo[]> | null = null;
const loadProviders = (): Promise<ProviderInfo[]> => (catalogue ??= fetchProviders());

function pick(list: ProviderInfo[]): AiProvider | null {
  const usable = list.filter((p) => p.enabled);
  if (usable.length === 0) return null;
  // Last choice wins, but only while it is still usable — a key removed since
  // the preference was stored must not preselect a provider that 503s.
  const remembered = rememberedProvider();
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
  const [chosen, setChosen] = useState<AiProvider | null>(null);

  // Loaded on open rather than on mount: these pickers are rendered once per
  // job card, and fetching for all of them up front would be wasted work for
  // the ones nobody opens.
  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadProviders().then((list) => {
      if (!live) return;
      setProviders(list);
      // Only seed a choice the user has not already made in this dialog, so a
      // slow catalogue cannot overwrite a click that landed first.
      setChosen((prev) => prev ?? pick(list));
    });
    return () => {
      live = false;
    };
  }, [open]);

  // Reset between openings so the next generation starts from the remembered
  // preference rather than whatever was clicked and then cancelled. Adjusted
  // during render against the previous `open` rather than in an effect — a
  // synchronous setState in an effect body is the cascading render this repo's
  // lint rules reject.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setChosen(null);
  }

  const usable = (providers ?? []).filter((p) => p.enabled);
  const ready = chosen != null && !busy;

  function confirm() {
    if (!chosen) return;
    rememberProvider(chosen);
    onConfirm(chosen);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      title={title}
      size="md"
      footer={
        <>
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

          {providers === null ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">Loading providers…</p>
          ) : usable.length === 0 ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              No AI provider is configured on this server. Ask an admin to set{' '}
              <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code>.
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
