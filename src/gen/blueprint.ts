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
 * (and difficulties) it may draw from.
 */
export const BLUEPRINT: readonly SlotOption[][] = [
  // Day 1: warm-up
  [o('add-column', 1)],
  [o('sub-column', 1)],
  [o('mul-div-0-1', 1), o('mul-mental', 1)],
  [o('pv-add-sub-power', 1)],
  [o('pv-partition', 1)],
  [o('pv-mul-div-10', 1)],
  [o('dec-add', 1)],
  [o('frac-add-same', 1)],
  // Day 2
  [o('missing-mul-div', 1)],
  [o('frac-sub-same', 1, 2)],
  [o('sub-column', 2)],
  [o('mul-short', 2)],
  [o('missing-add-sub', 2)],
  [o('order-ops', 1)],
  [o('div-short', 1, 2)],
  [o('mul-long', 1)],
  // Day 3
  [o('mul-mental', 2), o('pv-add-sub-power', 2)],
  [o('squares-cubes', 1, 2)],
  [o('pv-mul-div-10', 2, 3), o('pv-partition', 2, 3)],
  [o('dec-sub', 2)],
  [o('add-three', 2), o('add-column', 2)],
  [o('frac-add-diff', 1)],
  [o('frac-of', 1, 2)],
  [o('pct-of', 1)],
  // Day 4
  [o('frac-sub-diff', 1, 2)],
  [o('dec-mul', 1, 2)],
  [o('sub-round', 2), o('sub-column', 3)],
  [o('frac-mul-frac', 1, 2)],
  [o('div-long', 1)],
  [o('frac-mixed', 1, 2)],
  [o('dec-div', 1, 2)],
  [o('pct-of', 2)],
  // Day 5: hardest
  [o('frac-mul-whole', 2)],
  [o('order-ops', 3), o('squares-cubes', 3)],
  [o('frac-div-whole', 2, 3)],
  [o('frac-add-diff', 2, 3), o('frac-sub-diff', 3)],
  [o('pct-of', 3)],
  [o('mul-long', 2, 3)],
  [o('frac-mixed', 3), o('missing-add-sub', 3), o('missing-mul-div', 3)],
  [o('div-long', 2, 3)],
];

/** Day (1-5) of a question index (0-39). */
export const dayOf = (index: number): number => Math.floor(index / QUESTIONS_PER_DAY) + 1;
