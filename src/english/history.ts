// What a pupil has already seen in English, so new papers prefer fresh material and bring back
// mistakes (a light form of spaced repetition).
import { isItem, SUBJECT_OF } from '../gen/types';
import type { Attempt } from '../store/model';

export interface Seen {
  times: number;
  last: number;
  /** Result of the most recent marked attempt. */
  lastCorrect: boolean | null;
}

export type History = Map<string, Seen>;

export function englishHistory(attempts: Attempt[]): History {
  const out: History = new Map();
  const sorted = [...attempts].filter((a) => SUBJECT_OF[a.paper] === 'english').sort((x, y) => x.createdAt - y.createdAt);
  for (const a of sorted) {
    a.questions.forEach((q, i) => {
      if (!isItem(q) || !q.sourceId) return;
      const mark = a.marks[i];
      const prev = out.get(q.sourceId);
      out.set(q.sourceId, {
        times: (prev?.times ?? 0) + 1,
        last: a.markedAt[i] ?? a.createdAt,
        lastCorrect: mark === null ? (prev?.lastCorrect ?? null) : mark >= q.marks,
      });
    });
  }
  return out;
}

/** Orders candidates: never seen first, then the least recently seen. */
export function freshFirst<T>(items: readonly T[], id: (t: T) => string, history: History, shuffle: (xs: T[]) => T[]): T[] {
  const unseen = shuffle(items.filter((t) => !history.has(id(t))));
  const seen = items
    .filter((t) => history.has(id(t)))
    .sort((a, b) => (history.get(id(a))?.last ?? 0) - (history.get(id(b))?.last ?? 0));
  return [...unseen, ...seen];
}
