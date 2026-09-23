// App data and the pure functions that change it. React state holds one StoreData value;
// persist.ts writes it to localStorage.
import { isCorrect, type AnswerInput } from '../answer/answer';
import { QUESTIONS_PER_DAY, QUESTIONS_PER_PAPER } from '../gen/blueprint';
import type { Question } from '../gen/types';

export const SCHEMA_VERSION = 1;

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
  mode: Mode;
  createdAt: number;
  completedAt: number | null;
  questions: Question[]; // snapshot of the 40 questions
  answers: (AnswerInput | null)[];
  flagged: boolean[];
  timeMs: number[]; // time spent on each question
  marks: (0 | 1 | null)[]; // null until that question's session is submitted
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

export function createAttempt(
  profileId: string,
  mode: Mode,
  paperCode: string,
  questions: Question[],
  now: number,
  id = newId(),
): Attempt {
  const n = questions.length;
  return {
    id,
    profileId,
    paperCode,
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

/** The profile's unfinished paper, if any (the most recent one). */
export function activeAttempt(data: StoreData, profileId: string): Attempt | undefined {
  return data.attempts
    .filter((a) => a.profileId === profileId && a.completedAt === null)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** Session containing a question index. */
export function sessionAt(attempt: Attempt, index: number): Session {
  if (attempt.mode === 'full') return { from: 0, to: attempt.questions.length, day: null };
  const day = Math.floor(index / QUESTIONS_PER_DAY) + 1;
  return { from: (day - 1) * QUESTIONS_PER_DAY, to: day * QUESTIONS_PER_DAY, day };
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
  const marks = attempt.marks.map((m, i) =>
    i >= session.from && i < session.to ? (isCorrect(attempt.questions[i], attempt.answers[i]) ? 1 : 0) : m,
  );
  const markedAt = attempt.markedAt.map((t, i) => (i >= session.from && i < session.to ? now : t));
  const complete = marks.every((m) => m !== null);
  return {
    ...attempt,
    marks,
    markedAt,
    completedAt: complete ? now : null,
    current: complete ? attempt.current : Math.min(session.to, attempt.questions.length - 1),
  };
}

/** Score of the questions in [from, to). */
export function scoreOf(attempt: Attempt, from = 0, to = attempt.questions.length): { score: number; total: number } {
  let score = 0;
  for (let i = from; i < to; i++) score += attempt.marks[i] ?? 0;
  return { score, total: to - from };
}

export const isPaperLength = (attempt: Attempt): boolean => attempt.questions.length === QUESTIONS_PER_PAPER;
