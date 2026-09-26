import type { Difficulty } from './types';

export interface SlotOption {
  type: string;
  d: Difficulty[];
}

export const QUESTIONS_PER_PAPER = 40;
export const QUESTIONS_PER_DAY = 8;
export const DAYS = 5;

const o = (type: string, ...d: Difficulty[]): SlotOption => ({ type, d });

/**
 * The 40 slots of a paper, easy to hard, eight a day. Each slot lists the question types
 * (and difficulties) it may draw from: first an option, then one of its difficulties.
 *
 * Each slot stays within one topic group, so every paper has the same balance:
 * - fractions, decimals and percentages: 14 questions (8 fractions, 4 decimals, 2 percentages),
 *   14 of the 44 marks, about a third as on recent real papers;
 * - multiplication and division 13: short division 4 times (Q6, Q12, Q21, Q26), long
 *   multiplication at Q16 and Q37 and long division at Q30 and Q40 (2 marks each), 5 others;
 * - place value 4, addition and subtraction 6, order of operations and powers 3.
 * Days 1-2 hold every easy level; from Day 3 on no slot offers a level that is trivial there
 * (no n², n³, 20 × 20, × 0 or 1% of 100 late in the paper).
 *
 * Every type × difficulty the generators have is reachable (paper.test.ts checks this); none is
 * left out.
 */
export const BLUEPRINT: readonly SlotOption[][] = [
  // Day 1: warm-up
  [o('add-column', 1), o('add-three', 1)],
  [o('sub-column', 1), o('sub-round', 1)],
  [o('mul-mental', 1, 2), o('mul-div-0-1', 1, 2, 3)],
  [o('pv-add-sub-power', 1), o('pv-partition', 1)],
  [o('pv-mul-div-10', 1)],
  [o('div-short', 1)],
  [o('dec-add', 1), o('dec-sub', 1)],
  [o('frac-add-same', 1), o('frac-sub-same', 1)],
  // Day 2
  [o('missing-add-sub', 1, 2), o('missing-mul-div', 1, 2)],
  [o('mul-short', 1, 2)],
  [o('add-column', 2), o('add-three', 2), o('sub-column', 2), o('sub-round', 2)],
  [o('div-short', 2)],
  [o('squares-cubes', 1, 2), o('order-ops', 1)],
  [o('pv-partition', 2), o('pv-add-sub-power', 2, 3), o('pv-mul-div-10', 2)],
  [o('frac-add-same', 2), o('frac-sub-same', 2), o('frac-of', 1), o('frac-mul-whole', 1)],
  [o('mul-long', 1)],
  // Day 3
  [o('pv-partition', 3), o('pv-mul-div-10', 3)],
  [o('mul-mental', 3)],
  [o('add-column', 3), o('add-three', 3)],
  [o('dec-add', 2, 3), o('dec-sub', 2, 3)],
  [o('div-short', 2, 3)],
  [o('pct-of', 1, 2)],
  [o('sub-column', 3), o('sub-round', 3)],
  [o('frac-add-same', 3), o('frac-sub-same', 3), o('frac-add-diff', 1), o('frac-sub-diff', 1)],
  // Day 4
  [o('mul-short', 3)],
  [o('div-short', 3)],
  [o('frac-of', 2), o('frac-mul-frac', 1), o('frac-div-whole', 1)],
  [o('order-ops', 2), o('squares-cubes', 3)],
  [o('dec-mul', 1, 2), o('dec-div', 1)],
  [o('div-long', 1, 2)],
  [o('frac-add-diff', 2), o('frac-sub-diff', 2), o('frac-mixed', 1, 2)],
  [o('missing-add-sub', 3), o('missing-mul-div', 3)],
  // Day 5: hardest
  [o('dec-mul', 3), o('dec-div', 2, 3)],
  [o('frac-mul-frac', 2), o('frac-mul-whole', 2), o('frac-div-whole', 2)],
  [o('order-ops', 3)],
  [o('pct-of', 2, 3)],
  [o('mul-long', 2, 3)],
  [o('frac-add-diff', 3), o('frac-sub-diff', 3), o('frac-mixed', 3)],
  [o('frac-mul-frac', 3), o('frac-mul-whole', 3), o('frac-div-whole', 3), o('frac-of', 3)],
  [o('div-long', 2, 3)],
];

/**
 * Slots (1-40) a mock paper leaves out: four easy one-mark questions whose skills other slots also
 * test. Q4 place value (Q5, Q14 and Q17 remain), Q7 decimal + and − (Q20 remains), Q11 4-digit
 * + and − (Q1, Q2, Q19 and Q23 remain), Q18 mental × (Q3 remains). The mock keeps the ramp, all
 * four short divisions, both percentages and 13 fraction, decimal and percentage marks out of 40.
 */
export const MOCK_DROPPED_SLOTS: readonly number[] = [4, 7, 11, 18];

/**
 * A mock paper in the real Paper 1 format: 36 questions, 40 marks (the four long multiplications
 * and divisions are worth 2), easy to hard, done in one sitting.
 */
export const MOCK_BLUEPRINT: readonly SlotOption[][] = BLUEPRINT.filter((_, i) => !MOCK_DROPPED_SLOTS.includes(i + 1));

export const MOCK_QUESTIONS = 36;

/** Day (1-5) of a question index (0-39). */
export const dayOf = (index: number): number => Math.floor(index / QUESTIONS_PER_DAY) + 1;
