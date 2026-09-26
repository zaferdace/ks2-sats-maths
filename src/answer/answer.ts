import { joinTokens } from '../english/tokens';
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
  /** Marks given to an explanation question (after Finish, with a grown-up). */
  self?: number;
  /** A grown-up accepted a typed reading answer the app marked wrong (a misspelling, say). */
  accepted?: boolean;
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

/** Longest typed answer the letter keyboard allows. */
export const TEXT_MAX = 40;

/** Applies one letter-keyboard key to a typed answer. */
export function typeLetter(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (key === 'space') return value && !value.endsWith(' ') && value.length < TEXT_MAX ? `${value} ` : value;
  if (!/^[a-z'-]$/i.test(key) || value.length >= TEXT_MAX) return value;
  return value + key.toLowerCase();
}

/**
 * Exact value of a whole/fraction answer, or null when it is empty, not a number, or in a form the
 * real test does not credit: a mixed number's fraction must be proper (7 1/8, not 6 9/8).
 */
export function parseAnswer(a: AnswerInput | null | undefined): Rational | null {
  if (!a || (!a.whole && !a.num && !a.den)) return null;
  const { whole, num, den } = a;
  if (num || den) {
    if (!/^\d+$/.test(num) || !/^\d+$/.test(den) || Number(den) === 0) return null;
    if (whole && !/^\d+$/.test(whole)) return null;
    if (whole && Number(num) >= Number(den)) return null;
    return add(rat(whole ? Number(whole) : 0), rat(Number(num), Number(den)));
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(whole)) return null;
  return fromDecimalString(whole);
}

/** A fraction with only its top or only its bottom number filled in. */
export const incompleteFraction = (a: AnswerInput | null | undefined): boolean => Boolean(a && Boolean(a.num) !== Boolean(a.den));

/** Decimal places typed in a number box ("3.50" → 2, "12" → 0). */
const placesOf = (s: string): number => (s.includes('.') ? s.length - s.indexOf('.') - 1 : 0);

/**
 * Whether a typed box value is written the way the real test credits: money in pounds with no pence
 * or exactly two decimal places (£4.40, not £4.4), and rounding answers to the places asked for (50.0).
 */
export function boxFormOk(s: string | undefined, box: NumberBox): boolean {
  if (!s) return false;
  if (box.dp !== undefined) return placesOf(s) === box.dp;
  if (box.prefix === '£' && s.includes('.')) return placesOf(s) === 2;
  return true;
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

const endMark = (s: string) => s.trim().replace(/\s*[.!?]+$/, '');

/**
 * Typed words compared without case, extra spaces, curly quotes, a final full stop or quotation
 * marks around the whole answer ('fine' = fine). A single apostrophe stays: James' ≠ James.
 */
export const normText = (s: string): string => {
  const t = endMark(
    s
      .toLowerCase()
      .replace(/[‘’`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' '),
  );
  const quoted = /^(['"])(.+)\1$/.exec(t);
  return quoted ? endMark(quoted[2]) : t;
};

/** Every accepted typed answer of a text question. */
export const acceptedTexts = (q: ItemQuestion): string[] => q.answer.split('|');

/** Short answers are compared without a leading "a", "an" or "the": "a roll of tape" = "roll of tape". */
const loose = (s: string): string => normText(s).replace(/^(a|an|the) (?=\S)/, '');

function itemCorrect(q: ItemQuestion, a: AnswerInput): boolean {
  switch (q.input.kind) {
    case 'number': {
      const input = q.input;
      const expected = q.answer.split(';').map(ratFromString);
      return expected.every((e, i) => {
        const v = parseBox(a.boxes?.[i]);
        return v !== null && eq(v, e) && boxFormOk(a.boxes?.[i], input.boxes[i] ?? {});
      });
    }
    case 'fraction': {
      // "What fraction…?" and "Write … as a fraction" need a fraction: a decimal does not answer them.
      if (a.whole.includes('.')) return false;
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

/**
 * Why an answer with the right value still scores 0, in the words of the real test's marking, or null.
 * Shown with the correction so "but 6 9/8 is 7 1/8!" gets an answer.
 */
export function formNote(q: AnyQuestion, a: AnswerInput | null | undefined): string | null {
  if (!a || isBlank(a)) return null;
  const input = isItem(q) ? q.input : null;
  if (!input || input.kind === 'fraction') {
    const { whole, num, den } = a;
    if (whole && /^\d+$/.test(num) && /^\d+$/.test(den) && Number(den) > 0 && Number(num) >= Number(den)) {
      return 'In a mixed number the fraction part must be less than 1, so change it into wholes (7 1/8, not 6 9/8).';
    }
    if (input && whole.includes('.')) return 'The question asks for a fraction, so a decimal does not score.';
    if (incompleteFraction(a)) return 'The fraction was missing its top or bottom number.';
    return null;
  }
  if (input.kind !== 'number') return null;
  const expected = q.answer.split(';').map(ratFromString);
  for (const [i, box] of input.boxes.entries()) {
    const typed = a.boxes?.[i];
    const v = parseBox(typed);
    if (v === null || !eq(v, expected[i]) || boxFormOk(typed, box)) continue;
    if (box.dp !== undefined) return `Rounded to ${box.dp === 1 ? 'one decimal place' : `${box.dp} decimal places`}, the answer needs exactly ${box.dp === 1 ? 'one digit' : `${box.dp} digits`} after the point (e.g. ${formatBoxValue(expected[i], box)}).`;
    if (box.prefix === '£') return 'Money in pounds needs two digits for the pence (£4.40, not £4.4).';
  }
  return null;
}

/** Marks for one question: all or nothing, except self-marked explanations (the pupil's own mark). */
export function markFor(q: AnyQuestion, a: AnswerInput | null | undefined): number {
  if (!a) return 0;
  if (!isItem(q)) {
    const v = parseAnswer(a);
    return v !== null && eq(v, ratFromString(q.answer)) ? maxMarks(q) : 0;
  }
  if (q.input.kind === 'self') return Math.max(0, Math.min(a.self ?? 0, q.marks));
  if (a.accepted && q.input.kind === 'text' && a.text?.trim()) return q.marks;
  return itemCorrect(q, a) ? q.marks : 0;
}

/** A written explanation that has not been given its marks yet: left out of scores and statistics. */
export const awaitingMark = (q: AnyQuestion, a: AnswerInput | null | undefined): boolean =>
  isItem(q) && q.input.kind === 'self' && a?.self === undefined && Boolean(a?.text?.trim());

export const maxMarks = (q: AnyQuestion): number => (isItem(q) ? q.marks : (q.marks ?? 1));

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

/** What a pupil types for a value in a box: "4.40" in a £ box, "50.0" when one decimal place is asked for. */
export function typedValue(value: Rational, box: NumberBox): string {
  const s = toDecimalString(value) ?? '';
  if (box.dp !== undefined) return withPlaces(s, box.dp);
  if (box.prefix === '£' && s.includes('.')) return withPlaces(s, 2);
  return s;
}

/** A terminating decimal string padded with zeros to `places` decimal places ("3.5" → "3.50", "50" → "50.0"). */
function withPlaces(s: string, places: number): string {
  if (places === 0) return s;
  const [int, frac = ''] = s.split('.');
  return `${int}.${frac.padEnd(places, '0')}`;
}

/** A typed or expected box value as shown: "1,635", "−6", "£3.50", "1924" for years. */
export function formatBoxValue(value: string | Rational, box: NumberBox): string {
  let text: string;
  if (typeof value === 'string') {
    text = box.plain ? value.replace('-', '−') : formatNumber(value);
  } else {
    let s = toDecimalString(value) ?? `${value.n}/${value.d}`;
    if (box.prefix === '£') s = withPlaces(s, 2); // £3.50, £44.00
    if (box.dp !== undefined) s = withPlaces(s, box.dp); // 50.0
    text = box.plain ? s.replace('-', '−') : formatNumber(s);
  }
  const suffix = !box.suffix ? '' : /^[°%]/.test(box.suffix) ? box.suffix : ` ${box.suffix}`;
  return `${box.prefix ?? ''}${text}${suffix}`;
}

function formatNumbers(input: NumberInput, values: (string | Rational)[]): string {
  if (input.layout === 'time') {
    const [h, m] = values.map((v) => (typeof v === 'string' ? v : String(v.n)));
    const two = (v: string | undefined) => (v ? v.padStart(2, '0') : '__');
    return `${two(h)}:${two(m)}`;
  }
  const shown = input.boxes.map((b, i) => formatBoxValue(values[i] ?? '', b));
  if (input.layout === 'coord') return `(${shown.join(', ')})`;
  if (input.layout === 'sequence') return shown.join(', ');
  return input.boxes.map((b, i) => (b.label ? `${b.label} = ${shown[i]}` : shown[i])).join(', ');
}

/** Strips the light markup (**bold**, __underline__, [[3/4]]) for plain-text display. */
export const plain = (s: string): string => s.replace(/\*\*|__/g, '').replace(/\[\[(?:(\d+) )?(\d+)\/(\d+)\]\]/g, (_, w, n, d) => (w ? `${w} ${n}/${d}` : `${n}/${d}`));

/** A sentence with a punctuation mark put into the chosen gaps (gap i is after token i). */
export function withMarks(tokens: string[], gaps: number[], mark: string): string {
  const set = new Set(gaps);
  return joinTokens(tokens.flatMap((t, i) => (set.has(i) ? [t, mark] : [t])));
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

/** Applies one keypad key to an hours or minutes box: up to two digits, a leading zero kept ("08"). */
export function typeTimeKey(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (!/^\d$/.test(key) || value.length >= 2) return value;
  return value + key;
}

/** The hours box is complete: two digits, or one that can only be a single-digit hour (3-9). */
export const hoursComplete = (hours: string): boolean => hours.length === 2 || /^[3-9]$/.test(hours);

/** Applies one keypad key to a reasoning number box, honouring its decimal and negative flags. */
export function typeBoxKey(value: string, key: string, box: NumberBox): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  if (key === '-') return box.negative ? (negative ? digits : `-${digits}`) : value;
  if (key === '.' && !box.decimal) return value;
  const next = typeKey(digits, key, 'whole');
  return negative && key !== 'clear' ? `-${next}` : next;
}
