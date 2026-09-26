// Persistence (IndexedDB, with a localStorage copy while it fits) plus backup/restore.
// Everything stays on the device.
import { isBlank } from '../answer/answer';
import { PAPER_KINDS } from '../gen/types';
import { idbGet, idbSet } from './idb';
import { emptyStore, paperOf, SCHEMA_VERSION, type Attempt, type Profile, type StoreData } from './model';

// The key name predates schema 2; it stays so existing results are found.
export const STORAGE_KEY = 'ks2-arithmetic/v1';

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isRatString = (s: unknown): boolean => typeof s === 'string' && /^-?\d+\/\d+$/.test(s);
const isIndexList = (s: unknown, size: number): boolean =>
  typeof s === 'string' && (s === '' || s.split(',').every((v) => /^\d+$/.test(v) && Number(v) < size));
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every((v) => typeof v === 'string');

function isProfile(x: unknown): x is Profile {
  return isObject(x) && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.createdAt === 'number';
}

const BLOCKS = new Set(['text', 'table', 'bar', 'line', 'pie', 'coords', 'angles', 'rect', 'lshape', 'cuboid', 'grid', 'numberline', 'scale', 'column', 'cubes', 'polygon', 'angleset', 'speak', 'passage']);

/** An input and its encoded answer, checked closely enough that marking and display cannot throw. */
function isInputAndAnswer(input: unknown, answer: unknown): boolean {
  if (!isObject(input) || typeof answer !== 'string') return false;
  switch (input.kind) {
    case 'number':
      return Array.isArray(input.boxes) && input.boxes.every(isObject) && answer.split(';').every(isRatString);
    case 'fraction':
      return isRatString(answer);
    case 'choice':
      return strings(input.options) && isIndexList(answer, input.options.length);
    case 'order':
      return strings(input.items) && isIndexList(answer, input.items.length);
    case 'words':
    case 'gap':
      return strings(input.tokens) && isIndexList(answer, input.tokens.length);
    case 'tf':
      return strings(input.statements) && /^[01](,[01])*$|^$/.test(answer);
    case 'text':
      return true;
    case 'self':
      return typeof input.model === 'string' && strings(input.points);
    default:
      return false; // an input this version does not know
  }
}

function isQuestion(x: unknown): boolean {
  if (!isObject(x) || typeof x.typeId !== 'string' || ![1, 2, 3].includes(x.difficulty as number)) return false;
  if ('format' in x) {
    return (
      (x.format === 'reasoning' || x.format === 'english') &&
      typeof x.marks === 'number' &&
      Array.isArray(x.body) &&
      x.body.every((b) => isObject(b) && BLOCKS.has(b.b as string)) &&
      isInputAndAnswer(x.input, x.answer)
    );
  }
  return Array.isArray(x.parts) && x.parts.every(isObject) && ['int', 'dec', 'frac'].includes(x.kind as string) && isRatString(x.answer);
}

function isAttempt(x: unknown): x is Attempt {
  if (!isObject(x) || !Array.isArray(x.questions)) return false;
  const n = x.questions.length;
  const list = (k: string, ok: (v: unknown) => boolean) => Array.isArray(x[k]) && (x[k] as unknown[]).length === n && (x[k] as unknown[]).every(ok);
  return (
    typeof x.id === 'string' &&
    typeof x.profileId === 'string' &&
    typeof x.paperCode === 'string' &&
    (x.mode === 'daily' || x.mode === 'full' || x.mode === 'practice') &&
    typeof x.createdAt === 'number' &&
    (x.completedAt === undefined || x.completedAt === null || typeof x.completedAt === 'number') &&
    (x.paper === undefined || (PAPER_KINDS as readonly unknown[]).includes(x.paper)) &&
    x.questions.every(isQuestion) &&
    list('answers', (v) => v === null || isObject(v)) &&
    list('flagged', (v) => typeof v === 'boolean') &&
    list('timeMs', (v) => typeof v === 'number') &&
    list('marks', (v) => v === null || typeof v === 'number') &&
    list('markedAt', (v) => v === null || typeof v === 'number')
  );
}

/** Fills in what older versions did not store. */
const normalise = (a: Attempt): Attempt => ({
  ...a,
  paper: a.paper ?? paperOf(a.questions),
  completedAt: a.completedAt ?? null,
  current: typeof a.current === 'number' && a.current >= 0 && a.current < Math.max(a.questions.length, 1) ? a.current : 0,
});

/**
 * Reads unknown JSON (a backup, localStorage or IndexedDB) into StoreData, or null when it is not
 * a store at all. Each profile and paper is checked on its own: one this version cannot read (from a
 * newer version, say) is kept aside in `unreadable` and saved with the rest, never dropped, and is
 * read again by later versions. Version 1 data (arithmetic only, before `paper` existed) is migrated.
 */
export function parseStore(json: unknown): StoreData | null {
  if (!isObject(json) || typeof json.schemaVersion !== 'number' || json.schemaVersion < 1) return null;
  if (!Array.isArray(json.profiles) || !Array.isArray(json.attempts)) return null;
  const unreadable: unknown[] = [];
  const profiles: Profile[] = [];
  for (const p of json.profiles) (isProfile(p) ? profiles : unreadable).push(p);
  const attempts = new Map<string, Attempt>();
  const earlier = Array.isArray(json.unreadable) ? json.unreadable : [];
  for (const a of [...json.attempts, ...earlier]) {
    if (!isAttempt(a)) unreadable.push(a);
    else if (!attempts.has(a.id)) attempts.set(a.id, normalise(a));
  }
  const currentProfileId = typeof json.currentProfileId === 'string' ? json.currentProfileId : null;
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles,
    attempts: [...attempts.values()],
    currentProfileId,
    ...(unreadable.length > 0 && { unreadable }),
  };
}

