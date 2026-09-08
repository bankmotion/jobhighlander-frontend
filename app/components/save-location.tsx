'use client';

import { useState } from 'react';
import {
  canChooseFolder,
  chooseSaveDir,
  clearSaveDir,
  testSaveDir,
  useSaveDirName,
} from '@/lib/save-dir';

type Note = { ok: boolean; text: string };

/**
 * Where generated resumes and cover letters are written.
 *
 * A setting rather than a dialog, for the same reason the provider switch sits
 * beside it: asking on every download turns a one-time decision into a modal
 * between the user and a file they already asked for. Chosen once here, and
 * every download afterwards is silent.
 *
 * The Test button is not decoration. Every failure in this feature is invisible
 * by design — saving falls back to the Downloads folder, so a folder that does
 * not work looks exactly like one that does until you go looking in the wrong
 * place. This is the only way to find out without waiting to be surprised.
 *
 * Only Chromium can offer this. Firefox and Safari have no folder picker, so
 * there the control states where files go rather than pretending to offer a
 * choice that would fail.
 */
export function SaveLocation() {
  const dirName = useSaveDirName();
  const [busy, setBusy] = useState<'choose' | 'test' | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const supported = canChooseFolder();

  async function choose() {
    setBusy('choose');
    setNote(null);
    try {
      const result = await chooseSaveDir();
      if (result.ok) {
        setNote({ ok: true, text: `Saving to ${result.name}.` });
      } else if (result.reason === 'failed') {
        setNote({ ok: false, text: result.detail });
      } else if (result.reason === 'unsupported') {
        setNote({ ok: false, text: 'This browser cannot choose a folder.' });
      }
      // 'cancelled' says nothing: they closed the dialog and know they did.
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy('test');
    setNote(null);
    try {
      const result = await testSaveDir();
      setNote(
        result.ok
          ? { ok: true, text: `Wrote a test file to ${result.name} and removed it.` }
          : { ok: false, text: result.detail },
      );
    } finally {
      setBusy(null);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Downloads go to your browser&rsquo;s Downloads folder. Choosing one needs Chrome or Edge.
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
          disabled={busy !== null}
          className="jh-press shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--primary)] disabled:opacity-60"
        >
          {busy === 'choose' ? 'Choosing…' : dirName ? 'Change' : 'Choose…'}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        {dirName ? (
          <>
            <button
              type="button"
              onClick={() => void test()}
              disabled={busy !== null}
              className="jh-press rounded-md border border-[var(--border)] px-2 py-0.5 font-medium text-[var(--text)] transition hover:border-[var(--primary)] disabled:opacity-60"
            >
              {busy === 'test' ? 'Testing…' : 'Test'}
            </button>
            <button
              type="button"
              onClick={() => void clearSaveDir()}
              disabled={busy !== null}
              className="jh-press rounded-md border border-[var(--border)] px-2 py-0.5 font-medium text-[var(--text)] transition hover:border-[var(--primary)] disabled:opacity-60"
            >
              Use Downloads
            </button>
          </>
        ) : (
          // Says what picking a folder actually buys, since the benefit is the
          // absence of something rather than a visible feature.
          <span className="text-[var(--muted)]">
            Pick a folder to skip the browser&rsquo;s Downloads
          </span>
        )}
      </div>

      {note && (
        <p className={`mt-2 text-[11px] ${note.ok ? 'text-green-300' : 'text-amber-300'}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
