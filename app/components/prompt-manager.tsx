'use client';

import { useState } from 'react';
import type { PromptView } from '@/lib/prompts';
import { Toast, useToast } from './toast';

export function PromptManager({ initial }: { initial: PromptView[] }) {
  const [prompts, setPrompts] = useState<PromptView[]>(initial);
  const [activeKey, setActiveKey] = useState(initial[0]?.key ?? '');
  // Keyed by prompt, so switching tabs does not discard an unsaved edit on the
  // one you are leaving.
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((p) => [p.key, p.content])),
  );
  const [busy, setBusy] = useState(false);
  const { toast, show, dismiss } = useToast();

  const active = prompts.find((p) => p.key === activeKey);
  const draft = drafts[activeKey] ?? '';
  const dirty = active ? draft !== active.content : false;

  function apply(updated: PromptView) {
    setPrompts((list) => list.map((p) => (p.key === updated.key ? updated : p)));
    setDrafts((d) => ({ ...d, [updated.key]: updated.content }));
  }

  async function send(content: string, successMessage: string) {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/prompts/${active.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      apply(data);
      show(successMessage);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!active) {
    return <p className="text-sm text-[var(--muted)]">No editable prompts.</p>;
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Prompts"
        className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {prompts.map((p) => {
          const selected = p.key === activeKey;
          const unsaved = (drafts[p.key] ?? p.content) !== p.content;
          return (
            <button
              key={p.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveKey(p.key)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--surface-2)] text-white'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {p.name}
              {!p.present && (
                <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-normal text-red-300">
                  missing
                </span>
              )}
              {unsaved && (
                <span className="ml-1.5 text-amber-400" aria-label="unsaved changes">
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

      <p className="mb-3 text-sm text-[var(--muted)]">{active.description}</p>

      <textarea
        value={draft}
        onChange={(e) => setDrafts((d) => ({ ...d, [active.key]: e.target.value }))}
        spellCheck={false}
        rows={26}
        aria-label={`${active.name} prompt`}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--muted)]">
          {draft.length.toLocaleString()} characters
          {dirty && ' · unsaved changes'}
          {active.updatedAt && !dirty && (
            <>
              {' · last edited '}
              {new Date(active.updatedAt).toLocaleString()}
              {active.updatedBy ? ` by ${active.updatedBy}` : ''}
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => send(draft, 'Prompt saved')}
            disabled={!dirty || busy}
            className="jh-cta rounded-lg px-5 py-1.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save prompt'}
          </button>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
        Applies to the next generation — no restart needed. This text is the only copy: it lives in
        the database, not in the codebase, so there is no shipped default to fall back to and an
        empty prompt cannot be saved. Copy it somewhere before a large rewrite.
      </p>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
