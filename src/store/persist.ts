// Persistence (IndexedDB, with a localStorage copy while it fits) plus backup/restore.
// Everything stays on the device.
import { PAPER_KINDS } from '../gen/types';
import { idbGet, idbSet } from './idb';
import { emptyStore, paperOf, SCHEMA_VERSION, type Attempt, type Profile, type StoreData } from './model';

// The key name predates schema 2; it stays so existing results are found.
export const STORAGE_KEY = 'ks2-arithmetic/v1';

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

function isProfile(x: unknown): x is Profile {
  return isObject(x) && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.createdAt === 'number';
}

function isAttempt(x: unknown): x is Attempt {
  if (!isObject(x)) return false;
  const lists = ['questions', 'answers', 'flagged', 'timeMs', 'marks', 'markedAt'] as const;
  return (
    typeof x.id === 'string' &&
    typeof x.profileId === 'string' &&
    typeof x.paperCode === 'string' &&
    (x.mode === 'daily' || x.mode === 'full') &&
    typeof x.createdAt === 'number' &&
    (x.paper === undefined || (PAPER_KINDS as readonly unknown[]).includes(x.paper)) &&
    lists.every((k) => Array.isArray(x[k]) && (x[k] as unknown[]).length === (x.questions as unknown[]).length)
  );
}

/**
 * Validates unknown JSON (a backup or localStorage) into StoreData, or null. Version 1 data
 * (arithmetic only, before `paper` existed) is migrated, never rejected.
 */
export function parseStore(json: unknown): StoreData | null {
  if (!isObject(json) || (json.schemaVersion !== 1 && json.schemaVersion !== SCHEMA_VERSION)) return null;
  if (!Array.isArray(json.profiles) || !Array.isArray(json.attempts)) return null;
  if (!json.profiles.every(isProfile) || !json.attempts.every(isAttempt)) return null;
  const currentProfileId = typeof json.currentProfileId === 'string' ? json.currentProfileId : null;
  const attempts = json.attempts.map((a) => ({ ...a, paper: a.paper ?? paperOf(a.questions) }));
  return { schemaVersion: SCHEMA_VERSION, profiles: json.profiles, attempts, currentProfileId };
}

const progress = (a: Attempt) => a.marks.filter((m) => m !== null).length;

/** Union by id; for the same attempt keep whichever has more marked questions. */
export function mergeStores(base: StoreData, incoming: StoreData): StoreData {
  const profiles = new Map(base.profiles.map((p) => [p.id, p]));
  for (const p of incoming.profiles) profiles.set(p.id, p);
  const attempts = new Map(base.attempts.map((a) => [a.id, a]));
  for (const a of incoming.attempts) {
    const existing = attempts.get(a.id);
    if (!existing || progress(a) >= progress(existing)) attempts.set(a.id, a);
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: [...profiles.values()],
    attempts: [...attempts.values()].sort((x, y) => x.createdAt - y.createdAt),
    currentProfileId: base.currentProfileId ?? incoming.currentProfileId,
  };
}

export function loadStore(storage: Storage | undefined = globalThis.localStorage): StoreData {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return (raw && parseStore(JSON.parse(raw))) || emptyStore();
  } catch {
    return emptyStore();
  }
}

/** Returns false when the browser refused to save (e.g. storage full). */
export function saveStore(data: StoreData, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ---- Durable storage -------------------------------------------------------

/** Key-value access to IndexedDB (replaceable in tests). */
export interface KeyValue {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const indexedDb: KeyValue = { get: idbGet, set: idbSet };
const DB_KEY = 'store';
const SAVED_AT_KEY = 'ks2-sats/saved-at';

interface Saved {
  savedAt: number;
  data: unknown;
}

function localSavedAt(storage: Storage | undefined): number {
  try {
    return Number(storage?.getItem(SAVED_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Loads the newest copy: IndexedDB, or localStorage when that is newer (or IndexedDB is empty,
 * the first time after this update). `durable` is false when IndexedDB can't be used.
 */
export async function loadDurable(
  db: KeyValue = indexedDb,
  storage: Storage | undefined = globalThis.localStorage,
): Promise<{ data: StoreData; durable: boolean }> {
  const local = loadStore(storage);
  const localAt = localSavedAt(storage);
  try {
    const saved = (await db.get(DB_KEY)) as Saved | undefined;
    const fromDb = saved && typeof saved === 'object' ? parseStore(saved.data) : null;
    if (fromDb && saved!.savedAt >= localAt) return { data: fromDb, durable: true };
    await db.set(DB_KEY, { savedAt: localAt, data: local } satisfies Saved);
    return { data: local, durable: true };
  } catch {
    return { data: local, durable: false };
  }
}

/** Storages found full: they are not tried again (IndexedDB carries on). */
const full = new WeakSet<Storage>();

/** Saves everywhere it can. Returns false only when nothing could be saved. */
export async function saveDurable(
  data: StoreData,
  now: number,
  db: KeyValue = indexedDb,
  storage: Storage | undefined = globalThis.localStorage,
): Promise<boolean> {
  // localStorage first: it is synchronous, so it lands even if the app is closing.
  let local = false;
  if (storage && !full.has(storage)) {
    local = saveStore(data, storage);
    if (local) {
      try {
        storage.setItem(SAVED_AT_KEY, String(now));
      } catch {
        local = false;
      }
    } else {
      full.add(storage);
    }
  }
  try {
    await db.set(DB_KEY, { savedAt: now, data } satisfies Saved);
    return true;
  } catch {
    return local;
  }
}

/** Asks the browser not to evict our data under storage pressure. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}

export const backupFileName = (now = new Date()): string =>
  `ks2-sats-backup-${now.toISOString().slice(0, 10)}.json`;
