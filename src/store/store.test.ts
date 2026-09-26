import { describe, expect, it } from 'vitest';
import { generatePaper } from '../gen/paper';
import { generateReasoningPaper } from '../gen/reasoning/paper';
import type { ItemQuestion } from '../gen/types';
import { ratFromString, toDecimalString } from '../math/rational';
import {
  activeAttempt,
  activePractice,
  addAttempt,
  addProfile,
  addTime,
  createAttempt,
  emptyStore,
  openSession,
  removeProfile,
  scoreOf,
  setAccepted,
  setAnswer,
  setSelfMark,
  startAttempt,
  submitSession,
  type Attempt,
  type StoreData,
} from './model';
import {
  loadDurable,
  loadStore,
  mergeStores,
  parseStore,
  restoreBackup,
  saveDurable,
  saveStore,
  UNREADABLE_PREFIX,
  type KeyValue,
} from './persist';

const paper = generatePaper('TESTAB');

/** Types the right answer into question i. */
function answerRight(a: Attempt, i: number): Attempt {
  const s = toDecimalString(ratFromString(a.questions[i].answer));
  const r = ratFromString(a.questions[i].answer);
  return setAnswer(a, i, s !== null ? { whole: s, num: '', den: '' } : { whole: '', num: String(r.n), den: String(r.d) });
}

