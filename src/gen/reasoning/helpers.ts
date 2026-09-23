// Shared pieces for reasoning templates: names, number formatting, inputs and answer encoding.
import { rat, ratToString, toDecimalString, type Rational } from '../../math/rational';
import { formatNumber } from '../format';
import type { Rng } from '../rng';
import type { Block, InputSpec, NumberBox, ReasoningDraft } from '../types';

// Generic first names for word problems.
export const NAMES = [
  'Sam', 'Amir', 'Lily', 'Jack', 'Ava', 'Noah', 'Maya', 'Leo', 'Zara', 'Omar',
  'Ella', 'Ravi', 'Chloe', 'Kai', 'Isla', 'Theo', 'Priya', 'Finn', 'Grace', 'Yusuf',
];

/** Two different names. */
export function twoNames(rng: Rng): [string, string] {
  const [a, b] = rng.shuffle(NAMES);
  return [a, b];
}

/** Integers and rationals as printed on a paper: 4,478 · −6 · 0.35. */
export function fmt(v: number | Rational): string {
  const r = typeof v === 'number' ? rat(v) : v;
  const s = toDecimalString(r);
  if (s === null) throw new Error(`fmt() needs a terminating decimal, got ${r.n}/${r.d}`);
  return formatNumber(s);
}

/** Money from pence, as on SATs papers: 45p · £1.00 · £12.50 · £1,250.00. */
export function money(pence: number): string {
  if (!Number.isInteger(pence) || pence < 0) throw new Error(`money() needs whole pence, got ${pence}`);
  if (pence < 100) return `${pence}p`;
  return `£${formatNumber(String(Math.floor(pence / 100)))}.${String(pence % 100).padStart(2, '0')}`;
}

/** "1 red bead", "3 red beads". */
export const plural = (n: number, word: string, many = `${word}s`): string => `${fmt(n)} ${n === 1 ? word : many}`;

export const text = (t: string): Block => ({ b: 'text', text: t });

export const number = (box: NumberBox = {}): InputSpec => ({ kind: 'number', boxes: [box] });
export const moneyBox = (): InputSpec => ({ kind: 'number', boxes: [{ prefix: '£', decimal: true }] });
export const timeBox = (): InputSpec => ({ kind: 'number', boxes: [{}, {}], layout: 'time' });
export const coordBox = (): InputSpec => ({ kind: 'number', boxes: [{ negative: true }, { negative: true }], layout: 'coord' });

/** Encodes number-box answers: one rational per box. */
export const nums = (...values: (number | Rational)[]): string =>
  values.map((v) => ratToString(typeof v === 'number' ? rat(v) : v)).join(';');

/** A money answer from pence, for a £ box. */
export const penceAnswer = (pence: number): string => ratToString(rat(pence, 100));

/** Choice question: options shuffled, answer = the indexes of the correct ones. */
export function choices(rng: Rng, correct: string[], wrong: string[]): { input: InputSpec; answer: string } {
  const all = rng.shuffle([...correct.map((t) => ({ t, ok: true })), ...wrong.map((t) => ({ t, ok: false }))]);
  const options = all.map((o) => o.t);
  if (new Set(options).size !== options.length) throw new Error(`Duplicate options: ${options.join(' | ')}`);
  const answer = all
    .flatMap((o, i) => (o.ok ? [i] : []))
    .sort((x, y) => x - y)
    .join(',');
  return { input: { kind: 'choice', options, pick: correct.length }, answer };
}

/** Ordering question: items shuffled, answer = item indexes from smallest to largest. */
export function ordering(rng: Rng, items: { text: string; value: number }[], first = 'smallest'): { input: InputSpec; answer: string } {
  const values = items.map((i) => i.value);
  if (new Set(values).size !== values.length) throw new Error('Ordering items must differ');
  const shuffled = rng.shuffle(items);
  const sorted = shuffled.map((item, i) => ({ ...item, i })).sort((a, b) => a.value - b.value);
  return {
    input: { kind: 'order', items: shuffled.map((i) => i.text), first },
    answer: sorted.map((s) => s.i).join(','),
  };
}

export const draft = (body: Block[], input: InputSpec, answer: string): ReasoningDraft => ({ body, input, answer });

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0-999 in words, British style: "three hundred and six". */
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ''}`;
  if (!h) return restWords;
  return rest ? `${ONES[h]} hundred and ${restWords}` : `${ONES[h]} hundred`;
}

/** Whole numbers below ten million in words: 4,306,012 → "four million, three hundred and six thousand and twelve". */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 10_000_000) throw new Error(`numberWords() out of range: ${n}`);
  if (n === 0) return 'zero';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(`${under1000(millions)} million`);
  if (thousands) parts.push(`${under1000(thousands)} thousand`);
  if (rest) parts.push(rest < 100 && parts.length ? `and ${under1000(rest)}` : under1000(rest));
  return parts.join(', ').replace(/, and /g, ' and ');
}

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
