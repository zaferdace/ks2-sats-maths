// How recent full papers would add up in the real tests, against the expected standard.
import { STANDARD } from '../gen/exam';
import type { PaperKind } from '../gen/types';
import { scoreOf, type Attempt } from '../store/model';

/** Papers of each kind the estimate looks back over. */
export const RECENT_PAPERS = 3;

export interface Share {
  share: number; // marks scored ÷ marks available
  papers: number;
}

/** Share of the marks in the most recent finished papers of one kind (not topic practice). */
export function recentShare(attempts: Attempt[], paper: PaperKind, count = RECENT_PAPERS): Share | null {
  const done = attempts
    .filter((a) => a.paper === paper && a.mode !== 'practice' && a.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, count);
  let score = 0;
  let total = 0;
  for (const a of done) {
    const s = scoreOf(a);
    score += s.score;
    total += s.total;
  }
  return total ? { share: score / total, papers: done.length } : null;
}

export interface Estimate {
  id: 'maths' | 'reading' | 'gps';
  label: string;
  /** Estimated raw marks in the real test, or null until every paper it needs has been done. */
  raw: number | null;
  max: number;
  expected: number;
  /** Papers still needed for an estimate ("a reasoning paper"). */
  missing: string[];
}

/** Maths (Papers 1-3), reading, and grammar, punctuation and spelling, from the pupil's recent papers. */
export function readiness(attempts: Attempt[]): Estimate[] {
  const arithmetic = recentShare(attempts, 'arithmetic');
  const reasoning = recentShare(attempts, 'reasoning');
  const reading = recentShare(attempts, 'reading');
  const gps = recentShare(attempts, 'gps');
  const spelling = recentShare(attempts, 'spelling');
  const need = (share: Share | null, what: string) => (share ? [] : [what]);
  const both = (a: Share | null, b: Share | null, raw: (a: number, b: number) => number) => (a && b ? Math.round(raw(a.share, b.share)) : null);
  return [
    {
      id: 'maths',
      label: 'Maths',
      raw: both(arithmetic, reasoning, (a, r) => 40 * a + 70 * r),
      ...STANDARD.maths,
      missing: [...need(arithmetic, 'an arithmetic paper'), ...need(reasoning, 'a reasoning paper')],
    },
    {
      id: 'reading',
      label: 'Reading',
      raw: reading ? Math.round(50 * reading.share) : null,
      ...STANDARD.reading,
      missing: need(reading, 'a reading text'),
    },
    {
      id: 'gps',
      label: 'Grammar, punctuation & spelling',
      raw: both(gps, spelling, (g, s) => 50 * g + 20 * s),
      ...STANDARD.gps,
      missing: [...need(gps, 'a grammar paper'), ...need(spelling, 'a spelling test')],
    },
  ];
}
