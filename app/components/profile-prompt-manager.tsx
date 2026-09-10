'use client';

import { useState } from 'react';
import {
  CUSTOM_PROMPT_MAX,
  EFFECT_LABEL,
  VERDICT_LABEL,
  type ProfilePromptView,
  type PromptCheckView,
} from '@/lib/profile-prompts';
import type { AiProvider } from '@/lib/ai-providers';
import { GenerateModal } from './generate-modal';
import { Toast, useToast } from './toast';

const VERDICT_STYLE: Record<string, string> = {
  clean: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  partial: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  conflicts: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const EFFECT_STYLE: Record<string, string> = {
  ignored: 'bg-red-500/15 text-red-300',
  weakened: 'bg-amber-500/15 text-amber-300',
  reinterpreted: 'bg-sky-500/15 text-sky-300',
  // Violet, not red: nothing is broken, the instruction is just aimed at a
  // career this profile does not have.
  inapplicable: 'bg-violet-500/15 text-violet-300',
};

/** What the tab strip shows next to a profile name at a glance. */
function tabDot(p: ProfilePromptView, dirty: boolean): string | null {
  if (dirty) return 'text-amber-400';
  if (!p.content.trim()) return null;
  if (!p.check || p.check.stale) return 'text-[var(--muted)]';
  return p.check.verdict === 'clean' ? 'text-emerald-400' : 'text-amber-400';
}

function Review({ check }: { check: PromptCheckView }) {
  const style = VERDICT_STYLE[check.verdict] ?? VERDICT_STYLE.partial;

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 ${style}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">
          {VERDICT_LABEL[check.verdict] ?? check.verdict}
        </span>
        <span className="text-sm opacity-90">{check.summary}</span>
      </div>

      {check.findings.length > 0 && (
        <ul className="mt-3 space-y-3 border-t border-current/15 pt-3">
          {check.findings.map((f, i) => (
            <li key={i}>
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    EFFECT_STYLE[f.effect] ?? EFFECT_STYLE.weakened
                  }`}
                >
                  {EFFECT_LABEL[f.effect] ?? f.effect}
                </span>
                <span className="font-mono text-[13px] text-[var(--text)]">“{f.quote}”</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{f.reason}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text)]">
                <span className="text-[var(--muted)]">→ </span>
                {f.fix}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProfilePromptManager({ initial }: { initial: ProfilePromptView[] }) {
  const [prompts, setPrompts] = useState<ProfilePromptView[]>(initial);
  const [activeId, setActiveId] = useState<number>(initial[0]?.profileId ?? 0);
  // Keyed by profile, so switching tabs does not discard an unsaved edit on the
  // one you are leaving. Same reasoning as the super-admin Prompts screen.
  const [drafts, setDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(initial.map((p) => [p.profileId, p.content])),
  );
  const [busy, setBusy] = useState(false);
  // Which billable action the provider dialog is confirming, or null when it is
  // closed. One dialog for both, because both spend on the same call.
  const [pending, setPending] = useState<'save' | 'check' | null>(null);
  const { toast, show, dismiss } = useToast();

  const active = prompts.find((p) => p.profileId === activeId);
  const draft = drafts[activeId] ?? '';
  const dirty = active ? draft !== active.content : false;
  const tooLong = draft.length > CUSTOM_PROMPT_MAX;

  function apply(updated: ProfilePromptView) {
    setPrompts((list) =>
      list.map((p) => (p.profileId === updated.profileId ? updated : p)),
    );
    setDrafts((d) => ({ ...d, [updated.profileId]: updated.content }));
  }

  async function send(
    url: string,
    method: 'PUT' | 'POST',
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      apply(data as ProfilePromptView);
      show(successMessage);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Clearing a prompt spends nothing, so it must not open a spend dialog.
   * Everything else goes through the ordinary provider confirmation.
   */
  function onSave() {
    if (!draft.trim()) {
      void send(
        `/api/admin/profile-prompts/${activeId}`,
        'PUT',
        { content: '' },
        'Custom prompt cleared',
      );
      return;
    }
    setPending('save');
  }

  function confirm(provider: AiProvider) {
    const action = pending;
    setPending(null);
    if (action === 'save') {
      void send(
        `/api/admin/profile-prompts/${activeId}`,
        'PUT',
        { content: draft, provider },
        'Saved and reviewed',
      );
    } else if (action === 'check') {
      void send(
        `/api/admin/profile-prompts/${activeId}/check`,
        'POST',
        { provider },
        'Review updated',
      );
    }
  }

  if (!active) {
    return (
      <p className="text-sm text-[var(--muted)]">
        You do not own any profiles yet. Create one first — a custom prompt belongs to a profile.
      </p>
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Profiles"
        className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {prompts.map((p) => {
          const selected = p.profileId === activeId;
          const dot = tabDot(p, (drafts[p.profileId] ?? p.content) !== p.content);
          return (
            <button
              key={p.profileId}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(p.profileId)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--surface-2)] text-white'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {p.profileName}
              {dot && (
                <span className={`ml-1.5 ${dot}`} aria-hidden>
                  •
                </span>
              )}
              {selected && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--primary)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDrafts((d) => ({ ...d, [activeId]: e.target.value }))}
        spellCheck={false}
        rows={14}
        aria-label={`Custom prompt for ${active.profileName}`}
        placeholder={
          'Extra drafting guidance for this profile. For example: aim at fintech ' +
          'backend roles, keep the tone plain and technical, lead with distributed ' +
          'systems work, and avoid startup jargon.'
        }
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--text)] outline-none transition placeholder:text-[var(--muted)]/50 focus:border-[var(--primary)]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className={`text-xs ${tooLong ? 'text-red-400' : 'text-[var(--muted)]'}`}>
          {draft.length.toLocaleString()} / {CUSTOM_PROMPT_MAX.toLocaleString()} characters
          {tooLong && ' · too long to save'}
          {dirty && !tooLong && ' · unsaved changes'}
          {active.updatedAt && !dirty && (
            <>
              {' · saved '}
              {new Date(active.updatedAt).toLocaleString()}
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          {!dirty && active.content.trim() && (
            <button
              onClick={() => setPending('check')}
              disabled={busy}
              className="rounded-lg border border-[var(--border-strong)] px-4 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review again
            </button>
          )}
          <button
            onClick={onSave}
            disabled={!dirty || busy || tooLong}
            className="jh-cta rounded-lg px-5 py-1.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Working…' : draft.trim() ? 'Save and review' : 'Clear prompt'}
          </button>
        </div>
      </div>

      {active.check && active.content.trim() && (
        <>
          {active.check.stale && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              This review was run against an earlier version of the text below.
            </p>
          )}
          <Review check={active.check} />
          <p className="mt-2 text-xs text-[var(--muted)]">
            Reviewed {new Date(active.check.checkedAt).toLocaleString()} by{' '}
            {active.check.providerLabel}
            {active.check.checkedBy ? ` · ${active.check.checkedBy}` : ''}
          </p>
        </>
      )}

      {!active.check && active.content.trim() && (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
          Not reviewed yet. Saving runs the review automatically; if it was skipped, the AI call
          could not be made at the time.
        </p>
      )}

      <div className="mt-5 space-y-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
        <p>
          This text is added to the main application prompt as a house style addendum. It steers
          tone, emphasis, framing and how far the draft infers. It cannot change the output format,
          the fixed facts read from the profile (employers, dates, degrees, locations, total years),
          or the review markings — the main prompt overrides it wherever the two disagree.
        </p>
        <p>
          The review is advice, not enforcement. Your prompt is sent exactly as saved; nothing is
          stripped from it automatically.
        </p>
      </div>

      <GenerateModal
        open={pending !== null}
        busy={busy}
        title={pending === 'check' ? 'Review this prompt again?' : 'Save and review this prompt?'}
        description="One short AI call reads your prompt against the main application prompt and reports what it will and will not let through."
        confirmLabel={pending === 'check' ? 'Review' : 'Save and review'}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
