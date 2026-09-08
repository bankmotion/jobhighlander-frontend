'use client';

import { createLocalStore } from './local-store';

/**
 * The folder generated files are written to, chosen once and remembered.
 *
 * The alternative — a Save As dialog on every download — puts a modal between
 * the user and a file they already asked for, every single time. Choosing a
 * destination is a preference, so it lives with the other preferences and the
 * downloads themselves stay silent.
 *
 * The handle goes in IndexedDB because that is the only store that can hold
 * one: a `FileSystemDirectoryHandle` is structured-cloneable but not a string,
 * so localStorage cannot carry it. The folder's NAME is mirrored into
 * localStorage separately, purely so the menu can render the current choice
 * synchronously instead of flashing while an async read completes.
 */

const DB_NAME = 'jh-files';
const DB_VERSION = 1;
const STORE = 'handles';
const KEY = 'downloadDir';

export const SAVE_DIR_NAME_KEY = 'jh.saveDirName';

/** Only the parts of the handle API we call; not every TS DOM lib declares them. */
interface PermissionCapable {
  queryPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
}
export interface DirHandle extends PermissionCapable {
  name: string;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
}

type DirPicker = (opts?: { mode?: 'readwrite'; id?: string }) => Promise<DirHandle>;

function directoryPicker(): DirPicker | null {
  if (typeof window === 'undefined') return null;
  const fn = (window as unknown as { showDirectoryPicker?: DirPicker }).showDirectoryPicker;
  return typeof fn === 'function' ? fn : null;
}

/** Whether this browser can offer a folder choice at all. Chromium can; Firefox and Safari cannot. */
export function canChooseFolder(): boolean {
  return directoryPicker() !== null;
}

/** Display-only mirror of the chosen folder's name. Null means "the Downloads folder". */
export const saveDirNameStore = createLocalStore<string>({
  key: SAVE_DIR_NAME_KEY,
  parse: (raw) => raw || null,
  serialize: (value) => value,
  fallback: () => '',
});

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Private mode, a storage policy, or a browser without IndexedDB. Falling
    // back to the Downloads folder is the behaviour anyway.
    return null;
  }
}

async function storedHandle(): Promise<DirHandle | null> {
  return idb<DirHandle>('readonly', (s) => s.get(KEY));
}

/**
 * Ask the user for a folder and remember it.
 *
 * Returns the folder name on success, null if they cancelled or the browser
 * cannot do this. MUST be called from a click: the picker needs user activation.
 */
export async function chooseSaveDir(): Promise<string | null> {
  const show = directoryPicker();
  if (!show) return null;
  let handle: DirHandle;
  try {
    // `id` makes Chromium reopen at the last folder picked for this purpose
    // rather than at a default that has nothing to do with resumes.
    handle = await show({ mode: 'readwrite', id: 'jh-resumes' });
  } catch {
    return null; // cancelled
  }
  await idb('readwrite', (s) => s.put(handle, KEY));
  saveDirNameStore.set(handle.name);
  return handle.name;
}

/** Go back to letting the browser put files in its Downloads folder. */
export async function clearSaveDir(): Promise<void> {
  await idb('readwrite', (s) => s.delete(KEY));
  saveDirNameStore.set(null);
}

/**
 * The chosen folder, if it is still usable.
 *
 * Permission does not survive a browser restart, so a stored handle can come
 * back needing it again. `requestPermission` needs user activation — every
 * download but the automatic post-generation one has it, and that one simply
 * falls through to the Downloads folder rather than failing.
 *
 * A folder that has been deleted, or whose permission is refused, resolves to
 * null so the caller saves to Downloads instead of losing the file.
 */
export async function writableSaveDir(): Promise<DirHandle | null> {
  const handle = await storedHandle();
  if (!handle) return null;
  try {
    const opts = { mode: 'readwrite' } as const;
    if ((await handle.queryPermission?.(opts)) === 'granted') return handle;
    if ((await handle.requestPermission?.(opts)) === 'granted') return handle;
    return null;
  } catch {
    return null;
  }
}

/** The current folder name for display. Empty string means the Downloads folder. */
export function useSaveDirName(): string {
  return saveDirNameStore.useValue() ?? '';
}
