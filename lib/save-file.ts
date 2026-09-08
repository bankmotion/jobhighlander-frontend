'use client';

import { writableSaveDir } from './save-dir';

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
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  const dir = await writableSaveDir();
  if (dir) {
    try {
      const file = await dir.getFileHandle(filename, { create: true });
      const writable = await file.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // Fall through and download instead.
    }
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
}
