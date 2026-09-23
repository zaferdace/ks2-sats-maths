// Every question type across both paper kinds, for statistics and the report.
import { QUESTIONS_PER_PAPER } from './blueprint';
import { REASONING_QUESTIONS } from './reasoning/blueprint';
import { REASONING_TYPES } from './reasoning/registry';
import { QUESTION_TYPES } from './registry';
import type { PaperKind, TypeInfo } from './types';

export const ALL_TYPES: readonly TypeInfo[] = [
  ...QUESTION_TYPES.map((t): TypeInfo => ({ id: t.id, label: t.label, topic: t.topic, paper: 'arithmetic' })),
  ...REASONING_TYPES.map((t): TypeInfo => ({ id: t.id, label: t.label, topic: t.topic, paper: 'reasoning' })),
];

const BY_ID = new Map(ALL_TYPES.map((t) => [t.id, t]));

export const typeInfo = (id: string): TypeInfo | undefined => BY_ID.get(id);

export type PaperFilter = PaperKind | 'both';

export const typesOf = (paper: PaperFilter): TypeInfo[] =>
  ALL_TYPES.filter((t) => paper === 'both' || t.paper === paper);

export const PAPER_LENGTH: Record<PaperKind, number> = {
  arithmetic: QUESTIONS_PER_PAPER,
  reasoning: REASONING_QUESTIONS,
};

export const PAPER_NAME: Record<PaperKind, string> = {
  arithmetic: 'Arithmetic',
  reasoning: 'Reasoning',
};
