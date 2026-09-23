import { formatNumber } from '../gen/format';
import type { Question } from '../gen/types';
import { add, eq, fromDecimalString, rat, ratFromString, type Rational } from '../math/rational';

/** What the pupil typed. Whole-number and decimal answers only use `whole`. */
export interface AnswerInput {
  whole: string;
  num: string;
  den: string;
}

export type AnswerField = keyof AnswerInput;

export const emptyAnswer = (): AnswerInput => ({ whole: '', num: '', den: '' });

export const isBlank = (a: AnswerInput | null | undefined): boolean => !a || (!a.whole && !a.num && !a.den);

/** Exact value of an answer, or null when it is empty or not a number. */
export function parseAnswer(a: AnswerInput | null | undefined): Rational | null {
  if (!a || isBlank(a)) return null;
  const { whole, num, den } = a;
  if (num || den) {
    if (!/^\d+$/.test(num) || !/^\d+$/.test(den) || Number(den) === 0) return null;
    if (whole && !/^\d+$/.test(whole)) return null;
    return add(rat(whole ? Number(whole) : 0), rat(Number(num), Number(den)));
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(whole)) return null;
  return fromDecimalString(whole);
}

/** Any equivalent form scores: 3/4, 6/8 and 0.75 are all right for 3/4. */
export function isCorrect(q: Question, a: AnswerInput | null | undefined): boolean {
  const v = parseAnswer(a);
  return v !== null && eq(v, ratFromString(q.answer));
}

/** The answer as typed, tidied for display: "1,635", "2 3/4", "6/8". */
export function formatInput(a: AnswerInput | null | undefined): string {
  if (!a || isBlank(a)) return '';
  const whole = a.whole ? formatNumber(a.whole) : '';
  if (!a.num && !a.den) return whole;
  const fraction = `${a.num || '?'}/${a.den || '?'}`;
  return whole ? `${whole} ${fraction}` : fraction;
}

/** Keypad limits so a box never overflows. */
export const FIELD_MAX_LENGTH: Record<AnswerField, number> = { whole: 9, num: 4, den: 4 };

/** Applies one keypad key to a field value. */
export function typeKey(value: string, key: string, field: AnswerField): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (key === '.') {
    if (field !== 'whole' || value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }
  if (!/^\d$/.test(key) || value.length >= FIELD_MAX_LENGTH[field]) return value;
  // No leading zeros on whole numbers ("007"); "0." is fine.
  if (value === '0' && field === 'whole') return key;
  return value + key;
}
