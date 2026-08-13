'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Keyword } from '@/lib/types';
import { ConfirmModal } from './confirm-modal';

export function KeywordManager({ initial }: { initial: Keyword[] }) {
  const router = useRouter();
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to add');
        return;
      }
      setWord('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={add} className="mb-5 flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Add a word to emphasize…"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {initial.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No keywords yet — add one above.</p>
      ) : (
        <ul className="space-y-2">
          {initial.map((k) => (
            <KeywordRow key={k.id} kw={k} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function KeywordRow({ kw, onChanged }: { kw: Keyword; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(kw.word);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    const w = value.trim();
    if (!w || w === kw.word) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/keywords/${kw.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed');
        return;
      }
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    try {
      await fetch(`/api/admin/keywords/${kw.id}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]"
          />
          <button onClick={save} disabled={busy} className="font-medium text-green-400 hover:text-green-300">
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setValue(kw.word);
              setError(null);
            }}
            className="text-[var(--muted)] hover:text-white"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="mr-auto rounded bg-amber-400/20 px-1.5 font-medium text-amber-300">{kw.word}</span>
          <button onClick={() => setEditing(true)} className="text-[var(--muted)] hover:text-white">
            Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Delete
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
      <ConfirmModal
        open={confirming}
        title="Delete keyword?"
        message={`Remove “${kw.word}”? Job descriptions will no longer highlight it.`}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          await del();
          setConfirming(false);
        }}
      />
    </li>
  );
}