/** How far an attempt has got: marked questions, then answered questions, then time spent. */
const progress = (a: Attempt): number[] => [
  a.marks.filter((m) => m !== null).length,
  a.answers.filter((x) => !isBlank(x)).length,
  a.timeMs.reduce((s, t) => s + t, 0),
];

const ahead = (x: number[], y: number[]): boolean => {
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

const keyOf = (x: unknown): string => (isObject(x) && typeof x.id === 'string' ? `id:${x.id}` : JSON.stringify(x));

/** Union by id; for the same attempt the incoming copy wins only when it has got further. */
export function mergeStores(base: StoreData, incoming: StoreData): StoreData {
  const profiles = new Map(base.profiles.map((p) => [p.id, p]));
  for (const p of incoming.profiles) profiles.set(p.id, p);
  const attempts = new Map(base.attempts.map((a) => [a.id, a]));
  for (const a of incoming.attempts) {
    const existing = attempts.get(a.id);
    if (!existing || ahead(progress(a), progress(existing))) attempts.set(a.id, a);
  }
  const unreadable = new Map([...(base.unreadable ?? []), ...(incoming.unreadable ?? [])].map((x) => [keyOf(x), x]));
  for (const a of attempts.values()) unreadable.delete(`id:${a.id}`);
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: [...profiles.values()],
    attempts: [...attempts.values()].sort((x, y) => x.createdAt - y.createdAt),
    currentProfileId: base.currentProfileId ?? incoming.currentProfileId,
    ...(unreadable.size > 0 && { unreadable: [...unreadable.values()] }),
  };
}

const paperCount = (data: StoreData, profileId: string | null) => data.attempts.filter((a) => a.profileId === profileId).length;

/**
 * Restores a backup into what is here. When the profile in use has no papers yet (a new iPad), the
 * app switches to the backup's profile, and empty profiles with the same name as a restored one go.
 */
export function restoreBackup(base: StoreData, incoming: StoreData): StoreData {
  const merged = mergeStores(base, incoming);
  if (paperCount(merged, merged.currentProfileId) > 0) return merged;
  const restoredNames = new Set(incoming.profiles.map((p) => p.name.trim().toLowerCase()));
  const incomingIds = new Set(incoming.profiles.map((p) => p.id));
  const profiles = merged.profiles.filter(
    (p) => incomingIds.has(p.id) || paperCount(merged, p.id) > 0 || !restoredNames.has(p.name.trim().toLowerCase()),
  );
  const best =
    (incoming.currentProfileId && paperCount(merged, incoming.currentProfileId) > 0 ? incoming.currentProfileId : null) ??
    [...incoming.profiles].sort((x, y) => paperCount(merged, y.id) - paperCount(merged, x.id))[0]?.id ??
    merged.currentProfileId;
  const current = profiles.some((p) => p.id === best) ? best : (profiles[0]?.id ?? null);
  return { ...merged, profiles, currentProfileId: current };
}

/** The localStorage copy, or null when there is none or it cannot be read. */
function readLocal(storage: Storage | undefined): { raw: string | null; data: StoreData | null } {
  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? null;
    if (!raw) return { raw: null, data: null };
    try {
      return { raw, data: parseStore(JSON.parse(raw)) };
    } catch {
      return { raw, data: null };
    }
  } catch {
    return { raw: null, data: null };
  }
}

export function loadStore(storage: Storage | undefined = globalThis.localStorage): StoreData {
  return readLocal(storage).data ?? emptyStore();
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
/** Copies that could not be read at all are kept under their own keys, never overwritten. */
export const UNREADABLE_PREFIX = 'unreadable-';

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

const hasContent = (d: StoreData | null): d is StoreData =>
  d !== null && (d.profiles.length > 0 || d.attempts.length > 0 || (d.unreadable?.length ?? 0) > 0);

/**
 * Loads the newest copy that can be read: IndexedDB, or localStorage when that is newer (or
 * IndexedDB is empty, the first time after the move to IndexedDB). Loading never overwrites a stored
 * copy; one that cannot be read at all is kept aside first. `durable` is false when IndexedDB can't
 * be used.
 */
export async function loadDurable(
  db: KeyValue = indexedDb,
  storage: Storage | undefined = globalThis.localStorage,
): Promise<{ data: StoreData; durable: boolean }> {
  const local = readLocal(storage);
  const localAt = localSavedAt(storage);
  try {
    const saved = (await db.get(DB_KEY)) as Saved | undefined;
    const fromDb = isObject(saved) ? parseStore(saved.data) : null;
    const now = Date.now();
    if (local.raw && !local.data) await db.set(`${UNREADABLE_PREFIX}local-${now}`, local.raw);
    if (saved !== undefined && !fromDb) await db.set(`${UNREADABLE_PREFIX}db-${now}`, saved);
    const dbAt = isObject(saved) && typeof saved.savedAt === 'number' ? saved.savedAt : 0;
    if (hasContent(fromDb) && (!hasContent(local.data) || dbAt >= localAt)) return { data: fromDb, durable: true };
    if (hasContent(local.data)) {
      if (saved === undefined) await db.set(DB_KEY, { savedAt: localAt, data: local.data } satisfies Saved);
      return { data: local.data, durable: true };
    }
    return { data: fromDb ?? local.data ?? emptyStore(), durable: true };
  } catch {
    return { data: local.data ?? emptyStore(), durable: false };
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
