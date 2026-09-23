// localStorage persistence plus backup/restore. Everything stays on the device.
import { emptyStore, SCHEMA_VERSION, type Attempt, type Profile, type StoreData } from './model';

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
    lists.every((k) => Array.isArray(x[k]) && (x[k] as unknown[]).length === (x.questions as unknown[]).length)
  );
}

/** Validates unknown JSON (a backup or localStorage) into StoreData, or null. */
export function parseStore(json: unknown): StoreData | null {
  if (!isObject(json) || json.schemaVersion !== SCHEMA_VERSION) return null;
  if (!Array.isArray(json.profiles) || !Array.isArray(json.attempts)) return null;
  if (!json.profiles.every(isProfile) || !json.attempts.every(isAttempt)) return null;
  const currentProfileId = typeof json.currentProfileId === 'string' ? json.currentProfileId : null;
  return { schemaVersion: SCHEMA_VERSION, profiles: json.profiles, attempts: json.attempts, currentProfileId };
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

/** Asks the browser not to evict our data under storage pressure. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}

export const backupFileName = (now = new Date()): string =>
  `ks2-arithmetic-backup-${now.toISOString().slice(0, 10)}.json`;
