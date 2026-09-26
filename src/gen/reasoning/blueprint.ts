import type { Difficulty } from '../types';

export interface ReasoningSlot {
  marks: 1 | 2;
  options: { type: string; d: Difficulty[] }[];
}

export const REASONING_QUESTIONS = 25;
export const REASONING_MARKS = 35;

const one = (...options: ReasoningSlot['options']): ReasoningSlot => ({ marks: 1, options });
const two = (...options: ReasoningSlot['options']): ReasoningSlot => ({ marks: 2, options });
const o = (type: string, ...d: Difficulty[]) => ({ type, d });

/**
 * The 25 questions of a reasoning paper (Papers 2 and 3), easy to hard. Each day of five has
 * three 1-mark and two 2-mark questions: 7 marks a day, 35 in all. Two-mark slots hold the
 * multi-step problems only; one-step problems in the same contexts (adding two prices, a
 * fraction or percentage of an amount, doubling a recipe, undoing one operation, the minutes
 * between two times, a parallelogram's area, substituting into an expression) are 1-mark slots.
 */
export const REASONING_BLUEPRINT: readonly ReasoningSlot[] = [
  // Day 1
  one(o('r-digit-value', 1), o('r-rounding', 1), o('r-roman', 1)),
  one(o('r-angles-line', 1), o('r-angles-triangle', 1), o('r-shapes', 1)),
  one(o('r-bar-chart', 1), o('r-table', 1), o('r-line-graph', 1), o('r-money', 1)),
  two(o('r-money', 2), o('r-multistep', 1)),
  two(o('r-fraction-context', 2), o('r-percent-context', 2), o('r-recipe', 2)),
  // Day 2
  one(o('r-negative', 1, 2), o('r-order-numbers', 1), o('r-fraction-context', 1), o('r-recipe', 1)),
  one(o('r-shaded', 1, 2), o('r-compare-fractions', 1), o('r-percent-context', 1)),
  one(o('r-coordinates', 1), o('r-transform', 1), o('r-inverse', 1)),
  two(o('r-recipe', 3), o('r-ratio-share', 1, 2)),
  two(o('r-inverse', 2), o('r-formula', 1, 2)),
  // Day 3
  one(o('r-factors', 1, 2), o('r-estimate', 1, 2), o('r-time', 2)),
  one(o('r-convert', 1, 2), o('r-decimal-context', 1, 2), o('r-volume', 1)),
  one(o('r-line-graph', 1, 2), o('r-pie-chart', 1, 2)),
  two(o('r-money', 2), o('r-multistep', 2), o('r-remainders', 2, 3)),
  two(o('r-time', 1), o('r-perimeter-area', 2)),
  // Day 4
  one(o('r-equation', 1, 2), o('r-pattern', 1, 2), o('r-sequence', 1, 2), o('r-equation', 3)),
  one(o('r-angles-polygon', 1, 2), o('r-shapes', 2), o('r-angles-line', 2), o('r-perimeter-area', 1)),
  one(o('r-fdp', 1, 2), o('r-scale', 1, 2), o('r-shaded', 3)),
  two(o('r-percent-context', 2), o('r-fraction-context', 3)),
  two(o('r-perimeter-area', 3), o('r-volume', 2, 3)),
  // Day 5: hardest
  one(o('r-rounding', 2, 3), o('r-digit-value', 2, 3), o('r-order-numbers', 2, 3), o('r-factors', 3), o('r-roman', 2, 3)),
  one(o('r-angles-triangle', 2, 3), o('r-angles-polygon', 3), o('r-coordinates', 2, 3), o('r-transform', 2, 3), o('r-shapes', 3)),
  one(o('r-compare-fractions', 2, 3), o('r-fdp', 3), o('r-bar-chart', 2, 3), o('r-table', 2, 3), o('r-negative', 3)),
  two(o('r-ratio-share', 2, 3), o('r-scale', 3), o('r-time', 3), o('r-mean', 1, 2, 3), o('r-pie-chart', 3)),
  two(o('r-two-unknowns', 1, 2, 3), o('r-money', 3), o('r-multistep', 3), o('r-inverse', 3), o('r-sequence', 3)),
];
