import { describe, expect, it } from 'vitest';
import { typesOf } from '../gen/catalog';
import { generatePaper } from '../gen/paper';
import { ratFromString } from '../math/rational';
import { addTime, createAttempt, setAnswer, submitSession, type Attempt } from '../store/model';
import {
  byTopic,
  byType,
  collectRecords,
  collectSessions,
  positionGrid,
  streakDays,
  summarize,
  weakest,
  weekStart,
  weeklyGrid,
} from './stats';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 8, 23, 18, 0).getTime(); // Wednesday
const paper = generatePaper('STATSX');

/** Types the answer as a fraction; a wrong one is off by 1/d. */
function answer(a: Attempt, i: number, right: boolean): Attempt {
  const r = ratFromString(a.questions[i].answer);
  return setAnswer(a, i, { whole: '', num: String(right ? r.n : r.n + 1), den: String(r.d) });
}

/** Daily attempt: day 1 all right (yesterday), day 2 only the first four right (today). */
function fixture(): Attempt {
  let a = createAttempt('p', 'daily', 'STATSX', paper, NOW - 2 * DAY, 'a');
  for (let i = 0; i < 8; i++) a = addTime(answer(a, i, true), i, 10_000);
  a = submitSession(a, NOW - DAY);
  for (let i = 8; i < 16; i++) a = addTime(answer(a, i, i < 12), i, 20_000);
  return submitSession(a, NOW);
}

describe('stats', () => {
  const attempts = [fixture()];
  const records = collectRecords(attempts);
  const sessions = collectSessions(attempts);

  it('collects marked questions and sessions', () => {
    expect(records).toHaveLength(16);
    expect(sessions.map((s) => [s.day, s.score, s.total, s.timeMs])).toEqual([
      [1, 8, 8, 80_000],
      [2, 4, 8, 160_000],
    ]);
  });

  it('summarises', () => {
    expect(summarize(attempts, records, sessions, NOW)).toEqual({
      papersCompleted: 0,
      sessions: 2,
      questions: 16,
      correct: 12,
      accuracy: 0.75,
      avgTimeMs: 15_000,
      questionsLast7Days: 16,
      streakDays: 2,
    });
  });

  it('breaks accuracy down by topic, type and position', () => {
    const topicTotal = byTopic(records, typesOf('arithmetic')).reduce((s, r) => s + r.tally.total, 0);
    expect(topicTotal).toBe(16);
    const types = byType(records, typesOf('arithmetic'));
    expect(types.reduce((s, r) => s + r.tally.total, 0)).toBe(16);
    expect(types.some((r) => r.tally.total === 0)).toBe(true);
    const grid = positionGrid(records, 'arithmetic');
    expect(grid[0].every((c) => c.correct === 1 && c.total === 1)).toBe(true);
    expect(grid[1].map((c) => c.correct)).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
    expect(grid[2].every((c) => c.total === 0)).toBe(true);
  });

  it('orders the weakest types first', () => {
    const rows = byType(records, typesOf('arithmetic')).map((r) => ({ ...r, tally: { ...r.tally } }));
    rows[0].tally = { correct: 1, total: 4, timeMs: 0 };
    rows[1].tally = { correct: 3, total: 3, timeMs: 0 };
    rows[2].tally = { correct: 0, total: 2, timeMs: 0 };
    expect(weakest(rows).slice(0, 2).map((r) => r.typeId)).toEqual([rows[0].typeId, rows[1].typeId]);
  });

  it('buckets records into weeks', () => {
    expect(new Date(weekStart(NOW)).getDay()).toBe(1);
    const grid = weeklyGrid(records, NOW, typesOf('arithmetic'));
    expect(grid.weekStarts).toHaveLength(8);
    expect(grid.weekStarts[7]).toBe(weekStart(NOW));
    const lastWeek = grid.rows.reduce((s, r) => s + r.cells[7].total, 0);
    expect(lastWeek).toBe(16);
  });

  it('counts practice streaks', () => {
    const s = (at: number) => ({ at }) as ReturnType<typeof collectSessions>[number];
    expect(streakDays([s(NOW), s(NOW - DAY), s(NOW - 3 * DAY)], NOW)).toBe(2);
    expect(streakDays([s(NOW - DAY), s(NOW - 2 * DAY)], NOW)).toBe(2);
    expect(streakDays([s(NOW - 2 * DAY)], NOW)).toBe(0);
  });
});
