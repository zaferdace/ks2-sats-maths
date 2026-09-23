import { formatNumber, formatValue } from '../gen/format';
import { isReasoning, type AnyQuestion, type InputSpec, type NumberBox, type ReasoningQuestion } from '../gen/types';
import { add, eq, fromDecimalString, rat, ratFromString, toDecimalString, type Rational } from '../math/rational';

/**
 * What the pupil typed or tapped. Arithmetic and fraction answers use whole/num/den; reasoning
 * number answers use `boxes`; choice and ordering answers use `sel` (option indexes, tap order).
 */
export interface AnswerInput {
  whole: string;
  num: string;
  den: string;
  boxes?: string[];
  sel?: number[];
}

export type AnswerField = 'whole' | 'num' | 'den';

export const emptyAnswer = (): AnswerInput => ({ whole: '', num: '', den: '' });

export const isBlank = (a: AnswerInput | null | undefined): boolean =>
  !a || (!a.whole && !a.num && !a.den && !(a.boxes ?? []).some(Boolean) && !(a.sel ?? []).length);

/** Exact value of a whole/fraction answer, or null when it is empty or not a number. */
export function parseAnswer(a: AnswerInput | null | undefined): Rational | null {
  if (!a || (!a.whole && !a.num && !a.den)) return null;
  const { whole, num, den } = a;
  if (num || den) {
    if (!/^\d+$/.test(num) || !/^\d+$/.test(den) || Number(den) === 0) return null;
    if (whole && !/^\d+$/.test(whole)) return null;
    return add(rat(whole ? Number(whole) : 0), rat(Number(num), Number(den)));
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(whole)) return null;
  return fromDecimalString(whole);
}

/** Value typed into one number box: "12", "-6", "3.50". */
export function parseBox(s: string | undefined): Rational | null {
  if (!s || !/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return fromDecimalString(s);
}

const indexes = (s: string): number[] => (s ? s.split(',').map(Number) : []);

function reasoningCorrect(q: ReasoningQuestion, a: AnswerInput | null | undefined): boolean {
  if (!a) return false;
  switch (q.input.kind) {
    case 'number': {
      const expected = q.answer.split(';').map(ratFromString);
      return expected.every((e, i) => {
        const v = parseBox(a.boxes?.[i]);
        return v !== null && eq(v, e);
      });
    }
    case 'fraction': {
      const v = parseAnswer(a);
      return v !== null && eq(v, ratFromString(q.answer));
    }
    case 'choice': {
      const expected = indexes(q.answer).sort((x, y) => x - y);
      const chosen = [...(a.sel ?? [])].sort((x, y) => x - y);
      return expected.length === chosen.length && expected.every((v, i) => v === chosen[i]);
    }
    case 'order': {
      const expected = indexes(q.answer);
      const chosen = a.sel ?? [];
      return expected.length === chosen.length && expected.every((v, i) => v === chosen[i]);
    }
  }
}

/** Any equivalent form scores: 3/4, 6/8 and 0.75 are all right for 3/4; £3.5 equals £3.50. */
export function isCorrect(q: AnyQuestion, a: AnswerInput | null | undefined): boolean {
  if (isReasoning(q)) return reasoningCorrect(q, a);
  const v = parseAnswer(a);
  return v !== null && eq(v, ratFromString(q.answer));
}

/** True when the question is answered with the keypad (numbers or a fraction), not by tapping options. */
export const usesKeypad = (q: AnyQuestion): boolean => !isReasoning(q) || q.input.kind === 'number' || q.input.kind === 'fraction';

/** Marks for one question: all or nothing (a typed answer cannot earn a method mark). */
export const maxMarks = (q: AnyQuestion): number => (isReasoning(q) ? q.marks : 1);
export const markFor = (q: AnyQuestion, a: AnswerInput | null | undefined): number => (isCorrect(q, a) ? maxMarks(q) : 0);

type NumberInput = Extract<InputSpec, { kind: 'number' }>;

/** A typed or expected box value as shown: "1,635", "−6", "£3.50", "1924" for years. */
export function formatBoxValue(value: string | Rational, box: NumberBox): string {
  let text: string;
  if (typeof value === 'string') {
    text = box.plain ? value.replace('-', '−') : formatNumber(value);
  } else {
    let s = toDecimalString(value) ?? `${value.n}/${value.d}`;
    if (box.prefix === '£') s = s.includes('.') ? s.replace(/\.(\d)$/, '.$10') : `${s}.00`; // £3.50, £44.00
    text = box.plain ? s.replace('-', '−') : formatNumber(s);
  }
  const suffix = !box.suffix ? '' : /^[°%]/.test(box.suffix) ? box.suffix : ` ${box.suffix}`;
  return `${box.prefix ?? ''}${text}${suffix}`;
}

function formatNumbers(input: NumberInput, values: (string | Rational)[]): string {
  if (input.layout === 'time') {
    const [h, m] = values.map((v) => (typeof v === 'string' ? v : String(v.n)));
    return `${h ?? ''}:${(m ?? '').padStart(2, '0')}`;
  }
  const shown = input.boxes.map((b, i) => formatBoxValue(values[i] ?? '', b));
  if (input.layout === 'coord') return `(${shown.join(', ')})`;
  if (input.layout === 'sequence') return shown.join(', ');
  return input.boxes.map((b, i) => (b.label ? `${b.label} = ${shown[i]}` : shown[i])).join(', ');
}

function formatSelection(q: ReasoningQuestion, sel: number[]): string {
  const input = q.input;
  if (input.kind === 'choice') return sel.map((i) => input.options[i]).join(' and ');
  if (input.kind === 'order') return sel.map((i) => input.items[i]).join(', ');
  return '';
}

/** The right answer, written for the results list. */
export function formatCorrect(q: AnyQuestion): string {
  if (!isReasoning(q)) return formatValue(ratFromString(q.answer), q.kind);
  switch (q.input.kind) {
    case 'number':
      return formatNumbers(q.input, q.answer.split(';').map(ratFromString));
    case 'fraction':
      return formatValue(ratFromString(q.answer), 'frac');
    case 'choice':
    case 'order':
      return formatSelection(q, indexes(q.answer));
  }
}

/** The answer as typed, tidied for display: "1,635", "2 3/4", "(−2, 5)". */
export function formatInput(a: AnswerInput | null | undefined, q?: AnyQuestion): string {
  if (!a || isBlank(a)) return '';
  if (q && isReasoning(q)) {
    if (q.input.kind === 'number') return formatNumbers(q.input, q.input.boxes.map((_, i) => a.boxes?.[i] ?? ''));
    if (q.input.kind === 'choice' || q.input.kind === 'order') return formatSelection(q, a.sel ?? []);
  }
  const whole = a.whole ? formatNumber(a.whole) : '';
  if (!a.num && !a.den) return whole;
  const fraction = `${a.num || '?'}/${a.den || '?'}`;
  return whole ? `${whole} ${fraction}` : fraction;
}

/** Keypad limits so a box never overflows. */
export const FIELD_MAX_LENGTH: Record<AnswerField, number> = { whole: 9, num: 4, den: 4 };

/** Applies one keypad key to a whole/numerator/denominator field. */
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

/** Applies one keypad key to a reasoning number box, honouring its decimal and negative flags. */
export function typeBoxKey(value: string, key: string, box: NumberBox): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  if (key === '-') return box.negative ? (negative ? digits : `-${digits}`) : value;
  if (key === '.' && !box.decimal) return value;
  const next = typeKey(digits, key, 'whole');
  return negative && key !== 'clear' ? `-${next}` : next;
}
