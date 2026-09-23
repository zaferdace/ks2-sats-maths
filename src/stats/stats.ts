// Statistics and heat-map data, all derived from marked questions.
import { DAYS, QUESTIONS_PER_DAY } from '../gen/blueprint';
import { findType, QUESTION_TYPES } from '../gen/registry';
import { TOPICS, type Difficulty, type TopicId } from '../gen/types';
import type { Attempt, Mode } from '../store/model';

export interface QuestionRecord {
  attemptId: string;
  index: number; // 0-39
  typeId: string;
  topic: TopicId | null;
  difficulty: Difficulty;
  correct: boolean;
  timeMs: number;
  at: number; // when it was marked
}

export interface SessionRecord {
  attemptId: string;
  paperCode: string;
  mode: Mode;
  day: number | null;
  at: number;
  from: number;
  to: number;
  score: number;
  total: number;
  timeMs: number;
}

export interface Tally {
  correct: number;
  total: number;
  timeMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const emptyTally = (): Tally => ({ correct: 0, total: 0, timeMs: 0 });

export function tally(records: Iterable<QuestionRecord>): Tally {
  const t = emptyTally();
  for (const r of records) {
    t.total++;
    t.correct += r.correct ? 1 : 0;
    t.timeMs += r.timeMs;
  }
  return t;
}

export const accuracyOf = (t: Tally): number | null => (t.total ? t.correct / t.total : null);

export function collectRecords(attempts: Attempt[]): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  for (const a of attempts) {
    a.questions.forEach((q, index) => {
      const mark = a.marks[index];
      if (mark === null) return;
      out.push({
        attemptId: a.id,
        index,
        typeId: q.typeId,
        topic: findType(q.typeId)?.topic ?? null,
        difficulty: q.difficulty,
        correct: mark === 1,
        timeMs: a.timeMs[index],
        at: a.markedAt[index] ?? a.createdAt,
      });
    });
  }
  return out;
}

/** One record per submitted session (questions marked together share a timestamp). */
export function collectSessions(attempts: Attempt[]): SessionRecord[] {
  const out: SessionRecord[] = [];
  for (const a of attempts) {
    let i = 0;
    while (i < a.questions.length) {
      const at = a.markedAt[i];
      if (at === null) {
        i++;
        continue;
      }
      const from = i;
      let score = 0;
      let timeMs = 0;
      while (i < a.questions.length && a.markedAt[i] === at) {
        score += a.marks[i] ?? 0;
        timeMs += a.timeMs[i];
        i++;
      }
      out.push({
        attemptId: a.id,
        paperCode: a.paperCode,
        mode: a.mode,
        day: a.mode === 'daily' ? Math.floor(from / QUESTIONS_PER_DAY) + 1 : null,
        at,
        from,
        to: i,
        score,
        total: i - from,
        timeMs,
      });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

export interface TopicRow {
  topic: TopicId;
  label: string;
  tally: Tally;
}

export function byTopic(records: QuestionRecord[]): TopicRow[] {
  return TOPICS.map((t) => ({ topic: t.id, label: t.label, tally: tally(records.filter((r) => r.topic === t.id)) }));
}

export interface TypeRow {
  typeId: string;
  label: string;
  topic: TopicId;
  tally: Tally;
}

/** Every question type, in registry order, including those not yet attempted. */
export function byType(records: QuestionRecord[]): TypeRow[] {
  const tallies = new Map<string, Tally>();
  for (const r of records) {
    const t = tallies.get(r.typeId) ?? emptyTally();
    t.total++;
    t.correct += r.correct ? 1 : 0;
    t.timeMs += r.timeMs;
    tallies.set(r.typeId, t);
  }
  return QUESTION_TYPES.map((t) => ({
    typeId: t.id,
    label: t.label,
    topic: t.topic,
    tally: tallies.get(t.id) ?? emptyTally(),
  }));
}

/** Types answered at least `minAnswered` times, weakest first. */
export function weakest(rows: TypeRow[], minAnswered = 3): TypeRow[] {
  return rows
    .filter((r) => r.tally.total >= minAnswered)
    .sort((a, b) => a.tally.correct / a.tally.total - b.tally.correct / b.tally.total || b.tally.total - a.tally.total);
}

/** Accuracy by position in the paper: DAYS rows × QUESTIONS_PER_DAY columns. */
export function positionGrid(records: QuestionRecord[]): Tally[][] {
  const grid = Array.from({ length: DAYS }, () => Array.from({ length: QUESTIONS_PER_DAY }, emptyTally));
  for (const r of records) {
    const cell = grid[Math.floor(r.index / QUESTIONS_PER_DAY)]?.[r.index % QUESTIONS_PER_DAY];
    if (!cell) continue;
    cell.total++;
    cell.correct += r.correct ? 1 : 0;
    cell.timeMs += r.timeMs;
  }
  return grid;
}

/** Local midnight of the Monday starting the week that contains `ts`. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export interface WeeklyGrid {
  weekStarts: number[]; // oldest first
  rows: { typeId: string; label: string; topic: TopicId; cells: Tally[] }[];
}

/** Question types × the last `weeks` weeks. */
export function weeklyGrid(records: QuestionRecord[], now: number, weeks = 8): WeeklyGrid {
  const current = weekStart(now);
  const weekStarts = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * (weeks - 1 - i));
    return d.getTime();
  });
  const column = new Map(weekStarts.map((w, i) => [w, i]));
  const rows = QUESTION_TYPES.map((t) => ({
    typeId: t.id,
    label: t.label,
    topic: t.topic,
    cells: weekStarts.map(emptyTally),
  }));
  const rowOf = new Map(rows.map((r) => [r.typeId, r]));
  for (const r of records) {
    const col = column.get(weekStart(r.at));
    const row = rowOf.get(r.typeId);
    if (col === undefined || !row) continue;
    const cell = row.cells[col];
    cell.total++;
    cell.correct += r.correct ? 1 : 0;
    cell.timeMs += r.timeMs;
  }
  return { weekStarts, rows };
}

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Consecutive days, ending today or yesterday, with at least one submitted session. */
export function streakDays(sessions: SessionRecord[], now: number): number {
  const days = new Set(sessions.map((s) => dayKey(s.at)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface Summary {
  papersCompleted: number;
  sessions: number;
  questions: number;
  correct: number;
  accuracy: number | null;
  avgTimeMs: number | null;
  questionsLast7Days: number;
  streakDays: number;
}

export function summarize(attempts: Attempt[], records: QuestionRecord[], sessions: SessionRecord[], now: number): Summary {
  const t = tally(records);
  const timed = records.filter((r) => r.timeMs > 0);
  return {
    papersCompleted: attempts.filter((a) => a.completedAt !== null).length,
    sessions: sessions.length,
    questions: t.total,
    correct: t.correct,
    accuracy: accuracyOf(t),
    avgTimeMs: timed.length ? timed.reduce((s, r) => s + r.timeMs, 0) / timed.length : null,
    questionsLast7Days: records.filter((r) => r.at > now - 7 * DAY_MS).length,
    streakDays: streakDays(sessions, now),
  };
}
