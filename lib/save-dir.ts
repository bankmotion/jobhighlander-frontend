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

/**
 * Run one IndexedDB request.
 *
 * Throws on failure rather than returning null. The two are NOT the same thing:
 * "there is no saved folder" and "the folder could not be saved" led to the
 * same silent answer before, so a failed write still showed the folder as set
 * and quietly reverted to Downloads on the next page load.
 *
 * A write is resolved on the TRANSACTION completing, not on the request
 * succeeding. `put` reports success before the transaction commits, so
 * resolving there can report a save that a later abort undoes.
 */
function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    let value: T | null = null;
    void openDb().then((db) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => {
          value = (req.result as T) ?? null;
        };
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      } catch (err) {
        // `put` throws synchronously when the value cannot be structured-cloned.
        db.close();
        reject(err);
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      };
    }, reject);
  });
}

async function storedHandle(): Promise<DirHandle | null> {
  try {
    return await idb<DirHandle>('readonly', (s) => s.get(KEY));
  } catch {
    // A read that fails means no usable folder, which is the same outcome as
    // not having one. Writes are the case that must be reported.
    return null;
  }
}

export type ChooseResult =
  | { ok: true; name: string }
  | { ok: false; reason: 'cancelled' | 'unsupported' }
  | { ok: false; reason: 'failed'; detail: string };

/**
 * Ask the user for a folder and remember it.
 *
 * MUST be called from a click: the picker needs user activation.
 *
 * The name is only recorded once the handle is genuinely stored AND permission
 * is settled. Writing it earlier is what made a failed save look like a
 * successful one — the menu said the folder was set while every download went
 * to Downloads.
 */
export async function chooseSaveDir(): Promise<ChooseResult> {
  const show = directoryPicker();
  if (!show) return { ok: false, reason: 'unsupported' };
  let handle: DirHandle;
  try {
    // `id` makes Chromium reopen at the last folder picked for this purpose
    // rather than at a default that has nothing to do with resumes.
    handle = await show({ mode: 'readwrite', id: 'jh-resumes' });
  } catch {
    return { ok: false, reason: 'cancelled' };
  }

  // Settle permission while the picker's own activation is live.
  if (!(await permitted(handle))) {
    return { ok: false, reason: 'failed', detail: 'Permission to write to that folder was refused.' };
  }

  // Prove it round-trips before claiming it is set. A handle that cannot be
  // stored works until the next reload and then silently stops.
  try {
    await idb('readwrite', (s) => s.put(handle, KEY));
    if (!(await idb<DirHandle>('readonly', (s) => s.get(KEY)))) {
      throw new Error('the folder did not persist');
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'failed',
      detail: err instanceof Error ? err.message : 'the folder could not be stored',
    };
  }

  cached = handle;
  saveDirNameStore.set(handle.name);
  return { ok: true, name: handle.name };
}

/** Go back to letting the browser put files in its Downloads folder. */
export async function clearSaveDir(): Promise<void> {
  try {
    await idb('readwrite', (s) => s.delete(KEY));
  } catch {
    // Reverting to Downloads must succeed even if the store cannot be written.
  }
  saveDirNameStore.set(null);
  cached = null;
}

/**
 * Resolved handle for this page's lifetime.
 *
 * `undefined` = not looked yet. `null` = there is genuinely no folder stored.
 * A handle = usable, permission settled.
 *
 * Crucially, "the folder exists but permission could not be obtained just now"
 * is NOT cached, because that answer expires. The automatic save after a
 * generation runs with no user activation, so it cannot request permission —
 * caching its failure as `null` disabled the chosen folder for the rest of the
 * page, and every later click went to Downloads while the Test button, which
 * does not read this cache, still reported success.
 */
let cached: DirHandle | null | undefined;

async function permitted(handle: DirHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' } as const;
  const query = handle.queryPermission?.bind(handle);
  const request = handle.requestPermission?.bind(handle);

  // No permission API on this handle. Assume the write is allowed and let it
  // fail if it is not — treating "cannot ask" as "denied" silently disables the
  // chosen folder on any browser that does not expose these methods, which is a
  // worse answer than simply trying.
  if (!query && !request) return true;

  try {
    if (query && (await query(opts)) === 'granted') return true;
    if (request && (await request(opts)) === 'granted') return true;
  } catch {
    // Usually "requires user activation" — the caller asked at a moment with
    // none left. Not a permanent no.
  }
  return false;
}

