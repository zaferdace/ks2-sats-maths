import type { Rational } from '../math/rational';
import type { Rng } from './rng';

export type Op = '+' | '-' | '×' | '÷' | '=' | '(' | ')' | 'of';

/** Renderable, serialisable pieces of a question prompt. */
export type Part =
  | { t: 'num'; v: string } // canonical decimal string: "4478", "0.06"
  | { t: 'op'; v: Op }
  | { t: 'frac'; n: number; d: number; w?: number } // w = whole part of a mixed number
  | { t: 'pow'; b: number; e: 2 | 3 }
  | { t: 'pct'; v: string } // "20" → 20%
  | { t: 'box' }; // where the answer goes when it is inside the calculation

export type AnswerKind = 'int' | 'dec' | 'frac';
export type Difficulty = 1 | 2 | 3;

export const TOPICS = [
  { id: 'place-value', label: 'Place value' },
  { id: 'add-sub', label: 'Addition & subtraction' },
  { id: 'mul-div', label: 'Multiplication & division' },
  { id: 'order-powers', label: 'Order of operations & powers' },
  { id: 'fractions', label: 'Fractions' },
  { id: 'decimals', label: 'Decimals' },
  { id: 'percentages', label: 'Percentages' },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];

/** A question as stored with an attempt, so history survives generator changes. */
export interface Question {
  typeId: string;
  difficulty: Difficulty;
  parts: Part[];
  answer: string; // exact rational "n/d"
  kind: AnswerKind;
  showMethod?: boolean;
}

/** What a generator returns before it is snapshotted into a Question. */
export interface Generated {
  parts: Part[];
  answer: Rational;
  kind: AnswerKind;
  showMethod?: boolean;
}

export interface QuestionType {
  id: string;
  label: string;
  topic: TopicId;
  generate(rng: Rng, difficulty: Difficulty): Generated;
}
