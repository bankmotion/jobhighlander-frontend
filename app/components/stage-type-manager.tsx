'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from './confirm-modal';
import { StageChip } from './stage-badge';
import type { StageTypeWithUsage } from '@/lib/stage-types';

const SWATCHES = [
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#0ea5e9',
  '#14b8a6',
  '#10b981',
  '#22c55e',
  '#f59e0b',
  '#f97316',
  '#ec4899',
  '#ef4444',
  '#64748b',
];

export function StageTypeManager({ initial }: { initial: StageTypeWithUsage[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stage-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, color }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to add');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stage-types/seed', { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? 'Failed');
        return;
      }
      setNotice(d.added > 0 ? `Restored ${d.added} default stage(s)` : 'Nothing was missing');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, delta: number) {
    const a = initial[index];
    const b = initial[index + delta];
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all([
        put(a.id, { sortOrder: b.sortOrder }),
        put(b.id, { sortOrder: a.sortOrder }),
      ]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={add} className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label
            htmlFor="stage-name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            New stage
          </label>
          <input
            id="stage-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bar Raiser"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full transition ${
                color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surface)]' : ''
              }`}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          Add
        </button>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] transition hover:text-white disabled:opacity-60"
        >
          Restore defaults
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {notice && <p className="mb-3 text-sm text-green-400">{notice}</p>}

      {initial.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No stages yet — add one above, or restore the defaults.
        </p>
      ) : (
        <ul className="space-y-2">
          {initial.map((t, i) => (
            <StageRow
              key={t.id}
              type={t}
              first={i === 0}
              last={i === initial.length - 1}
              onMove={(d) => move(i, d)}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StageRow({
  type,
  first,
  last,
  onMove,
  onChanged,
}: {
  type: StageTypeWithUsage;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [color, setColor] = useState(type.color);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await put(type.id, { name: name.trim() || type.name, color });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    try {
      await put(type.id, { archived: !type.archived });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    try {
      await fetch(`/api/admin/stage-types/${type.id}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm ${
        type.archived ? 'opacity-60' : ''
      }`}
    >
      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="min-w-[8rem] flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Badge colour"
            className="h-7 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent"
          />
          <button
            onClick={save}
            disabled={busy}
            className="font-medium text-green-400 hover:text-green-300 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(type.name);
              setColor(type.color);
            }}
            className="text-[var(--muted)] hover:text-white"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <StageChip stage={type} size="md" />
          <span className="text-xs text-[var(--muted)]">
            {type.usage > 0
              ? `on ${type.usage} step${type.usage === 1 ? '' : 's'}`
              : 'unused'}
            {type.archived && ' · retired'}
          </span>

          <span className="ml-auto flex items-center gap-1">
            <button
              onClick={() => onMove(-1)}
              disabled={first || busy}
              aria-label={`Move ${type.name} up`}
              className="rounded px-1.5 text-[var(--muted)] transition hover:text-white disabled:opacity-25"
            >
              ↑
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={last || busy}
              aria-label={`Move ${type.name} down`}
              className="rounded px-1.5 text-[var(--muted)] transition hover:text-white disabled:opacity-25"
            >
              ↓
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-1.5 text-[var(--muted)] transition hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={toggleArchive}
              disabled={busy}
              className="px-1.5 text-[var(--muted)] transition hover:text-white disabled:opacity-50"
            >
              {type.archived ? 'Restore' : 'Retire'}
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="px-1.5 text-red-400 transition hover:text-red-300 disabled:opacity-50"
            >
              Delete
            </button>
          </span>
        </>
      )}

      <ConfirmModal
        open={confirming}
        title={type.usage > 0 ? 'Retire this stage?' : 'Delete this stage?'}
        // The message states what will ACTUALLY happen. A badge in use is
        // archived rather than deleted, because deleting it would strip it off
        // every step that wears it and rewrite rounds that genuinely happened.
        message={
          type.usage > 0
            ? `“${type.name}” is on ${type.usage} step${
                type.usage === 1 ? '' : 's'
              }, so it will be retired instead of deleted — it stays on those steps and leaves the picker.`
            : `Remove “${type.name}”? Nothing uses it, so it will be deleted outright.`
        }
        confirmLabel={type.usage > 0 ? 'Retire' : 'Delete'}
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

function put(id: number, body: Record<string, unknown>) {
  return fetch(`/api/admin/stage-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
