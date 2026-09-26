// Statistics and heat-map data, all derived from marked questions.
import { awaitingMark, maxMarks } from '../answer/answer';
import { DAYS } from '../gen/blueprint';
import { matchesFilter, PAPER_LENGTH, typeInfo, type MathsPaper, type PaperFilter } from '../gen/catalog';
import { TOPICS, type Difficulty, type PaperKind, type TopicId, type TypeInfo } from '../gen/types';
import { perDay, type Attempt, type Mode } from '../store/model';

export interface QuestionRecord {
  attemptId: string;
  paper: PaperKind;
  mode: Mode;
  index: number; // position in the paper
  typeId: string;
  topic: TopicId | null;
  difficulty: Difficulty;
  correct: boolean; // full marks
  marks: number;
  max: number;
  timeMs: number;
  at: number; // when it was marked
}

export interface SessionRecord {
  attemptId: string;
  paper: PaperKind;
  paperCode: string;
  mode: Mode;
  day: number | null;
  at: number;
  from: number;
  to: number;
  score: number; // marks
  total: number; // available marks
  timeMs: number;
}

export interface Tally {
  correct: number;
  total: number;
  timeMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const emptyTally = (): Tally => ({ correct: 0, total: 0, timeMs: 0 });

function count(t: Tally, r: QuestionRecord): void {
  t.total++;
  t.correct += r.correct ? 1 : 0;
  t.timeMs += r.timeMs;
}

export function tally(records: Iterable<QuestionRecord>): Tally {
  const t = emptyTally();
  for (const r of records) count(t, r);
  return t;
}

export const accuracyOf = (t: Tally): number | null => (t.total ? t.correct / t.total : null);

export const inPaper = (filter: PaperFilter) => (r: { paper: PaperKind }) => matchesFilter(filter, r.paper);

export function collectRecords(attempts: Attempt[]): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  for (const a of attempts) {
    a.questions.forEach((q, index) => {
      const mark = a.marks[index];
      if (mark === null || awaitingMark(q, a.answers[index])) return;
      const max = maxMarks(q);
      out.push({
        attemptId: a.id,
        paper: a.paper,
        mode: a.mode,
        index,
        typeId: q.typeId,
        topic: typeInfo(q.typeId)?.topic ?? null,
        difficulty: q.difficulty,
        correct: mark >= max,
        marks: mark,
        max,
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
      let total = 0;
      let timeMs = 0;
      while (i < a.questions.length && a.markedAt[i] === at) {
        if (!awaitingMark(a.questions[i], a.answers[i])) {
          score += a.marks[i] ?? 0;
          total += maxMarks(a.questions[i]);
        }
        timeMs += a.timeMs[i];
        i++;
      }
      if (total === 0) continue; // only written answers, none marked yet
      out.push({
        attemptId: a.id,
        paper: a.paper,
        paperCode: a.paperCode,
        mode: a.mode,
        day: a.mode === 'daily' ? Math.floor(from / perDay(a)) + 1 : null,
        at,
        from,
        to: i,
        score,
        total,
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

/** Accuracy per topic, for the topics that have question types in `types`. */
export function byTopic(records: QuestionRecord[], types: readonly TypeInfo[]): TopicRow[] {
  const topics = new Set(types.map((t) => t.topic));
  return TOPICS.filter((t) => topics.has(t.id)).map((t) => ({
    topic: t.id,
    label: t.label,
    tally: tally(records.filter((r) => r.topic === t.id)),
  }));
}

export interface TypeRow {
  typeId: string;
  label: string;
  topic: TopicId;
  paper: PaperKind;
  tally: Tally;
}

/** The given question types in order, including those not yet attempted. */
export function byType(records: QuestionRecord[], types: readonly TypeInfo[]): TypeRow[] {
  const tallies = new Map<string, Tally>();
  for (const r of records) {
    const t = tallies.get(r.typeId) ?? emptyTally();
    count(t, r);
    tallies.set(r.typeId, t);
  }
  return types.map((t) => ({
    typeId: t.id,
    label: t.label,
    topic: t.topic,
    paper: t.paper,
    tally: tallies.get(t.id) ?? emptyTally(),
  }));
}

/** Types answered at least `minAnswered` times, weakest first. */
export function weakest(rows: TypeRow[], minAnswered = 3): TypeRow[] {
  return rows
    .filter((r) => r.tally.total >= minAnswered)
    .sort((a, b) => a.tally.correct / a.tally.total - b.tally.correct / b.tally.total || b.tally.total - a.tally.total);
}

/** Accuracy by position in one kind of paper: DAYS rows × questions-per-day columns. */
export function positionGrid(records: QuestionRecord[], paper: MathsPaper): Tally[][] {
  const size = Math.ceil(PAPER_LENGTH[paper] / DAYS);
  const grid = Array.from({ length: DAYS }, () => Array.from({ length: size }, emptyTally));
  for (const r of records) {
    if (r.paper !== paper || r.mode === 'practice') continue; // positions only mean something in a paper
    const cell = grid[Math.floor(r.index / size)]?.[r.index % size];
    if (cell) count(cell, r);
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
export function weeklyGrid(records: QuestionRecord[], now: number, types: readonly TypeInfo[], weeks = 8): WeeklyGrid {
  const current = weekStart(now);
  const weekStarts = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * (weeks - 1 - i));
    return d.getTime();
  });
  const column = new Map(weekStarts.map((w, i) => [w, i]));
  const rows = types.map((t) => ({
    typeId: t.id,
    label: t.label,
    topic: t.topic,
    cells: weekStarts.map(emptyTally),
  }));
  const rowOf = new Map(rows.map((r) => [r.typeId, r]));
  for (const r of records) {
    const col = column.get(weekStart(r.at));
    const row = rowOf.get(r.typeId);
    if (col !== undefined && row) count(row.cells[col], r);
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

/**
 * Totals for the report. `attempts`, `records` and `sessions` are the ones in the chosen time range;
 * the streak counts back from today over `allSessions`, so a range never cuts it short.
 */
export function summarize(
  attempts: Attempt[],
  records: QuestionRecord[],
  sessions: SessionRecord[],
  now: number,
  allSessions: SessionRecord[] = sessions,
): Summary {
  const t = tally(records);
  const timed = records.filter((r) => r.timeMs > 0);
  return {
    papersCompleted: attempts.filter((a) => a.completedAt !== null && a.mode !== 'practice').length,
    sessions: sessions.length,
    questions: t.total,
    correct: t.correct,
    accuracy: accuracyOf(t),
    avgTimeMs: timed.length ? timed.reduce((s, r) => s + r.timeMs, 0) / timed.length : null,
    questionsLast7Days: records.filter((r) => r.at > now - 7 * DAY_MS).length,
    streakDays: streakDays(allSessions, now),
  };
}
