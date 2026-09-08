'use client';

import { useState } from 'react';
import { canChooseFolder, chooseSaveDir, clearSaveDir, useSaveDirName } from '@/lib/save-dir';

/**
 * Where generated resumes and cover letters are written.
 *
 * A setting rather than a dialog, for the same reason the provider switch sits
 * beside it: asking on every download turns a one-time decision into a modal
 * between the user and a file they already asked for. Chosen once here, and
 * every download afterwards is silent.
 *
 * Only Chromium can offer this. Firefox and Safari have no folder picker, so
 * there the control states where files go rather than pretending to offer a
 * choice that would fail.
 */
export function SaveLocation() {
  const dirName = useSaveDirName();
  const [busy, setBusy] = useState(false);
  const supported = canChooseFolder();

  async function choose() {
    setBusy(true);
    try {
      await chooseSaveDir();
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Downloads go to your browser&rsquo;s Downloads folder.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-[11px] text-[var(--muted)]">Save files to</span>
          <span className="truncate text-xs font-medium text-[var(--text)]">
            {dirName || 'Downloads folder'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void choose()}
          disabled={busy}
          className="jh-press shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--primary)] disabled:opacity-60"
        >
          {busy ? 'Choosing…' : dirName ? 'Change' : 'Choose…'}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        {dirName ? (
          <>
            <span className="text-[var(--muted)]">Saved without asking</span>
            <button
              type="button"
              onClick={() => void clearSaveDir()}
              className="jh-press rounded-md border border-[var(--border)] px-2 py-0.5 font-medium text-[var(--text)] transition hover:border-[var(--primary)]"
            >
              Use Downloads
            </button>
          </>
        ) : (
          // Says what picking a folder actually buys, since the benefit is the
          // absence of something rather than a visible feature.
          <span className="text-[var(--muted)]">Pick a folder to skip the browser&rsquo;s Downloads</span>
        )}
      </div>
    </div>
  );
}
