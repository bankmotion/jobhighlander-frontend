'use client';

import { resetSaveDirCache, writableSaveDir, type DirHandle } from './save-dir';

/** Where a file ended up, so the caller can say so if it was not where asked. */
export type SavedTo = 'folder' | 'downloads';

export interface SaveOutcome {
  to: SavedTo;
  /**
   * The chosen folder's name when the file went there. Callers put it in the
   * success toast, because a folder write paints NO browser download UI — no
   * shelf, no tray — so without the app saying so, a successful save is
   * indistinguishable from nothing having happened.
   */
  folder?: string;
  /**
   * Why the chosen folder was not used, verbatim from the browser.
   *
   * Carried rather than swallowed because this failure is otherwise invisible:
   * the file still arrives, just in the wrong place, so without the reason the
   * only symptom is "it does not work" and every diagnosis is a guess.
   */
  error?: string;
}

const describe = (err: unknown): string =>
  err instanceof Error ? `${err.name}: ${err.message}` : String(err);

/**
 * The handle is holding state that no longer matches what is on disk.
 *
 * Chromium raises this on the SECOND write into a folder: the first write
 * changed the directory, which invalidates the state the cached handle read
 * when it was resolved. It is exactly why a resume saved correctly and the
 * cover letter written immediately after it did not.
 *
 * Recoverable — the folder is fine, only this handle's view of it is stale.
 */
const isStale = (err: unknown): boolean =>
  err instanceof DOMException &&
  (err.name === 'InvalidStateError' || err.name === 'InvalidModificationError');

async function writeInto(dir: DirHandle, filename: string, blob: Blob): Promise<void> {
  const file = await dir.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Write a generated file out.
 *
 * Into the folder chosen in the account menu when there is one, and into the
 * browser's Downloads folder when there is not. Deliberately no dialog: the
 * destination is a setting, asked once, rather than a question repeated on
 * every download of every resume.
 *
 * Never throws for a storage problem. A folder that has been deleted or moved,
 * or whose permission has lapsed, falls through to the download — losing the
 * file to a stale preference would be a worse outcome than putting it somewhere
 * predictable.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<SaveOutcome> {
  let error: string | undefined;
  const dir = await writableSaveDir();
  if (dir) {
    try {
      await writeInto(dir, filename, blob);
      return { to: 'folder', folder: dir.name };
    } catch (err) {
      // Named, then fall through and download. Which call failed matters:
      // getFileHandle rejects an unusable NAME, createWritable an unusable
      // LOCATION, and a stale handle rejects a folder that is perfectly fine.
      error = describe(err);

      if (isStale(err)) {
        // Drop the cached handle and resolve a fresh one from storage before
        // trying again. Retrying with the SAME handle would fail identically —
        // it is the handle that is stale, not the folder.
        try {
          resetSaveDirCache();
          const fresh = await writableSaveDir();
          if (fresh) {
            await writeInto(fresh, filename, blob);
            return { to: 'folder', folder: fresh.name };
          }
        } catch (retryErr) {
          error = `${error} (retry: ${describe(retryErr)})`;
        }
      }
    }
  } else {
    error = 'the folder could not be opened for writing';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Appended before clicking: a detached anchor is ignored by Firefox.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking on the next line cancels the save in Firefox and Safari, which
  // read the blob asynchronously after the click. A plain timer, not an effect
  // cleanup — a filter toggle unmounts the caller, and tearing the URL down
  // there would kill a download in flight.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { to: 'downloads', error };
}