/**
 * Establish the folder while a click is still the current user activation.
 *
 * Call this at the START of a download, BEFORE any fetch. Permission does not
 * survive a browser restart, and re-granting it needs activation — which a
 * render round trip of several seconds has already spent. Priming here is what
 * makes a chosen folder survive a reload instead of quietly reverting to
 * Downloads on the first save of every session.
 *
 * Safe to call repeatedly; after the first success it is a no-op.
 */
export async function primeSaveDir(): Promise<void> {
  if (cached) return;
  const handle = await storedHandle();
  if (!handle) {
    // Nothing stored. This one IS stable, so it is worth remembering.
    cached = null;
    return;
  }
  if (await permitted(handle)) {
    cached = handle;
    return;
  }
  // Left `undefined` on purpose: permission may well be grantable on the next
  // attempt, which will be a click. Recording a refusal here would make one
  // activation-less save poison every save after it.
  cached = undefined;
}

/**
 * The chosen folder, if it is usable right now.
 *
 * A folder that has been deleted, or whose permission is refused, resolves to
 * null so the caller saves to Downloads instead of losing the file.
 */
export async function writableSaveDir(): Promise<DirHandle | null> {
  if (cached !== undefined) return cached;
  await primeSaveDir();
  return cached ?? null;
}

/**
 * Forget the resolved handle so the next call re-checks.
 *
 * For the case where the folder changed underneath us — chosen, cleared, or
 * re-granted — and the cached answer is now the wrong one.
 */
export function resetSaveDirCache(): void {
  cached = undefined;
}

/** True when a folder is configured, whether or not it is currently usable. */
export async function hasSaveDir(): Promise<boolean> {
  return (await storedHandle()) !== null;
}

/**
 * Write and delete a probe file in the chosen folder.
 *
 * Exists because every failure here is invisible by design: the fallback puts
 * the file somewhere sensible, so a broken folder looks exactly like a working
 * one until you go looking in the wrong place. This does the same operations a
 * real save does and returns whatever went wrong verbatim.
 *
 * Call from a click, so permission can still be requested if it has lapsed.
 */
export async function testSaveDir(): Promise<{ ok: true; name: string } | { ok: false; detail: string }> {
  if (!(await storedHandle())) {
    return { ok: false, detail: 'No folder is stored — choose one again.' };
  }
  // Deliberately through the SAME route a download takes, cache included.
  // Reading the handle directly made this probe pass while every download fell
  // back, which is worse than having no probe: it confirmed the wrong thing.
  cached = undefined;
  await primeSaveDir();
  const handle = await writableSaveDir();
  if (!handle) {
    return {
      ok: false,
      detail: 'The folder is stored but the browser would not grant write permission.',
    };
  }
  // A filename shaped like a real one, not a dotfile: the name is part of what
  // can fail, and a probe that writes something no download would write can
  // pass while every download fails.
  const probeName = 'resume_TestCompany-Test_Role-0.pdf';
  try {
    const probe = await handle.getFileHandle(probeName, { create: true });
    const writable = await probe.createWritable();
    await writable.write(new Blob(['ok']));
    await writable.close();
    // Tidy up. Older Chromium lacks removeEntry, and a stray empty file is a
    // far smaller problem than reporting a working folder as broken.
    try {
      await (handle as unknown as { removeEntry?: (n: string) => Promise<void> }).removeEntry?.(
        probeName,
      );
    } catch {
      // Left behind; harmless.
    }
    return { ok: true, name: handle.name };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  }
}

/**
 * Whether a folder is configured, read synchronously.
 *
 * Backed by the localStorage name mirror rather than IndexedDB so a caller can
 * ask on every save without an async hop — it is used to tell a genuine
 * fallback ("you chose a folder and this did not go there") apart from the
 * ordinary case of never having chosen one.
 */
export function saveDirConfigured(): boolean {
  try {
    return Boolean(saveDirNameStore.read());
  } catch {
    return false;
  }
}

/** The current folder name for display. Empty string means the Downloads folder. */
export function useSaveDirName(): string {
  return saveDirNameStore.useValue() ?? '';
}