describe('attempts', () => {
  it('puts the unfinished paper aside when a new one starts, for good', () => {
    let data = addProfile(emptyStore(), 'Sam', 1, 'p1');
    const first = createAttempt('p1', 'daily', 'AAAAAA', paper, 10, 'first');
    data = startAttempt(data, first, 10);
    const second = createAttempt('p1', 'daily', 'BBBBBB', paper, 20, 'second');
    data = startAttempt(data, second, 20);
    expect(activeAttempt(data, 'p1', 'arithmetic')?.id).toBe('second');
    expect(data.attempts.find((a) => a.id === 'first')?.abandonedAt).toBe(20);
    // Finishing the new paper does not bring the old one back.
    data = { ...data, attempts: data.attempts.map((a) => (a.id === 'second' ? { ...a, completedAt: 30 } : a)) };
    expect(activeAttempt(data, 'p1', 'arithmetic')).toBeUndefined();
  });

  it('keeps maths and English practice apart', () => {
    let data = addProfile(emptyStore(), 'Sam', 1, 'p1');
    data = startAttempt(data, createAttempt('p1', 'practice', 'MMMMMM', paper.slice(0, 10), 10, 'maths'), 10);
    const gps = createAttempt('p1', 'practice', 'EEEEEE', paper.slice(0, 10), 20, 'english', 'gps');
    data = startAttempt(data, gps, 20);
    expect(activePractice(data, 'p1', 'maths')?.id).toBe('maths');
    expect(activePractice(data, 'p1', 'english')?.id).toBe('english');
  });

  it('only removes profiles without papers', () => {
    const data = addAttempt(addProfile(addProfile(emptyStore(), 'Sam', 1, 'p1'), 'Ali', 2, 'p2'), createAttempt('p1', 'full', 'AAAAAA', paper, 3, 'a'));
    expect(removeProfile(data, 'p1').profiles).toHaveLength(2);
    expect(removeProfile(data, 'p2').profiles.map((p) => p.id)).toEqual(['p1']);
  });

  it('runs a daily paper as five sessions of eight', () => {
    let a = createAttempt('p1', 'daily', 'TESTAB', paper, 1000, 'a1');
    expect(openSession(a)).toEqual({ from: 0, to: 8, day: 1 });
    for (let i = 0; i < 6; i++) a = answerRight(a, i);
    a = submitSession(a, 2000);
    expect(scoreOf(a, 0, 8)).toEqual({ score: 6, total: 8, pending: 0, pendingMarks: 0 });
    expect(a.marks.slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
    expect(a.markedAt[0]).toBe(2000);
    expect(a.marks[8]).toBeNull();
    expect(a.current).toBe(8);
    expect(openSession(a)).toEqual({ from: 8, to: 16, day: 2 });
    for (let day = 2; day <= 5; day++) a = submitSession(a, 2000 + day);
    expect(openSession(a)).toBeNull();
    expect(a.completedAt).toBe(2005);
  });

  it('marks a full paper in one go', () => {
    let a = createAttempt('p1', 'full', 'TESTAB', paper, 1000, 'a2');
    for (let i = 0; i < 40; i++) a = answerRight(a, i);
    a = submitSession(a, 5000);
    // 40 questions: long multiplication and division (4 of them) are worth 2 marks, as in the real test.
    expect(scoreOf(a)).toMatchObject({ score: 44, total: 44 });
    expect(a.completedAt).toBe(5000);
  });

  it('finds the unfinished paper of a profile', () => {
    let data = addProfile(emptyStore(), ' Sam ', 1, 'p1');
    expect(data.profiles[0].name).toBe('Sam');
    expect(data.currentProfileId).toBe('p1');
    const done = { ...createAttempt('p1', 'full', 'AAAAAA', paper, 10, 'old'), completedAt: 20 };
    data = addAttempt(addAttempt(data, done), createAttempt('p1', 'daily', 'BBBBBB', paper, 30, 'new'));
    expect(activeAttempt(data, 'p1', 'arithmetic')?.id).toBe('new');
    expect(activeAttempt(data, 'p1', 'reasoning')).toBeUndefined();
    expect(activeAttempt(data, 'other', 'arithmetic')).toBeUndefined();
  });
});

describe('persistence', () => {
  const memory = (): Storage => {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, v),
      removeItem: (k) => void m.delete(k),
      clear: () => m.clear(),
      key: (i) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };

  it('saves and loads', () => {
    const storage = memory();
    const data = addAttempt(addProfile(emptyStore(), 'Sam', 1, 'p1'), createAttempt('p1', 'full', 'TESTAB', paper, 2, 'a'));
    expect(saveStore(data, storage)).toBe(true);
    expect(loadStore(storage)).toEqual(data);
  });

  it('migrates version 1 data instead of rejecting it', () => {
    const attempt = submitSession(createAttempt('p1', 'full', 'TESTAB', paper, 2, 'a'), 3);
    const { paper: _dropped, ...v1Attempt } = attempt;
    const v1 = { schemaVersion: 1, profiles: [{ id: 'p1', name: 'Sam', createdAt: 1 }], attempts: [v1Attempt], currentProfileId: 'p1' };
    const migrated = parseStore(JSON.parse(JSON.stringify(v1)));
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.attempts[0].paper).toBe('arithmetic');
    expect(migrated?.attempts[0].marks).toEqual(attempt.marks);
  });

  it('keeps reasoning attempts and their 2-mark scores', () => {
    const r = createAttempt('p1', 'daily', 'RRRRRR', generateReasoningPaper('RRRRRR'), 5, 'r');
    expect(r.paper).toBe('reasoning');
    const day1 = submitSession(r, 6);
    expect(scoreOf(day1, 0, 5).total).toBe(7);
    const data = addAttempt(addProfile(emptyStore(), 'Sam', 1, 'p1'), day1);
    expect(parseStore(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it('falls back to an empty store on data that is not a store at all', () => {
    const storage = memory();
    storage.setItem('ks2-arithmetic/v1', '{not json');
    expect(loadStore(storage)).toEqual(emptyStore());
    expect(parseStore({ profiles: [], attempts: [] })).toBeNull();
    expect(parseStore([])).toBeNull();
  });

  it('keeps what it cannot read aside instead of rejecting the whole store', () => {
    const good = createAttempt('p1', 'full', 'TESTAB', paper, 2, 'good');
    const future = { ...createAttempt('p1', 'full', 'NEWONE', paper, 3, 'future'), paper: 'times-tables' };
    const broken = { ...createAttempt('p1', 'full', 'BROKEN', paper, 4, 'broken'), questions: [null] };
    const read = parseStore({
      schemaVersion: 3,
      profiles: [{ id: 'p1', name: 'Sam', createdAt: 1 }, { id: 1 }],
      attempts: [good, future, broken],
      currentProfileId: 'p1',
    });
    expect(read?.attempts.map((a) => a.id)).toEqual(['good']);
    expect(read?.profiles.map((p) => p.id)).toEqual(['p1']);
    expect(read?.unreadable).toHaveLength(3);
    // Saved and read again (by this or a later version): nothing is lost, and what is readable comes back.
    const again = parseStore(JSON.parse(JSON.stringify({ ...read, unreadable: [...read!.unreadable!, { ...future, paper: 'arithmetic' }] })));
    expect(again?.attempts.map((a) => a.id).sort()).toEqual(['future', 'good']);
    expect(again?.unreadable).toHaveLength(3);
  });

  it('never lets one unreadable paper hide the others', () => {
    let data = addProfile(emptyStore(), 'Sam', 1, 'p1');
    for (let i = 0; i < 5; i++) data = addAttempt(data, createAttempt('p1', 'full', 'ABCDEF', paper, 10 + i, `a${i}`));
    const withFuture = { ...data, attempts: [...data.attempts, { ...data.attempts[0], id: 'x', mode: 'mock' }] };
    const read = parseStore(JSON.parse(JSON.stringify(withFuture)));
    expect(read?.attempts).toHaveLength(5);
    expect(read?.profiles).toHaveLength(1);
  });

  it('restoring an older backup keeps newer answers on this iPad', () => {
    let local = createAttempt('p1', 'daily', 'TESTAB', paper, 2, 'a');
    const backup = setAnswer(local, 0, { whole: '1', num: '', den: '' });
    for (let i = 0; i < 5; i++) local = setAnswer(local, i, { whole: String(i + 1), num: '', den: '' });
    local = addTime(local, 0, 60_000);
    const merged = mergeStores(addAttempt(emptyStore(), local), addAttempt(emptyStore(), backup));
    expect(merged.attempts[0].answers.filter(Boolean)).toHaveLength(5);
    expect(merged.attempts[0].timeMs[0]).toBe(60_000);
  });

  it('restoring on a new iPad switches to the restored profile and drops the empty copy', () => {
    const fresh = addProfile(emptyStore(), 'Amy', 5, 'new-device');
    const backup = addAttempt(addProfile(emptyStore(), 'Amy', 1, 'p1'), createAttempt('p1', 'full', 'TESTAB', paper, 2, 'a'));
    const restored = restoreBackup(fresh, backup);
    expect(restored.currentProfileId).toBe('p1');
    expect(restored.profiles.map((p) => p.id)).toEqual(['p1']);
    // With papers of its own, the profile in use stays.
    const busy = addAttempt(fresh, createAttempt('new-device', 'full', 'QQQQQQ', paper, 6, 'b'));
    const both = restoreBackup(busy, backup);
    expect(both.currentProfileId).toBe('new-device');
    expect(both.profiles).toHaveLength(2);
  });

  it('merges backups by id, keeping the most progress', () => {
    const base = addProfile(emptyStore(), 'Sam', 1, 'p1');
    const fresh = createAttempt('p1', 'daily', 'TESTAB', paper, 2, 'a');
    const progressed = submitSession(fresh, 3);
    const merged = mergeStores(addAttempt(base, progressed), addAttempt(addProfile(emptyStore(), 'Ali', 1, 'p2'), fresh));
    expect(merged.profiles.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(merged.attempts).toHaveLength(1);
    expect(merged.attempts[0].marks[0]).not.toBeNull();
    expect(merged.currentProfileId).toBe('p1');
  });
});

describe('durable storage', () => {
  const memory = (limit = Infinity): Storage => {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => {
        if (v.length > limit) throw new Error('QuotaExceededError');
        m.set(k, v);
      },
      removeItem: (k) => void m.delete(k),
      clear: () => m.clear(),
      key: (i) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };
  const fakeDb = (): KeyValue & { map: Map<string, unknown> } => {
    const map = new Map<string, unknown>();
    return { map, get: async (k) => map.get(k), set: async (k, v) => void map.set(k, structuredClone(v)) };
  };
  const brokenDb: KeyValue = { get: () => Promise.reject(new Error('no db')), set: () => Promise.reject(new Error('no db')) };
  const withSam = () => addProfile(emptyStore(), 'Sam', 1, 'p1');

  it('moves localStorage data into IndexedDB the first time', async () => {
    const storage = memory();
    saveStore(withSam(), storage);
    const db = fakeDb();
    const { data, durable } = await loadDurable(db, storage);
    expect(durable).toBe(true);
    expect(data.profiles.map((p) => p.name)).toEqual(['Sam']);
    expect(db.map.has('store')).toBe(true);
  });

  it('loads the newer copy', async () => {
    const storage = memory();
    const db = fakeDb();
    await saveDurable(withSam(), 10, db, storage);
    // An older app version wrote only to localStorage afterwards.
    const later = addProfile(withSam(), 'Ali', 2, 'p2');
    await saveDurable(later, 20, fakeDb(), storage);
    expect((await loadDurable(db, storage)).data.profiles).toHaveLength(2);
    // IndexedDB newer than localStorage.
    const db2 = fakeDb();
    await db2.set('store', { savedAt: 30, data: withSam() });
    expect((await loadDurable(db2, storage)).data.profiles).toHaveLength(1);
  });

  it('keeps saving to IndexedDB when localStorage is full', async () => {
    const storage = memory(10);
    const db = fakeDb();
    expect(await saveDurable(withSam(), 5, db, storage)).toBe(true);
    expect((await loadDurable(db, storage)).data.profiles).toHaveLength(1);
  });

  it('never overwrites stored results while loading, even when a paper cannot be read', async () => {
    let data = addProfile(emptyStore(), 'Mert', 1, 'p1');
    for (let i = 0; i < 20; i++) data = addAttempt(data, createAttempt('p1', 'full', 'ABCDEF', paper, 10 + i, `a${i}`));
    // A newer version wrote a kind of paper this one does not know, then the update was rolled back.
    const stored = { ...data, attempts: [...data.attempts, { ...createAttempt('p1', 'full', 'ZZZZZZ', paper, 99, 'new'), paper: 'mtc' }] };
    const storage = memory();
    storage.setItem('ks2-arithmetic/v1', JSON.stringify(stored));
    storage.setItem('ks2-sats/saved-at', '100');
    const db = fakeDb();
    await db.set('store', { savedAt: 100, data: stored });
    const { data: loaded } = await loadDurable(db, storage);
    expect(loaded.attempts).toHaveLength(20);
    expect(loaded.profiles).toHaveLength(1);
    expect(loaded.unreadable).toHaveLength(1);
    expect((db.map.get('store') as { data: StoreData }).data.attempts).toHaveLength(21);
  });

  it('keeps copies that cannot be read at all under their own keys', async () => {
    const storage = memory();
    storage.setItem('ks2-arithmetic/v1', '{"schemaVersion": 2, "profiles": [');
    const db = fakeDb();
    await db.set('store', { savedAt: 5, data: 'garbled' });
    const { data } = await loadDurable(db, storage);
    expect(data).toEqual(emptyStore());
    const kept = [...db.map.keys()].filter((k) => k.startsWith(UNREADABLE_PREFIX));
    expect(kept).toHaveLength(2);
    expect(db.map.get('store')).toEqual({ savedAt: 5, data: 'garbled' });
  });

  it('prefers a readable copy over a newer empty one', async () => {
    const storage = memory();
    saveStore(emptyStore(), storage);
    storage.setItem('ks2-sats/saved-at', '50');
    const db = fakeDb();
    await db.set('store', { savedAt: 10, data: withSam() });
    expect((await loadDurable(db, storage)).data.profiles).toHaveLength(1);
  });

  it('falls back to localStorage without IndexedDB', async () => {
    const storage = memory();
    expect(await saveDurable(withSam(), 5, brokenDb, storage)).toBe(true);
    const { data, durable } = await loadDurable(brokenDb, storage);
    expect(durable).toBe(false);
    expect(data.profiles).toHaveLength(1);
    expect(await saveDurable(withSam(), 6, brokenDb, memory(10))).toBe(false);
  });
});

describe('written answers and grown-up marking', () => {
  const explain: ItemQuestion = {
    format: 'english',
    typeId: 'rd-2d',
    difficulty: 2,
    marks: 2,
    body: [],
    input: { kind: 'self', model: 'Because…', points: ['a', 'b'] },
    answer: '',
  };
  const find: ItemQuestion = { format: 'english', typeId: 'rd-2b', difficulty: 1, marks: 1, body: [], input: { kind: 'text' }, answer: 'tape' };
  const blank = { whole: '', num: '', den: '' };

  it('leaves a written answer out of the score until it is marked, then counts it', () => {
    let a = createAttempt('p1', 'full', 'READIN', [explain, find, explain], 1, 'r', 'reading');
    a = setAnswer(a, 0, { ...blank, text: 'She was scared because she hid.' });
    a = setAnswer(a, 1, { ...blank, text: 'tape' });
    a = submitSession(a, 2);
    expect(scoreOf(a)).toEqual({ score: 1, total: 3, pending: 1, pendingMarks: 2 });
    a = setSelfMark(a, 0, 2);
    expect(scoreOf(a)).toEqual({ score: 3, total: 5, pending: 0, pendingMarks: 0 });
    a = setSelfMark(a, 0, 9);
    expect(a.marks[0]).toBe(2);
    // A blank explanation scores 0 and is not waiting for marks.
    expect(a.marks[2]).toBe(0);
  });

  it('lets a grown-up accept a typed reading answer with a spelling slip', () => {
    let a = createAttempt('p1', 'full', 'READIN', [find], 1, 'r', 'reading');
    a = setAnswer(a, 0, { ...blank, text: 'tpae' });
    a = submitSession(a, 2);
    expect(a.marks[0]).toBe(0);
    a = setAccepted(a, 0, true);
    expect(a.marks[0]).toBe(1);
    a = setAccepted(a, 0, false);
    expect(a.marks[0]).toBe(0);
    expect(a.answers[0]?.accepted).toBeUndefined();
  });
});

describe('mock tests', () => {
  it('run beside a daily paper without putting it aside', () => {
    let data = addProfile(emptyStore(), 'Sam', 1, 'p1');
    const daily = createAttempt('p1', 'daily', 'DDDDDD', paper, 10, 'daily');
    data = startAttempt(data, daily, 10);
    const mock = { ...createAttempt('p1', 'full', 'MMMMMM', paper, 20, 'mock'), timeLimitMs: 30 * 60_000 };
    data = startAttempt(data, mock, 20);
    expect(activeAttempt(data, 'p1', 'arithmetic')?.id).toBe('daily');
    expect(activeAttempt(data, 'p1', 'arithmetic', true)?.id).toBe('mock');
    expect(data.attempts.find((a) => a.id === 'daily')?.abandonedAt).toBeUndefined();
  });
});

