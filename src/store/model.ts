// App data and the pure functions that change it. React state holds one StoreData value;
// persist.ts writes it to localStorage.
import { awaitingMark, emptyAnswer, markFor, maxMarks, type AnswerInput } from '../answer/answer';
import { DAYS } from '../gen/blueprint';
import { isItem, SUBJECT_OF, type AnyQuestion, type LevelChoice, type PaperKind, type Subject } from '../gen/types';

/** 2: attempts carry `paper` and marks can be 0-2. Version 1 data is migrated on load. */
export const SCHEMA_VERSION = 2;

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

/** A daily paper (five sessions), a whole paper in one go, or a short practice of one topic. */
export type Mode = 'daily' | 'full' | 'practice';

/** What the home screen asks for. */
export interface StartRequest {
  paper: PaperKind;
  mode: Mode;
  level?: LevelChoice;
  /** Words in a spelling test, texts in a reading paper. */
  size?: number;
  /** Practice: the GPS question types or spelling groups to draw from, and their name. */
  types?: string[];
  groups?: string[];
  topic?: string;
}

export interface Attempt {
  id: string;
  profileId: string;
  paperCode: string;
  paper: PaperKind;
  mode: Mode;
  /** English only: the level picked when the paper was made. */
  level?: LevelChoice;
  /** Practice only: what is being practised ("Commas", "Silent letters"). */
  topic?: string;
  createdAt: number;
  completedAt: number | null;
  /** Set when a new paper of the same kind was started instead: it no longer counts as in progress. */
  abandonedAt?: number;
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
  /** Papers this version could not read (e.g. saved by a newer version): kept and saved, never dropped. */
  unreadable?: unknown[];
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

export const renameProfile = (data: StoreData, id: string, name: string): StoreData =>
  name.trim() ? { ...data, profiles: data.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)) } : data;

/** Removes a profile, but only one with no papers: results are never deleted from here. */
export function removeProfile(data: StoreData, id: string): StoreData {
  if (data.attempts.some((a) => a.profileId === id)) return data;
  return {
    ...data,
    profiles: data.profiles.filter((p) => p.id !== id),
    currentProfileId: data.currentProfileId === id ? null : data.currentProfileId,
  };
}

/** Paper of attempts saved before `paper` existed (maths only). */
export const paperOf = (questions: AnyQuestion[]): PaperKind =>
  questions.length > 0 && isItem(questions[0]) ? 'reasoning' : 'arithmetic';

export function createAttempt(
  profileId: string,
  mode: Mode,
  paperCode: string,
  questions: AnyQuestion[],
  now: number,
  id = newId(),
  paper: PaperKind = paperOf(questions),
  level?: LevelChoice,
): Attempt {
  const n = questions.length;
  return {
    id,
    profileId,
    paperCode,
    paper,
    mode,
    ...(level !== undefined && { level }),
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

const inProgress = (a: Attempt) => a.completedAt === null && a.abandonedAt === undefined;

/** The profile's unfinished paper of one kind, if any (the most recent one). Practice is separate. */
export function activeAttempt(data: StoreData, profileId: string, paper: PaperKind): Attempt | undefined {
  return data.attempts
    .filter((a) => a.profileId === profileId && a.paper === paper && a.mode !== 'practice' && inProgress(a))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** The profile's unfinished topic practice in a subject, if any. */
export function activePractice(data: StoreData, profileId: string, subject: Subject): Attempt | undefined {
  return data.attempts
    .filter((a) => a.profileId === profileId && a.mode === 'practice' && SUBJECT_OF[a.paper] === subject && inProgress(a))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** The unfinished paper or practice a new start would replace. */
export function replacedBy(data: StoreData, profileId: string, paper: PaperKind, mode: Mode): Attempt | undefined {
  return mode === 'practice' ? activePractice(data, profileId, SUBJECT_OF[paper]) : activeAttempt(data, profileId, paper);
}

/** Starts a paper: the unfinished one of the same kind is put aside (kept, but no longer in progress). */
export function startAttempt(data: StoreData, attempt: Attempt, now: number): StoreData {
  const old = replacedBy(data, attempt.profileId, attempt.paper, attempt.mode);
  const kept = old ? replaceAttempt(data, { ...old, abandonedAt: now }) : data;
  return addAttempt(kept, attempt);
}

/** Questions in one day of a daily paper: 8 for arithmetic, 5 for reasoning. */
export const perDay = (attempt: Attempt): number => Math.ceil(attempt.questions.length / DAYS);

/** Session containing a question index. */
export function sessionAt(attempt: Attempt, index: number): Session {
  if (attempt.mode !== 'daily') return { from: 0, to: attempt.questions.length, day: null };
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

export interface Score {
  score: number; // awarded marks
  total: number; // available marks, not counting answers still to be marked
  pending: number; // written answers still to be marked
  pendingMarks: number; // the marks they are worth
}

/** Awarded and available marks for the questions in [from, to). */
export function scoreOf(attempt: Attempt, from = 0, to = attempt.questions.length): Score {
  const out: Score = { score: 0, total: 0, pending: 0, pendingMarks: 0 };
  for (let i = from; i < to; i++) {
    const q = attempt.questions[i];
    if (attempt.marks[i] !== null && awaitingMark(q, attempt.answers[i])) {
      out.pending++;
      out.pendingMarks += maxMarks(q);
      continue;
    }
    out.score += attempt.marks[i] ?? 0;
    out.total += maxMarks(q);
  }
  return out;
}

/** Gives a written explanation its marks (after Finish, or changed later by a grown-up). */
export function setSelfMark(attempt: Attempt, index: number, mark: number): Attempt {
  const q = attempt.questions[index];
  if (!isItem(q) || q.input.kind !== 'self') return attempt;
  const self = Math.max(0, Math.min(Math.round(mark), q.marks));
  const answers = setAt(attempt.answers, index, { ...(attempt.answers[index] ?? emptyAnswer()), self, checked: true });
  const marks = attempt.marks[index] === null ? attempt.marks : setAt(attempt.marks, index, self);
  return { ...attempt, answers, marks };
}

/** A grown-up accepts (or no longer accepts) a typed reading answer the app marked wrong. */
export function setAccepted(attempt: Attempt, index: number, accepted: boolean): Attempt {
  const q = attempt.questions[index];
  const prev = attempt.answers[index];
  if (!isItem(q) || q.input.kind !== 'text' || !prev) return attempt;
  const answer: AnswerInput = { ...prev, accepted };
  if (!accepted) delete answer.accepted;
  const answers = setAt(attempt.answers, index, answer);
  const marks = attempt.marks[index] === null ? attempt.marks : setAt(attempt.marks, index, markFor(q, answer));
  return { ...attempt, answers, marks };
}
