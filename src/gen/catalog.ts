// Every question type across all papers, for statistics and the report.
import { ENGLISH_TYPES } from '../english/catalog';
import { QUESTIONS_PER_PAPER } from './blueprint';
import { REASONING_QUESTIONS } from './reasoning/blueprint';
import { REASONING_TYPES } from './reasoning/registry';
import { QUESTION_TYPES } from './registry';
import { SUBJECT_OF, type LevelChoice, type PaperKind, type Subject, type TypeInfo } from './types';

export const ALL_TYPES: readonly TypeInfo[] = [
  ...QUESTION_TYPES.map((t): TypeInfo => ({ id: t.id, label: t.label, topic: t.topic, paper: 'arithmetic' })),
  ...REASONING_TYPES.map((t): TypeInfo => ({ id: t.id, label: t.label, topic: t.topic, paper: 'reasoning' })),
  ...ENGLISH_TYPES,
];

const BY_ID = new Map(ALL_TYPES.map((t) => [t.id, t]));

export const typeInfo = (id: string): TypeInfo | undefined => BY_ID.get(id);

/** Report scope: everything, one subject or one paper. */
export type PaperFilter = 'all' | Subject | PaperKind;

export const matchesFilter = (filter: PaperFilter, paper: PaperKind): boolean =>
  filter === 'all' || filter === paper || filter === SUBJECT_OF[paper];

export const typesOf = (filter: PaperFilter): TypeInfo[] => ALL_TYPES.filter((t) => matchesFilter(filter, t.paper));

/** Maths papers have a fixed length, so they get a question-position heat map. */
export type MathsPaper = 'arithmetic' | 'reasoning';

export const PAPER_LENGTH: Record<MathsPaper, number> = {
  arithmetic: QUESTIONS_PER_PAPER,
  reasoning: REASONING_QUESTIONS,
};

export const PAPER_NAME: Record<PaperKind, string> = {
  arithmetic: 'Arithmetic',
  reasoning: 'Reasoning',
  gps: 'Grammar & punctuation',
  spelling: 'Spelling',
  reading: 'Reading',
};

export const LEVEL_NAME: Record<LevelChoice, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard', mixed: 'Mixed' };
