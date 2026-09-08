'use client';

import { writableSaveDir } from './save-dir';

/** Where a file ended up, so the caller can say so if it was not where asked. */
export type SavedTo = 'folder' | 'downloads';

export interface SaveOutcome {
  to: SavedTo;
  /**
   * Why the chosen folder was not used, verbatim from the browser.
   *
   * Carried rather than swallowed because this failure is otherwise invisible:
   * the file still arrives, just in the wrong place, so without the reason the
   * only symptom is "it does not work" and every diagnosis is a guess.
   */
  error?: string;
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
      const file = await dir.getFileHandle(filename, { create: true });
      const writable = await file.createWritable();
      await writable.write(blob);
      await writable.close();
      return { to: 'folder' };
    } catch (err) {
      // Named, then fall through and download. Which of the three calls above
      // failed matters: getFileHandle rejects an unusable NAME, createWritable
      // rejects an unusable LOCATION.
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
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
