import { describe, expect, it } from 'vitest';
import { generatePaper } from '../gen/paper';
import { generateReasoningPaper } from '../gen/reasoning/paper';
import { ratFromString, toDecimalString } from '../math/rational';
import {
  activeAttempt,
  addAttempt,
  addProfile,
  createAttempt,
  emptyStore,
  openSession,
  scoreOf,
  setAnswer,
  submitSession,
  type Attempt,
} from './model';
import { loadStore, mergeStores, parseStore, saveStore } from './persist';

const paper = generatePaper('TESTAB');

/** Types the right answer into question i. */
function answerRight(a: Attempt, i: number): Attempt {
  const s = toDecimalString(ratFromString(a.questions[i].answer));
  const r = ratFromString(a.questions[i].answer);
  return setAnswer(a, i, s !== null ? { whole: s, num: '', den: '' } : { whole: '', num: String(r.n), den: String(r.d) });
}

describe('attempts', () => {
  it('runs a daily paper as five sessions of eight', () => {
    let a = createAttempt('p1', 'daily', 'TESTAB', paper, 1000, 'a1');
    expect(openSession(a)).toEqual({ from: 0, to: 8, day: 1 });
    for (let i = 0; i < 6; i++) a = answerRight(a, i);
    a = submitSession(a, 2000);
    expect(scoreOf(a, 0, 8)).toEqual({ score: 6, total: 8 });
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
    expect(scoreOf(a)).toEqual({ score: 40, total: 40 });
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

  it('falls back to an empty store on bad data', () => {
    const storage = memory();
    storage.setItem('ks2-arithmetic/v1', '{not json');
    expect(loadStore(storage)).toEqual(emptyStore());
    expect(parseStore({ schemaVersion: 99, profiles: [], attempts: [] })).toBeNull();
    expect(parseStore({ schemaVersion: 1, profiles: [{ id: 1 }], attempts: [] })).toBeNull();
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
