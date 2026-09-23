// App data and the pure functions that change it. React state holds one StoreData value;
// persist.ts writes it to localStorage.
import { markFor, maxMarks, type AnswerInput } from '../answer/answer';
import { DAYS } from '../gen/blueprint';
import { isReasoning, type AnyQuestion, type PaperKind } from '../gen/types';

/** 2: attempts carry `paper` and marks can be 0-2. Version 1 data is migrated on load. */
export const SCHEMA_VERSION = 2;

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

export type Mode = 'daily' | 'full';

export interface Attempt {
  id: string;
  profileId: string;
  paperCode: string;
  paper: PaperKind;
  mode: Mode;
  createdAt: number;
  completedAt: number | null;
  questions: AnyQuestion[]; // snapshot of the paper
  answers: (AnswerInput | null)[];
  flagged: boolean[];
  timeMs: number[]; // time spent on each question
  marks: (number | null)[]; // awarded marks; null until that question's session is submitted
  markedAt: (number | null)[];
  current: number; // question on screen
}

export interface StoreData {
  schemaVersion: number;
  profiles: Profile[];
  attempts: Attempt[];
  currentProfileId: string | null;
}

/** A contiguous block of questions answered and submitted together. */
export interface Session {
  from: number; // inclusive index
  to: number; // exclusive index
  day: number | null; // 1-5 in daily mode
}

export const emptyStore = (): StoreData => ({
  schemaVersion: SCHEMA_VERSION,
  profiles: [],
  attempts: [],
  currentProfileId: null,
});

export const newId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function addProfile(data: StoreData, name: string, now: number, id = newId()): StoreData {
  const profile: Profile = { id, name: name.trim(), createdAt: now };
  return { ...data, profiles: [...data.profiles, profile], currentProfileId: id };
}

export const selectProfile = (data: StoreData, id: string | null): StoreData => ({ ...data, currentProfileId: id });

export const paperOf = (questions: AnyQuestion[]): PaperKind =>
  questions.length > 0 && isReasoning(questions[0]) ? 'reasoning' : 'arithmetic';

export function createAttempt(
  profileId: string,
  mode: Mode,
  paperCode: string,
  questions: AnyQuestion[],
  now: number,
  id = newId(),
): Attempt {
  const n = questions.length;
  return {
    id,
    profileId,
    paperCode,
    paper: paperOf(questions),
    mode,
    createdAt: now,
    completedAt: null,
    questions,
    answers: Array(n).fill(null),
    flagged: Array(n).fill(false),
    timeMs: Array(n).fill(0),
    marks: Array(n).fill(null),
    markedAt: Array(n).fill(null),
    current: 0,
  };
}

export const addAttempt = (data: StoreData, attempt: Attempt): StoreData => ({
  ...data,
  attempts: [...data.attempts, attempt],
});

export const replaceAttempt = (data: StoreData, attempt: Attempt): StoreData => ({
  ...data,
  attempts: data.attempts.map((a) => (a.id === attempt.id ? attempt : a)),
});

export const findAttempt = (data: StoreData, id: string): Attempt | undefined =>
  data.attempts.find((a) => a.id === id);

/** The profile's unfinished paper of one kind, if any (the most recent one). */
export function activeAttempt(data: StoreData, profileId: string, paper: PaperKind): Attempt | undefined {
  return data.attempts
    .filter((a) => a.profileId === profileId && a.paper === paper && a.completedAt === null)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** Questions in one day of a daily paper: 8 for arithmetic, 5 for reasoning. */
export const perDay = (attempt: Attempt): number => Math.ceil(attempt.questions.length / DAYS);

/** Session containing a question index. */
export function sessionAt(attempt: Attempt, index: number): Session {
  if (attempt.mode === 'full') return { from: 0, to: attempt.questions.length, day: null };
  const size = perDay(attempt);
  const day = Math.floor(index / size) + 1;
  return { from: (day - 1) * size, to: Math.min(day * size, attempt.questions.length), day };
}

/** The session still to be submitted, or null when the paper is complete. */
export function openSession(attempt: Attempt): Session | null {
  const first = attempt.marks.findIndex((m) => m === null);
  return first === -1 ? null : sessionAt(attempt, first);
}

const setAt = <T>(list: T[], index: number, value: T): T[] => list.map((v, i) => (i === index ? value : v));

export const setAnswer = (attempt: Attempt, index: number, answer: AnswerInput | null): Attempt => ({
  ...attempt,
  answers: setAt(attempt.answers, index, answer),
});

export const toggleFlag = (attempt: Attempt, index: number): Attempt => ({
  ...attempt,
  flagged: setAt(attempt.flagged, index, !attempt.flagged[index]),
});

export const setCurrent = (attempt: Attempt, index: number): Attempt => ({ ...attempt, current: index });

export function addTime(attempt: Attempt, index: number, ms: number): Attempt {
  if (ms <= 0) return attempt;
  return { ...attempt, timeMs: setAt(attempt.timeMs, index, attempt.timeMs[index] + Math.round(ms)) };
}

/** Marks the open session. Completing the last session completes the paper. */
export function submitSession(attempt: Attempt, now: number): Attempt {
  const session = openSession(attempt);
  if (!session) return attempt;
  const inSession = (i: number) => i >= session.from && i < session.to;
  const marks = attempt.marks.map((m, i) => (inSession(i) ? markFor(attempt.questions[i], attempt.answers[i]) : m));
  const markedAt = attempt.markedAt.map((t, i) => (inSession(i) ? now : t));
  const complete = marks.every((m) => m !== null);
  return {
    ...attempt,
    marks,
    markedAt,
    completedAt: complete ? now : null,
    current: complete ? attempt.current : Math.min(session.to, attempt.questions.length - 1),
  };
}

/** Awarded and available marks for the questions in [from, to). */
export function scoreOf(attempt: Attempt, from = 0, to = attempt.questions.length): { score: number; total: number } {
  let score = 0;
  let total = 0;
  for (let i = from; i < to; i++) {
    score += attempt.marks[i] ?? 0;
    total += maxMarks(attempt.questions[i]);
  }
  return { score, total };
}
