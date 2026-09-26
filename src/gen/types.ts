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

/** Maths: Paper 1 arithmetic, Papers 2 and 3 reasoning. English: grammar and punctuation, spelling, reading. */
export type PaperKind = 'arithmetic' | 'reasoning' | 'gps' | 'spelling' | 'reading';

export const PAPER_KINDS: readonly PaperKind[] = ['arithmetic', 'reasoning', 'gps', 'spelling', 'reading'];

/** Level a pupil picks for English: one difficulty throughout, or "mixed" (easy to hard, like the real test). */
export type LevelChoice = Difficulty | 'mixed';

export type Subject = 'maths' | 'english';

export const SUBJECT_OF: Record<PaperKind, Subject> = {
  arithmetic: 'maths',
  reasoning: 'maths',
  gps: 'english',
  spelling: 'english',
  reading: 'english',
};

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
  { id: 'word-classes', label: 'Word classes' },
  { id: 'sentence-structure', label: 'Sentences and clauses' },
  { id: 'verb-forms', label: 'Verbs and tenses' },
  { id: 'standard-english', label: 'Standard English and formality' },
  { id: 'punctuation', label: 'Punctuation' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'spelling', label: 'Spelling' },
  { id: 'reading-words', label: 'Reading: word meanings' },
  { id: 'reading-retrieval', label: 'Reading: finding information' },
  { id: 'reading-inference', label: 'Reading: inference and prediction' },
  { id: 'reading-structure', label: 'Reading: summary, structure and language' },
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
  | { b: 'grid'; cols: number; rows: number; shaded: number[] }
  /** Spelling dictation: the word is spoken, the sentence is shown with the word blanked out. */
  | { b: 'speak'; word: string; sentence: string }
  /** A reading text, shown beside its questions; `paragraph` (1-based) is the one the question points to. */
  | { b: 'passage'; textId: string; paragraph?: number };

export interface NumberBox {
  label?: string; // before the box: "x", "□", "Ben"
  prefix?: string; // inside, before the value: "£"
  suffix?: string; // after the box: "cm", "°"
  negative?: boolean; // allow "−"
  decimal?: boolean; // allow "."
  plain?: boolean; // no thousands commas (years)
  dp?: number; // exactly this many decimal places, as asked ("to one decimal place" → 50.0)
}

export type InputSpec =
  | { kind: 'number'; boxes: NumberBox[]; layout?: 'row' | 'time' | 'coord' | 'sequence'; tokens?: (string | null)[] }
  | { kind: 'fraction' }
  | { kind: 'choice'; options: string[]; pick: number } // pick > 1: "tick two"
  | { kind: 'order'; items: string[]; first: string } // first: "smallest", "earliest", …
  /** A typed word or phrase on the letter keyboard. `spell` hides the word in feedback-free spelling tests. */
  | { kind: 'text'; before?: string; after?: string; spell?: boolean }
  /** Tap word(s) of a sentence. */
  | { kind: 'words'; tokens: string[]; pick: number }
  /** Tap where a punctuation mark goes; gap i is just after token i. */
  | { kind: 'gap'; tokens: string[]; mark: string }
  /** True or false for each statement. */
  | { kind: 'tf'; statements: string[] }
  /** Explanation question: the pupil compares with the model answer and gives themselves 0 to marks. */
  | { kind: 'self'; model: string; points: string[] };

/**
 * A reasoning or English question as stored with an attempt. Answer encoding by input kind:
 * number "n/d;n/d" (one per box) · fraction "n/d" · choice, words, gap "0,3" (sorted) ·
 * order "2,0,1" · text "answer|other accepted answer" · tf "1,0,1" · self "" (pupil marks it).
 */
export interface ItemQuestion {
  format: 'reasoning' | 'english';
  typeId: string;
  difficulty: Difficulty;
  marks: number;
  body: Block[];
  /** Why the answer is right, shown after marking. */
  explain?: string;
  /** Bank entry the question came from (English), so papers can avoid repeats and revisit mistakes. */
  sourceId?: string;
  input: InputSpec;
  answer: string;
}

export type AnyQuestion = Question | ItemQuestion;

/** Any question built from blocks and an input (reasoning and English), as opposed to a Paper 1 calculation. */
export const isItem = (q: AnyQuestion): q is ItemQuestion => 'format' in q;

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
