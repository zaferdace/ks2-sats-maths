import { formatNumber, formatValue } from '../gen/format';
import { isItem, type AnyQuestion, type InputSpec, type NumberBox, type ItemQuestion } from '../gen/types';
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
  /** Choice, ordering, tapped words and tapped gaps. */
  sel?: number[];
  /** Typed words (letter keyboard). */
  text?: string;
  /** True/false per statement. */
  tf?: (boolean | null)[];
  /** Explanation question: the model answer has been shown, so the written answer is locked. */
  checked?: boolean;
  /** Marks a pupil gave themselves on an explanation question. */
  self?: number;
}

export type AnswerField = 'whole' | 'num' | 'den';

export const emptyAnswer = (): AnswerInput => ({ whole: '', num: '', den: '' });

export const isBlank = (a: AnswerInput | null | undefined): boolean =>
  !a ||
  (!a.whole &&
    !a.num &&
    !a.den &&
    !(a.boxes ?? []).some(Boolean) &&
    !(a.sel ?? []).length &&
    !a.text?.trim() &&
    !(a.tf ?? []).some((v) => v !== null && v !== undefined) &&
    a.self === undefined);

const TEXT_MAX = 40;

/** Applies one letter-keyboard key to a typed answer. */
export function typeLetter(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (key === 'space') return value && !value.endsWith(' ') && value.length < TEXT_MAX ? `${value} ` : value;
  if (!/^[a-z'-]$/i.test(key) || value.length >= TEXT_MAX) return value;
  return value + key.toLowerCase();
}

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

const sameSet = (a: number[], b: number[]) => {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/** Typed words compared without case, extra spaces, curly quotes or a final full stop. */
export const normText = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*[.!?]+$/, '');

/** Every accepted typed answer of a text question. */
export const acceptedTexts = (q: ItemQuestion): string[] => q.answer.split('|');

/** Short answers are compared without a leading "a", "an" or "the": "a roll of tape" = "roll of tape". */
const loose = (s: string): string => normText(s).replace(/^(a|an|the) (?=\S)/, '');

function itemCorrect(q: ItemQuestion, a: AnswerInput): boolean {
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
    case 'choice':
    case 'words':
    case 'gap':
      return sameSet(indexes(q.answer), a.sel ?? []);
    case 'order': {
      const expected = indexes(q.answer);
      const chosen = a.sel ?? [];
      return expected.length === chosen.length && expected.every((v, i) => v === chosen[i]);
    }
    case 'text': {
      const typed = loose(a.text ?? '');
      return typed !== '' && acceptedTexts(q).some((t) => loose(t) === typed);
    }
    case 'tf': {
      const expected = q.answer.split(',').map((v) => v === '1');
      return expected.every((v, i) => a.tf?.[i] === v);
    }
    case 'self':
      return (a.self ?? 0) >= q.marks;
  }
}

/** Marks for one question: all or nothing, except self-marked explanations (the pupil's own mark). */
export function markFor(q: AnyQuestion, a: AnswerInput | null | undefined): number {
  if (!a) return 0;
  if (!isItem(q)) {
    const v = parseAnswer(a);
    return v !== null && eq(v, ratFromString(q.answer)) ? 1 : 0;
  }
  if (q.input.kind === 'self') return Math.max(0, Math.min(a.self ?? 0, q.marks));
  return itemCorrect(q, a) ? q.marks : 0;
}

export const maxMarks = (q: AnyQuestion): number => (isItem(q) ? q.marks : 1);

/** Any equivalent form scores: 3/4, 6/8 and 0.75 are all right for 3/4; £3.5 equals £3.50. */
export const isCorrect = (q: AnyQuestion, a: AnswerInput | null | undefined): boolean => markFor(q, a) === maxMarks(q);

/** Which on-screen keyboard a question needs: digits, letters or none (tapping). */
export function keyboardFor(q: AnyQuestion): 'numbers' | 'letters' | null {
  if (!isItem(q)) return 'numbers';
  if (q.input.kind === 'number' || q.input.kind === 'fraction') return 'numbers';
  if (q.input.kind === 'text') return 'letters';
  return null;
}

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

/** Strips the light markup (**bold**, __underline__, [[3/4]]) for plain-text display. */
export const plain = (s: string): string => s.replace(/\*\*|__/g, '').replace(/\[\[(?:(\d+) )?(\d+)\/(\d+)\]\]/g, (_, w, n, d) => (w ? `${w} ${n}/${d}` : `${n}/${d}`));

/** A sentence with a punctuation mark put into the chosen gaps. */
export function withMarks(tokens: string[], gaps: number[], mark: string): string {
  const set = new Set(gaps);
  return tokens
    .map((t, i) => (set.has(i) ? `${t}${mark === '(' || mark === '"' ? ` ${mark}` : mark}` : t))
    .join(' ')
    .replace(/ ([.,!?;:)])/g, '$1');
}

function formatSelection(q: ItemQuestion, sel: number[]): string {
  const input = q.input;
  switch (input.kind) {
    case 'choice':
      return sel.map((i) => plain(input.options[i])).join(' and ');
    case 'order':
      return sel.map((i) => plain(input.items[i])).join(', ');
    case 'words':
      return sel
        .slice()
        .sort((a, b) => a - b)
        .map((i) => input.tokens[i])
        .join(', ');
    case 'gap':
      return withMarks(input.tokens, sel, input.mark);
    default:
      return '';
  }
}

const tfText = (values: (boolean | null | undefined)[]) => values.map((v) => (v === true ? 'true' : v === false ? 'false' : '?')).join(', ');

/** The right answer, written for the results list. */
export function formatCorrect(q: AnyQuestion): string {
  if (!isItem(q)) return formatValue(ratFromString(q.answer), q.kind);
  switch (q.input.kind) {
    case 'number':
      return formatNumbers(q.input, q.answer.split(';').map(ratFromString));
    case 'fraction':
      return formatValue(ratFromString(q.answer), 'frac');
    case 'choice':
    case 'order':
    case 'words':
    case 'gap':
      return formatSelection(q, indexes(q.answer));
    case 'text':
      return acceptedTexts(q)[0];
    case 'tf':
      return tfText(q.answer.split(',').map((v) => v === '1'));
    case 'self':
      return plain(q.input.model);
  }
}

/** The answer as typed, tidied for display: "1,635", "2 3/4", "(−2, 5)". */
export function formatInput(a: AnswerInput | null | undefined, q?: AnyQuestion): string {
  if (!a || isBlank(a)) return '';
  if (q && isItem(q)) {
    if (q.input.kind === 'number') return formatNumbers(q.input, q.input.boxes.map((_, i) => a.boxes?.[i] ?? ''));
    if (q.input.kind === 'text') return a.text ?? '';
    if (q.input.kind === 'tf') return tfText(q.input.statements.map((_, i) => a.tf?.[i]));
    if (q.input.kind === 'self') return `you gave yourself ${a.self ?? 0} of ${q.marks}`;
    if (q.input.kind !== 'fraction') return formatSelection(q, a.sel ?? []);
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
