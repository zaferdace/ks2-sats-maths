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

/** Paper 1 is arithmetic; Papers 2 and 3 share the reasoning format. */
export type PaperKind = 'arithmetic' | 'reasoning';

export const TOPICS = [
  { id: 'place-value', label: 'Place value' },
  { id: 'add-sub', label: 'Addition & subtraction' },
  { id: 'mul-div', label: 'Multiplication & division' },
  { id: 'order-powers', label: 'Order of operations & powers' },
  { id: 'fractions', label: 'Fractions' },
  { id: 'decimals', label: 'Decimals' },
  { id: 'percentages', label: 'Percentages' },
  { id: 'ratio', label: 'Ratio & proportion' },
  { id: 'algebra', label: 'Algebra' },
  { id: 'measurement', label: 'Measurement' },
  { id: 'geometry', label: 'Shapes & angles' },
  { id: 'position', label: 'Position & direction' },
  { id: 'statistics', label: 'Statistics' },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];

/** An arithmetic (Paper 1) question as stored with an attempt. */
export interface Question {
  typeId: string;
  difficulty: Difficulty;
  parts: Part[];
  answer: string; // exact rational "n/d"
  kind: AnswerKind;
  showMethod?: boolean;
}

/** What an arithmetic generator returns before it is snapshotted into a Question. */
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

// ---- Reasoning (Papers 2 and 3) ----

/** Paragraphs and figures of a reasoning question. Text supports **bold** and [[3/8]] fractions. */
export type Block =
  | { b: 'text'; text: string }
  | { b: 'table'; head: string[]; rows: string[][] }
  | { b: 'bar'; title: string; labels: string[]; values: number[]; axis: string; max: number; step: number }
  | { b: 'line'; title: string; labels: string[]; values: number[]; axis: string; min: number; max: number; step: number }
  | { b: 'pie'; title: string; slices: { label: string; turn: number }[] } // turn: share of the circle, 0-1
  | { b: 'coords'; min: number; max: number; points: { label: string; x: number; y: number }[]; join: boolean }
  | { b: 'angles'; shape: 'triangle' | 'line' | 'point' | 'quad'; labels: string[] } // not to scale
  | { b: 'rect'; labels: [string, string]; square?: boolean } // width label, height label; not to scale
  | { b: 'lshape'; labels: string[] } // six sides clockwise from the top; '' hides a label
  | { b: 'cuboid'; labels: [string, string, string] } // length, width, height
  | { b: 'grid'; cols: number; rows: number; shaded: number[] };

export interface NumberBox {
  label?: string; // before the box: "x", "□", "Ben"
  prefix?: string; // inside, before the value: "£"
  suffix?: string; // after the box: "cm", "°"
  negative?: boolean; // allow "−"
  decimal?: boolean; // allow "."
  plain?: boolean; // no thousands commas (years)
}

export type InputSpec =
  | { kind: 'number'; boxes: NumberBox[]; layout?: 'row' | 'time' | 'coord' | 'sequence'; tokens?: (string | null)[] }
  | { kind: 'fraction' }
  | { kind: 'choice'; options: string[]; pick: number } // pick > 1: "tick two"
  | { kind: 'order'; items: string[]; first: string }; // first: "smallest", "earliest", …

/**
 * A reasoning question as stored with an attempt. Answer encoding by input kind:
 * number "n/d;n/d" (one per box) · fraction "n/d" · choice "0,3" (sorted) · order "2,0,1".
 */
export interface ReasoningQuestion {
  format: 'reasoning';
  typeId: string;
  difficulty: Difficulty;
  marks: 1 | 2;
  body: Block[];
  input: InputSpec;
  answer: string;
}

export type AnyQuestion = Question | ReasoningQuestion;

export const isReasoning = (q: AnyQuestion): q is ReasoningQuestion => 'format' in q && q.format === 'reasoning';

/** What a reasoning template returns; the paper builder adds the marks. */
export interface ReasoningDraft {
  body: Block[];
  input: InputSpec;
  answer: string;
}

export interface ReasoningType {
  id: string;
  label: string;
  topic: TopicId;
  generate(rng: Rng, difficulty: Difficulty): ReasoningDraft;
}

/** What the report needs to know about any question type. */
export interface TypeInfo {
  id: string;
  label: string;
  topic: TopicId;
  paper: PaperKind;
}
