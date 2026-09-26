// Facts about the real KS2 tests that the app measures practice against.
import type { PaperKind } from './types';

/** The 2027 tests run from Monday 10 May to Thursday 13 May (GOV.UK, information for parents). */
export const SATS_START = new Date(2027, 4, 10);

/** Whole days from `now` to the first test day (0 on the day, negative after it). */
export function daysToSats(now: number): number {
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((SATS_START.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Time allowed in a mock test, in minutes: the real test's time. A mock arithmetic paper has the real
 * paper's 36 questions and 40 marks. Spelling is read aloud at the test's pace, so it has no limit.
 */
export const MOCK_MINUTES: Partial<Record<PaperKind, number>> = {
  arithmetic: 30,
  reasoning: 40,
  gps: 45,
  reading: 60,
};

/** Real test timings used as a pace guide in practice: [marks, minutes]. */
export const PACE: Partial<Record<PaperKind, [number, number]>> = {
  arithmetic: [40, 30],
  reasoning: [35, 40],
  gps: [50, 45],
  spelling: [20, 15],
  reading: [50, 60],
};

export interface Standard {
  /** Raw marks available in the real test. */
  max: number;
  /** Raw marks that reached the expected standard (a scaled score of 100) in 2025. */
  expected: number;
}

/**
 * 2025 thresholds (the latest published): maths 58 of 110 (Paper 1: 40, Papers 2 and 3: 35 each),
 * reading 28 of 50, grammar, punctuation and spelling 35 of 70 (Paper 1: 50, spelling: 20). They move
 * a little every year.
 */
export const STANDARD = {
  maths: { max: 110, expected: 58 },
  reading: { max: 50, expected: 28 },
  gps: { max: 70, expected: 35 },
} as const satisfies Record<string, Standard>;
